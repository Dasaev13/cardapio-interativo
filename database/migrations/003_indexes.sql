-- ============================================================
-- MIGRATION 003: ÍNDICES DE PERFORMANCE
-- ============================================================

-- Lojas
CREATE INDEX idx_lojas_slug ON lojas(slug);
CREATE INDEX idx_lojas_ativo ON lojas(ativo) WHERE ativo = true;

-- Categorias
CREATE INDEX idx_categorias_loja_ordem ON categorias(loja_id, ordem);
CREATE INDEX idx_categorias_loja_ativo ON categorias(loja_id, ativo);

-- Produtos
CREATE INDEX idx_produtos_loja_id ON produtos(loja_id);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_loja_disponivel ON produtos(loja_id, disponivel) WHERE disponivel = true;
CREATE INDEX idx_produtos_loja_destaque ON produtos(loja_id, destaque) WHERE destaque = true;
CREATE INDEX idx_produtos_loja_ordem ON produtos(loja_id, ordem);

-- Busca full-text em português para produtos
CREATE INDEX idx_produtos_search ON produtos USING GIN(
  to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, ''))
);

-- Bairros e Faixas de entrega
CREATE INDEX idx_bairros_loja_ativo ON bairros_entrega(loja_id, ativo);
CREATE INDEX idx_bairros_loja_nome_lower ON bairros_entrega(loja_id, LOWER(nome));
CREATE INDEX idx_faixas_loja_ativo ON faixas_entrega(loja_id, ativo);

-- Sessions WhatsApp
CREATE INDEX idx_sessions_loja_telefone ON sessions_whatsapp(loja_id, telefone);
CREATE INDEX idx_sessions_estado ON sessions_whatsapp(loja_id, estado);
CREATE INDEX idx_sessions_ultimo_contato ON sessions_whatsapp(ultimo_contato);

-- Pedidos (hot path - consultas frequentes)
CREATE INDEX idx_pedidos_loja_status ON pedidos(loja_id, status, created_at DESC);
CREATE INDEX idx_pedidos_loja_created ON pedidos(loja_id, created_at DESC);
CREATE INDEX idx_pedidos_telefone ON pedidos(loja_id, telefone_cliente);
CREATE INDEX idx_pedidos_idempotency ON pedidos(idempotency_key);
CREATE INDEX idx_pedidos_numero ON pedidos(loja_id, numero);
CREATE INDEX idx_pedidos_impresso ON pedidos(loja_id, impresso) WHERE impresso = false;

-- Pedido Itens
CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_loja ON pedido_itens(loja_id);

-- Pagamentos
CREATE INDEX idx_pagamentos_pedido ON pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_gateway_id ON pagamentos(gateway_id) WHERE gateway_id IS NOT NULL;
CREATE INDEX idx_pagamentos_status ON pagamentos(loja_id, status);
CREATE INDEX idx_pagamentos_pix_expira ON pagamentos(pix_expira_em) WHERE status = 'pendente' AND metodo = 'pix';
CREATE INDEX idx_pagamentos_idempotency ON pagamentos(idempotency_key);
