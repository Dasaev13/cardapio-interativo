import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from './errorHandler';

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

// Verificar assinatura HMAC do Gerencianet
export function verifyGerencianetSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = env.GERENCIANET_WEBHOOK_SECRET;
  if (!secret) {
    next();
    return;
  }

  const signature = req.headers['x-gerencianet-hmac'] as string;
  if (!signature || !req.rawBody) {
    next(new AppError(401, 'Assinatura webhook ausente', 'INVALID_SIGNATURE'));
    return;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    next(new AppError(401, 'Assinatura webhook inválida', 'INVALID_SIGNATURE'));
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
