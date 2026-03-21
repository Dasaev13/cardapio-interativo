import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import { sendPrintJob } from '../services/print.service';

interface PrintJobData {
  pedido_id: string;
  loja_id: string;
}

export function startPrintWorker(): Worker {
  const worker = new Worker<PrintJobData>(
    'print-jobs',
    async (job: Job<PrintJobData>) => {
      console.log(`[PrintWorker] Imprimindo pedido ${job.data.pedido_id}`);
      await sendPrintJob(job.data);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[PrintWorker] Job ${job.id} concluído`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[PrintWorker] Job ${job?.id} falhou (tentativa ${job?.attemptsMade}):`, err.message);
  });

  return worker;
}
