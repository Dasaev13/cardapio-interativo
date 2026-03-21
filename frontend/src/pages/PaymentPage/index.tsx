import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { createPixPayment } from '../../api/payments';
import { generateUUID } from '../../utils/format';
import { usePaymentPolling } from '../../hooks/usePayment';
import PixDisplay from './PixDisplay';
import toast from 'react-hot-toast';
import type { PixPayment } from '../../types/payment';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentPage() {
  const { slug = '', pedidoId = '' } = useParams<{ slug: string; pedidoId: string }>();
  const navigate = useNavigate();
  const { formaPagamento, pedidoId: storedPedidoId, pagamentoId, setPagamentoId, resetOrder } = useOrderStore();
  const [pixData, setPixData] = useState<PixPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status } = usePaymentPolling(pagamentoId, 3000);

  // Detectar pagamento aprovado
  useEffect(() => {
    if (status?.status === 'aprovado') {
      toast.success('🎉 Pagamento confirmado!');
      resetOrder();
      setTimeout(() => navigate(`/pedido/${pedidoId}`), 1500);
    }
    if (status?.status === 'expirado') {
      toast.error('Pix expirado. Tente novamente.');
      setPixData(null);
      setPagamentoId('');
    }
  }, [status?.status, pedidoId, navigate, resetOrder, setPagamentoId]);

  // Gerar Pix automaticamente ao entrar na página
  useEffect(() => {
    if (formaPagamento === 'pix' && pedidoId && !pixData && !pagamentoId) {
      generatePix();
    }
  }, [pedidoId, formaPagamento]);

  async function generatePix() {
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = generateUUID();
      const result = await createPixPayment({
        pedido_id: pedidoId,
        idempotency_key: idempotencyKey,
      });
      setPixData(result);
      setPagamentoId(result.pagamento_id);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar Pix');
      toast.error('Erro ao gerar QR Code Pix');
    } finally {
      setLoading(false);
    }
  }

  // Pagamento em dinheiro - ir direto para status
  useEffect(() => {
    if (formaPagamento === 'dinheiro') {
      navigate(`/pedido/${pedidoId}`);
    }
  }, [formaPagamento, pedidoId, navigate]);

  if (status?.status === 'aprovado') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center animate-bounce-in">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Pagamento Confirmado!</h1>
          <p className="text-gray-500 mt-2">Redirecionando para seu pedido...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-red-500 mx-auto mb-3" />
          <p className="text-gray-500">Gerando QR Code Pix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6">Pagamento</h1>

        {formaPagamento === 'pix' && (
          <>
            {pixData ? (
              <PixDisplay
                pixData={pixData}
                onExpire={() => {
                  setPixData(null);
                  setPagamentoId('');
                }}
                onRefresh={generatePix}
              />
            ) : error ? (
              <div className="bg-red-50 rounded-2xl p-6 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={generatePix} className="btn-primary">
                  Tentar novamente
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
