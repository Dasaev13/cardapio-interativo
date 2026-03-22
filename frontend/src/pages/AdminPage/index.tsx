import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, LogOut, ExternalLink, ChefHat, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../api/client';
import LoginPage from './LoginPage';
import ProductForm from './ProductForm';
import OrdersSection from './OrdersSection';

interface Category {
  id: string;
  nome: string;
}

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  preco_promocional?: number | null;
  categoria_id: string;
  imagem_url?: string;
  disponivel: boolean;
  destaque: boolean;
  ordem: number;
}

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [lojaSlug, setLojaSlug] = useState(() => localStorage.getItem('admin_slug') || slug || '');
  const [loja, setLoja] = useState<{ id: string; nome: string; aberto: boolean } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'cardapio'>('pedidos');

  const isLogged = !!token;

  function handleLogin(t: string, s: string) {
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_slug', s);
    setToken(t);
    setLojaSlug(s);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  }

  function handleLogout() {
    supabase.auth.signOut();
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_slug');
    setToken('');
    navigate('/admin');
  }

  const loadData = useCallback(async () => {
    if (!token || !lojaSlug) return;
    setLoading(true);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const [lojaRes, catsRes, prodsRes] = await Promise.all([
        apiClient.get('/admin/loja'),
        apiClient.get('/admin/categorias'),
        apiClient.get('/admin/produtos'),
      ]);
      setLoja(lojaRes.data.data);
      setCategories(catsRes.data.data || []);
      setProducts(prodsRes.data.data || []);
    } catch {
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [token, lojaSlug]);

  useEffect(() => {
    if (isLogged) loadData();
  }, [isLogged, loadData]);

  async function handleSaveProduct(data: Omit<Product, 'id'>) {
    if (editingProduct) {
      await apiClient.put(`/admin/produtos/${editingProduct.id}`, data);
    } else {
      await apiClient.post('/admin/produtos', data);
    }
    await loadData();
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Deletar "${nome}"?`)) return;
    await apiClient.delete(`/admin/produtos/${id}`);
    await loadData();
  }

  async function handleToggle(product: Product) {
    await apiClient.put(`/admin/produtos/${product.id}`, {
      ...product,
      disponivel: !product.disponivel,
    });
    await loadData();
  }

  function openNew() {
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setShowForm(true);
  }

  if (!isLogged) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const filteredProducts = selectedCat === 'all'
    ? products
    : products.filter(p => p.categoria_id === selectedCat);

  const categoryName = (id: string) => categories.find(c => c.id === id)?.nome || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ChefHat size={24} />
          <div>
            <h1 className="font-bold text-lg leading-tight">{loja?.nome || 'Painel Admin'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loja?.aberto ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
              {loja?.aberto ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${lojaSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
            Ver cardápio
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* Abas */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pedidos' ? 'bg-white shadow text-green-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList size={16} />
            Pedidos
          </button>
          <button
            onClick={() => setActiveTab('cardapio')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'cardapio' ? 'bg-white shadow text-green-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChefHat size={16} />
            Cardápio
          </button>
        </div>

        {/* Seção Pedidos */}
        {activeTab === 'pedidos' && loja && (
          <OrdersSection lojaId={loja.id} />
        )}

        {/* Seção Cardápio */}
        {activeTab === 'cardapio' && (
          <>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Cardápio</h2>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-800 transition-colors"
          >
            <Plus size={18} />
            Novo Prato
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCat === 'all' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Todos ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCat === c.id ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {c.nome} ({products.filter(p => p.categoria_id === c.id).length})
            </button>
          ))}
        </div>

        {/* Product list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ChefHat size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum prato cadastrado.</p>
            <button onClick={openNew} className="mt-3 text-green-700 font-medium hover:underline">
              Adicionar primeiro prato
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-opacity ${!product.disponivel ? 'opacity-60' : ''}`}
              >
                {/* Image */}
                {product.imagem_url ? (
                  <img src={product.imagem_url} alt={product.nome} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ChefHat size={24} className="text-gray-300" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{product.nome}</span>
                    {product.destaque && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Destaque</span>
                    )}
                    {!product.disponivel && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Indisponível</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{categoryName(product.categoria_id)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-green-700 font-bold">
                      R$ {product.preco.toFixed(2).replace('.', ',')}
                    </span>
                    {product.preco_promocional && (
                      <span className="text-xs text-gray-400 line-through">
                        R$ {Number(product.preco_promocional).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(product)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={product.disponivel ? 'Desativar' : 'Ativar'}
                  >
                    {product.disponivel
                      ? <ToggleRight size={22} className="text-green-600" />
                      : <ToggleLeft size={22} className="text-gray-400" />}
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.nome)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
