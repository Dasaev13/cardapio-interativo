import { Router } from 'express';
import { publicRateLimit } from '../middleware/rateLimiter';
import { calculateDelivery, getBairros } from '../controllers/delivery.controller';

const router = Router();

router.post('/calculate', publicRateLimit, calculateDelivery);
router.get('/bairros/:slug', publicRateLimit, getBairros);

export default router;
