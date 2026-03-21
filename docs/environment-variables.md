# Variáveis de Ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha:

## Backend

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase (ex: `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key do Supabase (bypassa RLS) |
| `REDIS_URL` | ✅ | URL do Redis (ex: `redis://localhost:6379`) |
| `PORT` | ❌ | Porta do backend (padrão: 3000) |
| `NODE_ENV` | ❌ | `development` ou `production` |
| `GERENCIANET_CLIENT_ID` | Pix | Client ID da API Gerencianet |
| `GERENCIANET_CLIENT_SECRET` | Pix | Client Secret |
| `GERENCIANET_PIX_KEY` | Pix | Chave Pix do restaurante (email/CPF/CNPJ/aleatória) |
| `GERENCIANET_SANDBOX` | ❌ | `true` para sandbox, `false` para produção |
| `GERENCIANET_WEBHOOK_SECRET` | Pix | Secret para verificar webhooks |
| `MERCADOPAGO_ACCESS_TOKEN` | Cartão | Access token do Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Cartão | Secret para webhooks MP |
| `EVOLUTION_API_URL` | WhatsApp | URL da Evolution API |
| `EVOLUTION_API_KEY` | WhatsApp | API Key da Evolution API |
| `ANTHROPIC_API_KEY` | ❌ | API Key da Anthropic (Claude - parser de pedidos) |
| `PRINT_SERVICE_URL` | ❌ | URL do print-service (padrão: `http://localhost:3001`) |
| `PRINT_SERVICE_API_KEY` | ❌ | API key interna do print-service |
| `N8N_WEBHOOK_URL` | ❌ | URL base dos webhooks n8n |
| `INTERNAL_API_KEY` | ❌ | Chave para comunicação interna entre serviços |
| `JWT_SECRET` | ❌ | JWT secret do Supabase (em Settings > API) |
| `CORS_ORIGIN` | ❌ | Origens permitidas (separadas por vírgula) |

## Frontend

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL do Supabase (mesma do backend) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon key pública do Supabase |
| `VITE_API_BASE_URL` | ✅ | URL do backend (ex: `https://api.cardapio.app`) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Cartão | Public key do Mercado Pago |

## Print Service

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PRINTER_NAME` | ❌ | Nome da impressora no Windows (ex: `EPSON TM-T20`) |
| `PRINTER_TYPE` | ❌ | Tipo: `epson`, `star`, `bematech` (padrão: `epson`) |
| `PRINTER_INTERFACE` | ❌ | Interface: `tcp://192.168.1.10` ou `/dev/usb/lp0` |
| `BACKEND_INTERNAL_API_KEY` | ✅ | Mesma que `PRINT_SERVICE_API_KEY` do backend |
| `PRINT_PORT` | ❌ | Porta do print-service (padrão: 3001) |
