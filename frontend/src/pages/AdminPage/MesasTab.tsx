import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, QrCode, RefreshCw, UtensilsCrossed, X, ChevronDown, ChevronUp, Banknote, CreditCard, Copy, Check } from 'lucide-react';
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';

interface PedidoItem {
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
}

interface Pedido {
  id: string;
  numero: number;
  status: string;
  total: number;
  nome_cliente: string | null;
  telefone_cliente: string;
  created_at: string;
  pedido_itens: PedidoItem[];
}

interface Mesa {
  mesa: string;
  pedidos: Pedido[];
  total: number;
  aberta_desde: string;
}

interface PixData {
  pagamento_id: string;
  pix_qrcode: string | null;
  pix_copia_cola: string | null;
  pix_expira_em: string;
  valor: number;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Novo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  pronto: 'Pronto',
};

const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-green-100 text-green-800',
  preparando: 'bg-orange-100 text-orange-800',
  pronto: 'bg-purple-100 text-purple-800',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

interface PaymentModalProps {
  mesa: Mesa;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ mesa, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<'select' | 'pix'>('select');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Polling para verificar pagamento Pix
  useEffect(() => {
    if (!pixData) return;
    const id = window.setInterval(async () => {
      try {
        const res = await apiClient.get(`/payments/${pixData.pagamento_id}`);
        const status = res.data.data?.status;
        if (status === 'aprovado') {
          clearInterval(id);
          // Fechar todos os pedidos da mesa
          await apiClient.put(`/admin/mesas/${mesa.mesa}/fechar`);
          onSuccess();
        }
        // Atualizar QR se ainda não tinha
        if (!pixData.pix_qrcode && res.data.data?.pix_qrcode) {
          setPixData(prev => prev ? { ...prev, ...res.data.data } : prev);
        }
      } catch { /* continua polling */ }
    }, 3000);
    setPollingId(id);
    return () => clearInterval(id);
  }, [pixData]);

  async function handlePagamento(forma: 'dinheiro' | 'cartao' | 'pix') {
    setLoading(true);
    try {
      const res = await apiClient.post(`/admin/mesas/${mesa.mesa}/checkout`, { forma_pagamento: forma });
      if (forma === 'pix') {
        setPixData(res.data.data);
        setStep('pix');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (pixData?.pix_copia_cola) {
      navigator.clipboard.writeText(pixData.pix_copia_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Fechar conta — Mesa {mesa.mesa}</h2>
            <p className="text-sm text-gray-500">Total: <span className="font-bold text-amber-700">{formatCurrency(mesa.total)}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {step === 'select' && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600 text-center mb-2">Selecione a forma de pagamento</p>

            <button
              onClick={() => handlePagamento('dinheiro')}
              disabled={loading}
              className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Banknote size={20} className="text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Dinheiro</p>
                <p className="text-xs text-gray-500">Pagamento em espécie</p>
              </div>
            </button>

            <button
              onClick={() => handlePagamento('cartao')}
              disabled={loading}
              className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Cartão</p>
                <p className="text-xs text-gray-500">Crédito ou débito (maquininha)</p>
              </div>
            </button>

            <button
              onClick={() => handlePagamento('pix')}
              disabled={loading}
              className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <QrCode size={20} className="text-teal-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Pix</p>
                <p className="text-xs text-gray-500">QR Code instantâneo</p>
              </div>
            </button>

            {loading && <p className="text-center text-sm text-gray-400 animate-pulse">Processando...</p>}
          </div>
        )}

        {step === 'pix' && (
          <div className="p-4 space-y-4">
            <p className="text-center text-sm text-gray-600">
              Mostre o QR Code para o cliente escanear
            </p>

            <div className="flex justify-center">
              {pixData?.pix_qrcode ? (
                <img src={pixData.pix_qrcode} alt="QR Code Pix" className="w-48 h-48 rounded-lg" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">Gerando QR Code...</p>
                </div>
              )}
            </div>

            {pixData?.pix_copia_cola && (
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar código Pix'}
              </button>
            )}

            <div className="text-center">
              <p className="text-xs text-gray-400 animate-pulse">Aguardando pagamento...</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MesasTabProps {
  lojaId: string;
  lojaSlug: string;
}

export default function MesasTab({ lojaId, lojaSlug }: MesasTabProps) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const [quantidade, setQuantidade] = useState(10);
  const [payingMesa, setPayingMesa] = useState<Mesa | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/mesas');
      setMesas(res.data.data || []);
    } catch {
      setMesas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-mesas')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `loja_id=eq.${lojaId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lojaId, load]);

  function toggleExpand(mesa: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(mesa) ? s.delete(mesa) : s.add(mesa);
      return s;
    });
  }

  function handlePrint() {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;
    const janela = window.open('', '_blank');
    if (!janela) return;
    janela.document.write(`
      <html>
        <head>
          <title>QR Codes das Mesas</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; background: white; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; }
            .card { border: 2px dashed #ccc; border-radius: 12px; padding: 20px; text-align: center; break-inside: avoid; }
            .card h2 { font-size: 22px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a; }
            .card p { font-size: 11px; color: #666; margin-top: 8px; }
            svg { display: block; margin: 0 auto; }
            @media print { .grid { gap: 8px; padding: 8px; } }
          </style>
        </head>
        <body>${conteudo}</body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 300);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">Mesas abertas</h2>
          {mesas.length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {mesas.length}
            </span>
          )}
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando mesas...</div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <UtensilsCrossed size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma mesa com pedidos abertos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mesas.map(m => {
            const isExpanded = expanded.has(m.mesa);
            return (
              <div key={m.mesa} className="bg-white rounded-xl border-2 border-amber-200">
                <div className="p-4 cursor-pointer" onClick={() => toggleExpand(m.mesa)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Mesa {m.mesa}</p>
                        <p className="text-xs text-gray-500">
                          {m.pedidos.length} {m.pedidos.length === 1 ? 'pedido' : 'pedidos'} • aberta há {timeAgo(m.aberta_desde)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-700 text-lg">{formatCurrency(m.total)}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-amber-100 px-4 pb-4 pt-3 space-y-3">
                    {m.pedidos.map(pedido => (
                      <div key={pedido.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-700 text-sm">#{pedido.numero}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[pedido.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[pedido.status] || pedido.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {pedido.pedido_itens.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                              <span>{item.quantidade}x {item.nome_produto}</span>
                              <span>{formatCurrency(item.quantidade * item.preco_unitario)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-gray-800 mt-2 pt-2 border-t border-gray-200">
                          <span>Subtotal</span>
                          <span>{formatCurrency(pedido.total)}</span>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-xs text-gray-500">Total da conta</p>
                        <p className="font-bold text-xl text-amber-700">{formatCurrency(m.total)}</p>
                      </div>
                      <button
                        onClick={() => setPayingMesa(m)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <CreditCard size={16} /> Fechar conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Seção QR Codes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowQR(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <QrCode size={16} />
            Gerar QR Codes das mesas
          </div>
          {showQR ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showQR && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Quantidade:</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantidade}
                  onChange={e => setQuantidade(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
              >
                <Printer size={16} />
                Imprimir
              </button>
            </div>

            <div ref={printRef}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: quantidade }, (_, i) => i + 1).map(mesa => {
                  const url = `${baseUrl}/${lojaSlug}?mesa=${mesa}`;
                  return (
                    <div key={mesa} className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1 text-gray-600">
                        <QrCode size={12} />
                        <span className="text-xs font-medium uppercase tracking-wide">Escaneie para pedir</span>
                      </div>
                      <QRCodeSVG value={url} size={120} level="M" />
                      <p className="font-bold text-lg text-gray-900">Mesa {mesa}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de pagamento */}
      {payingMesa && (
        <PaymentModal
          mesa={payingMesa}
          onClose={() => setPayingMesa(null)}
          onSuccess={() => {
            setPayingMesa(null);
            load();
          }}
        />
      )}
    </div>
  );
}
