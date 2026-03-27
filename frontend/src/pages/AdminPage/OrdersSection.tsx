import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { RefreshCw, ChevronDown, ChevronUp, Truck, Store, Clock, UtensilsCrossed } from 'lucide-react';

interface Order {
  id: string;
  numero: number;
  status: string;
  total: number;
  tipo_entrega: string;
  nome_cliente: string | null;
  telefone_cliente: string;
  forma_pagamento: string;
  mesa: string | null;
  impresso: boolean;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Novo',
  aguardando_pagamento: 'Aguard. Pix',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aguardando_pagamento: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-green-100 text-green-800',
  preparando: 'bg-orange-100 text-orange-800',
  pronto: 'bg-purple-100 text-purple-800',
  entregue: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-100 text-red-600',
};

const NEXT_STATUS: Record<string, { label: string; next: string; color: string } | null> = {
  pendente: { label: 'Confirmar', next: 'confirmado', color: 'bg-green-600 hover:bg-green-700' },
  confirmado: { label: 'Iniciar preparo', next: 'preparando', color: 'bg-orange-500 hover:bg-orange-600' },
  preparando: { label: 'Marcar pronto', next: 'pronto', color: 'bg-purple-600 hover:bg-purple-700' },
  pronto: { label: 'Entregar', next: 'entregue', color: 'bg-gray-600 hover:bg-gray-700' },
  aguardando_pagamento: null,
  entregue: null,
  cancelado: null,
};

const PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

export default function OrdersSection({ lojaId }: { lojaId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ativos');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ativos = ['pendente', 'aguardando_pagamento', 'confirmado', 'preparando', 'pronto'];
      const params = new URLSearchParams({ limit: '50' });
      if (filter === 'ativos') {
        ativos.forEach(s => params.append('status', s));
      } else if (filter !== 'todos') {
        params.set('status', filter);
      }
      const res = await apiClient.get(`/admin/pedidos?${params.toString()}`);
      setOrders(res.data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Realtime: novo pedido ou mudança de status
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `loja_id=eq.${lojaId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lojaId, load]);

  async function handleStatus(orderId: string, nextStatus: string) {
    setUpdating(orderId);
    try {
      await apiClient.put(`/admin/pedidos/${orderId}/status`, { status: nextStatus });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Erro desconhecido';
      alert(`Erro ao atualizar status: ${msg}`);
    } finally {
      setUpdating(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!confirm('Cancelar este pedido?')) return;
    await handleStatus(orderId, 'cancelado');
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const filterTabs = [
    { key: 'ativos', label: 'Ativos' },
    { key: 'entregue', label: 'Entregues' },
    { key: 'cancelado', label: 'Cancelados' },
    { key: 'todos', label: 'Todos' },
  ];

  const activeCount = orders.filter(o =>
    ['pendente', 'aguardando_pagamento', 'confirmado', 'preparando', 'pronto'].includes(o.status)
  ).length;

  return (
    <div>
      {/* Filtros */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {t.label}
              {t.key === 'ativos' && activeCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{activeCount}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum pedido {filter === 'ativos' ? 'ativo' : ''} no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const nextAction = NEXT_STATUS[order.status];
            const isExpanded = expanded.has(order.id);
            return (
              <div key={order.id} className={`bg-white rounded-xl border-2 transition-colors ${
                order.status === 'pendente' ? 'border-yellow-300' :
                order.status === 'preparando' ? 'border-orange-300' : 'border-gray-100'
              }`}>
                {/* Header do pedido */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="font-bold text-lg text-gray-900">#{order.numero}</div>
                        <div className="text-xs text-gray-400">{timeAgo(order.created_at)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {order.nome_cliente || order.telefone_cliente}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                            {STATUS_LABEL[order.status]}
                          </span>
                          {order.mesa ? (
                            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <UtensilsCrossed size={10} /> Mesa {order.mesa}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              {order.tipo_entrega === 'delivery'
                                ? <><Truck size={10} /> Entrega</>
                                : <><Store size={10} /> Retirada</>
                              }
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{PAGAMENTO_LABEL[order.forma_pagamento] || order.forma_pagamento}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-700">{formatCurrency(order.total)}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                {(nextAction || order.status !== 'cancelado') && (
                  <div className="px-4 pb-4 flex gap-2" onClick={e => e.stopPropagation()}>
                    {nextAction && (
                      <button
                        onClick={() => handleStatus(order.id, nextAction.next)}
                        disabled={updating === order.id}
                        className={`flex-1 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 ${nextAction.color}`}
                      >
                        {updating === order.id ? 'Atualizando...' : nextAction.label}
                      </button>
                    )}
                    {!['entregue', 'cancelado'].includes(order.status) && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={updating === order.id}
                        className="px-4 text-red-500 text-sm font-medium py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}

                {/* Detalhe expandido */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-1">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Tel:</span> {order.telefone_cliente}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
