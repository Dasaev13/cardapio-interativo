import { apiClient } from './client';
import type { Pedido } from '../types/order';

export interface CreateOrderPayload {
  loja_slug: string;
  telefone_cliente: string;
  nome_cliente?: string;
  tipo_entrega: 'delivery' | 'retirada';
  endereco_entrega?: {
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
  };
  itens: Array<{
    produto_id: string;
    quantidade: number;
    opcoes_selecionadas: Array<{
      grupo_id: string;
      nome: string;
      item_id: string;
      item_nome: string;
      preco_adicional: number;
    }>;
    observacao?: string;
  }>;
  forma_pagamento: 'pix' | 'cartao' | 'dinheiro';
  troco_para?: number;
  observacao?: string;
  idempotency_key: string;
  origem?: 'web' | 'whatsapp' | 'admin';
}

export async function createOrder(payload: CreateOrderPayload): Promise<Pedido> {
  const { data } = await apiClient.post<{ data: Pedido }>('/orders', payload, {
    headers: { 'X-Idempotency-Key': payload.idempotency_key },
  });
  return data.data;
}

export async function getOrder(pedidoId: string): Promise<any> {
  const { data } = await apiClient.get(`/orders/${pedidoId}`);
  return data.data;
}
