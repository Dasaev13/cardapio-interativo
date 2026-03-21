# Deploy - Print Service (Máquina Local do Restaurante)

O print-service roda **localmente** na máquina do restaurante, acessível apenas pelo backend via API key.

## Instalação

### Pré-requisitos
- Node.js 20+
- Driver da impressora instalado no sistema operacional
- Impressora térmica conectada (USB, serial ou rede TCP/IP)

### Windows

```cmd
cd cadapio-interativo\print-service
npm install
copy ..\env.example .env
```

Edite o `.env`:
```
PRINTER_NAME=EPSON TM-T20
PRINTER_TYPE=epson
BACKEND_INTERNAL_API_KEY=internal-api-key-secret
PRINT_PORT=3001
```

Instalar como serviço Windows com PM2:
```cmd
npm install -g pm2
pm2 start dist/index.js --name print-service
pm2 startup
pm2 save
```

### Linux / Ubuntu

```bash
cd cadapio-interativo/print-service
npm install

# Descobrir a porta da impressora USB
ls /dev/usb/lp*
# ou para impressora serial:
ls /dev/ttyUSB*
```

Edite o `.env`:
```
PRINTER_INTERFACE=/dev/usb/lp0
PRINTER_TYPE=epson
BACKEND_INTERNAL_API_KEY=internal-api-key-secret
```

Criar serviço systemd:
```bash
sudo nano /etc/systemd/system/print-service.service
```

```ini
[Unit]
Description=Cardapio Print Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/cadapio-interativo/print-service
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable print-service
sudo systemctl start print-service
```

## Impressoras Suportadas

| Marca | Modelo | Tipo | Interface |
|---|---|---|---|
| Epson | TM-T20, TM-T88 | epson | USB / TCP |
| Bematech | MP-4200, MP-100S | bematech | USB / Serial |
| Elgin | i9, i7 | epson | USB / TCP |
| Daruma | DR800 | epson | USB |

## Impressora em Rede (TCP/IP)

```
PRINTER_INTERFACE=tcp://192.168.1.100:9100
PRINTER_TYPE=epson
```

## Testar Impressão

```bash
curl -X POST http://localhost:3001/print/test \
  -H "x-api-key: internal-api-key-secret"
```

## Expor para o Backend Remoto (Túnel)

Se o backend está na nuvem e precisa acessar o print-service local:

```bash
# Usando ngrok (temporário, para teste)
ngrok http 3001

# Ou cloudflare tunnel (permanente, gratuito)
cloudflared tunnel create cardapio-print
cloudflared tunnel route dns cardapio-print print.seudominio.com
```

Configure no backend: `PRINT_SERVICE_URL=https://print.seudominio.com`
