import { z } from 'zod';

export const enderecoSchema = z.object({
  rua: z.string().min(1, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
  cep: z.string().optional().default(''),
  lat: z.number().optional(),
  lng: z.number().optional(),
  referencia: z.string().optional(),
});

export const pedidoItemSchema = z.object({
  produto_id: z.string().uuid('ID do produto inválido'),
  quantidade: z.number().int().min(1, 'Quantidade mínima é 1').max(99),
  opcoes_selecionadas: z.array(z.object({
    grupo_id: z.string(),
    nome: z.string(),
    item_id: z.string(),
    item_nome: z.string(),
    preco_adicional: z.number().min(0).default(0),
  })).default([]),
  observacao: z.string().max(200).optional(),
});

export const createPedidoSchema = z.object({
  loja_slug: z.string().min(1, 'Slug da loja é obrigatório'),
  telefone_cliente: z.string()
    .min(10, 'Telefone inválido')
    .max(20)
    .transform(v => v.replace(/\D/g, '')),
  nome_cliente: z.string().max(100).optional(),
  tipo_entrega: z.enum(['delivery', 'retirada']),
  endereco_entrega: enderecoSchema.optional(),
  itens: z.array(pedidoItemSchema).min(1, 'Pedido deve ter ao menos 1 item'),
  forma_pagamento: z.enum(['pix', 'cartao', 'dinheiro']),
  troco_para: z.number().min(0).optional(),
  observacao: z.string().max(500).optional(),
  idempotency_key: z.string().uuid('Chave de idempotência inválida'),
  session_id: z.string().uuid().optional(),
  origem: z.enum(['whatsapp', 'web', 'admin']).default('web'),
  mesa: z.string().max(20).optional(),
}).refine(
  (data) => data.tipo_entrega === 'retirada' || data.mesa !== undefined || data.endereco_entrega !== undefined,
  { message: 'Endereço de entrega é obrigatório para delivery', path: ['endereco_entrega'] }
).refine(
  (data) => data.forma_pagamento !== 'dinheiro' || data.troco_para === undefined || data.troco_para >= 0,
  { message: 'Troco inválido', path: ['troco_para'] }
);

export type CreatePedidoInput = z.infer<typeof createPedidoSchema>;
