import { env } from '../config/env';
import { supabase } from '../config/supabase';

export interface PrintJobData {
  pedido_id: string;
  loja_id: string;
}

export async function sendPrintJob(data: PrintJobData): Promise<void> {
  // Buscar dados completos do pedido
  const { data: pedidoData } = await supabase
    .rpc('get_pedido_completo', { p_pedido_id: data.pedido_id });

  if (!pedidoData) {
    console.error(`[Print] Pedido ${data.pedido_id} não encontrado`);
    return;
  }

  // Enviar para print-service
  const response = await fetch(`${env.PRINT_SERVICE_URL}/print/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.PRINT_SERVICE_API_KEY,
    },
    body: JSON.stringify(pedidoData),
  });

  if (response.ok) {
    // Marcar como impresso
    await supabase
      .from('pedidos')
      .update({ impresso: true })
      .eq('id', data.pedido_id);

    console.log(`[Print] Pedido ${data.pedido_id} enviado para impressão`);
  } else {
    const text = await response.text();
    console.error(`[Print] Erro ao imprimir pedido ${data.pedido_id}: ${text}`);
    throw new Error(`Print service error: ${response.status}`);
  }
}
