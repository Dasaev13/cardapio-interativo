import { supabase } from '../../config/supabase';
import { AppError } from '../../middleware/errorHandler';
import { CashPaymentInput } from '../../validators/payment.validator';
import { printQueue } from '../../config/queues';
import { sendN8nEvent } from '../whatsapp.service';

export async function processCashPayment(input: CashPaymentInput): Promise<{
  pagamento_id: string;
  status: string;
}> {
  // Verificar idempotência
  const { data: existing } = await supabase
    .from('pagamentos')
    .select('id, status')
    .eq('idempotency_key', input.idempotency_key)
    .single();

  if (existing) {
    return { pagamento_id: existing.id, status: existing.status };
  }

  // Buscar pedido
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id, loja_id, total, status, telefone_cliente')
    .eq('id', input.pedido_id)
    .single();

  if (error || !pedido) {
    throw new AppError(404, 'Pedido não encontrado', 'PEDIDO_NOT_FOUND');
  }

  if (!['pendente'].includes(pedido.status)) {
    throw new AppError(400, `Pedido em status inválido: ${pedido.status}`, 'INVALID_ORDER_STATUS');
  }

  // Validar troco
  if (input.troco_para !== undefined && input.troco_para < Number(pedido.total)) {
    throw new AppError(
      400,
      `Troco insuficiente. Total do pedido: R$ ${Number(pedido.total).toFixed(2)}`,
      'INVALID_TROCO'
    );
  }

  // Criar pagamento em dinheiro
  const { data: pagamento, error: pgError } = await supabase
    .from('pagamentos')
    .insert({
      pedido_id: pedido.id,
      loja_id: pedido.loja_id,
      metodo: 'dinheiro',
      status: 'aprovado',
      valor: Number(pedido.total),
      gateway: 'manual',
      idempotency_key: input.idempotency_key,
    })
    .select('id')
    .single();

  if (pgError || !pagamento) {
    throw new AppError(500, 'Erro ao criar pagamento', 'DB_ERROR');
  }

  // Atualizar troco se fornecido
  if (input.troco_para !== undefined) {
    await supabase
      .from('pedidos')
      .update({ troco_para: input.troco_para })
      .eq('id', pedido.id);
  }

  // Enfileirar impressão
  await printQueue.add('print-order', {
    pedido_id: pedido.id,
    loja_id: pedido.loja_id,
  });

  // Notificar n8n → cozinha
  sendN8nEvent('order_confirmed', {
    pedido_id: pedido.id,
    loja_id: pedido.loja_id,
    telefone_cliente: pedido.telefone_cliente,
    forma_pagamento: 'dinheiro',
  }).catch(() => {});

  return {
    pagamento_id: pagamento.id,
    status: 'aprovado',
  };
}
