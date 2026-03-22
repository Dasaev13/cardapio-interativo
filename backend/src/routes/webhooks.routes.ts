import { Router } from 'express';
import { webhookRateLimit } from '../middleware/rateLimiter';
import { verifyMercadoPagoSignature } from '../middleware/webhookSignature';
import {
  handleMercadoPagoWebhookController,
  handleWhatsAppWebhookController,
  handleN8nWebhook,
} from '../controllers/webhooks.controller';

const router = Router();

// Pix e Cartão usam o mesmo webhook do Mercado Pago
router.post(
  '/mercadopago',
  webhookRateLimit,
  verifyMercadoPagoSignature,
  handleMercadoPagoWebhookController
);

router.post('/whatsapp', webhookRateLimit, handleWhatsAppWebhookController);

router.post('/n8n', webhookRateLimit, handleN8nWebhook);

export default router;
