import rateLimit from 'express-rate-limit';

export const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: { message: 'Muitas requisições. Tente novamente em 1 minuto.', code: 'RATE_LIMIT' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: { message: 'Limite de pedidos atingido. Aguarde 1 minuto.', code: 'RATE_LIMIT' } },
  keyGenerator: (req) => req.body?.loja_id || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: { message: 'Rate limit webhook', code: 'RATE_LIMIT' } },
  standardHeaders: true,
  legacyHeaders: false,
});
