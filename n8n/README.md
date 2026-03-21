# Workflows n8n - Cardápio Interativo

## Importação

1. Acesse seu n8n (self-hosted ou cloud)
2. Vá em **Workflows → Import from file**
3. Importe cada arquivo `.json` desta pasta

## Variáveis de Ambiente no n8n

Configure em **Settings → Variables**:

| Variável | Valor |
|---|---|
| `BACKEND_URL` | `https://sua-api.railway.app` |
| `FRONTEND_URL` | `https://cardapio.app` |
| `EVOLUTION_API_URL` | `https://evolution.seudominio.com` |
| `EVOLUTION_API_KEY` | Sua API Key da Evolution |
| `INTERNAL_API_KEY` | Mesma do backend `.env` |

## Workflows

### 1. `whatsapp_bot_main.json`
Recebe mensagens da Evolution API e repassa ao backend.

**Webhook URL para configurar na Evolution API:**
`https://seu-n8n.com/webhook/whatsapp-message`

### 2. `order_confirmation.json`
Envia confirmação de pedido via WhatsApp ao cliente.

**Configurar no backend** `N8N_WEBHOOK_URL`:
`https://seu-n8n.com/webhook/order-event`

### 3. `new_order_kitchen.json`
Ao confirmar pedido, dispara impressão na cozinha.

### 4. `pix_timeout_alert.json`
Notifica cliente quando Pix expira.

### 5. `whatsapp_human_takeover.json`
Gerencia solicitações de atendimento humano.

## Credenciais

Configure na aba **Credentials** do n8n:
- **HTTP Header Auth** para Evolution API (apikey)
- **HTTP Header Auth** para Backend (x-internal-api-key)
