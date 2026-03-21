import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { CalculateDeliveryInput } from '../validators/delivery.validator';

export interface DeliveryResult {
  disponivel: boolean;
  taxa: number;
  tempo_min: number;
  tempo_max: number;
  metodo: 'bairro' | 'distancia';
  distancia_km?: number;
  bairro_id?: string;
  faixa_id?: string;
  mensagem?: string;
}

// Fórmula de Haversine para distância em km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export async function calculateDeliveryFee(input: CalculateDeliveryInput): Promise<DeliveryResult> {
  // Buscar loja
  const { data: loja, error: lojaError } = await supabase
    .from('lojas')
    .select('id, config, endereco')
    .eq('slug', input.slug)
    .eq('ativo', true)
    .single();

  if (lojaError || !loja) {
    throw new AppError(404, 'Loja não encontrada', 'LOJA_NOT_FOUND');
  }

  // PRIORIDADE 1: Busca por bairro (texto)
  if (input.bairro) {
    const { data: bairroData } = await supabase
      .rpc('calcular_taxa_entrega_bairro', {
        p_loja_id: loja.id,
        p_bairro: input.bairro,
      });

    if (bairroData && bairroData.length > 0) {
      const b = bairroData[0];
      return {
        disponivel: true,
        taxa: Number(b.taxa),
        tempo_min: b.tempo_min,
        tempo_max: b.tempo_max,
        metodo: 'bairro',
        bairro_id: b.bairro_id,
      };
    }
  }

  // FALLBACK: Cálculo por distância (se coordenadas fornecidas)
  if (input.lat !== undefined && input.lng !== undefined) {
    const lojaEndereco = loja.endereco as any;

    if (!lojaEndereco?.lat || !lojaEndereco?.lng) {
      return {
        disponivel: false,
        taxa: 0,
        tempo_min: 0,
        tempo_max: 0,
        metodo: 'distancia',
        mensagem: 'Endereço da loja não configurado para cálculo por distância',
      };
    }

    const distancia = haversineDistance(
      lojaEndereco.lat,
      lojaEndereco.lng,
      input.lat,
      input.lng
    );

    const { data: faixaData } = await supabase
      .rpc('calcular_taxa_entrega_distancia', {
        p_loja_id: loja.id,
        p_distancia_km: distancia,
      });

    if (faixaData && faixaData.length > 0) {
      const f = faixaData[0];
      return {
        disponivel: true,
        taxa: Number(f.taxa),
        tempo_min: f.tempo_min,
        tempo_max: f.tempo_max,
        metodo: 'distancia',
        distancia_km: Math.round(distancia * 100) / 100,
        faixa_id: f.faixa_id,
      };
    }

    // Fora da área de entrega
    return {
      disponivel: false,
      taxa: 0,
      tempo_min: 0,
      tempo_max: 0,
      metodo: 'distancia',
      distancia_km: Math.round(distancia * 100) / 100,
      mensagem: `Endereço fora da área de entrega (${Math.round(distancia * 10) / 10}km)`,
    };
  }

  // Bairro não encontrado e sem coordenadas
  return {
    disponivel: false,
    taxa: 0,
    tempo_min: 0,
    tempo_max: 0,
    metodo: 'bairro',
    mensagem: `Bairro "${input.bairro}" não atendido. Verifique o endereço ou forneça coordenadas.`,
  };
}
