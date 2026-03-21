import './config/env';
import express, { Request, Response, NextFunction } from 'express';
import { env } from './config/env';
import { printOrder } from './services/printer.service';

const app = express();
app.use(express.json({ limit: '5mb' }));

// Auth middleware (apenas aceita requests do backend)
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];
  if (key !== env.BACKEND_INTERNAL_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'print-service', env: env.NODE_ENV });
});

// Rota de impressão de pedido
app.post('/print/order', requireApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    if (!data?.pedido) {
      res.status(400).json({ error: 'Dados do pedido ausentes' });
      return;
    }

    await printOrder(data);
    res.json({ success: true, message: `Pedido #${data.pedido.numero} enviado para impressão` });
  } catch (err: any) {
    console.error('[PrintService] Erro:', err);
    res.status(500).json({ error: err.message || 'Erro ao imprimir' });
    next(err);
  }
});

// Rota de teste de impressão
app.post('/print/test', requireApiKey, async (_req: Request, res: Response) => {
  const testData = {
    pedido: {
      id: 'test',
      numero: 999,
      tipo_entrega: 'delivery' as const,
      nome_cliente: 'Cliente Teste',
      telefone_cliente: '11999999999',
      subtotal: 50.00,
      taxa_entrega: 5.00,
      total: 55.00,
      forma_pagamento: 'pix',
      created_at: new Date().toISOString(),
      endereco_entrega: {
        rua: 'Rua Teste',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
      },
    },
    itens: [
      {
        quantidade: 2,
        nome_produto: 'X-Burger Clássico',
        preco_unitario: 22.90,
        subtotal: 45.80,
        opcoes_selecionadas: [{ nome: 'Tamanho', item_nome: 'Duplo' }],
        observacao: 'sem cebola',
      },
      {
        quantidade: 1,
        nome_produto: 'Refrigerante Lata',
        preco_unitario: 6.00,
        subtotal: 6.00,
      },
    ],
    pagamento: { metodo: 'pix', status: 'aprovado' },
    loja: { nome: 'Burger House' },
  };

  try {
    await printOrder(testData as any);
    res.json({ success: true, message: 'Impressão de teste realizada' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(env.PRINT_PORT, '127.0.0.1', () => {
  console.log(`
🖨️  Print Service rodando em http://127.0.0.1:${env.PRINT_PORT}
   Impressora: ${env.PRINTER_NAME || env.PRINTER_INTERFACE || 'Simulação (console)'}
   Tipo: ${env.PRINTER_TYPE}
  `);
});
