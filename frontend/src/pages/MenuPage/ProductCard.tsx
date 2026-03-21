import { Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import type { Produto } from '../../types/menu';
import type { Loja } from '../../types/menu';

interface Props {
  produto: Produto;
  loja: Loja;
  onClick: () => void;
}

export default function ProductCard({ produto, onClick }: Props) {
  const hasDiscount = produto.preco_promocional && produto.preco_promocional < produto.preco;
  const displayPrice = hasDiscount ? produto.preco_promocional! : produto.preco;

  return (
    <div
      className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-200 cursor-pointer overflow-hidden active:scale-98"
      onClick={onClick}
    >
      <div className="flex p-4 gap-3">
        {/* Texto */}
        <div className="flex-1 min-w-0">
          {produto.destaque && (
            <span className="inline-block text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full mb-1">
              Destaque
            </span>
          )}
          <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
            {produto.nome}
          </h3>
          {produto.descricao && (
            <p className="text-gray-500 text-[13px] mt-1 line-clamp-2 leading-relaxed">
              {produto.descricao}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(produto.preco)}
              </span>
            )}
            <span className="text-base font-bold text-red-500">
              {formatCurrency(displayPrice)}
            </span>
          </div>
        </div>

        {/* Imagem + botão adicionar */}
        <div className="relative flex-shrink-0">
          {produto.imagem_url ? (
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-24 h-24 object-cover rounded-xl"
              loading="lazy"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              🍔
            </div>
          )}
          <button
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
