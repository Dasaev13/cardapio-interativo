import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export function useRealtimeOrderStatus(pedidoId: string | null) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId || !import.meta.env.VITE_SUPABASE_URL) return;

    const channel = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${pedidoId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus) setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId]);

  return status;
}
