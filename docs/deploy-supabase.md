# Deploy - Supabase

## 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Escolha região mais próxima (South America - São Paulo)
3. Anote: **URL**, **anon key**, **service_role key**, **JWT secret**

## 2. Executar Migrações

No painel Supabase → SQL Editor, execute **na ordem**:

```bash
# Copie e cole cada arquivo no SQL Editor
database/migrations/001_initial_schema.sql
database/migrations/002_rls_policies.sql
database/migrations/003_indexes.sql
database/migrations/004_functions.sql
database/migrations/005_triggers.sql
database/migrations/006_seed_demo.sql  # opcional - dados demo
```

## 3. Configurar Realtime

Em **Database → Replication**, habilite Realtime para a tabela `pedidos`:
- Selecione `pedidos` → habilite `INSERT`, `UPDATE`, `DELETE`

## 4. Configurar Storage (opcional - para logos/imagens)

Em **Storage**, crie um bucket `produtos-imagens` com política pública de leitura.

## 5. Habilitar Auth (para painel admin)

Em **Authentication → Providers**, habilite Email/Password.
Crie um usuário em **Authentication → Users** para o primeiro operador.

## 6. Inserir Operador

```sql
INSERT INTO operadores (loja_id, user_id, nome, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- loja demo
  'UUID_DO_USER_SUPABASE_AUTH',
  'Admin',
  'admin@seurestaurante.com',
  'admin'
);
```
