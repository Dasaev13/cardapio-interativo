import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';

const LOCK_TTL_SECONDS = 30;
const CACHE_TTL_SECONDS = 86400; // 24h

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotency_key;

  if (!idempotencyKey) {
    next();
    return;
  }

  const redis = getRedisClient();
  const lockKey = `idempotency:lock:${idempotencyKey}`;
  const cacheKey = `idempotency:response:${idempotencyKey}`;

  // Verificar se já existe resposta cacheada (timeout 3s para não travar sem Redis)
  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  withTimeout(redis.get(cacheKey), 3000).then(async (cached) => {
    if (cached) {
      const { status, body } = JSON.parse(cached);
      res.status(status).json(body);
      return;
    }

    // Tentar adquirir lock para evitar race condition
    const locked = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!locked) {
      // Outra request com mesma chave está em andamento
      res.status(409).json({
        error: {
          message: 'Requisição duplicada em andamento. Aguarde e tente novamente.',
          code: 'DUPLICATE_REQUEST',
        },
      });
      return;
    }

    // Interceptar resposta para cachear
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode < 500) {
        redis.setex(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify({ status: res.statusCode, body })
        ).catch(() => {});
        redis.del(lockKey).catch(() => {});
      } else {
        redis.del(lockKey).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  }).catch(() => {
    // Se Redis falhar, prosseguir sem idempotência (degraded mode)
    next();
  });
}
