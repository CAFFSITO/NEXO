import { ABREV_MES } from "../calendario/fechas";
import { PALETA_FAMILIA, type EventoFamilia } from "./tipos";

interface TarjetaEventoFamiliaProps {
  evento: EventoFamilia;
  onAbrir: (evento: EventoFamilia) => void;
  onConfirmarAsistencia: (id: string) => void;
}

// Tarjeta de evento para la lista "Próximos eventos" / "Agenda".
// Muestra estado de lectura y, en reuniones, botón de confirmar asistencia.
export default function TarjetaEventoFamilia({
  evento,
  onAbrir,
  onConfirmarAsistencia,
}: TarjetaEventoFamiliaProps) {
  const paleta = PALETA_FAMILIA[evento.tipo];
  const [, mesStr, diaStr] = evento.fecha.split("-");

  // La reunión pendiente de confirmar se destaca con borde reforzado.
  const destacado = evento.requiereConfirmacion && !evento.confirmado;

  return (
    <div
      className={`bg-[#2D1B4E] p-4 rounded-xl flex items-center justify-between transition-all group
        ${destacado
          ? "border-2 border-[#C548F5]/20 hover:border-[#C548F5]/40"
          : "border border-white/5 hover:border-[#C548F5]/30"}
        ${evento.leido ? "opacity-80" : ""}
      `}
    >
      <div className="flex items-center gap-6">
        <div className="text-center w-12">
          <p className="text-xs font-bold text-gray-400 uppercase">
            {ABREV_MES[Number(mesStr) - 1].charAt(0) + ABREV_MES[Number(mesStr) - 1].slice(1).toLowerCase()}
          </p>
          <p className="text-2xl font-black text-white">{diaStr}</p>
        </div>
        <div className="h-10 w-[1px] bg-white/10" />
        <div>
          <h4 className="font-bold text-white">{evento.titulo}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${paleta.chip}`}>
              {evento.etiqueta}
            </span>
            {evento.leido ? (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                Leído
              </span>
            ) : (
              <span className="text-xs text-[#C548F5] flex items-center gap-1 font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C548F5]" />
                Sin leer
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {evento.requiereConfirmacion &&
          (evento.confirmado ? (
            <span className="px-4 py-1.5 rounded-full text-xs font-bold text-green-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              Asistencia confirmada
            </span>
          ) : (
            <button
              onClick={() => onConfirmarAsistencia(evento.id)}
              className="px-4 py-1.5 rounded-full border border-[#C548F5] text-[#C548F5] text-xs font-bold hover:bg-[#C548F5] hover:text-white transition-all"
            >
              Confirmar asistencia
            </button>
          ))}
        <button
          onClick={() => onAbrir(evento)}
          aria-label="Ver detalle"
          className="p-2 text-gray-500 group-hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
