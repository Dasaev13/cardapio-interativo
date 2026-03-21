import { Request, Response, NextFunction } from 'express';
import { createPedidoSchema } from '../validators/order.validator';
import { createPedido, getPedidoById, updatePedidoStatus } from '../services/order.service';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createPedidoSchema.parse(req.body);
    const pedido = await createPedido(input);
    res.status(201).json({ data: pedido });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const pedido = await getPedidoById(id);
    res.json({ data: pedido });
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lojaId = req.lojaId!;
    const { status, page = '1', limit = '20', data_inicio, data_fim } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('pedidos')
      .select('id, numero, status, total, tipo_entrega, nome_cliente, telefone_cliente, forma_pagamento, impresso, created_at', { count: 'exact' })
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) query = query.eq('status', status as string);
    if (data_inicio) query = query.gte('created_at', `${data_inicio}T00:00:00`);
    if (data_fim) query = query.lte('created_at', `${data_fim}T23:59:59`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data,
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lojaId = req.lojaId!;

    if (!status) {
      throw new AppError(400, 'Status é obrigatório', 'MISSING_STATUS');
    }

    await updatePedidoStatus(id, lojaId, status);
    res.json({ message: 'Status atualizado com sucesso' });
  } catch (err) {
    next(err);
  }
}
