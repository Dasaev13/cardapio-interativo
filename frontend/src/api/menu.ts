import { apiClient } from './client';
import type { MenuData } from '../types/menu';

export async function fetchMenu(slug: string): Promise<MenuData> {
  const { data } = await apiClient.get<{ data: MenuData }>(`/menu/${slug}`);
  return data.data;
}
