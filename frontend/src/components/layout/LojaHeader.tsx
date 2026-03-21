import { Clock, MapPin } from 'lucide-react';
import type { Loja } from '../../types/menu';

interface Props {
  loja: Loja;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function LojaHeader({ loja }: Props) {
  const hoje = new Date().getDay();
  const horarioHoje = loja.horarios?.find(h => h.dia_semana === hoje && h.ativo);

  return (
    <div className="relative">
      {/* Banner */}
      {loja.banner_url ? (
        <div className="h-40 sm:h-56 overflow-hidden">
          <img
            src={loja.banner_url}
            alt={`Banner ${loja.nome}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className="h-40 sm:h-56"
          style={{ background: `linear-gradient(135deg, ${loja.config.cor_primaria}, ${loja.config.cor_secundaria})` }}
        />
      )}

      {/* Info da loja */}
      <div className="bg-white px-4 pb-4">
        <div className="flex items-start gap-4 -mt-8 relative">
          {/* Logo */}
          {loja.logo_url ? (
            <img
              src={loja.logo_url}
              alt={loja.nome}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex-shrink-0 flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: loja.config.cor_primaria }}
            >
              {loja.nome.charAt(0)}
            </div>
          )}

          {/* Status aberto/fechado */}
          <div className="mt-10 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${loja.aberto ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={`text-sm font-semibold ${loja.aberto ? 'text-green-600' : 'text-red-500'}`}>
                {loja.aberto ? 'Aberto agora' : 'Fechado'}
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mt-2">{loja.nome}</h1>

        {loja.descricao && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{loja.descricao}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-3">
          {horarioHoje && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={13} className="text-gray-400" />
              <span>{horarioHoje.abre} – {horarioHoje.fecha}</span>
            </div>
          )}
          {loja.endereco?.bairro && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={13} className="text-gray-400" />
              <span>{loja.endereco.bairro}, {loja.endereco.cidade}</span>
            </div>
          )}
          {loja.config.tempo_preparo_min > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>⏱️</span>
              <span>Preparo: ~{loja.config.tempo_preparo_min} min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
