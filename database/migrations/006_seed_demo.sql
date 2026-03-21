-- ============================================================
-- MIGRATION 006: DADOS DE DEMONSTRAÇÃO
-- Restaurante: "Burger House" - slug: burger-house
-- ============================================================

DO $$
DECLARE
  v_loja_id UUID := '00000000-0000-0000-0000-000000000001';
  v_cat_burgers UUID := '00000000-0000-0000-0001-000000000001';
  v_cat_bebidas UUID := '00000000-0000-0000-0001-000000000002';
  v_cat_porcoes UUID := '00000000-0000-0000-0001-000000000003';
  v_cat_sobremesas UUID := '00000000-0000-0000-0001-000000000004';
BEGIN

-- Loja demo
INSERT INTO lojas (id, slug, nome, telefone, whatsapp_instance, descricao,
  logo_url, banner_url, aberto, ativo, plano,
  endereco, config, horarios)
VALUES (
  v_loja_id,
  'burger-house',
  'Burger House',
  '5511999999999',
  'burger-house-instance',
  'Os melhores burgers artesanais da cidade! Carne 100% bovina, pão brioche fresquinho.',
  'https://via.placeholder.com/200x200/EF4444/FFFFFF?text=BH',
  'https://via.placeholder.com/1200x400/1F2937/FFFFFF?text=Burger+House',
  true,
  true,
  'pro',
  '{"rua": "Rua dos Sabores", "numero": "123", "bairro": "Centro", "cidade": "São Paulo", "estado": "SP", "cep": "01310-000", "lat": -23.5505, "lng": -46.6333}'::JSONB,
  '{
    "cor_primaria": "#EF4444",
    "cor_secundaria": "#991B1B",
    "taxa_servico_pct": 0,
    "tempo_preparo_min": 25,
    "pedido_minimo": 20.00,
    "aceitar_retirada": true,
    "aceitar_entrega": true,
    "validar_pagamento": false
  }'::JSONB,
  '[
    {"dia_semana": 0, "abre": "11:00", "fecha": "23:00", "ativo": true},
    {"dia_semana": 1, "abre": "11:00", "fecha": "23:00", "ativo": true},
    {"dia_semana": 2, "abre": "11:00", "fecha": "23:00", "ativo": true},
    {"dia_semana": 3, "abre": "11:00", "fecha": "23:00", "ativo": true},
    {"dia_semana": 4, "abre": "11:00", "fecha": "23:00", "ativo": true},
    {"dia_semana": 5, "abre": "11:00", "fecha": "00:00", "ativo": true},
    {"dia_semana": 6, "abre": "12:00", "fecha": "22:00", "ativo": true}
  ]'::JSONB
);

-- Categorias
INSERT INTO categorias (id, loja_id, nome, descricao, ordem) VALUES
  (v_cat_burgers, v_loja_id, 'Burgers', 'Nossos burgers artesanais', 1),
  (v_cat_bebidas, v_loja_id, 'Bebidas', 'Refrigerantes, sucos e mais', 2),
  (v_cat_porcoes, v_loja_id, 'Porções', 'Frituras e acompanhamentos', 3),
  (v_cat_sobremesas, v_loja_id, 'Sobremesas', 'Finalize com o pé doce', 4);

-- Produtos - Burgers
INSERT INTO produtos (loja_id, categoria_id, nome, descricao, preco, imagem_url, disponivel, destaque, ordem, opcoes) VALUES
(v_loja_id, v_cat_burgers,
  'X-Burger Clássico',
  'Pão brioche, hamburger 150g, queijo cheddar, alface, tomate, cebola caramelizada e molho especial',
  22.90,
  'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=X-Burger',
  true, true, 1,
  '[
    {
      "id": "opt-tamanho",
      "nome": "Tamanho",
      "obrigatorio": true,
      "multiplo": false,
      "min": 1,
      "max": 1,
      "itens": [
        {"id": "tam-simples", "nome": "Simples (150g)", "preco_adicional": 0},
        {"id": "tam-duplo", "nome": "Duplo (300g)", "preco_adicional": 10.00}
      ]
    },
    {
      "id": "opt-adicionais",
      "nome": "Adicionais",
      "obrigatorio": false,
      "multiplo": true,
      "min": 0,
      "max": 5,
      "itens": [
        {"id": "add-bacon", "nome": "Bacon Crispy", "preco_adicional": 4.00},
        {"id": "add-ovo", "nome": "Ovo Frito", "preco_adicional": 3.00},
        {"id": "add-cheddar", "nome": "Cheddar Extra", "preco_adicional": 3.00},
        {"id": "add-picles", "nome": "Picles", "preco_adicional": 1.00}
      ]
    }
  ]'::JSONB
),
(v_loja_id, v_cat_burgers,
  'X-Bacon Supreme',
  'Pão brioche, hamburger 200g, duplo cheddar, bacon crocante, cebola crispy, molho barbecue e maionese defumada',
  31.90,
  'https://via.placeholder.com/400x300/DC2626/FFFFFF?text=X-Bacon',
  true, true, 2,
  '[
    {
      "id": "opt-tamanho",
      "nome": "Tamanho",
      "obrigatorio": true,
      "multiplo": false,
      "min": 1,
      "max": 1,
      "itens": [
        {"id": "tam-simples", "nome": "Simples (200g)", "preco_adicional": 0},
        {"id": "tam-duplo", "nome": "Duplo (400g)", "preco_adicional": 12.00}
      ]
    }
  ]'::JSONB
),
(v_loja_id, v_cat_burgers,
  'Smash Burger',
  'Técnica smash com dois discos de 90g, queijo american, picles, cebola, mostarda e ketchup',
  26.90,
  'https://via.placeholder.com/400x300/B91C1C/FFFFFF?text=Smash',
  true, false, 3,
  '[]'::JSONB
),
(v_loja_id, v_cat_burgers,
  'Veggie Burger',
  'Hamburguer de grão-de-bico, queijo vegano, alface americana, tomate, pepino e molho tahine',
  24.90,
  'https://via.placeholder.com/400x300/16A34A/FFFFFF?text=Veggie',
  true, false, 4,
  '[]'::JSONB
);

-- Produtos - Bebidas
INSERT INTO produtos (loja_id, categoria_id, nome, descricao, preco, imagem_url, disponivel, ordem, opcoes) VALUES
(v_loja_id, v_cat_bebidas,
  'Refrigerante Lata',
  'Coca-Cola, Pepsi, Guaraná ou Sprite - 350ml',
  6.00,
  'https://via.placeholder.com/400x300/1D4ED8/FFFFFF?text=Refri',
  true, 1,
  '[
    {
      "id": "opt-sabor",
      "nome": "Sabor",
      "obrigatorio": true,
      "multiplo": false,
      "min": 1,
      "max": 1,
      "itens": [
        {"id": "sabor-coca", "nome": "Coca-Cola", "preco_adicional": 0},
        {"id": "sabor-pepsi", "nome": "Pepsi", "preco_adicional": 0},
        {"id": "sabor-guarana", "nome": "Guaraná", "preco_adicional": 0},
        {"id": "sabor-sprite", "nome": "Sprite", "preco_adicional": 0}
      ]
    }
  ]'::JSONB
),
(v_loja_id, v_cat_bebidas,
  'Suco Natural',
  'Suco de fruta fresco - 400ml',
  10.00,
  'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Suco',
  true, 2,
  '[
    {
      "id": "opt-fruta",
      "nome": "Fruta",
      "obrigatorio": true,
      "multiplo": false,
      "min": 1,
      "max": 1,
      "itens": [
        {"id": "fruta-laranja", "nome": "Laranja", "preco_adicional": 0},
        {"id": "fruta-limao", "nome": "Limão", "preco_adicional": 0},
        {"id": "fruta-manga", "nome": "Manga", "preco_adicional": 2.00},
        {"id": "fruta-acai", "nome": "Açaí", "preco_adicional": 3.00}
      ]
    }
  ]'::JSONB
),
(v_loja_id, v_cat_bebidas,
  'Água Mineral',
  'Sem gás ou com gás - 500ml',
  4.00,
  'https://via.placeholder.com/400x300/60A5FA/FFFFFF?text=Agua',
  true, 3,
  '[]'::JSONB
),
(v_loja_id, v_cat_bebidas,
  'Milkshake',
  'Cremoso e gelado - 400ml',
  18.00,
  'https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Shake',
  true, 4,
  '[
    {
      "id": "opt-sabor",
      "nome": "Sabor",
      "obrigatorio": true,
      "multiplo": false,
      "min": 1,
      "max": 1,
      "itens": [
        {"id": "shake-chocolate", "nome": "Chocolate Belga", "preco_adicional": 0},
        {"id": "shake-morango", "nome": "Morango", "preco_adicional": 0},
        {"id": "shake-baunilha", "nome": "Baunilha", "preco_adicional": 0},
        {"id": "shake-oreo", "nome": "Oreo", "preco_adicional": 3.00}
      ]
    }
  ]'::JSONB
);

-- Produtos - Porções
INSERT INTO produtos (loja_id, categoria_id, nome, descricao, preco, imagem_url, disponivel, ordem) VALUES
(v_loja_id, v_cat_porcoes,
  'Batata Frita',
  'Crocante por fora, macia por dentro. Temperada com alecrim e flor de sal',
  16.00,
  'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Batata',
  true, 1
),
(v_loja_id, v_cat_porcoes,
  'Onion Rings',
  'Anéis de cebola empanados no panko com molho ranch',
  18.00,
  'https://via.placeholder.com/400x300/F97316/FFFFFF?text=Rings',
  true, 2
),
(v_loja_id, v_cat_porcoes,
  'Frango Crispy',
  '6 pedaços de frango empanado crocante com molho barbecue',
  22.00,
  'https://via.placeholder.com/400x300/FCD34D/FFFFFF?text=Crispy',
  true, 3
);

-- Produtos - Sobremesas
INSERT INTO produtos (loja_id, categoria_id, nome, descricao, preco, imagem_url, disponivel, ordem) VALUES
(v_loja_id, v_cat_sobremesas,
  'Brownie com Sorvete',
  'Brownie de chocolate quente com sorvete de baunilha e calda de chocolate',
  16.00,
  'https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=Brownie',
  true, 1
),
(v_loja_id, v_cat_sobremesas,
  'Pudim de Leite',
  'Pudim tradicional com calda de caramelo - fatia individual',
  12.00,
  'https://via.placeholder.com/400x300/D97706/FFFFFF?text=Pudim',
  true, 2
);

-- Bairros de entrega (São Paulo - Centro e arredores)
INSERT INTO bairros_entrega (loja_id, nome, cidade, taxa, tempo_min, tempo_max, ativo) VALUES
(v_loja_id, 'Centro', 'São Paulo', 5.00, 20, 40, true),
(v_loja_id, 'República', 'São Paulo', 5.00, 20, 40, true),
(v_loja_id, 'Consolação', 'São Paulo', 6.00, 25, 45, true),
(v_loja_id, 'Bela Vista', 'São Paulo', 6.00, 25, 45, true),
(v_loja_id, 'Liberdade', 'São Paulo', 6.00, 25, 45, true),
(v_loja_id, 'Jardins', 'São Paulo', 8.00, 30, 50, true),
(v_loja_id, 'Paulista', 'São Paulo', 7.00, 30, 50, true),
(v_loja_id, 'Higienópolis', 'São Paulo', 8.00, 35, 55, true),
(v_loja_id, 'Perdizes', 'São Paulo', 9.00, 35, 55, true),
(v_loja_id, 'Pinheiros', 'São Paulo', 10.00, 40, 60, true),
(v_loja_id, 'Vila Madalena', 'São Paulo', 10.00, 40, 60, true),
(v_loja_id, 'Moema', 'São Paulo', 12.00, 45, 65, true);

-- Faixas de entrega (fallback por distância)
INSERT INTO faixas_entrega (loja_id, nome, distancia_min, distancia_max, taxa, tempo_min, tempo_max, ativo) VALUES
(v_loja_id, 'Até 2km', 0, 2, 5.00, 20, 35, true),
(v_loja_id, '2 a 5km', 2, 5, 8.00, 30, 50, true),
(v_loja_id, '5 a 10km', 5, 10, 12.00, 40, 60, true),
(v_loja_id, '10 a 15km', 10, 15, 18.00, 50, 75, true);

END $$;
