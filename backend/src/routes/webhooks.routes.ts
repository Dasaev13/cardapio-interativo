import { Router } from 'express';
import { webhookRateLimit } from '../middleware/rateLimiter';
import {
  captureRawBody,
  verifyGerencianetSignature,
  verifyMercadoPagoSignature,
} from '../middleware/webhookSignature';
import {
  handlePixWebhookController,
  handleMercadoPagoWebhookController,
  handleWhatsAppWebhookController,
  handleN8nWebhook,
} from '../controllers/webhooks.controller';

const router = Router();

router.post(
  '/pix',
  webhookRateLimit,
  captureRawBody,
  verifyGerencianetSignature,
  handlePixWebhookController
);

router.post(
  '/mercadopago',
  webhookRateLimit,
  captureRawBody,
  verifyMercadoPagoSignature,
  handleMercadoPagoWebhookController
);

router.post('/whatsapp', webhookRateLimit, handleWhatsAppWebhookController);

router.post('/n8n', webhookRateLimit, handleN8nWebhook);

export default router;
