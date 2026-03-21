import { Redis } from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Necessário para BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Erro de conexão:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Conectado');
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
