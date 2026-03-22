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

export async function generatePixPayment(input: PixPaymentInput): Promise<{
  pagamento_id: string;
  pix_qrcode: string;
  pix_copia_cola: string;
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

  let pixQrcode: string;
  let pixCopiaCola: string;
  let gatewayId: string;

  if (env.MERCADOPAGO_ACCESS_TOKEN) {
    const client = getMercadoPagoClient();
    const payment = new Payment(client);

    const mpResponse = await payment.create({
      body: {
        transaction_amount: valor,
        payment_method_id: 'pix',
        payer: {
          email: `cliente${pedido.telefone_cliente.replace(/\D/g, '')}@cardapio.app`,
        },
        date_of_expiration: expiraEm.toISOString(),
        external_reference: pedido.id,
        metadata: {
          pedido_id: pedido.id,
          loja_id: pedido.loja_id,
        },
      },
      requestOptions: { idempotencyKey: input.idempotency_key },
    });

    const txData = mpResponse.point_of_interaction?.transaction_data;
    if (!txData?.qr_code || !txData?.qr_code_base64) {
      throw new AppError(502, 'Erro ao gerar QR Code Pix', 'PIX_GENERATION_ERROR');
    }

    gatewayId = String(mpResponse.id);
    pixCopiaCola = txData.qr_code;
    pixQrcode = `data:image/png;base64,${txData.qr_code_base64}`;
  } else {
    // Modo simulação sem credenciais
    gatewayId = `sim_${input.idempotency_key.replace(/-/g, '').slice(0, 20)}`;
    pixCopiaCola = `PIX_SIMULADO_${gatewayId}_${valor.toFixed(2)}`;
    pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    console.warn('[Pix] Modo simulação - configure MERCADOPAGO_ACCESS_TOKEN');
  }

  // Salvar pagamento no banco
  const { data: pagamento, error: pgError } = await supabase
    .from('pagamentos')
    .insert({
      pedido_id: pedido.id,
      loja_id: pedido.loja_id,
      metodo: 'pix',
      status: 'pendente',
      valor,
      gateway: 'mercadopago',
      gateway_id: gatewayId,
      pix_txid: gatewayId,
      pix_qrcode: pixQrcode,
      pix_copia_cola: pixCopiaCola,
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

  // Enfileirar job de timeout
  const delayMs = expiraEm.getTime() - Date.now();
  await pixTimeoutQueue.add(
    'pix-timeout',
    { pagamento_id: pagamento.id, pedido_id: pedido.id, loja_id: pedido.loja_id, telefone: pedido.telefone_cliente },
    { delay: delayMs, jobId: `pix-timeout-${pagamento.id}` }
  );

  return {
    pagamento_id: pagamento.id,
    pix_qrcode: pixQrcode,
    pix_copia_cola: pixCopiaCola,
    pix_expira_em: expiraEm.toISOString(),
    valor,
  };
}
