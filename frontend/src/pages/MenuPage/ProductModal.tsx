import { useState, useEffect } from 'react';
import { X, Plus, Minus, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';
import type { Produto, Loja, GrupoOpcoes, OpcaoItem } from '../../types/menu';
import type { OpcaoSelecionada } from '../../types/order';

interface Props {
  produto: Produto;
  loja: Loja;
  onClose: () => void;
}

export default function ProductModal({ produto, loja, onClose }: Props) {
  const { addItem } = useCartStore();
  const [quantidade, setQuantidade] = useState(1);
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<OpcaoSelecionada[]>([]);
  const [observacao, setObservacao] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function calcularPrecoTotal(): number {
    const adicional = opcoesSelecionadas.reduce((sum, o) => sum + o.preco_adicional, 0);
    const precoBase = produto.preco_promocional ?? produto.preco;
    return (precoBase + adicional) * quantidade;
  }

  function handleSelecionarOpcao(grupo: GrupoOpcoes, item: OpcaoItem, checked: boolean) {
    setErrors(prev => ({ ...prev, [grupo.id]: '' }));

    if (grupo.multiplo) {
      if (checked) {
        const count = opcoesSelecionadas.filter(o => o.grupo_id === grupo.id).length;
        if (count >= grupo.max) {
          toast.error(`Máximo ${grupo.max} opções para "${grupo.nome}"`);
          return;
        }
        setOpcoesSelecionadas(prev => [...prev, {
          grupo_id: grupo.id,
          nome: grupo.nome,
          item_id: item.id,
          item_nome: item.nome,
          preco_adicional: item.preco_adicional,
        }]);
      } else {
        setOpcoesSelecionadas(prev =>
          prev.filter(o => !(o.grupo_id === grupo.id && o.item_id === item.id))
        );
      }
    } else {
      // Seleção única (radio)
      setOpcoesSelecionadas(prev => [
        ...prev.filter(o => o.grupo_id !== grupo.id),
        {
          grupo_id: grupo.id,
          nome: grupo.nome,
          item_id: item.id,
          item_nome: item.nome,
          preco_adicional: item.preco_adicional,
        },
      ]);
    }
  }

  function isSelected(grupoId: string, itemId: string): boolean {
    return opcoesSelecionadas.some(o => o.grupo_id === grupoId && o.item_id === itemId);
  }

  function validar(): boolean {
    const newErrors: Record<string, string> = {};
    for (const grupo of produto.opcoes) {
      if (grupo.obrigatorio) {
        const selected = opcoesSelecionadas.filter(o => o.grupo_id === grupo.id);
        if (selected.length < grupo.min) {
          newErrors[grupo.id] = `Selecione ao menos ${grupo.min} opção${grupo.min > 1 ? 'ões' : ''} em "${grupo.nome}"`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAddToCart() {
    if (!validar()) return;

    const precoUnitario = (produto.preco_promocional ?? produto.preco) +
      opcoesSelecionadas.reduce((s, o) => s + o.preco_adicional, 0);

    addItem({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: precoUnitario,
      quantidade,
      opcoes_selecionadas: opcoesSelecionadas,
      observacao: observacao.trim() || undefined,
      imagem_url: produto.imagem_url,
    });

    toast.success(`${quantidade}x ${produto.nome} adicionado!`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col animate-slide-up">
        {/* Imagem */}
        {produto.imagem_url && (
          <div className="relative h-56 sm:h-64 flex-shrink-0 rounded-t-3xl overflow-hidden">
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
        >
          <X size={20} className="text-gray-700" />
        </button>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900">{produto.nome}</h2>
            {produto.descricao && (
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">{produto.descricao}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {produto.preco_promocional && (
                <span className="text-sm text-gray-400 line-through">{formatCurrency(produto.preco)}</span>
              )}
              <span className="text-xl font-bold text-red-500">
                {formatCurrency(produto.preco_promocional ?? produto.preco)}
              </span>
            </div>

            {/* Grupos de opções */}
            {produto.opcoes.map(grupo => (
              <div key={grupo.id} className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{grupo.nome}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {grupo.obrigatorio
                        ? `Obrigatório • ${grupo.multiplo ? `Escolha até ${grupo.max}` : 'Escolha 1'}`
                        : `Opcional${grupo.multiplo ? ` • Até ${grupo.max}` : ''}`
                      }
                    </p>
                  </div>
                  {grupo.obrigatorio && (
                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                      Obrigatório
                    </span>
                  )}
                </div>

                {errors[grupo.id] && (
                  <p className="text-red-500 text-xs mb-2">{errors[grupo.id]}</p>
                )}

                <div className="space-y-2">
                  {grupo.itens.map(item => {
                    const selected = isSelected(grupo.id, item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                          }`}>
                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{item.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.preco_adicional > 0 && (
                            <span className="text-sm font-semibold text-red-500">
                              +{formatCurrency(item.preco_adicional)}
                            </span>
                          )}
                        </div>
                        <input
                          type={grupo.multiplo ? 'checkbox' : 'radio'}
                          className="sr-only"
                          checked={selected}
                          onChange={e => handleSelecionarOpcao(grupo, item, e.target.checked)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Observação */}
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Algum comentário? <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex: sem cebola, bem passado..."
                maxLength={200}
                rows={2}
                className="input-field resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer com quantidade e adicionar */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-3xl safe-bottom">
          <div className="flex items-center gap-4">
            {/* Quantidade */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
              <button
                onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                className="text-gray-600 hover:text-red-500 transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="font-bold text-gray-900 w-4 text-center">{quantidade}</span>
              <button
                onClick={() => setQuantidade(q => q + 1)}
                className="text-gray-600 hover:text-red-500 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Adicionar ao carrinho */}
            <button
              onClick={handleAddToCart}
              className="flex-1 btn-primary flex items-center justify-between"
            >
              <span>Adicionar</span>
              <span className="font-bold">{formatCurrency(calcularPrecoTotal())}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
