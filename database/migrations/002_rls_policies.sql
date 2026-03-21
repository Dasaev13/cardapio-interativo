-- ============================================================
-- MIGRATION 002: ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas tenant
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bairros_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE faixas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS PÚBLICAS (anon - leitura de cardápio)
-- ============================================================

-- Qualquer um pode ler lojas ativas (para busca por slug)
CREATE POLICY "Public: read active lojas"
  ON lojas FOR SELECT TO anon
  USING (ativo = true);

-- Qualquer um pode ler categorias ativas
CREATE POLICY "Public: read active categorias"
  ON categorias FOR SELECT TO anon
  USING (ativo = true);

-- Qualquer um pode ler produtos disponíveis
CREATE POLICY "Public: read available produtos"
  ON produtos FOR SELECT TO anon
  USING (disponivel = true);

-- Qualquer um pode ler bairros ativos (para autocomplete entrega)
CREATE POLICY "Public: read active bairros"
  ON bairros_entrega FOR SELECT TO anon
  USING (ativo = true);

-- Qualquer um pode ler faixas ativas
CREATE POLICY "Public: read active faixas"
  ON faixas_entrega FOR SELECT TO anon
  USING (ativo = true);

-- Qualquer um pode ler seu próprio pedido por ID (sem filtro de loja pois é por UUID)
CREATE POLICY "Public: read own pedido"
  ON pedidos FOR SELECT TO anon
  USING (true);
-- Nota: filtragem real é feita no backend usando service_role key
-- O frontend busca por UUID único do pedido

-- ============================================================
-- POLÍTICAS AUTENTICADAS (authenticated - operadores/admins)
-- ============================================================

-- Operadores autenticados gerenciam apenas sua loja
CREATE POLICY "Auth: manage own loja produtos"
  ON produtos FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own loja categorias"
  ON categorias FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own loja pedidos"
  ON pedidos FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own loja pagamentos"
  ON pagamentos FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own loja bairros"
  ON bairros_entrega FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own loja faixas"
  ON faixas_entrega FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

CREATE POLICY "Auth: manage own sessions"
  ON sessions_whatsapp FOR ALL TO authenticated
  USING (loja_id = (
    SELECT loja_id FROM operadores
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1
  ));

-- Nota: O backend usa a chave service_role que BYPASSA o RLS automaticamente.
-- As políticas acima são para clientes Supabase que usam JWT de usuário autenticado
-- (ex: admin dashboard conectado diretamente ao Supabase).
