import { Truck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatTime } from '../../utils/format';
import type { DeliveryResult } from '../../types/delivery';

interface Props {
  result: DeliveryResult;
}

export default function DeliverySummary({ result }: Props) {
  if (!result.disponivel) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
        <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Fora da área de entrega</p>
          <p className="text-red-500 text-xs mt-0.5">{result.mensagem}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle size={18} className="text-green-500" />
        <span className="font-semibold text-green-700 text-sm">Entrega disponível</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Truck size={15} className="text-gray-400" />
            <span className="font-semibold text-gray-900">
              {result.taxa === 0 ? 'Entrega Grátis' : formatCurrency(result.taxa)}
            </span>
          </div>
          {result.distancia_km && (
            <span className="text-xs text-gray-400">({result.distancia_km}km)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} />
          <span>{formatTime(result.tempo_min)} – {formatTime(result.tempo_max)}</span>
        </div>
      </div>
    </div>
  );
}
