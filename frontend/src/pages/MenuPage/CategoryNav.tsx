import { useRef, useEffect } from 'react';
import type { Categoria } from '../../types/menu';

interface Props {
  categorias: Categoria[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryNav({ categorias, activeCategory, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto scrollbar-hide px-4 py-2"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {categorias.map(cat => (
        <button
          key={cat.id}
          ref={cat.id === activeCategory ? activeRef : null}
          onClick={() => onSelect(cat.id)}
          className={`
            whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200 flex-shrink-0
            ${cat.id === activeCategory
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          {cat.nome}
        </button>
      ))}
    </div>
  );
}
