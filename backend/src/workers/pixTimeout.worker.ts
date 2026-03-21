import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import { supabase } from '../config/supabase';
import { sendN8nEvent } from '../services/whatsapp.service';

interface PixTimeoutJobData {
  pagamento_id: string;
  pedido_id: string;
  loja_id: string;
  telefone: string;
}

export function startPixTimeoutWorker(): Worker {
  const worker = new Worker<PixTimeoutJobData>(
    'pix-timeout',
    async (job: Job<PixTimeoutJobData>) => {
      const { pagamento_id, pedido_id, loja_id, telefone } = job.data;

      console.log(`[PixTimeout] Processando expiração: pagamento ${pagamento_id}`);

      // Verificar se ainda está pendente
      const { data: pagamento } = await supabase
        .from('pagamentos')
        .select('id, status')
        .eq('id', pagamento_id)
        .single();

      if (!pagamento || pagamento.status !== 'pendente') {
        console.log(`[PixTimeout] Pagamento ${pagamento_id} já processado (status: ${pagamento?.status}). Ignorando.`);
        return;
      }

      // Expirar pagamento
      const { error } = await supabase
        .from('pagamentos')
        .update({ status: 'expirado' })
        .eq('id', pagamento_id)
        .eq('status', 'pendente'); // double-check para evitar race condition

      if (error) {
        console.error(`[PixTimeout] Erro ao expirar pagamento ${pagamento_id}:`, error);
        throw error;
      }

      // O trigger sync_pedido_status_on_payment cuida de cancelar o pedido

      // Notificar cliente via n8n
      await sendN8nEvent('pix_expired', {
        pedido_id,
        pagamento_id,
        loja_id,
        telefone,
      });

      console.log(`[PixTimeout] Pagamento ${pagamento_id} expirado com sucesso`);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[PixTimeout] Job ${job.id} concluído`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[PixTimeout] Job ${job?.id} falhou:`, err.message);
  });

  return worker;
}
