# Configuração de Pagamentos

## Pix - Gerencianet (Efí Bank)

### 1. Criar conta
1. Acesse [efipay.com.br](https://efipay.com.br) → Criar Conta Empresarial
2. Valide CNPJ, documentos e dados bancários
3. Acesse **API → Minhas Aplicações → Nova Aplicação**

### 2. Obter credenciais
- **Client ID** e **Client Secret** (para sandbox e produção)
- Baixe o certificado `.p12` (necessário para mTLS em produção)

### 3. Registrar chave Pix
Em **Pix → Minhas Chaves**, registre uma chave (email, CPF, CNPJ ou aleatória).

### 4. Configurar webhook
```bash
curl -X PUT https://pix.api.efipay.com.br/v2/webhook/sua-chave-pix \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://sua-api.railway.app/api/v1/webhooks/pix"}'
```

### 5. Sandbox vs Produção
- Sandbox: `https://pix-h.api.efipay.com.br`
- Produção: `https://pix.api.efipay.com.br`
- Defina `GERENCIANET_SANDBOX=false` para produção

---

## Cartão - Mercado Pago

### 1. Criar conta
1. Acesse [mercadopago.com.br](https://www.mercadopago.com.br)
2. Crie conta de vendedor (precisa CNPJ para receber)

### 2. Credenciais
Em **Seu negócio → Configurações → Gestão e Administração → Credenciais**:
- **Public Key** (frontend)
- **Access Token** (backend)

### 3. Configurar webhook
Em **Seu negócio → Configurações → Notificações**:
- URL: `https://sua-api.railway.app/api/v1/webhooks/mercadopago`
- Eventos: `payment`

### 4. Sandbox
Use credenciais de teste em `https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing`

---

## Segurança dos Webhooks

### Gerencianet
Valida via HMAC-SHA256 no header `x-gerencianet-hmac`. O backend verifica automaticamente se `GERENCIANET_WEBHOOK_SECRET` estiver configurado.

### Mercado Pago
Valida via header `x-signature`. O backend verifica automaticamente se `MERCADOPAGO_WEBHOOK_SECRET` estiver configurado.

**Nunca processe um webhook sem verificar a assinatura em produção.**
