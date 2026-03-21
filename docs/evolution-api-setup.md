# Configuração Evolution API (WhatsApp)

## Deploy com Docker

```bash
# docker-compose.yml
version: '3.8'
services:
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      SERVER_URL: https://evolution.seudominio.com
      AUTHENTICATION_API_KEY: sua-api-key-aqui
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: true
      QRCODE_LIMIT: 30
      QRCODE_COLOR: '#198754'
    volumes:
      - evolution_data:/evolution/instances
      - evolution_store:/evolution/store

volumes:
  evolution_data:
  evolution_store:
```

```bash
docker-compose up -d
```

## Criar Instância para um Restaurante

```bash
# Criar instância
curl -X POST https://evolution.seudominio.com/instance/create \
  -H "apikey: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "burger-house", "token": "token-da-instancia"}'

# Conectar WhatsApp (escanear QR Code)
curl https://evolution.seudominio.com/instance/connect/burger-house \
  -H "apikey: sua-api-key"
```

## Configurar Webhook para n8n

```bash
curl -X POST https://evolution.seudominio.com/webhook/set/burger-house \
  -H "apikey: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-n8n.com/webhook/whatsapp-message",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE"]
  }'
```

## Atualizar loja no banco

```sql
UPDATE lojas
SET whatsapp_instance = 'burger-house'
WHERE slug = 'burger-house';
```

## Deploy no Railway (alternativo a VPS)

1. New Project → Deploy from GitHub (repositório da Evolution API)
2. Configure as variáveis de ambiente acima
3. Adicione domínio personalizado
