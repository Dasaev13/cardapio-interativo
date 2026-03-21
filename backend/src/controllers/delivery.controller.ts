import { Request, Response, NextFunction } from 'express';
import { calculateDeliverySchema } from '../validators/delivery.validator';
import { calculateDeliveryFee } from '../services/delivery.service';
import { supabase } from '../config/supabase';

export async function calculateDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = calculateDeliverySchema.parse(req.body);
    const result = await calculateDeliveryFee(input);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getBairros(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;

    const { data: loja } = await supabase
      .from('lojas')
      .select('id')
      .eq('slug', slug)
      .eq('ativo', true)
      .single();

    if (!loja) {
      res.status(404).json({ error: { message: 'Loja não encontrada', code: 'NOT_FOUND' } });
      return;
    }

    const { data: bairros, error } = await supabase
      .from('bairros_entrega')
      .select('id, nome, cidade, taxa, tempo_min, tempo_max')
      .eq('loja_id', loja.id)
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;

    res.json({ data: bairros });
  } catch (err) {
    next(err);
  }
}
