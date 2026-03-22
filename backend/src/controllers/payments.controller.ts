import { Request, Response, NextFunction } from 'express';
import { pixPaymentSchema, cardPaymentSchema, cashPaymentSchema } from '../validators/payment.validator';
import { generatePixPayment } from '../services/payment/pix.service';
import { processCardPayment } from '../services/payment/card.service';
import { processCashPayment } from '../services/payment/cash.service';
import { supabase } from '../config/supabase';

export async function createPixPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = pixPaymentSchema.parse(req.body);
    const result = await generatePixPayment(input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createCardPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = cardPaymentSchema.parse(req.body);
    const result = await processCardPayment(input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createCashPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = cashPaymentSchema.parse(req.body);
    const result = await processCashPayment(input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('pagamentos')
      .select('id, metodo, status, valor, pix_qrcode, pix_copia_cola, pix_expira_em, card_last_four, card_brand, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: { message: 'Pagamento não encontrado', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
}
