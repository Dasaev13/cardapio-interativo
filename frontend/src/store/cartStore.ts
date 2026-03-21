import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, OpcaoSelecionada } from '../types/order';

interface CartStore {
  items: CartItem[];
  lojaSlug: string | null;

  // Ações
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  removeItem: (produto_id: string, opcoes: OpcaoSelecionada[]) => void;
  updateQuantity: (produto_id: string, opcoes: OpcaoSelecionada[], quantidade: number) => void;
  clearCart: () => void;
  setLojaSlug: (slug: string) => void;

  // Computed
  totalItems: () => number;
  totalPrice: () => number;
  isEmpty: () => boolean;
}

// Gerar chave única para um item (produto + opções selecionadas)
function getItemKey(produto_id: string, opcoes: OpcaoSelecionada[]): string {
  const opcoesKey = opcoes
    .map(o => `${o.grupo_id}:${o.item_id}`)
    .sort()
    .join('|');
  return `${produto_id}__${opcoesKey}`;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lojaSlug: null,

      setLojaSlug: (slug) => {
        const { lojaSlug } = get();
        // Se mudou de loja, limpar carrinho
        if (lojaSlug && lojaSlug !== slug) {
          set({ items: [], lojaSlug: slug });
        } else {
          set({ lojaSlug: slug });
        }
      },

      addItem: (newItem) => {
        set((state) => {
          const key = getItemKey(newItem.produto_id, newItem.opcoes_selecionadas);
          const existingIndex = state.items.findIndex(
            item => getItemKey(item.produto_id, item.opcoes_selecionadas) === key
          );

          if (existingIndex >= 0) {
            // Incrementar quantidade do item existente
            const updatedItems = [...state.items];
            const existing = updatedItems[existingIndex];
            const novaQuantidade = existing.quantidade + newItem.quantidade;
            updatedItems[existingIndex] = {
              ...existing,
              quantidade: novaQuantidade,
              subtotal: existing.preco_unitario * novaQuantidade,
            };
            return { items: updatedItems };
          }

          // Adicionar novo item
          const subtotal = newItem.preco_unitario * newItem.quantidade;
          return {
            items: [...state.items, { ...newItem, subtotal }],
          };
        });
      },

      removeItem: (produto_id, opcoes) => {
        const key = getItemKey(produto_id, opcoes);
        set((state) => ({
          items: state.items.filter(
            item => getItemKey(item.produto_id, item.opcoes_selecionadas) !== key
          ),
        }));
      },

      updateQuantity: (produto_id, opcoes, quantidade) => {
        const key = getItemKey(produto_id, opcoes);
        set((state) => {
          if (quantidade <= 0) {
            return {
              items: state.items.filter(
                item => getItemKey(item.produto_id, item.opcoes_selecionadas) !== key
              ),
            };
          }
          return {
            items: state.items.map(item => {
              if (getItemKey(item.produto_id, item.opcoes_selecionadas) === key) {
                return {
                  ...item,
                  quantidade,
                  subtotal: item.preco_unitario * quantidade,
                };
              }
              return item;
            }),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantidade, 0),

      totalPrice: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),

      isEmpty: () => get().items.length === 0,
    }),
    {
      name: 'cardapio-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
