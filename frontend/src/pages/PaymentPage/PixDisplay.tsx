import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, Clock, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRemainingSeconds } from '../../utils/format';
import type { PixPayment } from '../../types/payment';

interface Props {
  pixData: PixPayment;
  onExpire: () => void;
  onRefresh: () => void;
}

export default function PixDisplay({ pixData, onExpire, onRefresh }: Props) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => getRemainingSeconds(pixData.pix_expira_em));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(pixData.pix_expira_em);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pixData.pix_expira_em, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isExpiring = secondsLeft < 60;
  const progress = (secondsLeft / (5 * 60)) * 100;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pixData.pix_copia_cola);
      setCopied(true);
      toast.success('Código Pix copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Não foi possível copiar. Selecione manualmente.');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className={`rounded-2xl p-4 text-center ${isExpiring ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock size={18} className={isExpiring ? 'text-red-500' : 'text-orange-500'} />
          <span className={`font-bold text-lg ${isExpiring ? 'text-red-600' : 'text-orange-600'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
        {/* Barra de progresso */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? 'bg-red-500' : 'bg-orange-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isExpiring ? '⚠️ Expirando em breve!' : 'Pague antes do tempo esgotar'}
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-2xl p-6 text-center shadow-card">
        <div className="flex items-center gap-2 justify-center mb-4">
          <Smartphone size={20} className="text-green-500" />
          <span className="font-bold text-gray-900">Pagamento via Pix</span>
        </div>

        {pixData.pix_qrcode ? (
          <img
            src={pixData.pix_qrcode}
            alt="QR Code Pix"
            className="w-52 h-52 mx-auto rounded-xl border border-gray-100"
          />
        ) : (
          <div className="w-52 h-52 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
            <p className="text-gray-400 text-sm">QR Code indisponível</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Abra seu app bancário e escaneie o QR Code
        </p>
      </div>

      {/* Código copia e cola */}
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <p className="text-sm font-semibold text-gray-700 mb-2">Ou use o código Pix Copia e Cola:</p>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
          <p className="flex-1 text-xs text-gray-600 font-mono break-all line-clamp-3">
            {pixData.pix_copia_cola}
          </p>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-blue-50 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-sm text-blue-700 font-medium">
            Aguardando confirmação do pagamento...
          </p>
        </div>
        <p className="text-xs text-blue-500 mt-1">A página atualiza automaticamente</p>
      </div>

      {/* Botão gerar novo */}
      {secondsLeft === 0 && (
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Gerar novo QR Code
        </button>
      )}
    </div>
  );
}
