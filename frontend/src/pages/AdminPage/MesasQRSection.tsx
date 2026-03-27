import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, QrCode } from 'lucide-react';

interface MesasQRSectionProps {
  lojaSlug: string;
}

export default function MesasQRSection({ lojaSlug }: MesasQRSectionProps) {
  const [quantidade, setQuantidade] = useState(10);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;
  const mesas = Array.from({ length: quantidade }, (_, i) => i + 1);

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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Quantidade de mesas:</label>
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
          Imprimir todos
        </button>
      </div>

      <div ref={printRef} className="grid">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {mesas.map(mesa => {
            const url = `${baseUrl}/${lojaSlug}?mesa=${mesa}`;
            return (
              <div
                key={mesa}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-1 text-gray-700">
                  <QrCode size={14} />
                  <span className="text-xs font-medium uppercase tracking-wide">Escaneie para pedir</span>
                </div>
                <QRCodeSVG value={url} size={140} level="M" />
                <div>
                  <p className="font-bold text-xl text-gray-900">Mesa {mesa}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Escaneie e faça seu pedido</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
