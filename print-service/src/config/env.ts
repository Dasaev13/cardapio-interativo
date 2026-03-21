import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PRINT_PORT: z.string().default('3001').transform(Number),
  PRINTER_NAME: z.string().optional(),
  PRINTER_TYPE: z.enum(['epson', 'star', 'bematech', 'network', 'console']).default('epson'),
  PRINTER_INTERFACE: z.string().optional(), // Ex: "tcp://192.168.1.10" ou "/dev/usb/lp0"
  BACKEND_INTERNAL_API_KEY: z.string().default('internal-api-key-secret'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Env inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
