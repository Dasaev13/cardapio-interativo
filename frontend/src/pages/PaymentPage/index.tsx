import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../store/orderStore';
import { createPixPayment } from '../../api/payments';
import { getOrder } from '../../api/orders';
import { generateUUID } from '../../utils/format';
import { usePaymentPolling } from '../../hooks/usePayment';
import PixDisplay from './PixDisplay';
import CardPayment from './CardPayment';
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
  const [orderTotal, setOrderTotal] = useState(0);

  const { status } = usePaymentPolling(pagamentoId, 2000);
  const [cardError, setCardError] = useState<string | null>(null);

  // Buscar total do pedido para o Brick do cartão
  useEffect(() => {
    if (pedidoId && formaPagamento === 'cartao') {
      getOrder(pedidoId).then(data => setOrderTotal(Number(data?.pedido?.total || 0))).catch(() => {});
    }
  }, [pedidoId, formaPagamento]);

  // Quando polling retorna QR code, atualizar pixData
  useEffect(() => {
    if (status?.pix_qrcode && status.pix_copia_cola && pixData && !pixData.pix_qrcode) {
      setPixData(prev => prev ? {
        ...prev,
        pix_qrcode: status.pix_qrcode!,
        pix_copia_cola: status.pix_copia_cola!,
      } : prev);
    }
  }, [status?.pix_qrcode]);

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
    if (status?.status === 'erro') {
      toast.error('Erro ao gerar Pix. Tente novamente.');
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
          <p className="text-gray-500">Criando pagamento...</p>
        </div>
      </div>
    );
  }

  // QR Code ainda sendo gerado (polling ativo)
  const qrCodeGerandoState = pixData && !pixData.pix_qrcode && !status?.pix_qrcode;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6">Pagamento</h1>

        {formaPagamento === 'pix' && (
          <>
            {qrCodeGerandoState ? (
              <div className="bg-white rounded-2xl p-8 shadow-card text-center">
                <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Gerando QR Code Pix...</p>
                <p className="text-gray-400 text-sm mt-1">Aguarde alguns segundos</p>
              </div>
            ) : pixData?.pix_qrcode || status?.pix_qrcode ? (
              <PixDisplay
                pixData={{
                  ...pixData!,
                  pix_qrcode: (pixData?.pix_qrcode || status?.pix_qrcode)!,
                  pix_copia_cola: (pixData?.pix_copia_cola || status?.pix_copia_cola)!,
                }}
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

        {formaPagamento === 'cartao' && (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            {cardError && (
              <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">
                {cardError}
              </div>
            )}
            <CardPayment
              pedidoId={pedidoId}
              total={orderTotal}
              onSuccess={(pagamentoId) => {
                setPagamentoId(pagamentoId);
                toast.success('Cartão aprovado! Aguardando confirmação...');
              }}
              onError={(msg) => {
                setCardError(msg);
                toast.error(msg);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
