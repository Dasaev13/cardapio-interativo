import https from 'https';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { supabase } from '../../config/supabase';
import { pixTimeoutQueue } from '../../config/queues';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { PixPaymentInput } from '../../validators/payment.validator';

const PIX_EXPIRY_MINUTES = 5;

interface GerencianetTokenResponse {
  access_token: string;
  expires_in: number;
}

interface GerencianetPixResponse {
  txid: string;
  qrcode: {
    imagemQrcode: string;
    qrcode: string;
  };
  revisao: number;
  status: string;
  valor: { original: string };
  chave: string;
  solicitacaoPagador?: string;
}

async function getGerencianetToken(): Promise<string> {
  if (!env.GERENCIANET_CLIENT_ID || !env.GERENCIANET_CLIENT_SECRET) {
    throw new AppError(500, 'Gerencianet não configurado', 'PAYMENT_CONFIG_ERROR');
  }

  const credentials = Buffer.from(
    `${env.GERENCIANET_CLIENT_ID}:${env.GERENCIANET_CLIENT_SECRET}`
  ).toString('base64');

  const baseUrl = env.GERENCIANET_SANDBOX
    ? 'https://pix-h.api.efipay.com.br'
    : 'https://pix.api.efipay.com.br';

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `Erro ao autenticar Gerencianet: ${text}`, 'PAYMENT_AUTH_ERROR');
  }

  const data = await response.json() as GerencianetTokenResponse;
  return data.access_token;
}

async function createGerencianetPix(
  token: string,
  txid: string,
  valor: number,
  nomePagador?: string,
  cpfPagador?: string
): Promise<GerencianetPixResponse> {
  const baseUrl = env.GERENCIANET_SANDBOX
    ? 'https://pix-h.api.efipay.com.br'
    : 'https://pix.api.efipay.com.br';

  const expiracaoSegundos = PIX_EXPIRY_MINUTES * 60;

  const body: any = {
    calendario: {
      expiracao: expiracaoSegundos,
    },
    valor: {
      original: valor.toFixed(2),
    },
    chave: env.GERENCIANET_PIX_KEY!,
    solicitacaoPagador: 'Pagamento de pedido',
  };

  if (nomePagador && cpfPagador) {
    body.devedor = {
      cpf: cpfPagador.replace(/\D/g, ''),
      nome: nomePagador,
    };
  }

  const response = await fetch(`${baseUrl}/v2/cob/${txid}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `Erro ao gerar Pix: ${text}`, 'PIX_GENERATION_ERROR');
  }

  // Buscar QR Code
  const cobResponse = await response.json();

  const qrResponse = await fetch(`${baseUrl}/v2/loc/${cobResponse.loc?.id}/qrcode`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const qrData = await qrResponse.json();

  return {
    ...cobResponse,
    qrcode: qrData,
  };
}

export async function generatePixPayment(input: PixPaymentInput): Promise<{
  pagamento_id: string;
  pix_qrcode: string;
  pix_copia_cola: string;
  pix_expira_em: string;
  valor: number;
}> {
  // Verificar idempotência
  const { data: existingPagamento } = await supabase
    .from('pagamentos')
    .select('id, pix_qrcode, pix_copia_cola, pix_expira_em, valor, status')
    .eq('idempotency_key', input.idempotency_key)
    .single();

  if (existingPagamento) {
    if (existingPagamento.status === 'expirado') {
      throw new AppError(400, 'Este Pix expirou. Gere um novo pagamento.', 'PIX_EXPIRED');
    }
    return {
      pagamento_id: existingPagamento.id,
      pix_qrcode: existingPagamento.pix_qrcode,
      pix_copia_cola: existingPagamento.pix_copia_cola,
      pix_expira_em: existingPagamento.pix_expira_em,
      valor: existingPagamento.valor,
    };
  }

  // Buscar pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('id, loja_id, total, status, telefone_cliente')
    .eq('id', input.pedido_id)
    .single();

  if (pedidoError || !pedido) {
    throw new AppError(404, 'Pedido não encontrado', 'PEDIDO_NOT_FOUND');
  }

  if (!['pendente', 'aguardando_pagamento'].includes(pedido.status)) {
    throw new AppError(400, `Pedido não pode receber pagamento. Status: ${pedido.status}`, 'INVALID_ORDER_STATUS');
  }

  const valor = Number(pedido.total);
  const txid = input.idempotency_key.replace(/-/g, '').slice(0, 35);
  const expiraEm = new Date(Date.now() + PIX_EXPIRY_MINUTES * 60 * 1000);

  let pixQrcode: string;
  let pixCopiaCola: string;
  let pixTxid: string;

  // Tentar Gerencianet; fallback para QR Code simulado em desenvolvimento
  if (env.GERENCIANET_CLIENT_ID && env.GERENCIANET_PIX_KEY) {
    try {
      const token = await getGerencianetToken();
      const pixData = await createGerencianetPix(
        token, txid, valor, input.nome_devedor, input.cpf_devedor
      );

      pixCopiaCola = pixData.qrcode.qrcode;
      pixTxid = pixData.txid;

      // Gerar imagem QR Code em base64
      pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    } catch (err) {
      console.error('[Pix] Erro Gerencianet, usando simulação:', err);
      pixCopiaCola = `00020126580014br.gov.bcb.pix0136${env.GERENCIANET_PIX_KEY}5204000053039865406${valor.toFixed(2).replace('.', '')}5802BR5910CardapioApp6007Sao Paulo62070503***6304ABCD`;
      pixTxid = txid;
      pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    }
  } else {
    // Modo desenvolvimento sem Gerencianet
    pixCopiaCola = `PIX_SIMULADO_${txid}_${valor.toFixed(2)}`;
    pixTxid = txid;
    pixQrcode = await QRCode.toDataURL(pixCopiaCola);
    console.warn('[Pix] Modo simulação - configure GERENCIANET_CLIENT_ID para produção');
  }

  // Salvar pagamento no banco
  const { data: pagamento, error: pgError } = await supabase
    .from('pagamentos')
    .insert({
      pedido_id: pedido.id,
      loja_id: pedido.loja_id,
      metodo: 'pix',
      status: 'pendente',
      valor,
      gateway: 'gerencianet',
      gateway_id: pixTxid,
      pix_txid: pixTxid,
      pix_qrcode: pixQrcode,
      pix_copia_cola: pixCopiaCola,
      pix_expira_em: expiraEm.toISOString(),
      idempotency_key: input.idempotency_key,
    })
    .select('id')
    .single();

  if (pgError || !pagamento) {
    throw new AppError(500, 'Erro ao salvar pagamento', 'DB_ERROR');
  }

  // Atualizar pedido para aguardando_pagamento
  await supabase
    .from('pedidos')
    .update({ status: 'aguardando_pagamento' })
    .eq('id', pedido.id);

  // Enfileirar job de timeout (delay = tempo em ms até expiração)
  const delayMs = expiraEm.getTime() - Date.now();
  await pixTimeoutQueue.add(
    'pix-timeout',
    { pagamento_id: pagamento.id, pedido_id: pedido.id, loja_id: pedido.loja_id, telefone: pedido.telefone_cliente },
    { delay: delayMs, jobId: `pix-timeout-${pagamento.id}` }
  );

  return {
    pagamento_id: pagamento.id,
    pix_qrcode: pixQrcode,
    pix_copia_cola: pixCopiaCola,
    pix_expira_em: expiraEm.toISOString(),
    valor,
  };
}

export async function handlePixWebhook(payload: any): Promise<void> {
  // Payload Gerencianet: { pix: [{ txid, endToEndId, valor, horario, pagador }] }
  if (!payload?.pix?.length) return;

  for (const pix of payload.pix) {
    const txid = pix.txid;

    // Buscar pagamento pelo txid
    const { data: pagamento } = await supabase
      .from('pagamentos')
      .select('id, pedido_id, loja_id, status, valor')
      .eq('pix_txid', txid)
      .single();

    if (!pagamento || pagamento.status === 'aprovado') continue;

    // Confirmar pagamento
    await supabase
      .from('pagamentos')
      .update({
        status: 'aprovado',
        gateway_payload: pix,
      })
      .eq('id', pagamento.id);

    // O trigger sync_pedido_status_on_payment cuida de atualizar o pedido

    console.log(`[Pix] Pagamento confirmado: pedido ${pagamento.pedido_id}`);
  }
}
