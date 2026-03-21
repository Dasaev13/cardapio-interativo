import { z } from 'zod';

export const pixPaymentSchema = z.object({
  pedido_id: z.string().uuid('ID do pedido inválido'),
  idempotency_key: z.string().uuid('Chave de idempotência inválida'),
  nome_devedor: z.string().max(200).optional(),
  cpf_devedor: z.string().optional(),
});

export const cardPaymentSchema = z.object({
  pedido_id: z.string().uuid(),
  idempotency_key: z.string().uuid(),
  token: z.string().min(1, 'Token do cartão é obrigatório'),
  installments: z.number().int().min(1).max(12).default(1),
  payment_method_id: z.string().min(1),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
});

export const cashPaymentSchema = z.object({
  pedido_id: z.string().uuid(),
  idempotency_key: z.string().uuid(),
  troco_para: z.number().min(0).optional(),
});

export type PixPaymentInput = z.infer<typeof pixPaymentSchema>;
export type CardPaymentInput = z.infer<typeof cardPaymentSchema>;
export type CashPaymentInput = z.infer<typeof cashPaymentSchema>;
