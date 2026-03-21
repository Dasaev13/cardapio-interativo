import { Redis } from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

// Retorna opções de conexão (objeto puro) para uso no BullMQ.
// BullMQ usa seu próprio ioredis internamente; passar uma instância Redis
// causa incompatibilidade de tipos entre as duas cópias da biblioteca.
export function getRedisConnectionOptions() {
  const parsed = new URL(env.REDIS_URL);
  return {
    host: parsed.hostname || '127.0.0.1',
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

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
