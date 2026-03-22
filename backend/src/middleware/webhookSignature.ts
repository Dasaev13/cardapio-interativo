import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from './errorHandler';

// crypto still used by verifyMercadoPagoSignature below

// Capturar rawBody para verificação de assinatura
export function captureRawBody(req: Request, res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    try {
      req.body = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      req.body = {};
    }
    next();
  });
}

// Verificar token de webhook do Asaas
export function verifyAsaasWebhook(req: Request, res: Response, next: NextFunction): void {
  const token = env.ASAAS_WEBHOOK_TOKEN;
  if (!token) {
    next();
    return;
  }

  const receivedToken = req.headers['asaas-access-token'] as string;
  if (!receivedToken) {
    next(new AppError(401, 'Token webhook Asaas ausente', 'INVALID_SIGNATURE'));
    return;
  }

  if (receivedToken !== token) {
    next(new AppError(401, 'Token webhook Asaas inválido', 'INVALID_SIGNATURE'));
    return;
  }

  next();
}

// Verificar assinatura do Mercado Pago
export function verifyMercadoPagoSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    next();
    return;
  }

  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;
  const dataId = req.query['data.id'] as string;

  if (!xSignature) {
    next(new AppError(401, 'Assinatura MP ausente', 'INVALID_SIGNATURE'));
    return;
  }

  // Extrair ts e v1 do header x-signature
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach(part => {
    const [key, val] = part.trim().split('=');
    parts[key] = val;
  });

  const { ts, v1 } = parts;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(v1 || ''), Buffer.from(expectedSig))) {
    next(new AppError(401, 'Assinatura MP inválida', 'INVALID_SIGNATURE'));
    return;
  }

  next();
}
