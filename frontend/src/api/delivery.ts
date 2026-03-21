import { apiClient } from './client';
import type { DeliveryResult, BairroEntrega } from '../types/delivery';

export async function calculateDelivery(params: {
  slug: string;
  bairro?: string;
  cidade?: string;
  lat?: number;
  lng?: number;
}): Promise<DeliveryResult> {
  const { data } = await apiClient.post<{ data: DeliveryResult }>('/delivery/calculate', params);
  return data.data;
}

export async function getBairros(slug: string): Promise<BairroEntrega[]> {
  const { data } = await apiClient.get<{ data: BairroEntrega[] }>(`/delivery/bairros/${slug}`);
  return data.data;
}
