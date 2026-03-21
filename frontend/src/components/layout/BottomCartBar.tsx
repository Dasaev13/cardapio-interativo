import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/format';

interface Props {
  onClick: () => void;
  onCheckout: () => void;
}

export default function BottomCartBar({ onClick, onCheckout }: Props) {
  const { totalItems, totalPrice } = useCartStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div
          className="bg-red-500 rounded-2xl shadow-xl flex items-center overflow-hidden cursor-pointer"
          onClick={onClick}
        >
          {/* Contador */}
          <div className="bg-red-600 px-4 py-4 flex items-center justify-center min-w-[56px]">
            <span className="bg-white text-red-500 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
              {totalItems()}
            </span>
          </div>

          {/* Texto */}
          <div className="flex-1 px-4 py-4">
            <p className="text-white font-semibold text-sm">Ver carrinho</p>
          </div>

          {/* Preço */}
          <div className="px-4 py-4 flex items-center gap-1">
            <span className="text-white font-bold">{formatCurrency(totalPrice())}</span>
            <ChevronRight size={18} className="text-white/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
