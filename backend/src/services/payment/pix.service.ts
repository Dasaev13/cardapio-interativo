import { MercadoPagoConfig, Payment } from 'mercadopago';
import QRCode from 'qrcode';
import { supabase } from '../../config/supabase';
import { pixTimeoutQueue } from '../../config/queues';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { PixPaymentInput } from '../../validators/payment.validator';

const PIX_EXPIRY_MINUTES = 30;

function getMercadoPagoClient() {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(500, 'Mercado Pago não configurado', 'PAYMENT_CONFIG_ERROR');
  }
  return new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN });
}

async function gerarQrCodeMP(pagamentoId: string, pedidoId: string, lojaId: string, valor: number, expiraEm: Date, idempotencyKey: string, telefone: string) {
  try {
    const client = getMercadoPagoClient();
    const payment = new Payment(client);

    const mpResponse = await payment.create({
      body: {
        transaction_amount: valor,
        payment_method_id: 'pix',
        payer: { email: `cliente${telefone.replace(/\D/g, '')}@cardapio.app` },
        date_of_expiration: expiraEm.toISOString(),
        external_reference: pedidoId,
        metadata: { pedido_id: pedidoId, loja_id: lojaId },
      },
      requestOptions: { idempotencyKey },
    });

    const txData = mpResponse.point_of_interaction?.transaction_data;
    if (!txData?.qr_code || !txData?.qr_code_base64) {
      throw new Error('QR Code não retornado pelo MP');
    }

    await supabase
      .from('pagamentos')
      .update({
        gateway_id: String(mpResponse.id),
        pix_txid: String(mpResponse.id),
        pix_qrcode: `data:image/png;base64,${txData.qr_code_base64}`,
        pix_copia_cola: txData.qr_code,
        status: 'pendente',
      })
      .eq('id', pagamentoId);

    console.log(`[Pix] QR Code gerado para pagamento ${pagamentoId}`);
  } catch (err) {
    console.error('[Pix] Erro ao gerar QR Code MP:', err);
    await supabase.from('pagamentos').update({ status: 'cancelado' }).eq('id', pagamentoId);
  }
}

export async function generatePixPayment(input: PixPaymentInput): Promise<{
  pagamento_id: string;
  pix_qrcode: string | null;
  pix_copia_cola: string | null;
  pix_expira_em: string;
  valor: number;
}> {
  // Verificar idempotência
  const { data: existingPagamento } = await supabase
    .from('pagamentos')
    .select('id, pix_qrcode, pix_copia_cola, pix_expira_em, valor, status')
    .eq('idempotency_key', input.idempotency_key)
    .single();

  if (existingPagamento) {
    if (existingPagamento.status === 'expirado') {
      throw new AppError(400, 'Este Pix expirou. Gere um novo pagamento.', 'PIX_EXPIRED');
    }
    return {
      pagamento_id: existingPagamento.id,
      pix_qrcode: existingPagamento.pix_qrcode,
      pix_copia_cola: existingPagamento.pix_copia_cola,
      pix_expira_em: existingPagamento.pix_expira_em,
      valor: existingPagamento.valor,
    };
  }

  // Buscar pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('id, loja_id, total, status, telefone_cliente, nome_cliente')
    .eq('id', input.pedido_id)
    .single();

  if (pedidoError || !pedido) {
    throw new AppError(404, 'Pedido não encontrado', 'PEDIDO_NOT_FOUND');
  }

  if (!['pendente', 'aguardando_pagamento'].includes(pedido.status)) {
    throw new AppError(400, `Pedido não pode receber pagamento. Status: ${pedido.status}`, 'INVALID_ORDER_STATUS');
  }

  const valor = Number(pedido.total);
  const expiraEm = new Date(Date.now() + PIX_EXPIRY_MINUTES * 60 * 1000);

  // Criar registro imediatamente com status 'gerando'
  const { data: pagamento, error: pgError } = await supabase
    .from('pagamentos')
    .insert({
      pedido_id: pedido.id,
      loja_id: pedido.loja_id,
      metodo: 'pix',
      status: 'processando',
      valor,
      gateway: 'mercadopago',
      gateway_id: `pending_${input.idempotency_key.slice(0, 8)}`,
      pix_txid: null,
      pix_qrcode: null,
      pix_copia_cola: null,
      pix_expira_em: expiraEm.toISOString(),
      idempotency_key: input.idempotency_key,
    })
    .select('id')
    .single();

  if (pgError || !pagamento) {
    throw new AppError(500, 'Erro ao salvar pagamento', 'DB_ERROR');
  }

  // Atualizar pedido para aguardando_pagamento
  await supabase
    .from('pedidos')
    .update({ status: 'aguardando_pagamento' })
    .eq('id', pedido.id);

  // Gerar QR Code em background (não bloqueia a resposta)
  if (env.MERCADOPAGO_ACCESS_TOKEN) {
    gerarQrCodeMP(pagamento.id, pedido.id, pedido.loja_id, valor, expiraEm, input.idempotency_key, pedido.telefone_cliente);
  } else {
    // Simulação
    const pixCopiaCola = `PIX_SIMULADO_${pagamento.id}_${valor.toFixed(2)}`;
    QRCode.toDataURL(pixCopiaCola).then(async (qr) => {
      await supabase.from('pagamentos').update({
        pix_qrcode: qr, pix_copia_cola: pixCopiaCola, status: 'pendente',
        gateway_id: pagamento.id, pix_txid: pagamento.id,
      }).eq('id', pagamento.id);
    });
  }

  // Enfileirar job de timeout
  const delayMs = expiraEm.getTime() - Date.now();
  await pixTimeoutQueue.add(
    'pix-timeout',
    { pagamento_id: pagamento.id, pedido_id: pedido.id, loja_id: pedido.loja_id, telefone: pedido.telefone_cliente },
    { delay: delayMs, jobId: `pix-timeout-${pagamento.id}` }
  ).catch(() => {}); // Redis pode estar indisponível

  // Retornar imediatamente (QR Code null, frontend vai fazer polling)
  return {
    pagamento_id: pagamento.id,
    pix_qrcode: null,
    pix_copia_cola: null,
    pix_expira_em: expiraEm.toISOString(),
    valor,
  };
}
