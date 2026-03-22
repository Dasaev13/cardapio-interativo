import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Store } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useOrderStore } from '../../store/orderStore';
import { useMenu } from '../../hooks/useMenu';
import { createOrder } from '../../api/orders';
import { generateUUID, formatCurrency } from '../../utils/format';
import DeliveryForm from './DeliveryForm';
import DeliverySummary from './DeliverySummary';
import PaymentSelector from './PaymentSelector';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: menu } = useMenu(slug);
  const { items, totalPrice, clearCart, isEmpty } = useCartStore();
  const {
    tipoEntrega, setTipoEntrega,
    endereco, deliveryResult,
    formaPagamento, trocoParа,
    nomeCliente, setNomeCliente,
    telefoneCliente, setTelefoneCliente,
    observacao, setObservacao,
    setPedidoId,
  } = useOrderStore();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'delivery' | 'payment'>('delivery');
  const [submitted, setSubmitted] = useState(false);

  if (!submitted && (!menu || isEmpty())) {
    navigate(`/${slug}`);
    return null;
  }

  const { loja } = menu;
  const taxaEntrega = tipoEntrega === 'delivery' ? (deliveryResult?.taxa ?? 0) : 0;
  const total = totalPrice() + taxaEntrega;

  async function handleFinalize() {
    if (!telefoneCliente.trim()) {
      toast.error('Informe seu telefone (WhatsApp)');
      return;
    }
    if (!formaPagamento) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    if (tipoEntrega === 'delivery' && !endereco) {
      toast.error('Informe o endereço de entrega');
      setStep('delivery');
      return;
    }
    if (tipoEntrega === 'delivery' && !deliveryResult?.disponivel) {
      toast.error('Endereço fora da área de entrega');
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = generateUUID();

      const pedido = await createOrder({
        loja_slug: slug,
        telefone_cliente: telefoneCliente,
        nome_cliente: nomeCliente || undefined,
        tipo_entrega: tipoEntrega,
        endereco_entrega: tipoEntrega === 'delivery' && endereco ? {
          rua: endereco.rua,
          numero: endereco.numero,
          complemento: endereco.complemento,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          cep: endereco.cep,
          lat: endereco.lat,
          lng: endereco.lng,
          referencia: endereco.referencia,
        } : undefined,
        itens: items.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          opcoes_selecionadas: item.opcoes_selecionadas,
          observacao: item.observacao,
        })),
        forma_pagamento: formaPagamento,
        troco_para: trocoParа ?? undefined,
        observacao: observacao || undefined,
        idempotency_key: idempotencyKey,
        origem: 'web',
      });

      setPedidoId(pedido.id);
      setSubmitted(true);
      clearCart();

      // Redirecionar para página de pagamento
      navigate(`/${slug}/payment/${pedido.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/${slug}`)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Finalizar Pedido</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-32">
        {/* Tipo de entrega */}
        <div className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Como deseja receber?</h2>
          <div className="grid grid-cols-2 gap-3">
            {loja.config.aceitar_entrega && (
              <button
                onClick={() => setTipoEntrega('delivery')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  tipoEntrega === 'delivery'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <Truck size={24} className={tipoEntrega === 'delivery' ? 'text-red-500' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${tipoEntrega === 'delivery' ? 'text-red-500' : 'text-gray-600'}`}>
                  Entrega
                </span>
              </button>
            )}
            {loja.config.aceitar_retirada && (
              <button
                onClick={() => setTipoEntrega('retirada')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  tipoEntrega === 'retirada'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <Store size={24} className={tipoEntrega === 'retirada' ? 'text-red-500' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${tipoEntrega === 'retirada' ? 'text-red-500' : 'text-gray-600'}`}>
                  Retirada
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Dados do cliente */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Seus dados</h2>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nome (opcional)</label>
            <input
              type="text"
              value={nomeCliente}
              onChange={e => setNomeCliente(e.target.value)}
              placeholder="Seu nome"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">WhatsApp *</label>
            <input
              type="tel"
              value={telefoneCliente}
              onChange={e => setTelefoneCliente(e.target.value)}
              placeholder="(11) 99999-9999"
              className="input-field"
            />
          </div>
        </div>

        {/* Endereço de entrega */}
        {tipoEntrega === 'delivery' && (
          <DeliveryForm slug={slug} />
        )}

        {/* Resumo da taxa de entrega */}
        {tipoEntrega === 'delivery' && deliveryResult && (
          <DeliverySummary result={deliveryResult} />
        )}

        {/* Forma de pagamento */}
        <PaymentSelector loja={loja} tipoEntrega={tipoEntrega} total={total} />

        {/* Observação geral */}
        <div className="bg-white rounded-2xl p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Observações gerais <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Ex: interfone 203, deixar na portaria..."
            maxLength={300}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        {/* Resumo do pedido */}
        <div className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Resumo</h2>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantidade}x {item.nome}</span>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(totalPrice())}</span>
              </div>
              {tipoEntrega === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Entrega</span>
                  <span className={taxaEntrega === 0 ? 'text-green-600 font-medium' : ''}>
                    {taxaEntrega === 0 ? 'Grátis' : formatCurrency(taxaEntrega)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-red-500">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botão finalizar (fixo) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleFinalize}
            disabled={loading}
            className="w-full btn-primary flex items-center justify-between"
          >
            <span>{loading ? 'Processando...' : 'Confirmar Pedido'}</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
