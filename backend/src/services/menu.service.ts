import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export interface MenuData {
  loja: {
    id: string;
    slug: string;
    nome: string;
    descricao?: string;
    telefone?: string;
    logo_url?: string;
    banner_url?: string;
    config: Record<string, any>;
    horarios: any[];
    aberto: boolean;
    endereco: Record<string, any>;
  };
  categorias: Array<{
    id: string;
    nome: string;
    descricao?: string;
    imagem_url?: string;
    ordem: number;
    produtos: Array<{
      id: string;
      nome: string;
      descricao?: string;
      preco: number;
      preco_promocional?: number;
      imagem_url?: string;
      disponivel: boolean;
      destaque: boolean;
      ordem: number;
      opcoes: any[];
    }>;
  }>;
}

export async function getMenuBySlug(slug: string): Promise<MenuData> {
  const { data, error } = await supabase
    .rpc('get_menu', { p_slug: slug });

  if (error) {
    throw new AppError(500, 'Erro ao buscar cardápio', 'MENU_ERROR');
  }

  if (!data) {
    throw new AppError(404, 'Cardápio não encontrado', 'MENU_NOT_FOUND');
  }

  return data as MenuData;
}

export async function getLojaBySlug(slug: string) {
  const { data, error } = await supabase
    .from('lojas')
    .select('id, slug, nome, telefone, config, endereco, aberto, ativo, whatsapp_instance')
    .eq('slug', slug)
    .eq('ativo', true)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Loja não encontrada', 'LOJA_NOT_FOUND');
  }

  return data;
}
