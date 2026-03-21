# Deploy - n8n

## Opção 1: n8n Cloud (Recomendado para início)

1. Acesse [n8n.io](https://n8n.io) → Start for free
2. Importe os workflows da pasta `n8n/workflows/`
3. Configure as variáveis em **Settings → Variables**

## Opção 2: Self-Hosted com Docker

```bash
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: true
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: senha-segura
      WEBHOOK_URL: https://n8n.seudominio.com
      GENERIC_TIMEZONE: America/Sao_Paulo
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

```bash
docker-compose up -d
```

## Opção 3: Railway

1. New Project → Deploy from Docker image: `docker.n8n.io/n8nio/n8n`
2. Configure variáveis de ambiente
3. Adicione volume persistente para `/home/node/.n8n`

## Importar Workflows

1. Acesse n8n → Workflows → **Import from file**
2. Importe nesta ordem:
   1. `whatsapp_bot_main.json`
   2. `order_confirmation.json`
   3. `new_order_kitchen.json`
   4. `pix_timeout_alert.json`
   5. `whatsapp_human_takeover.json`
3. **Ative** todos os workflows

## Configurar Variáveis

Em **Settings → Variables**, adicione:

```
BACKEND_URL = https://sua-api.railway.app
FRONTEND_URL = https://cardapio.seudominio.com
EVOLUTION_API_URL = https://evolution.seudominio.com
EVOLUTION_API_KEY = sua-api-key
INTERNAL_API_KEY = internal-api-key-secret
```

## URLs dos Webhooks

Após ativar os workflows, copie as URLs dos webhooks e configure:

- **Evolution API** → webhook para `whatsapp_bot_main`
- **Backend** `N8N_WEBHOOK_URL` → URL base para eventos (n8n determina rota pelo evento)
