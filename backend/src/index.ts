import './config/env'; // Validar env vars primeiro
import { createApp } from './app';
import { env } from './config/env';
import { startPixTimeoutWorker } from './workers/pixTimeout.worker';
import { startPrintWorker } from './workers/print.worker';

async function main() {
  const app = createApp();

  // Iniciar workers BullMQ
  const pixWorker = startPixTimeoutWorker();
  const printWorker = startPrintWorker();

  // Iniciar servidor HTTP
  const server = app.listen(env.PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   Cardápio Interativo API             ║
║   http://localhost:${env.PORT}              ║
║   Ambiente: ${env.NODE_ENV.padEnd(26)}║
╚═══════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Recebido ${signal}. Encerrando graciosamente...`);

    await pixWorker.close();
    await printWorker.close();

    server.close(() => {
      console.log('[Server] HTTP server encerrado');
      process.exit(0);
    });

    // Force exit após 10s
    setTimeout(() => {
      console.error('[Server] Forçando encerramento após timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] unhandledRejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Server] uncaughtException:', err);
    process.exit(1);
  });
}

main().catch(err => {
  console.error('[Server] Erro fatal ao iniciar:', err);
  process.exit(1);
});
