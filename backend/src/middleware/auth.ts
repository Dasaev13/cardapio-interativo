import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from './errorHandler';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Token de autenticação ausente', 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);

    // Verificar JWT com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError(401, 'Token inválido ou expirado', 'INVALID_TOKEN');
    }

    // Buscar loja_id do operador
    const { data: operador, error: opError } = await supabase
      .from('operadores')
      .select('id, loja_id, role')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .single();

    if (opError || !operador) {
      throw new AppError(403, 'Operador não encontrado ou inativo', 'FORBIDDEN');
    }

    req.lojaId = operador.loja_id;
    req.operadorId = operador.id;
    req.operadorRole = operador.role;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.operadorRole || !roles.includes(req.operadorRole)) {
      next(new AppError(403, 'Permissão insuficiente', 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const { env } = require('../config/env');
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== env.INTERNAL_API_KEY) {
    next(new AppError(401, 'Chave interna inválida', 'UNAUTHORIZED'));
    return;
  }
  next();
}
