import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env do root do monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Asaas (Pix)
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_SANDBOX: z.string().default('true').transform(v => v === 'true'),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  ASAAS_DEFAULT_CUSTOMER_ID: z.string().optional(),

  // Mercado Pago (Cartão)
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // Evolution API (WhatsApp)
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),

  // Claude AI
  ANTHROPIC_API_KEY: z.string().optional(),

  // Print Service
  PRINT_SERVICE_URL: z.string().default('http://localhost:3001'),
  PRINT_SERVICE_API_KEY: z.string().default('print-service-secret'),

  // n8n
  N8N_WEBHOOK_URL: z.string().url().optional(),

  // Internal
  INTERNAL_API_KEY: z.string().default('internal-api-key-secret'),
  JWT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
