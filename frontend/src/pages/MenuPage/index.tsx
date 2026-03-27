import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMenu } from '../../hooks/useMenu';
import { useCartStore } from '../../store/cartStore';
import CategoryNav from './CategoryNav';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import CartDrawer from './CartDrawer';
import BottomCartBar from '../../components/layout/BottomCartBar';
import LojaHeader from '../../components/layout/LojaHeader';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { Produto } from '../../types/menu';

export default function MenuPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: menu, isLoading, error } = useMenu(slug);
  const { setLojaSlug, setMesa, mesa, totalItems } = useCartStore();

  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (slug) setLojaSlug(slug);
  }, [slug, setLojaSlug]);

  useEffect(() => {
    const mesaParam = searchParams.get('mesa');
    setMesa(mesaParam);
  }, [searchParams, setMesa]);

  useEffect(() => {
    if (menu?.categorias?.length) {
      setActiveCategory(menu.categorias[0].id);
    }
  }, [menu]);

  // Observer para categoria ativa durante scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace('cat-', ''));
          }
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' }
    );

    categoryRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [menu]);

  if (isLoading) {
    return <MenuPageSkeleton />;
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
          <p className="text-gray-500">Verifique o link e tente novamente</p>
        </div>
      </div>
    );
  }

  const { loja, categorias } = menu;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header da loja */}
      <LojaHeader loja={loja} />

      {/* Banner de mesa */}
      {mesa && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <UtensilsCrossed size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 text-sm font-medium">
            Você está na <strong>Mesa {mesa}</strong> — seu pedido será entregue aqui
          </span>
        </div>
      )}

      {/* Navegação por categorias */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <CategoryNav
          categorias={categorias}
          activeCategory={activeCategory}
          onSelect={(catId) => {
            const el = categoryRefs.current.get(catId);
            if (el) {
              const yOffset = -120;
              const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }}
        />
      </div>

      {/* Lista de categorias e produtos */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {categorias.map(categoria => (
          <section
            key={categoria.id}
            id={`cat-${categoria.id}`}
            ref={el => el && categoryRefs.current.set(categoria.id, el)}
            className="mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3 py-2">
              {categoria.nome}
            </h2>
            <div className="space-y-3">
              {categoria.produtos.map(produto => (
                <ProductCard
                  key={produto.id}
                  produto={produto}
                  loja={loja}
                  onClick={() => setSelectedProduct(produto)}
                />
              ))}
            </div>
          </section>
        ))}

        {categorias.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
            <p>Cardápio em breve</p>
          </div>
        )}
      </div>

      {/* Modal de produto */}
      {selectedProduct && (
        <ProductModal
          produto={selectedProduct}
          loja={loja}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Drawer do carrinho */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        slug={slug}
        loja={loja}
        onCheckout={() => {
          setCartOpen(false);
          navigate(`/${slug}/checkout`);
        }}
      />

      {/* Barra inferior do carrinho */}
      {totalItems() > 0 && (
        <BottomCartBar
          onClick={() => setCartOpen(true)}
          onCheckout={() => navigate(`/${slug}/checkout`)}
        />
      )}
    </div>
  );
}

function MenuPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 shimmer" />
      <div className="sticky top-0 h-12 bg-white shadow-sm" />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 flex gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 shimmer rounded w-3/4" />
              <div className="h-3 shimmer rounded w-full" />
              <div className="h-3 shimmer rounded w-1/2" />
            </div>
            <div className="w-20 h-20 shimmer rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
