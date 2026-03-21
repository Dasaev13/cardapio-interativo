import { useQuery } from '@tanstack/react-query';
import { fetchMenu } from '../api/menu';
import type { MenuData } from '../types/menu';

export function useMenu(slug: string) {
  return useQuery<MenuData, Error>({
    queryKey: ['menu', slug],
    queryFn: () => fetchMenu(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 3, // 3 minutos
  });
}
