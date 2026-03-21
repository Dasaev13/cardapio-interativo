import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes/index';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'x-internal-api-key'],
    credentials: true,
  }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Body parsing (exceto webhooks que precisam do raw body)
  app.use((req, res, next) => {
    if (req.path.startsWith('/webhooks/')) {
      next();
    } else {
      express.json({ limit: '10mb' })(req, res, next);
    }
  });
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'cardapio-interativo-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API Routes
  app.use('/api/v1', routes);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { message: 'Rota não encontrada', code: 'NOT_FOUND' } });
  });

  // Error handler (deve ser o último middleware)
  app.use(errorHandler);

  return app;
}
