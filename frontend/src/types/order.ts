export interface CartItem {
  produto_id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  opcoes_selecionadas: OpcaoSelecionada[];
  observacao?: string;
  subtotal: number;
  imagem_url?: string;
}

export interface OpcaoSelecionada {
  grupo_id: string;
  nome: string;
  item_id: string;
  item_nome: string;
  preco_adicional: number;
}

export interface EnderecoEntrega {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  lat?: number;
  lng?: number;
  referencia?: string;
}

export type TipoEntrega = 'delivery' | 'retirada';
export type FormaPagamento = 'pix' | 'cartao' | 'dinheiro';

export interface Pedido {
  id: string;
  numero: number;
  loja_id: string;
  status: PedidoStatus;
  total: number;
  taxa_entrega: number;
  subtotal: number;
  tipo_entrega: TipoEntrega;
  telefone_cliente: string;
  nome_cliente?: string;
  forma_pagamento?: FormaPagamento;
  endereco_entrega?: EnderecoEntrega;
  created_at: string;
  itens: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  nome_produto: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
  opcoes_selecionadas: OpcaoSelecionada[];
  observacao?: string;
}

export type PedidoStatus =
  | 'pendente'
  | 'aguardando_pagamento'
  | 'confirmado'
  | 'em_preparo'
  | 'pronto'
  | 'saiu_entrega'
  | 'entregue'
  | 'cancelado'
  | 'recusado';

export const STATUS_LABELS: Record<PedidoStatus, string> = {
  pendente: 'Aguardando confirmação',
  aguardando_pagamento: 'Aguardando pagamento',
  confirmado: 'Pedido confirmado',
  em_preparo: 'Em preparo',
  pronto: 'Pronto para retirada',
  saiu_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  recusado: 'Recusado',
};

export const STATUS_COLORS: Record<PedidoStatus, string> = {
  pendente: 'text-yellow-600 bg-yellow-50',
  aguardando_pagamento: 'text-orange-600 bg-orange-50',
  confirmado: 'text-blue-600 bg-blue-50',
  em_preparo: 'text-purple-600 bg-purple-50',
  pronto: 'text-green-600 bg-green-50',
  saiu_entrega: 'text-cyan-600 bg-cyan-50',
  entregue: 'text-green-700 bg-green-100',
  cancelado: 'text-red-600 bg-red-50',
  recusado: 'text-red-700 bg-red-100',
};
