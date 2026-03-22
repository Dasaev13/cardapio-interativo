import { CheckCircle, Clock, ChefHat, Bike, Package, XCircle } from 'lucide-react';

interface Props {
  status: string;
  tipoEntrega: 'delivery' | 'retirada';
}

interface Step {
  id: string;
  label: string;
  icon: React.ElementType;
  deliveryOnly?: boolean;
}

const STEPS_DELIVERY: Step[] = [
  { id: 'confirmado', label: 'Pedido confirmado', icon: CheckCircle },
  { id: 'preparando', label: 'Em preparo', icon: ChefHat },
  { id: 'pronto', label: 'Saiu para entrega', icon: Bike },
  { id: 'entregue', label: 'Entregue', icon: Package },
];

const STEPS_RETIRADA: Step[] = [
  { id: 'confirmado', label: 'Pedido confirmado', icon: CheckCircle },
  { id: 'preparando', label: 'Em preparo', icon: ChefHat },
  { id: 'pronto', label: 'Pronto para retirada', icon: Package },
  { id: 'entregue', label: 'Retirado', icon: CheckCircle },
];

const STATUS_ORDER = [
  'pendente', 'aguardando_pagamento', 'confirmado',
  'preparando', 'pronto', 'entregue',
];

function getStepIndex(status: string): number {
  return STATUS_ORDER.indexOf(status);
}

export default function StatusTimeline({ status, tipoEntrega }: Props) {
  const steps = tipoEntrega === 'delivery' ? STEPS_DELIVERY : STEPS_RETIRADA;
  const currentIndex = getStepIndex(status);
  const isCancelled = ['cancelado', 'recusado'].includes(status);
  const isPending = ['pendente', 'aguardando_pagamento'].includes(status);

  if (isCancelled) {
    return (
      <div className="bg-red-50 rounded-2xl p-5 text-center shadow-card">
        <XCircle size={40} className="text-red-400 mx-auto mb-2" />
        <p className="font-bold text-red-700">Pedido {status === 'cancelado' ? 'cancelado' : 'recusado'}</p>
        <p className="text-sm text-red-400 mt-1">Entre em contato com o estabelecimento</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="bg-yellow-50 rounded-2xl p-5 text-center shadow-card">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-bold text-yellow-700">
          {status === 'aguardando_pagamento' ? 'Aguardando pagamento' : 'Aguardando confirmação'}
        </p>
        <p className="text-sm text-yellow-500 mt-1">Isso pode levar alguns instantes</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <div className="relative">
        {/* Linha de progresso */}
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
        <div
          className="absolute left-5 top-5 w-0.5 bg-red-500 transition-all duration-700"
          style={{
            height: `${Math.max(0, ((currentIndex - 2) / (steps.length - 1))) * 100}%`,
          }}
        />

        <div className="space-y-6">
          {steps.map((step, idx) => {
            const stepStatusIndex = getStepIndex(step.id);
            const isCompleted = currentIndex >= stepStatusIndex;
            const isCurrent = currentIndex === stepStatusIndex - 1 || (idx === 0 && currentIndex >= 2);
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-4 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                  isCompleted
                    ? 'bg-red-500 shadow-md'
                    : isCurrent
                    ? 'bg-red-100 border-2 border-red-300'
                    : 'bg-gray-100'
                }`}>
                  <Icon size={18} className={isCompleted ? 'text-white' : 'text-gray-400'} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && !isCompleted && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Em andamento
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
