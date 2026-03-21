import { Router } from 'express';
import { orderRateLimit } from '../middleware/rateLimiter';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { createOrder, getOrder } from '../controllers/orders.controller';

const router = Router();

router.post('/', orderRateLimit, idempotencyMiddleware, createOrder);
router.get('/:id', getOrder);

export default router;
