# Arquitetura do Sistema

## Visão Geral

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   INTERNET                           │
                    └─────────────────────────────────────────────────────┘
                              │                    │
                    ┌─────────▼──────┐   ┌─────────▼──────────┐
                    │  WhatsApp      │   │  Cardápio Web       │
                    │  (Cliente)     │   │  (React/Vite)       │
                    └─────────┬──────┘   └─────────┬──────────┘
                              │                    │
                    ┌─────────▼──────┐             │
                    │  Evolution API │             │
                    │  (WhatsApp)    │             │
                    └─────────┬──────┘             │
                              │                    │
                    ┌─────────▼────────────────────▼──────┐
                    │           n8n Automation             │
                    │  (Orquestração de eventos)           │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         Backend API (Express)        │
                    │  ┌────────────┐  ┌───────────────┐  │
                    │  │  REST API  │  │  BullMQ Jobs  │  │
                    │  └─────┬──────┘  └───────┬───────┘  │
                    └────────┼─────────────────┼──────────┘
                             │                 │
              ┌──────────────┼─────────────────┼──────────────┐
              │              │                 │              │
    ┌─────────▼──┐  ┌────────▼──┐  ┌──────────▼──┐  ┌───────▼──────┐
    │  Supabase  │  │   Redis   │  │  Gerencianet │  │  Mercado Pago│
    │ (Postgres) │  │ (BullMQ)  │  │  (Pix)       │  │  (Cartão)    │
    └────────────┘  └───────────┘  └─────────────┘  └──────────────┘
                                                            │
                                               ┌────────────▼─────────────┐
                                               │   Print Service          │
                                               │   (Máquina local do      │
                                               │    restaurante)          │
                                               └──────────────────────────┘
```

## Fluxo de um Pedido Completo

```
1. Cliente ─── WhatsApp "oi" ──────────────────► Evolution API
                                                        │
2. Evolution API ─── webhook ───────────────────► n8n
                                                        │
3. n8n ─── POST /api/v1/webhooks/whatsapp ──────► Backend
                                                        │
4. Backend ─── resposta com link do cardápio ───► n8n
                                                        │
5. n8n ─── enviar mensagem com link ────────────► Evolution API ──► Cliente

6. Cliente ─── acessa link ─────────────────────► Frontend (React)

7. Frontend ─── GET /menu/:slug ────────────────► Backend ──► Supabase
         ◄─── categorias + produtos ────────────

8. Cliente ─── monta carrinho ──────────────────► (local, Zustand store)

9. Cliente ─── preenche endereço ───────────────► Frontend
         ─── POST /delivery/calculate ──────────► Backend ──► Supabase
         ◄─── taxa + tempo estimado ────────────

10. Cliente ─── POST /orders ────────────────────► Backend
          ─── validar produtos ──────────────────► Supabase
          ─── calcular total ──────────────────────
          ─── INSERT pedido + itens ───────────────► Supabase
          ◄─── {pedido_id, total} ─────────────────

11. Cliente ─── POST /payments/pix ──────────────► Backend
          ─── GET access_token ────────────────────► Gerencianet
          ─── PUT /v2/cob/{txid} ──────────────────► Gerencianet
          ◄─── {qrcode, copia_cola} ───────────────
          ─── INSERT pagamentos ───────────────────► Supabase
          ─── BullMQ.add(pixTimeout, delay=5min) ──► Redis
          ◄─── {pix_qrcode, expira_em} ────────────

12. Cliente ─── escaneia QR Code ────────────────► Banco (fora do sistema)
                                                        │
13. Banco ─── confirmar Pix ─────────────────────► Gerencianet
                                                        │
14. Gerencianet ─── POST /webhooks/pix ──────────► Backend
           ─── verificar assinatura HMAC ────────────
           ─── UPDATE pagamentos status=aprovado ───► Supabase
           ─── trigger SQL: UPDATE pedido=confirmado──
           ─── POST /webhooks/n8n (order_confirmed) ──► n8n
                                                        │
15. Supabase Realtime ──────────────────────────────► Frontend (WebSocket)
          ─── status atualizado na tela ─────────────

16. n8n ─── POST /admin/pedidos/:id/print ───────► Backend
          ─── BullMQ print job ───────────────────► Print Service
          ─── imprimir cupom ESC/POS ───────────────► Impressora Térmica

17. n8n ─── sendText via Evolution API ──────────► Cliente WhatsApp
          "✅ Pedido #42 confirmado!"
```

## Garantias do Sistema

| Garantia | Mecanismo |
|---|---|
| Não duplicar pedidos | `idempotency_key UNIQUE` + Redis lock 30s |
| Não duplicar pagamentos | `idempotency_key UNIQUE` na tabela pagamentos |
| Pix não fica pendente para sempre | BullMQ timeout job (5 min) |
| Bot não responde quando humano atende | `estado = human_attendant` na session |
| Isolamento multi-tenant | RLS + loja_id em todas as tabelas |
| Preço correto em pedidos históricos | Snapshot do nome/preço em pedido_itens |
| Numeração sequencial por restaurante | Trigger PostgreSQL com advisory lock |
