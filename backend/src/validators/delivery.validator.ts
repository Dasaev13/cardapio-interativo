import { z } from 'zod';

export const calculateDeliverySchema = z.object({
  slug: z.string().min(1, 'Slug da loja é obrigatório'),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).refine(
  (data) => data.bairro !== undefined || (data.lat !== undefined && data.lng !== undefined),
  { message: 'Forneça bairro ou coordenadas (lat/lng)', path: ['bairro'] }
);

export type CalculateDeliveryInput = z.infer<typeof calculateDeliverySchema>;
