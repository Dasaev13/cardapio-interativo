import { useState, useEffect, useRef, useCallback } from 'react';
import { getPaymentStatus } from '../api/payments';
import type { PaymentStatus } from '../types/payment';

export function usePaymentPolling(pagamentoId: string | null, intervalMs = 3000) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (!pagamentoId) return;
    try {
      const result = await getPaymentStatus(pagamentoId);
      setStatus(result);

      // Parar polling quando chegar a status final
      if (['aprovado', 'recusado', 'expirado', 'cancelado', 'reembolsado'].includes(result.status)) {
        stopPolling();
      }
    } catch (err) {
      console.error('[PaymentPolling] Erro:', err);
    }
  }, [pagamentoId, stopPolling]);

  useEffect(() => {
    if (!pagamentoId) return;

    setIsPolling(true);
    poll(); // Poll imediatamente

    intervalRef.current = setInterval(poll, intervalMs);

    return () => stopPolling();
  }, [pagamentoId, intervalMs, poll, stopPolling]);

  return { status, isPolling, stopPolling };
}
