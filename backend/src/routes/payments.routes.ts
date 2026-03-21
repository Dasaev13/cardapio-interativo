import { Router } from 'express';
import { orderRateLimit } from '../middleware/rateLimiter';
import { idempotencyMiddleware } from '../middleware/idempotency';
import {
  createPixPayment,
  createCardPayment,
  createCashPayment,
  getPaymentStatus,
} from '../controllers/payments.controller';

const router = Router();

router.post('/pix', orderRateLimit, idempotencyMiddleware, createPixPayment);
router.post('/card', orderRateLimit, idempotencyMiddleware, createCardPayment);
router.post('/cash', orderRateLimit, idempotencyMiddleware, createCashPayment);
router.get('/:id/status', getPaymentStatus);

export default router;
