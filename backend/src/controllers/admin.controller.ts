import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { printQueue } from '../config/queues';

// ---- LOJA ----
export async function getLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('id', req.lojaId!)
      .single();

    if (error || !data) throw new AppError(404, 'Loja não encontrada', 'NOT_FOUND');
    res.json({ data });
  } catch (err) { next(err); }
}

export async function updateLoja(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const allowedFields = ['nome', 'descricao', 'telefone', 'logo_url', 'banner_url', 'config', 'horarios', 'aberto', 'endereco'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) updates[field] = req.body[field];
    }

    const { data, error } = await supabase
      .from('lojas')
      .update(updates)
      .eq('id', req.lojaId!)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}

// ---- PRODUTOS ----
export async function listProdutos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { categoria_id, disponivel } = req.query;
    let query = supabase
      .from('produtos')
      .select('*, categorias(nome)')
      .eq('loja_id', req.lojaId!)
      .order('categoria_id')
      .order('ordem');

    if (categoria_id) query = query.eq('categoria_id', categoria_id as string);
    if (disponivel !== undefined) query = query.eq('disponivel', disponivel === 'true');

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}

export async function createProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, descricao, preco, preco_promocional, categoria_id, imagem_url, disponivel, destaque, ordem, opcoes } = req.body;
    if (!nome || preco === undefined) throw new AppError(400, 'Nome e preço são obrigatórios', 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('produtos')
      .insert({ loja_id: req.lojaId!, nome, descricao, preco, preco_promocional, categoria_id, imagem_url, disponivel: disponivel ?? true, destaque: destaque ?? false, ordem: ordem ?? 0, opcoes: opcoes ?? [] })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function updateProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const allowedFields = ['nome', 'descricao', 'preco', 'preco_promocional', 'categoria_id', 'imagem_url', 'disponivel', 'destaque', 'ordem', 'opcoes'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) updates[field] = req.body[field];
    }

    const { data, error } = await supabase
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .eq('loja_id', req.lojaId!)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new AppError(404, 'Produto não encontrado', 'NOT_FOUND');
    res.json({ data });
  } catch (err) { next(err); }
}

export async function deleteProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('loja_id', req.lojaId!);

    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
}

// ---- CATEGORIAS ----
export async function listCategorias(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('loja_id', req.lojaId!)
      .order('ordem');

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}

export async function createCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, descricao, imagem_url, ordem } = req.body;
    if (!nome) throw new AppError(400, 'Nome é obrigatório', 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('categorias')
      .insert({ loja_id: req.lojaId!, nome, descricao, imagem_url, ordem: ordem ?? 0 })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function updateCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { nome, descricao, imagem_url, ordem, ativo } = req.body;

    const { data, error } = await supabase
      .from('categorias')
      .update({ nome, descricao, imagem_url, ordem, ativo })
      .eq('id', id)
      .eq('loja_id', req.lojaId!)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new AppError(404, 'Categoria não encontrada', 'NOT_FOUND');
    res.json({ data });
  } catch (err) { next(err); }
}

// ---- BAIRROS DE ENTREGA ----
export async function listBairros(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('bairros_entrega')
      .select('*')
      .eq('loja_id', req.lojaId!)
      .order('nome');

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}

export async function createBairro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, cidade, taxa, tempo_min, tempo_max } = req.body;
    if (!nome || taxa === undefined) throw new AppError(400, 'Nome e taxa são obrigatórios', 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('bairros_entrega')
      .insert({ loja_id: req.lojaId!, nome, cidade: cidade ?? '', taxa, tempo_min: tempo_min ?? 30, tempo_max: tempo_max ?? 60 })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function updateBairro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { nome, cidade, taxa, tempo_min, tempo_max, ativo } = req.body;

    const { data, error } = await supabase
      .from('bairros_entrega')
      .update({ nome, cidade, taxa, tempo_min, tempo_max, ativo })
      .eq('id', id)
      .eq('loja_id', req.lojaId!)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new AppError(404, 'Bairro não encontrado', 'NOT_FOUND');
    res.json({ data });
  } catch (err) { next(err); }
}

export async function deleteBairro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('bairros_entrega')
      .delete()
      .eq('id', id)
      .eq('loja_id', req.lojaId!);

    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
}

// ---- SESSÕES WHATSAPP ----
export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('sessions_whatsapp')
      .select('*')
      .eq('loja_id', req.lojaId!)
      .order('ultimo_contato', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}

export async function takeoverSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('sessions_whatsapp')
      .update({ estado: 'human_attendant', operador_id: req.operadorId })
      .eq('id', id)
      .eq('loja_id', req.lojaId!);

    if (error) throw error;
    res.json({ message: 'Atendimento assumido com sucesso' });
  } catch (err) { next(err); }
}

export async function releaseSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('sessions_whatsapp')
      .update({ estado: 'idle', operador_id: null })
      .eq('id', id)
      .eq('loja_id', req.lojaId!);

    if (error) throw error;
    res.json({ message: 'Sessão devolvida ao bot' });
  } catch (err) { next(err); }
}

// ---- RE-IMPRIMIR PEDIDO ----
export async function reprintOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Verificar que o pedido pertence à loja
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, loja_id')
      .eq('id', id)
      .eq('loja_id', req.lojaId!)
      .single();

    if (!pedido) throw new AppError(404, 'Pedido não encontrado', 'NOT_FOUND');

    await printQueue.add('print-order', { pedido_id: id, loja_id: req.lojaId! });
    res.json({ message: 'Pedido enviado para reimpressão' });
  } catch (err) { next(err); }
}

// ---- ESTATÍSTICAS ----
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data_inicio, data_fim } = req.query;
    const hoje = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .rpc('get_dashboard_stats', {
        p_loja_id: req.lojaId!,
        p_data_inicio: (data_inicio as string) || hoje,
        p_data_fim: (data_fim as string) || hoje,
      });

    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
}
