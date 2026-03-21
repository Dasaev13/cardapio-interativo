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

export interface BairroEntrega {
  id: string;
  nome: string;
  cidade: string;
  taxa: number;
  tempo_min: number;
  tempo_max: number;
}
