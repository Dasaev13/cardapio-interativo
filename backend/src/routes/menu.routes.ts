import { Router } from 'express';
import { publicRateLimit } from '../middleware/rateLimiter';
import { getMenu } from '../controllers/menu.controller';

const router = Router();

router.get('/:slug', publicRateLimit, getMenu);

export default router;
