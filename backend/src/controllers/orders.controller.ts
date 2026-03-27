import { Request, Response, NextFunction } from 'express';
import { createPedidoSchema } from '../validators/order.validator';
import { createPedido, getPedidoById, updatePedidoStatus } from '../services/order.service';
import { generatePixForMesa } from '../services/payment/pix.service';
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
      .select('id, numero, status, total, tipo_entrega, nome_cliente, telefone_cliente, forma_pagamento, mesa, impresso, created_at', { count: 'exact' })
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) {
      const statuses = Array.isArray(status) ? status as string[] : [status as string];
      query = statuses.length === 1 ? query.eq('status', statuses[0]) : query.in('status', statuses);
    }
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

export async function listMesas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lojaId = req.lojaId!;

    const { data: orders, error } = await supabase
      .from('pedidos')
      .select('id, numero, status, total, nome_cliente, telefone_cliente, created_at, mesa, pedido_itens(nome_produto, quantidade, preco_unitario)')
      .eq('loja_id', lojaId)
      .not('mesa', 'is', null)
      .not('status', 'in', '(cancelado,entregue)')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar por mesa
    const mesasMap: Record<string, { mesa: string; pedidos: any[]; total: number; aberta_desde: string }> = {};
    for (const order of orders || []) {
      if (!mesasMap[order.mesa]) {
        mesasMap[order.mesa] = { mesa: order.mesa, pedidos: [], total: 0, aberta_desde: order.created_at };
      }
      mesasMap[order.mesa].pedidos.push(order);
      mesasMap[order.mesa].total += Number(order.total);
    }

    const mesas = Object.values(mesasMap).sort((a, b) => Number(a.mesa) - Number(b.mesa));
    res.json({ data: mesas });
  } catch (err) {
    next(err);
  }
}

export async function checkoutMesa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lojaId = req.lojaId!;
    const { mesa } = req.params;
    const { forma_pagamento } = req.body;

    if (!['dinheiro', 'cartao', 'pix'].includes(forma_pagamento)) {
      throw new AppError(400, 'Forma de pagamento inválida', 'INVALID_PAYMENT');
    }

    // Buscar pedidos abertos da mesa
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('id, total')
      .eq('loja_id', lojaId)
      .eq('mesa', mesa)
      .not('status', 'in', '(cancelado,entregue)');

    if (error) throw error;
    if (!pedidos || pedidos.length === 0) {
      throw new AppError(404, 'Nenhum pedido aberto para esta mesa', 'MESA_SEM_PEDIDOS');
    }

    const total = pedidos.reduce((sum, p) => sum + Number(p.total), 0);

    if (forma_pagamento === 'pix') {
      // Gerar Pix para o total consolidado da mesa
      const result = await generatePixForMesa(lojaId, mesa, total, pedidos[0].id);
      res.json({ data: { ...result, forma_pagamento: 'pix', aguardando_pix: true } });
      return;
    }

    // Dinheiro ou Cartão: fechar imediatamente
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ status: 'entregue', forma_pagamento })
      .eq('loja_id', lojaId)
      .eq('mesa', mesa)
      .not('status', 'in', '(cancelado,entregue)');

    if (updateError) throw updateError;
    res.json({ data: { success: true, total, forma_pagamento } });
  } catch (err) {
    next(err);
  }
}

export async function fecharMesa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lojaId = req.lojaId!;
    const { mesa } = req.params;

    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'entregue', forma_pagamento: 'pix' })
      .eq('loja_id', lojaId)
      .eq('mesa', mesa)
      .not('status', 'in', '(cancelado,entregue)');

    if (error) throw error;
    res.json({ success: true });
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
