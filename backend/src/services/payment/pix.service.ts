import QRCode from 'qrcode';
import { supabase } from '../../config/supabase';
import { pixTimeoutQueue } from '../../config/queues';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { PixPaymentInput } from '../../validators/payment.validator';

const PIX_EXPIRY_MINUTES = 5;

function asaasBaseUrl(): string {
  return env.ASAAS_SANDBOX
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3';
}

function asaasHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': env.ASAAS_API_KEY!,
  };
}

async function createAsaasCustomer(nome: string, telefone: string): Promise<string> {
  const response = await fetch(`${asaasBaseUrl()}/customers`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify({
      name: nome || 'Cliente',
      mobilePhone: telefone.replace(/\D/g, ''),
      externalReference: telefone.replace(/\D/g, ''),
      notificationDisabled: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `Erro ao criar cliente Asaas: ${text}`, 'PAYMENT_CUSTOMER_ERROR');
  }

  const data = await response.json() as { id: string };
  return data.id;
}

async function createAsaasPix(customerId: string, valor: number, pedidoId: string): Promise<{
  id: string;
  encodedImage: string;
  payload: string;
}> {
  // Criar cobrança Pix
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // vence amanhã (controle de expiração é interno)
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  const paymentRes = await fetch(`${asaasBaseUrl()}/payments`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      value: valor,
      dueDate: dueDateStr,
      description: 'Pagamento de pedido',
      externalReference: pedidoId,
    }),
  });

  if (!paymentRes.ok) {
    const text = await paymentRes.text();
    throw new AppError(502, `Erro ao criar cobrança Asaas: ${text}`, 'PIX_GENERATION_ERROR');
  }

  const payment = await paymentRes.json() as { id: string };

  // Buscar QR Code
  const qrRes = await fetch(`${asaasBaseUrl()}/payments/${payment.id}/pixQrCode`, {
    headers: asaasHeaders(),
  });

  if (!qrRes.ok) {
    const text = await qrRes.text();
    throw new AppError(502, `Erro ao buscar QR Code Asaas: ${text}`, 'PIX_QRCODE_ERROR');
  }

  const qrData = await qrRes.json() as { encodedImage: string; payload: string };

  return {
    id: payment.id,
    encodedImage: qrData.encodedImage, // já é base64 PNG
    payload: qrData.payload,           // copia e cola
  };
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
  let asaasPaymentId: string;

  if (env.ASAAS_API_KEY) {
    try {
      const customerId = await createAsaasCustomer(
        pedido.nome_cliente || 'Cliente',
        pedido.telefone_cliente
      );
      const pixData = await createAsaasPix(customerId, valor, pedido.id);

      asaasPaymentId = pixData.id;
      // encodedImage já vem como base64 do Asaas (sem prefixo data:image)
      pixQrcode = pixData.encodedImage.startsWith('data:')
        ? pixData.encodedImage
        : `data:image/png;base64,${pixData.encodedImage}`;
      pixCopiaCola = pixData.payload;
    } catch (err) {
      console.error('[Pix] Erro Asaas, usando simulação:', err);
      asaasPaymentId = `sim_${input.idempotency_key.replace(/-/g, '').slice(0, 20)}`;
      pixCopiaCola = `PIX_SIMULADO_${asaasPaymentId}_${valor.toFixed(2)}`;
      pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    }
  } else {
    // Modo desenvolvimento sem Asaas
    asaasPaymentId = `sim_${input.idempotency_key.replace(/-/g, '').slice(0, 20)}`;
    pixCopiaCola = `PIX_SIMULADO_${asaasPaymentId}_${valor.toFixed(2)}`;
    pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    console.warn('[Pix] Modo simulação - configure ASAAS_API_KEY para produção');
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
      gateway: 'asaas',
      gateway_id: asaasPaymentId,
      pix_txid: asaasPaymentId,
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

export async function handlePixWebhook(payload: any): Promise<string | null> {
  // Payload Asaas: { event: 'PAYMENT_RECEIVED' | 'PAYMENT_CONFIRMED', payment: { id, value, status, ... } }
  const confirmEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
  if (!confirmEvents.includes(payload?.event)) return null;

  const asaasId = payload?.payment?.id;
  if (!asaasId) return null;

  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('id, pedido_id, loja_id, status')
    .eq('gateway_id', asaasId)
    .single();

  if (!pagamento || pagamento.status === 'aprovado') return null;

  await supabase
    .from('pagamentos')
    .update({ status: 'aprovado', gateway_payload: payload.payment })
    .eq('id', pagamento.id);

  console.log(`[Pix] Pagamento confirmado: pedido ${pagamento.pedido_id}`);
  return pagamento.pedido_id;
}
