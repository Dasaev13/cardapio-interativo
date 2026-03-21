import { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useOrderStore } from '../../store/orderStore';
import { useDeliveryFee, useBairros } from '../../hooks/useDeliveryFee';

interface Props {
  slug: string;
}

export default function DeliveryForm({ slug }: Props) {
  const { endereco, setEndereco, setDeliveryResult } = useOrderStore();
  const [bairroInput, setBairroInput] = useState(endereco?.bairro || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: bairros = [] } = useBairros(slug);
  const { data: deliveryResult, isFetching } = useDeliveryFee(
    slug,
    bairroInput,
    bairroInput.length >= 3
  );

  useEffect(() => {
    setDeliveryResult(deliveryResult ?? null);
  }, [deliveryResult, setDeliveryResult]);

  const filteredBairros = bairros.filter(b =>
    b.nome.toLowerCase().includes(bairroInput.toLowerCase())
  );

  function handleSelectBairro(nome: string) {
    setBairroInput(nome);
    setShowSuggestions(false);
    if (endereco) {
      setEndereco({ ...endereco, bairro: nome });
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
        <MapPin size={18} className="text-red-500" />
        Endereço de entrega
      </h2>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Rua / Avenida *</label>
          <input
            type="text"
            value={endereco?.rua || ''}
            onChange={e => setEndereco({ ...(endereco as any), rua: e.target.value })}
            placeholder="Rua das Flores"
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Número *</label>
          <input
            type="text"
            value={endereco?.numero || ''}
            onChange={e => setEndereco({ ...(endereco as any), numero: e.target.value })}
            placeholder="123"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Complemento</label>
        <input
          type="text"
          value={endereco?.complemento || ''}
          onChange={e => setEndereco({ ...(endereco as any), complemento: e.target.value })}
          placeholder="Apto 201, Bloco B"
          className="input-field"
        />
      </div>

      {/* Bairro com autocomplete */}
      <div className="relative">
        <label className="text-xs text-gray-500 mb-1 block">Bairro *</label>
        <div className="relative">
          <input
            type="text"
            value={bairroInput}
            onChange={e => {
              setBairroInput(e.target.value);
              setEndereco({ ...(endereco as any), bairro: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Digite seu bairro"
            className="input-field pr-8"
          />
          {isFetching && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Sugestões */}
        {showSuggestions && filteredBairros.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
            {filteredBairros.map(b => (
              <button
                key={b.id}
                className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm border-b border-gray-50 last:border-0 flex items-center justify-between"
                onMouseDown={() => handleSelectBairro(b.nome)}
              >
                <span className="font-medium">{b.nome}</span>
                <span className="text-gray-400 text-xs">R$ {b.taxa.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Cidade *</label>
          <input
            type="text"
            value={endereco?.cidade || ''}
            onChange={e => setEndereco({ ...(endereco as any), cidade: e.target.value })}
            placeholder="São Paulo"
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">UF *</label>
          <input
            type="text"
            value={endereco?.estado || ''}
            onChange={e => setEndereco({ ...(endereco as any), estado: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="SP"
            maxLength={2}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Referência</label>
        <input
          type="text"
          value={endereco?.referencia || ''}
          onChange={e => setEndereco({ ...(endereco as any), referencia: e.target.value })}
          placeholder="Próximo ao mercado Bom Preço"
          className="input-field"
        />
      </div>
    </div>
  );
}
