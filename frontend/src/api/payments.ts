import { apiClient } from './client';
import type { PixPayment, PaymentStatus } from '../types/payment';

export async function createPixPayment(params: {
  pedido_id: string;
  idempotency_key: string;
  nome_devedor?: string;
}): Promise<PixPayment> {
  const { data } = await apiClient.post<{ data: PixPayment }>('/payments/pix', params, {
    headers: { 'X-Idempotency-Key': params.idempotency_key },
  });
  return data.data;
}

export async function createCashPayment(params: {
  pedido_id: string;
  idempotency_key: string;
  troco_para?: number;
}): Promise<{ pagamento_id: string; status: string }> {
  const { data } = await apiClient.post('/payments/cash', params, {
    headers: { 'X-Idempotency-Key': params.idempotency_key },
  });
  return data.data;
}

export async function getPaymentStatus(pagamentoId: string): Promise<PaymentStatus> {
  const { data } = await apiClient.get<{ data: PaymentStatus }>(`/payments/${pagamentoId}/status`);
  return data.data;
}
