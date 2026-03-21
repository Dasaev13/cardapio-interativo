import { useQuery } from '@tanstack/react-query';
import { calculateDelivery, getBairros } from '../api/delivery';
import type { DeliveryResult, BairroEntrega } from '../types/delivery';

export function useDeliveryFee(slug: string, bairro: string, enabled: boolean) {
  return useQuery<DeliveryResult, Error>({
    queryKey: ['delivery-fee', slug, bairro],
    queryFn: () => calculateDelivery({ slug, bairro }),
    enabled: enabled && Boolean(slug) && Boolean(bairro.trim()),
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: false,
  });
}

export function useBairros(slug: string) {
  return useQuery<BairroEntrega[], Error>({
    queryKey: ['bairros', slug],
    queryFn: () => getBairros(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 30,
  });
}
