import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Category {
  id: string;
  nome: string;
}

interface Product {
  id?: string;
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

interface Props {
  product?: Product | null;
  categories: Category[];
  onSave: (data: Omit<Product, 'id'>) => Promise<void>;
  onClose: () => void;
}

export default function ProductForm({ product, categories, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Product, 'id'>>({
    nome: '',
    descricao: '',
    preco: 0,
    preco_promocional: null,
    categoria_id: categories[0]?.id || '',
    imagem_url: '',
    disponivel: true,
    destaque: false,
    ordem: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        nome: product.nome,
        descricao: product.descricao || '',
        preco: product.preco,
        preco_promocional: product.preco_promocional ?? null,
        categoria_id: product.categoria_id,
        imagem_url: product.imagem_url || '',
        disponivel: product.disponivel,
        destaque: product.destaque,
        ordem: product.ordem,
      });
    }
  }, [product]);

  function set(field: keyof typeof form, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || form.preco <= 0) {
      setError('Nome e preço são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">{product ? 'Editar Prato' : 'Novo Prato'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Tilápia Grelhada"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={3}
              placeholder="Ingredientes, acompanhamentos, porção..."
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select
              value={form.categoria_id}
              onChange={e => set('categoria_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={e => set('preco', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Promocional</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.preco_promocional ?? ''}
                onChange={e => set('preco_promocional', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Opcional"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
            <input
              type="url"
              value={form.imagem_url || ''}
              onChange={e => set('imagem_url', e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de exibição</label>
            <input
              type="number"
              min="0"
              value={form.ordem}
              onChange={e => set('ordem', parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.disponivel}
                onChange={e => set('disponivel', e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm font-medium">Disponível</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={e => set('destaque', e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm font-medium">Destaque</span>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
