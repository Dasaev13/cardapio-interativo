export interface PixPayment {
  pagamento_id: string;
  pix_qrcode: string | null;
  pix_copia_cola: string | null;
  pix_expira_em: string;
  valor: number;
}

export interface PaymentStatus {
  id: string;
  metodo: 'pix' | 'cartao' | 'dinheiro';
  status: 'pendente' | 'processando' | 'aprovado' | 'recusado' | 'expirado' | 'reembolsado' | 'cancelado';
  valor: number;
  pix_qrcode?: string | null;
  pix_copia_cola?: string | null;
  pix_expira_em?: string;
  card_last_four?: string;
  card_brand?: string;
  created_at: string;
  updated_at: string;
}
