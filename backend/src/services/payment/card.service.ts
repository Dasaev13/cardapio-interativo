import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../config/supabase';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { CardPaymentInput } from '../../validators/payment.validator';

function getMercadoPagoClient() {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(500, 'Mercado Pago não configurado', 'PAYMENT_CONFIG_ERROR');
  }
  return new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN });
}

export async function processCardPayment(input: CardPaymentInput): Promise<{
  pagamento_id: string;
  gateway_id: string;
  status: string;
  card_last_four?: string;
  card_brand?: string;
}> {
  // Verificar idempotência
  const { data: existingPagamento } = await supabase
    .from('pagamentos')
    .select('id, gateway_id, status, card_last_four, card_brand')
    .eq('idempotency_key', input.idempotency_key)
    .single();

  if (existingPagamento) {
    return {
      pagamento_id: existingPagamento.id,
      gateway_id: existingPagamento.gateway_id,
      status: existingPagamento.status,
      card_last_four: existingPagamento.card_last_four,
      card_brand: existingPagamento.card_brand,
    };
  }

  // Buscar pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('id, loja_id, total, status, nome_cliente, telefone_cliente')
    .eq('id', input.pedido_id)
    .single();

  if (pedidoError || !pedido) {
    throw new AppError(404, 'Pedido não encontrado', 'PEDIDO_NOT_FOUND');
  }

  if (!['pendente', 'aguardando_pagamento'].includes(pedido.status)) {
    throw new AppError(400, `Pedido em status inválido: ${pedido.status}`, 'INVALID_ORDER_STATUS');
  }

  const client = getMercadoPagoClient();
  const payment = new Payment(client);

  try {
    const mpResponse = await payment.create({
      body: {
        transaction_amount: Number(pedido.total),
        token: input.token,
        installments: input.installments,
        payment_method_id: input.payment_method_id,
        payer: {
          email: input.email || `cliente-${pedido.telefone_cliente}@cardapio.app`,
          identification: input.cpf ? {
            type: 'CPF',
            number: input.cpf.replace(/\D/g, ''),
          } : undefined,
        },
        external_reference: pedido.id,
        metadata: {
          pedido_id: pedido.id,
          loja_id: pedido.loja_id,
        },
      },
    });

    const mpStatus = mpResponse.status === 'approved' ? 'aprovado' : 'processando';

    const { data: pagamento, error: pgError } = await supabase
      .from('pagamentos')
      .insert({
        pedido_id: pedido.id,
        loja_id: pedido.loja_id,
        metodo: 'cartao',
        status: mpStatus,
        valor: Number(pedido.total),
        gateway: 'mercadopago',
        gateway_id: String(mpResponse.id),
        gateway_payload: mpResponse,
        card_last_four: mpResponse.card?.last_four_digits,
        card_brand: mpResponse.payment_method_id,
        idempotency_key: input.idempotency_key,
      })
      .select('id')
      .single();

    if (pgError || !pagamento) {
      throw new AppError(500, 'Erro ao salvar pagamento', 'DB_ERROR');
    }

    return {
      pagamento_id: pagamento.id,
      gateway_id: String(mpResponse.id),
      status: mpStatus,
      card_last_four: mpResponse.card?.last_four_digits,
      card_brand: mpResponse.payment_method_id,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, `Erro no processamento do cartão: ${err.message}`, 'CARD_PAYMENT_ERROR');
  }
}

export async function handleMercadoPagoWebhook(data: any): Promise<string | null> {
  if (data.type !== 'payment' || !data.data?.id) return null;

  const client = getMercadoPagoClient();
  const payment = new Payment(client);

  try {
    const mpPayment = await payment.get({ id: data.data.id });

    const pedidoId = mpPayment.external_reference;
    if (!pedidoId) return null;

    const mpStatus = mpPayment.status;
    let status: string;

    switch (mpStatus) {
      case 'approved': status = 'aprovado'; break;
      case 'rejected': status = 'recusado'; break;
      case 'cancelled': status = 'cancelado'; break;
      case 'refunded': status = 'reembolsado'; break;
      default: status = 'processando';
    }

    await supabase
      .from('pagamentos')
      .update({ status, gateway_payload: mpPayment })
      .eq('gateway_id', String(data.data.id))
      .eq('gateway', 'mercadopago');

    console.log(`[MP] Pagamento ${data.data.id} → ${status} (${mpPayment.payment_method_id})`);

    // Se aprovado, confirmar pedido automaticamente
    if (status === 'aprovado') {
      await supabase
        .from('pedidos')
        .update({ status: 'confirmado' })
        .eq('id', pedidoId)
        .in('status', ['pendente', 'aguardando_pagamento']);

      return pedidoId;
    }

    return null;
  } catch (err) {
    console.error('[MP] Erro ao processar webhook:', err);
    return null;
  }
}
