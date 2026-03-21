# Deploy - Frontend (Vercel)

## Deploy no Vercel

### 1. Via CLI

```bash
cd frontend
npm install -g vercel
vercel
```

### 2. Via GitHub

1. Acesse [vercel.com](https://vercel.com) → Import Project
2. Selecione o repositório
3. **Framework**: Vite
4. **Root directory**: `frontend`
5. **Build command**: `npm run build`
6. **Output directory**: `dist`

### 3. Variáveis de ambiente

Em **Settings → Environment Variables**:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=https://backend-production-xxxx.up.railway.app
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
```

### 4. Domínio personalizado

Em **Settings → Domains**, adicione: `cardapio.seudominio.com`

## Alternativa: Netlify

```bash
cd frontend
npm run build
# Fazer upload da pasta dist/ para Netlify
```

## Roteamento SPA

O Vite/React Router usa client-side routing. Configure redirecionamentos:

### Vercel (vercel.json)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlify (_redirects)
```
/*  /index.html  200
```

Crie esses arquivos em `frontend/public/`.
