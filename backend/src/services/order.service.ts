import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { CreatePedidoInput } from '../validators/order.validator';
import { calculateDeliveryFee } from './delivery.service';
import { notificationQueue, printQueue } from '../config/queues';
import { sendN8nEvent, notifyNovoPedido, notifyStatusPedido } from './whatsapp.service';
import { env } from '../config/env';

export interface PedidoCompleto {
  id: string;
  numero: number;
  loja_id: string;
  status: string;
  total: number;
  taxa_entrega: number;
  subtotal: number;
  tipo_entrega: string;
  telefone_cliente: string;
  nome_cliente?: string;
  forma_pagamento?: string;
  created_at: string;
  itens: PedidoItem[];
}

interface PedidoItem {
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  opcoes_selecionadas: any[];
  observacao?: string;
}

export async function createPedido(input: CreatePedidoInput): Promise<PedidoCompleto> {
  // 1. Verificar idempotência - pedido já existe?
  const { data: existing } = await supabase
    .from('pedidos')
    .select('id, numero, status, total, taxa_entrega, subtotal, tipo_entrega, telefone_cliente, forma_pagamento, created_at')
    .eq('idempotency_key', input.idempotency_key)
    .single();

  if (existing) {
    // Retornar pedido existente (idempotência)
    const { data: itens } = await supabase
      .from('pedido_itens')
      .select('*')
      .eq('pedido_id', existing.id);

    return { ...existing, loja_id: '', nome_cliente: '', itens: itens || [] };
  }

  // 2. Buscar loja
  const { data: loja, error: lojaError } = await supabase
    .from('lojas')
    .select('id, config, ativo, aberto, telefone')
    .eq('slug', input.loja_slug)
    .single();

  if (lojaError || !loja) {
    throw new AppError(404, 'Loja não encontrada', 'LOJA_NOT_FOUND');
  }

  if (!loja.ativo) {
    throw new AppError(400, 'Loja inativa', 'LOJA_INACTIVE');
  }

  // 3. Validar produtos e calcular subtotal
  const produtoIds = input.itens.map(i => i.produto_id);
  const { data: produtos, error: prodError } = await supabase
    .from('produtos')
    .select('id, nome, preco, disponivel, opcoes, loja_id')
    .in('id', produtoIds)
    .eq('loja_id', loja.id);

  if (prodError) throw new AppError(500, 'Erro ao validar produtos', 'DB_ERROR');

  const produtoMap = new Map(produtos?.map(p => [p.id, p]) || []);

  let subtotal = 0;
  const itensProcessados: PedidoItem[] = [];

  for (const item of input.itens) {
    const produto = produtoMap.get(item.produto_id);

    if (!produto) {
      throw new AppError(400, `Produto ${item.produto_id} não encontrado nesta loja`, 'PRODUTO_NOT_FOUND');
    }

    if (!produto.disponivel) {
      throw new AppError(400, `Produto "${produto.nome}" não está disponível`, 'PRODUTO_UNAVAILABLE');
    }

    // Calcular adicionais das opções selecionadas
    let precoBase = Number(produto.preco);
    let adicionalOpcoes = 0;

    for (const opcao of item.opcoes_selecionadas) {
      adicionalOpcoes += Number(opcao.preco_adicional || 0);
    }

    const precoUnitario = precoBase + adicionalOpcoes;
    const itemSubtotal = precoUnitario * item.quantidade;
    subtotal += itemSubtotal;

    itensProcessados.push({
      produto_id: produto.id,
      nome_produto: produto.nome,
      quantidade: item.quantidade,
      preco_unitario: precoUnitario,
      subtotal: itemSubtotal,
      opcoes_selecionadas: item.opcoes_selecionadas,
      observacao: item.observacao,
    });
  }

  // 4. Verificar pedido mínimo
  const pedidoMinimo = Number(loja.config?.pedido_minimo || 0);
  if (subtotal < pedidoMinimo) {
    throw new AppError(
      400,
      `Pedido mínimo é R$ ${pedidoMinimo.toFixed(2)}. Seu pedido está em R$ ${subtotal.toFixed(2)}.`,
      'PEDIDO_MINIMO'
    );
  }

  // 5. Calcular taxa de entrega
  let taxaEntrega = 0;
  let bairroEntregaId: string | undefined;
  let faixaEntregaId: string | undefined;

  if (input.tipo_entrega === 'delivery' && input.endereco_entrega) {
    const deliveryResult = await calculateDeliveryFee({
      slug: input.loja_slug,
      bairro: input.endereco_entrega.bairro,
      lat: input.endereco_entrega.lat,
      lng: input.endereco_entrega.lng,
    });

    if (!deliveryResult.disponivel) {
      throw new AppError(400, deliveryResult.mensagem || 'Endereço fora da área de entrega', 'FORA_AREA_ENTREGA');
    }

    taxaEntrega = deliveryResult.taxa;
    bairroEntregaId = deliveryResult.bairro_id;
    faixaEntregaId = deliveryResult.faixa_id;
  }

  // 6. Calcular taxa de serviço
  const taxaServicoPct = Number(loja.config?.taxa_servico_pct || 0);
  const taxaServico = (subtotal * taxaServicoPct) / 100;

  // 7. Total final
  const total = subtotal + taxaEntrega + taxaServico;

  // 8. Criar pedido no banco
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      loja_id: loja.id,
      telefone_cliente: input.telefone_cliente,
      nome_cliente: input.nome_cliente,
      tipo_entrega: input.tipo_entrega,
      endereco_entrega: input.endereco_entrega || null,
      bairro_entrega_id: bairroEntregaId || null,
      faixa_entrega_id: faixaEntregaId || null,
      subtotal,
      taxa_entrega: taxaEntrega,
      taxa_servico: taxaServico,
      desconto: 0,
      total,
      forma_pagamento: input.forma_pagamento,
      troco_para: input.troco_para || null,
      status: 'pendente',
      observacao: input.observacao,
      origem: input.origem,
      idempotency_key: input.idempotency_key,
      session_id: input.session_id || null,
      mesa: input.mesa || null,
    })
    .select('id, numero, loja_id, status, total, taxa_entrega, subtotal, tipo_entrega, telefone_cliente, nome_cliente, forma_pagamento, mesa, created_at')
    .single();

  if (pedidoError || !pedido) {
    throw new AppError(500, 'Erro ao criar pedido', 'DB_ERROR');
  }

  // 9. Inserir itens do pedido
  const { error: itensError } = await supabase
    .from('pedido_itens')
    .insert(
      itensProcessados.map(item => ({
        pedido_id: pedido.id,
        loja_id: loja.id,
        produto_id: item.produto_id,
        nome_produto: item.nome_produto,
        preco_unitario: item.preco_unitario,
        quantidade: item.quantidade,
        opcoes_selecionadas: item.opcoes_selecionadas,
        subtotal: item.subtotal,
        observacao: item.observacao,
      }))
    );

  if (itensError) {
    // Rollback manual - deletar pedido criado
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    throw new AppError(500, 'Erro ao criar itens do pedido', 'DB_ERROR');
  }

  // 10. Notificar via WhatsApp (assíncrono, não bloqueia resposta)
  if (loja.telefone && env.EVOLUTION_API_URL) {
    notifyNovoPedido({
      instance: loja.config?.whatsapp_instance || env.EVOLUTION_INSTANCE,
      telefoneRestaurante: loja.telefone,
      telefoneCliente: input.telefone_cliente || undefined,
      nomeCliente: input.nome_cliente,
      numeroPedido: pedido.numero,
      total,
      tipoEntrega: input.tipo_entrega,
      formaPagamento: input.forma_pagamento,
      mesa: input.mesa,
    }).catch(err => console.error('[Order] Erro ao notificar WhatsApp:', err));
  }

  // 11. Se pagamento em dinheiro ou mesa, confirmar e enfileirar impressão
  if (input.forma_pagamento === 'dinheiro' || input.forma_pagamento === 'mesa') {
    // Enfileirar impressão (assíncrono, não bloqueia resposta)
    printQueue.add('print-order', { pedido_id: pedido.id, loja_id: loja.id })
      .catch(err => console.error('[Order] Erro ao enfileirar impressão:', err.message));
  }

  return {
    ...pedido,
    itens: itensProcessados,
  };
}

export async function getPedidoById(pedidoId: string) {
  const { data, error } = await supabase
    .rpc('get_pedido_completo', { p_pedido_id: pedidoId });

  if (error || !data) {
    throw new AppError(404, 'Pedido não encontrado', 'PEDIDO_NOT_FOUND');
  }

  return data;
}

export async function updatePedidoStatus(
  pedidoId: string,
  lojaId: string,
  status: string
): Promise<void> {
  const validStatuses = [
    'pendente', 'aguardando_pagamento', 'confirmado',
    'preparando', 'pronto',
    'entregue', 'cancelado', 'recusado',
  ];

  if (!validStatuses.includes(status)) {
    throw new AppError(400, 'Status inválido', 'INVALID_STATUS');
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ status })
    .eq('id', pedidoId)
    .eq('loja_id', lojaId);

  if (error) {
    throw new AppError(500, 'Erro ao atualizar status', 'DB_ERROR');
  }

  // Notificar cliente sobre mudança de status via WhatsApp
  if (env.EVOLUTION_API_URL) {
    supabase
      .from('pedidos')
      .select('numero, telefone_cliente, tipo_entrega, mesa, lojas(telefone, config)')
      .eq('id', pedidoId)
      .single()
      .then(({ data: p }) => {
        if (!p?.telefone_cliente) return;
        const lojaData = (p as any).lojas;
        notifyStatusPedido({
          instance: lojaData?.config?.whatsapp_instance || env.EVOLUTION_INSTANCE,
          telefoneCliente: p.telefone_cliente,
          numeroPedido: p.numero,
          status,
          tipoEntrega: p.tipo_entrega,
          mesa: p.mesa,
        }).catch(() => {});
      })
      .catch(() => {});
  }
}
