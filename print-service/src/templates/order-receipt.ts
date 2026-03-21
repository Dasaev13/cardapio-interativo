export interface ReceiptData {
  pedido: {
    id: string;
    numero: number;
    tipo_entrega: 'delivery' | 'retirada';
    nome_cliente?: string;
    telefone_cliente: string;
    subtotal: number;
    taxa_entrega: number;
    total: number;
    forma_pagamento?: string;
    troco_para?: number;
    observacao?: string;
    created_at: string;
    endereco_entrega?: {
      rua?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      referencia?: string;
    };
  };
  itens: Array<{
    quantidade: number;
    nome_produto: string;
    preco_unitario: number;
    subtotal: number;
    opcoes_selecionadas?: Array<{ nome: string; item_nome: string }>;
    observacao?: string;
  }>;
  pagamento?: {
    metodo: string;
    status: string;
  };
  loja?: {
    nome: string;
  };
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} ${h}:${m}`;
}

function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len);
}

function padLeft(str: string, len: number): string {
  return str.substring(0, len).padStart(len);
}

const LINE_WIDTH = 42;
const DIVIDER = '─'.repeat(LINE_WIDTH);

export function buildReceiptLines(data: ReceiptData): Array<{
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: 'normal' | 'large';
}> {
  const { pedido, itens, pagamento, loja } = data;
  const lines: Array<{ text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'large' }> = [];

  const add = (text: string, align: 'left' | 'center' | 'right' = 'left', bold = false, size: 'normal' | 'large' = 'normal') => {
    lines.push({ text, align, bold, size });
  };

  // Cabeçalho
  add(loja?.nome || 'CARDÁPIO DIGITAL', 'center', true, 'large');
  add('');
  add(`Pedido #${pedido.numero}`, 'center', true);
  add(pedido.tipo_entrega === 'delivery' ? '🛵 ENTREGA' : '🏪 RETIRADA', 'center');
  add(formatDateTime(pedido.created_at), 'center');
  add(DIVIDER, 'center');

  // Cliente
  if (pedido.nome_cliente) add(`Cliente: ${pedido.nome_cliente}`, 'left');
  add(`Tel: ${pedido.telefone_cliente}`, 'left');
  add(DIVIDER, 'center');

  // Itens
  add('ITENS', 'left', true);
  add('');
  for (const item of itens) {
    // Linha principal do item
    const qtd = `${item.quantidade}x`;
    const price = formatCurrency(item.subtotal);
    const available = LINE_WIDTH - qtd.length - 1 - price.length;
    const name = item.nome_produto.substring(0, available);
    add(`${qtd} ${padRight(name, available)} ${price}`);

    // Opções selecionadas
    if (item.opcoes_selecionadas?.length) {
      const opts = item.opcoes_selecionadas.map(o => o.item_nome).join(', ');
      add(`   ${opts}`, 'left');
    }

    // Observação do item
    if (item.observacao) {
      add(`   Obs: ${item.observacao}`, 'left');
    }
  }

  add('');
  add(DIVIDER, 'center');

  // Totais
  const subtotalLine = padRight('Subtotal:', 28) + padLeft(formatCurrency(pedido.subtotal), LINE_WIDTH - 28);
  add(subtotalLine);

  if (pedido.tipo_entrega === 'delivery' && pedido.taxa_entrega >= 0) {
    const entregaLine = padRight('Taxa de entrega:', 28) + padLeft(
      pedido.taxa_entrega === 0 ? 'Grátis' : formatCurrency(pedido.taxa_entrega),
      LINE_WIDTH - 28
    );
    add(entregaLine);
  }

  const totalLine = padRight('TOTAL:', 28) + padLeft(formatCurrency(pedido.total), LINE_WIDTH - 28);
  add(totalLine, 'left', true, 'large');

  add(DIVIDER, 'center');

  // Pagamento
  const formaPagMap: Record<string, string> = {
    pix: 'PIX',
    cartao: 'CARTÃO',
    dinheiro: 'DINHEIRO',
  };
  const formaLabel = formaPagMap[pedido.forma_pagamento || ''] || pedido.forma_pagamento || '';
  const statusLabel = pagamento?.status === 'aprovado' ? '✓ PAGO' : '⏳ PENDENTE';

  add(`Pagamento: ${formaLabel} ${statusLabel}`);

  if (pedido.troco_para) {
    add(`Troco para: ${formatCurrency(pedido.troco_para)}`);
    add(`Troco: ${formatCurrency(pedido.troco_para - pedido.total)}`);
  }

  add(DIVIDER, 'center');

  // Endereço de entrega
  if (pedido.tipo_entrega === 'delivery' && pedido.endereco_entrega) {
    add('ENDEREÇO DE ENTREGA', 'left', true);
    const end = pedido.endereco_entrega;
    if (end.rua) add(`${end.rua}, ${end.numero}${end.complemento ? ` - ${end.complemento}` : ''}`);
    if (end.bairro) add(end.bairro);
    if (end.referencia) add(`Ref: ${end.referencia}`);
    add(DIVIDER, 'center');
  }

  // Observação geral
  if (pedido.observacao) {
    add('OBSERVAÇÕES:', 'left', true);
    add(pedido.observacao);
    add(DIVIDER, 'center');
  }

  // Rodapé
  add('');
  add('Obrigado pela preferência!', 'center');
  add('cardapio.app', 'center');
  add('');

  return lines;
}
