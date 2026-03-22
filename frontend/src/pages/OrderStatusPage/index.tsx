import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrder } from '../../api/orders';
import { useRealtimeOrderStatus } from '../../hooks/useRealtime';
import StatusTimeline from './StatusTimeline';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Loader2, Package } from 'lucide-react';
import type { PedidoStatus, STATUS_LABELS } from '../../types/order';

export default function OrderStatusPage() {
  const { pedidoId = '' } = useParams<{ pedidoId: string }>();
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const realtimeStatus = useRealtimeOrderStatus(pedidoId);

  const fetchOrder = () => {
    if (!pedidoId) return;
    getOrder(pedidoId).then(data => {
      setPedido(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  // Carga inicial
  useEffect(() => { fetchOrder(); }, [pedidoId]);

  // Polling a cada 5s como fallback ao realtime
  useEffect(() => {
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [pedidoId]);

  // Atualizar status via realtime (quando disponível)
  useEffect(() => {
    if (realtimeStatus && pedido) {
      setPedido((prev: any) => ({ ...prev, pedido: { ...prev.pedido, status: realtimeStatus } }));
    }
  }, [realtimeStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Pedido não encontrado</p>
        </div>
      </div>
    );
  }

  const order = pedido.pedido;
  const itens = pedido.itens || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 text-center shadow-card">
          <p className="text-gray-400 text-sm">Pedido #{order.numero}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</p>
        </div>

        {/* Status timeline */}
        <StatusTimeline
          status={order.status}
          tipoEntrega={order.tipo_entrega}
        />

        {/* Itens do pedido */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <h2 className="font-semibold text-gray-900 mb-3">Itens do pedido</h2>
          <div className="space-y-2">
            {itens.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.quantidade}x {item.nome_produto}</span>
                  {item.opcoes_selecionadas?.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {item.opcoes_selecionadas.map((o: any) => o.item_nome).join(', ')}
                    </p>
                  )}
                  {item.observacao && (
                    <p className="text-xs text-gray-400 italic">"{item.observacao}"</p>
                  )}
                </div>
                <span className="text-gray-700">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.tipo_entrega === 'delivery' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entrega</span>
                <span>{order.taxa_entrega === 0 ? 'Grátis' : formatCurrency(order.taxa_entrega)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-red-500">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Endereço (se delivery) */}
        {order.tipo_entrega === 'delivery' && order.endereco_entrega && (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <h2 className="font-semibold text-gray-900 mb-2">Endereço de entrega</h2>
            <p className="text-sm text-gray-600">
              {order.endereco_entrega.rua}, {order.endereco_entrega.numero}
              {order.endereco_entrega.complemento ? ` - ${order.endereco_entrega.complemento}` : ''}
            </p>
            <p className="text-sm text-gray-600">
              {order.endereco_entrega.bairro} - {order.endereco_entrega.cidade}/{order.endereco_entrega.estado}
            </p>
            {order.endereco_entrega.referencia && (
              <p className="text-xs text-gray-400 mt-1">{order.endereco_entrega.referencia}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
