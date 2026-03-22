import { useEffect, useRef, useState } from 'react';
import { createCardPayment } from '../../api/payments';
import { generateUUID } from '../../utils/format';
import { Loader2 } from 'lucide-react';

interface Props {
  pedidoId: string;
  total: number;
  onSuccess: (pagamentoId: string) => void;
  onError: (msg: string) => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function CardPayment({ pedidoId, total, onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const brickRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey) {
      onError('Pagamento com cartão não configurado.');
      return;
    }

    // Carregar SDK do MP via script
    const existingScript = document.getElementById('mp-sdk');
    const initBrick = () => {
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      bricksBuilder.create('cardPayment', 'card-payment-brick', {
        initialization: {
          amount: Number(total),
        },
        customization: {
          paymentMethods: { minInstallments: 1, maxInstallments: 1 },
          visual: { style: { theme: 'default' } },
        },
        callbacks: {
          onReady: () => setLoading(false),
          onError: (err: any) => onError(err?.message || 'Erro no cartão'),
          onSubmit: async (formData: any) => {
            setSubmitting(true);
            try {
              const result = await createCardPayment({
                pedido_id: pedidoId,
                token: formData.token,
                installments: formData.installments,
                payment_method_id: formData.payment_method_id,
                email: formData.payer?.email,
                cpf: formData.payer?.identification?.number,
                idempotency_key: generateUUID(),
              });
              onSuccess(result.pagamento_id);
            } catch (err: any) {
              const msg = err?.response?.data?.error?.message || err?.message || 'Erro ao processar cartão';
              onError(msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      }).then((brick: any) => {
        brickRef.current = brick;
      });
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'mp-sdk';
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = initBrick;
      document.head.appendChild(script);
    } else if (window.MercadoPago) {
      initBrick();
    } else {
      existingScript.addEventListener('load', initBrick);
    }

    return () => {
      brickRef.current?.unmount?.();
    };
  }, [pedidoId, total]);

  return (
    <div>
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}
      <div id="card-payment-brick" ref={containerRef} />
      {submitting && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Processando pagamento...
        </div>
      )}
    </div>
  );
}
