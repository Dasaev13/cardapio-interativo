import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EnderecoEntrega, TipoEntrega, FormaPagamento } from '../types/order';
import type { DeliveryResult } from '../types/delivery';

interface OrderStore {
  // Checkout state
  tipoEntrega: TipoEntrega;
  endereco: EnderecoEntrega | null;
  deliveryResult: DeliveryResult | null;
  formaPagamento: FormaPagamento | null;
  trocoParа: number | null;
  nomeCliente: string;
  telefoneCliente: string;
  observacao: string;

  // Pedido criado
  pedidoId: string | null;
  pagamentoId: string | null;

  // Ações
  setTipoEntrega: (tipo: TipoEntrega) => void;
  setEndereco: (endereco: EnderecoEntrega) => void;
  setDeliveryResult: (result: DeliveryResult | null) => void;
  setFormaPagamento: (forma: FormaPagamento) => void;
  setTroco: (troco: number | null) => void;
  setNomeCliente: (nome: string) => void;
  setTelefoneCliente: (tel: string) => void;
  setObservacao: (obs: string) => void;
  setPedidoId: (id: string) => void;
  setPagamentoId: (id: string) => void;
  resetOrder: () => void;
}

const initialState = {
  tipoEntrega: 'delivery' as TipoEntrega,
  endereco: null,
  deliveryResult: null,
  formaPagamento: null,
  trocoParа: null,
  nomeCliente: '',
  telefoneCliente: '',
  observacao: '',
  pedidoId: null,
  pagamentoId: null,
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      ...initialState,
      setTipoEntrega: (tipo) => set({ tipoEntrega: tipo }),
      setEndereco: (endereco) => set({ endereco }),
      setDeliveryResult: (result) => set({ deliveryResult: result }),
      setFormaPagamento: (forma) => set({ formaPagamento: forma }),
      setTroco: (troco) => set({ trocoParа: troco }),
      setNomeCliente: (nome) => set({ nomeCliente: nome }),
      setTelefoneCliente: (tel) => set({ telefoneCliente: tel }),
      setObservacao: (obs) => set({ observacao: obs }),
      setPedidoId: (id) => set({ pedidoId: id }),
      setPagamentoId: (id) => set({ pagamentoId: id }),
      resetOrder: () => set(initialState),
    }),
    {
      name: 'cardapio-order',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
