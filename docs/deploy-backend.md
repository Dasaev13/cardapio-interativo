# Deploy - Backend (Railway)

## Deploy no Railway

### 1. Preparar repositório

```bash
cd cadapio-interativo
git init
git add .
git commit -m "Initial commit"
```

### 2. Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → selecione o repositório
3. Em **Settings → Build**:
   - Root directory: `backend`
   - Build command: `npm run build`
   - Start command: `node dist/index.js`

### 3. Adicionar Redis

No Railway, clique em **+ New** → **Redis** → ele será adicionado automaticamente ao projeto.
A variável `REDIS_URL` será injetada automaticamente.

### 4. Variáveis de ambiente

Em **Variables**, adicione todas as variáveis do `.env.example`:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GERENCIANET_CLIENT_ID=...
# ... demais variáveis
```

### 5. URL do backend

Após deploy, a URL será algo como: `https://backend-production-xxxx.up.railway.app`

Configure no frontend: `VITE_API_BASE_URL=https://backend-production-xxxx.up.railway.app`

## Deploy Alternativo: Render.com

1. New Web Service → Connect GitHub
2. Build Command: `cd backend && npm install && npm run build`
3. Start Command: `cd backend && node dist/index.js`
4. Adicione Redis via **Add-ons → Redis**

## Configurar Webhooks de Pagamento

### Gerencianet (Pix)
URL: `https://sua-api.railway.app/api/v1/webhooks/pix`
- Configure no painel Gerencianet → Minha Conta → Webhooks

### Mercado Pago
URL: `https://sua-api.railway.app/api/v1/webhooks/mercadopago`
- Configure em: Conta MP → Sua loja → Webhooks
