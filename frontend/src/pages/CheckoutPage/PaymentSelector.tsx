import { useState } from 'react';
import { Smartphone, CreditCard, Banknote } from 'lucide-react';
import { useOrderStore } from '../../store/orderStore';
import { formatCurrency } from '../../utils/format';
import type { Loja } from '../../types/menu';
import type { TipoEntrega, FormaPagamento } from '../../types/order';

interface Props {
  loja: Loja;
  tipoEntrega: TipoEntrega;
  total: number;
}

const PAYMENT_OPTIONS = [
  {
    id: 'pix' as FormaPagamento,
    label: 'Pix',
    description: 'Pagamento instantâneo',
    icon: Smartphone,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    id: 'cartao' as FormaPagamento,
    label: 'Cartão Online',
    description: 'Crédito ou débito',
    icon: CreditCard,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'dinheiro' as FormaPagamento,
    label: 'Dinheiro',
    description: 'Na entrega',
    icon: Banknote,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
];

export default function PaymentSelector({ loja, tipoEntrega, total }: Props) {
  const { formaPagamento, setFormaPagamento, trocoParа, setTroco } = useOrderStore();
  const [trocoInput, setTrocoInput] = useState(trocoParа?.toString() || '');

  // Remover opção dinheiro se for pedido online (retirada só tem pix/cartão ou dinheiro dependendo config)
  const availableOptions = PAYMENT_OPTIONS.filter(opt => {
    if (opt.id === 'dinheiro' && tipoEntrega !== 'delivery') return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Forma de pagamento</h2>

      <div className="space-y-2">
        {availableOptions.map(option => {
          const Icon = option.icon;
          const selected = formaPagamento === option.id;

          return (
            <button
              key={option.id}
              onClick={() => setFormaPagamento(option.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                selected
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${option.bgColor}`}>
                <Icon size={20} className={option.iconColor} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${selected ? 'text-red-700' : 'text-gray-800'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-400">{option.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected ? 'border-red-500' : 'border-gray-300'
              }`}>
                {selected && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Campo de troco (apenas para dinheiro) */}
      {formaPagamento === 'dinheiro' && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <label className="text-sm font-medium text-yellow-800 mb-2 block">
            Troco para quanto? <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="number"
            value={trocoInput}
            onChange={e => {
              setTrocoInput(e.target.value);
              setTroco(e.target.value ? parseFloat(e.target.value) : null);
            }}
            placeholder={formatCurrency(total)}
            min={total}
            step="0.01"
            className="input-field bg-white"
          />
          <p className="text-xs text-yellow-600 mt-1">
            Total do pedido: {formatCurrency(total)}
          </p>
        </div>
      )}

      {/* Badge Pix */}
      {formaPagamento === 'pix' && (
        <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
          <p className="text-xs text-green-700">
            ✅ Você receberá um QR Code para pagamento na próxima tela.
            O código expira em <strong>5 minutos</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
