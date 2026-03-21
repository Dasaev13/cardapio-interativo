-- ============================================================
-- MIGRATION 001: SCHEMA INICIAL
-- Cardápio Interativo - SaaS Multi-Tenant
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- LOJAS (Tenants do SaaS)
-- ============================================================
CREATE TABLE lojas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT UNIQUE NOT NULL,
  nome                  TEXT NOT NULL,
  telefone              TEXT,
  whatsapp_instance     TEXT,
  logo_url              TEXT,
  banner_url            TEXT,
  descricao             TEXT,
  endereco              JSONB DEFAULT '{}'::JSONB,
  -- {rua, numero, bairro, cidade, estado, cep, lat, lng}
  config                JSONB DEFAULT '{
    "cor_primaria": "#EF4444",
    "cor_secundaria": "#991B1B",
    "taxa_servico_pct": 0,
    "tempo_preparo_min": 20,
    "pedido_minimo": 0,
    "aceitar_retirada": true,
    "aceitar_entrega": true,
    "validar_pagamento": false
  }'::JSONB,
  horarios              JSONB DEFAULT '[]'::JSONB,
  -- [{dia_semana: 0-6, abre: "08:00", fecha: "22:00", ativo: true}]
  aberto                BOOLEAN DEFAULT false,
  ativo                 BOOLEAN DEFAULT true,
  plano                 TEXT DEFAULT 'basic' CHECK (plano IN ('basic', 'pro', 'enterprise')),
  owner_id              UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE TABLE categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  imagem_url  TEXT,
  ordem       INTEGER DEFAULT 0,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE produtos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id             UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  categoria_id        UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  preco               NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  preco_promocional   NUMERIC(10,2) CHECK (preco_promocional >= 0),
  imagem_url          TEXT,
  disponivel          BOOLEAN DEFAULT true,
  destaque            BOOLEAN DEFAULT false,
  ordem               INTEGER DEFAULT 0,
  opcoes              JSONB DEFAULT '[]'::JSONB,
  -- Estrutura opcoes:
  -- [{
  --   "id": "uuid",
  --   "nome": "Tamanho",
  --   "obrigatorio": true,
  --   "multiplo": false,
  --   "min": 1,
  --   "max": 1,
  --   "itens": [
  --     {"id": "uuid", "nome": "P - 250ml", "preco_adicional": 0},
  --     {"id": "uuid", "nome": "G - 400ml", "preco_adicional": 3.00}
  --   ]
  -- }]
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BAIRROS_ENTREGA (Zonas de entrega por bairro - PRIORIDADE)
-- ============================================================
CREATE TABLE bairros_entrega (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cidade      TEXT NOT NULL DEFAULT '',
  taxa        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (taxa >= 0),
  tempo_min   INTEGER DEFAULT 30 CHECK (tempo_min > 0),
  tempo_max   INTEGER DEFAULT 60 CHECK (tempo_max > 0),
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bairros_tempo_check CHECK (tempo_max >= tempo_min)
);

-- ============================================================
-- FAIXAS_ENTREGA (Por distância km - FALLBACK)
-- ============================================================
CREATE TABLE faixas_entrega (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id         UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  distancia_min   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (distancia_min >= 0),
  distancia_max   NUMERIC(6,2) NOT NULL CHECK (distancia_max > 0),
  taxa            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (taxa >= 0),
  tempo_min       INTEGER DEFAULT 30,
  tempo_max       INTEGER DEFAULT 60,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT faixas_distancia_check CHECK (distancia_max > distancia_min),
  CONSTRAINT faixas_tempo_check CHECK (tempo_max >= tempo_min)
);

-- ============================================================
-- SESSIONS_WHATSAPP (State machine do bot)
-- ============================================================
CREATE TABLE sessions_whatsapp (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id         UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  telefone        TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'idle'
                  CHECK (estado IN (
                    'idle', 'menu_sent', 'cart_building', 'checkout',
                    'awaiting_address', 'awaiting_payment', 'awaiting_pix',
                    'order_placed', 'human_attendant'
                  )),
  dados           JSONB DEFAULT '{}'::JSONB,
  -- {cart: [...], address: {...}, delivery_method, payment_method, delivery_fee, pedido_id}
  operador_id     UUID,
  ultimo_contato  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, telefone)
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id             UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  numero              INTEGER,
  -- numero é preenchido automaticamente via trigger (sequencial por loja)

  -- Dados do cliente
  telefone_cliente    TEXT NOT NULL,
  nome_cliente        TEXT,

  -- Tipo e entrega
  tipo_entrega        TEXT NOT NULL CHECK (tipo_entrega IN ('delivery', 'retirada')),
  endereco_entrega    JSONB DEFAULT NULL,
  -- {rua, numero, complemento, bairro, cidade, estado, cep, lat, lng, referencia}
  bairro_entrega_id   UUID REFERENCES bairros_entrega(id) ON DELETE SET NULL,
  faixa_entrega_id    UUID REFERENCES faixas_entrega(id) ON DELETE SET NULL,

  -- Valores
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  taxa_entrega        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (taxa_entrega >= 0),
  taxa_servico        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (taxa_servico >= 0),
  desconto            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  total               NUMERIC(10,2) NOT NULL CHECK (total >= 0),

  -- Pagamento
  troco_para          NUMERIC(10,2),
  forma_pagamento     TEXT CHECK (forma_pagamento IN ('pix', 'cartao', 'dinheiro', NULL)),

  -- Status
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN (
                        'pendente', 'aguardando_pagamento', 'confirmado',
                        'em_preparo', 'pronto', 'saiu_entrega',
                        'entregue', 'cancelado', 'recusado'
                      )),

  -- Metadata
  observacao          TEXT,
  origem              TEXT DEFAULT 'web' CHECK (origem IN ('whatsapp', 'web', 'admin')),
  impresso            BOOLEAN DEFAULT false,
  notificado          BOOLEAN DEFAULT false,
  idempotency_key     TEXT UNIQUE NOT NULL,
  session_id          UUID REFERENCES sessions_whatsapp(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PEDIDO_ITENS
-- ============================================================
CREATE TABLE pedido_itens (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id               UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id              UUID REFERENCES produtos(id) ON DELETE SET NULL,
  loja_id                 UUID NOT NULL,

  -- Snapshot dos dados no momento do pedido (imutável)
  nome_produto            TEXT NOT NULL,
  preco_unitario          NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
  quantidade              INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  opcoes_selecionadas     JSONB DEFAULT '[]'::JSONB,
  -- [{nome: "Tamanho", item: "G", preco_adicional: 3.00}]
  subtotal                NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  observacao              TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGAMENTOS
-- ============================================================
CREATE TABLE pagamentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  loja_id             UUID NOT NULL,

  metodo              TEXT NOT NULL CHECK (metodo IN ('pix', 'cartao', 'dinheiro')),
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN (
                        'pendente', 'processando', 'aprovado',
                        'recusado', 'expirado', 'reembolsado', 'cancelado'
                      )),
  valor               NUMERIC(10,2) NOT NULL CHECK (valor > 0),

  -- Gateway
  gateway             TEXT CHECK (gateway IN ('gerencianet', 'mercadopago', 'manual', NULL)),
  gateway_id          TEXT,
  gateway_payload     JSONB,

  -- Pix específico
  pix_txid            TEXT,
  pix_qrcode          TEXT,
  pix_copia_cola      TEXT,
  pix_expira_em       TIMESTAMPTZ,

  -- Cartão específico
  card_last_four      TEXT,
  card_brand          TEXT,

  idempotency_key     TEXT UNIQUE NOT NULL,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OPERADORES (Atendentes humanos)
-- ============================================================
CREATE TABLE operadores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  user_id     UUID,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefone    TEXT,
  role        TEXT DEFAULT 'atendente' CHECK (role IN ('atendente', 'gerente', 'admin')),
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loja_id, email)
);
