import { X, Trash2, Plus, Minus, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/format';
import type { Loja } from '../../types/menu';

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  loja: Loja;
  onCheckout: () => void;
}

export default function CartDrawer({ open, onClose, loja, onCheckout }: Props) {
  const { items, updateQuantity, removeItem, totalPrice, isEmpty } = useCartStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white flex flex-col h-full animate-slide-up sm:animate-none sm:translate-x-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={20} className="text-red-500" />
            Seu Pedido
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isEmpty() ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Seu carrinho está vazio</p>
              <p className="text-sm mt-1">Adicione itens do cardápio</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-start gap-3">
                  {item.imagem_url && (
                    <img
                      src={item.imagem_url}
                      alt={item.nome}
                      className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{item.nome}</p>
                    {item.opcoes_selecionadas.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.opcoes_selecionadas.map(o => o.item_nome).join(', ')}
                      </p>
                    )}
                    {item.observacao && (
                      <p className="text-xs text-gray-400 italic">"{item.observacao}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.produto_id, item.opcoes_selecionadas)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.produto_id, item.opcoes_selecionadas, item.quantidade - 1)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantidade}</span>
                    <button
                      onClick={() => updateQuantity(item.produto_id, item.opcoes_selecionadas, item.quantidade + 1)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isEmpty() && (
          <div className="p-4 border-t border-gray-100 space-y-3 safe-bottom">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalPrice())}</span>
            </div>
            {loja.config.pedido_minimo > 0 && totalPrice() < loja.config.pedido_minimo && (
              <p className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg">
                Pedido mínimo: {formatCurrency(loja.config.pedido_minimo)}
              </p>
            )}
            <button
              onClick={onCheckout}
              disabled={loja.config.pedido_minimo > 0 && totalPrice() < loja.config.pedido_minimo}
              className="w-full btn-primary flex items-center justify-between"
            >
              <span>Finalizar pedido</span>
              <div className="flex items-center gap-1">
                <span className="font-bold">{formatCurrency(totalPrice())}</span>
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
