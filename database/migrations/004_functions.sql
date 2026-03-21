-- ============================================================
-- MIGRATION 004: FUNÇÕES POSTGRESQL
-- ============================================================

-- ============================================================
-- get_menu: Retorna cardápio completo de uma loja (single query)
-- ============================================================
CREATE OR REPLACE FUNCTION get_menu(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_loja RECORD;
  v_result JSONB;
BEGIN
  -- Buscar loja
  SELECT * INTO v_loja FROM lojas WHERE slug = p_slug AND ativo = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'loja', jsonb_build_object(
      'id', v_loja.id,
      'slug', v_loja.slug,
      'nome', v_loja.nome,
      'descricao', v_loja.descricao,
      'telefone', v_loja.telefone,
      'logo_url', v_loja.logo_url,
      'banner_url', v_loja.banner_url,
      'config', v_loja.config,
      'horarios', v_loja.horarios,
      'aberto', v_loja.aberto,
      'endereco', v_loja.endereco
    ),
    'categorias', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'nome', c.nome,
          'descricao', c.descricao,
          'imagem_url', c.imagem_url,
          'ordem', c.ordem,
          'produtos', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', p.id,
                'nome', p.nome,
                'descricao', p.descricao,
                'preco', p.preco,
                'preco_promocional', p.preco_promocional,
                'imagem_url', p.imagem_url,
                'disponivel', p.disponivel,
                'destaque', p.destaque,
                'ordem', p.ordem,
                'opcoes', p.opcoes
              )
              ORDER BY p.ordem ASC, p.nome ASC
            )
            FROM produtos p
            WHERE p.categoria_id = c.id
              AND p.loja_id = v_loja.id
              AND p.disponivel = true
          ), '[]'::JSONB)
        )
        ORDER BY c.ordem ASC, c.nome ASC
      )
      FROM categorias c
      WHERE c.loja_id = v_loja.id
        AND c.ativo = true
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- calcular_taxa_entrega: Busca taxa por bairro (priority)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_taxa_entrega_bairro(
  p_loja_id UUID,
  p_bairro TEXT
)
RETURNS TABLE(
  bairro_id UUID,
  taxa NUMERIC,
  tempo_min INTEGER,
  tempo_max INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS bairro_id,
    b.taxa,
    b.tempo_min,
    b.tempo_max
  FROM bairros_entrega b
  WHERE b.loja_id = p_loja_id
    AND b.ativo = true
    AND LOWER(TRIM(b.nome)) = LOWER(TRIM(p_bairro))
  ORDER BY b.taxa ASC
  LIMIT 1;
END;
$$;

-- ============================================================
-- calcular_taxa_entrega_distancia: Busca taxa por faixa km
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_taxa_entrega_distancia(
  p_loja_id UUID,
  p_distancia_km NUMERIC
)
RETURNS TABLE(
  faixa_id UUID,
  taxa NUMERIC,
  tempo_min INTEGER,
  tempo_max INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS faixa_id,
    f.taxa,
    f.tempo_min,
    f.tempo_max
  FROM faixas_entrega f
  WHERE f.loja_id = p_loja_id
    AND f.ativo = true
    AND p_distancia_km >= f.distancia_min
    AND p_distancia_km <= f.distancia_max
  ORDER BY f.distancia_min ASC
  LIMIT 1;
END;
$$;

-- ============================================================
-- get_pedido_completo: Retorna pedido com itens e pagamento
-- ============================================================
CREATE OR REPLACE FUNCTION get_pedido_completo(p_pedido_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pedido', to_jsonb(p.*),
    'itens', COALESCE((
      SELECT jsonb_agg(to_jsonb(pi.*) ORDER BY pi.created_at)
      FROM pedido_itens pi WHERE pi.pedido_id = p.id
    ), '[]'::JSONB),
    'pagamento', (
      SELECT to_jsonb(pg.*)
      FROM pagamentos pg
      WHERE pg.pedido_id = p.id
      ORDER BY pg.created_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM pedidos p
  WHERE p.id = p_pedido_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- haversine_distance: Calcula distância em km entre dois pontos
-- ============================================================
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2)^2;
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  RETURN R * c;
END;
$$;

-- ============================================================
-- get_dashboard_stats: Estatísticas do painel admin
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_loja_id UUID,
  p_data_inicio DATE DEFAULT CURRENT_DATE,
  p_data_fim DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_pedidos', COUNT(*),
    'pedidos_confirmados', COUNT(*) FILTER (WHERE status NOT IN ('cancelado', 'recusado', 'pendente')),
    'pedidos_cancelados', COUNT(*) FILTER (WHERE status IN ('cancelado', 'recusado')),
    'receita_total', COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelado', 'recusado', 'pendente')), 0),
    'ticket_medio', COALESCE(AVG(total) FILTER (WHERE status NOT IN ('cancelado', 'recusado', 'pendente')), 0),
    'pedidos_delivery', COUNT(*) FILTER (WHERE tipo_entrega = 'delivery'),
    'pedidos_retirada', COUNT(*) FILTER (WHERE tipo_entrega = 'retirada')
  ) INTO v_result
  FROM pedidos
  WHERE loja_id = p_loja_id
    AND DATE(created_at) BETWEEN p_data_inicio AND p_data_fim;

  RETURN v_result;
END;
$$;
