export interface Loja {
  id: string;
  slug: string;
  nome: string;
  descricao?: string;
  telefone?: string;
  logo_url?: string;
  banner_url?: string;
  aberto: boolean;
  config: {
    cor_primaria: string;
    cor_secundaria: string;
    taxa_servico_pct: number;
    tempo_preparo_min: number;
    pedido_minimo: number;
    aceitar_retirada: boolean;
    aceitar_entrega: boolean;
    validar_pagamento: boolean;
  };
  horarios: Horario[];
  endereco: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    lat?: number;
    lng?: number;
  };
}

export interface Horario {
  dia_semana: number; // 0=dom, 6=sáb
  abre: string;       // "HH:mm"
  fecha: string;
  ativo: boolean;
}

export interface OpcaoItem {
  id: string;
  nome: string;
  preco_adicional: number;
}

export interface GrupoOpcoes {
  id: string;
  nome: string;
  obrigatorio: boolean;
  multiplo: boolean;
  min: number;
  max: number;
  itens: OpcaoItem[];
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  preco_promocional?: number;
  imagem_url?: string;
  disponivel: boolean;
  destaque: boolean;
  ordem: number;
  opcoes: GrupoOpcoes[];
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  ordem: number;
  produtos: Produto[];
}

export interface MenuData {
  loja: Loja;
  categorias: Categoria[];
}
