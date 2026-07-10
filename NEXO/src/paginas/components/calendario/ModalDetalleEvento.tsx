import { NOMBRES_MES, formatearRangoHorario } from "./fechas";
import { PALETA_EVENTO, type EventoCalendario } from "./tipos";

interface ModalDetalleEventoProps {
  evento: EventoCalendario;
  onEliminar: (id: string) => void;
  onCerrar: () => void;
  // Solo los roles con permiso de edición (Admin Académica) ven "Eliminar".
  puedeEliminar?: boolean;
}

export default function ModalDetalleEvento({ evento, onEliminar, onCerrar, puedeEliminar = true }: ModalDetalleEventoProps) {
  const paleta = PALETA_EVENTO[evento.tipo];
  const [anio, mes, dia] = evento.fecha.split("-").map(Number);
  const horario = formatearRangoHorario(evento.horaInicio, evento.horaFin);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-secondary rounded-3xl p-6 shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${paleta.chip}`}>
            {paleta.label}
          </span>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <h3 className="text-xl font-bold text-white font-headline mb-4">{evento.titulo}</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-slate-300">
            <span className="material-symbols-outlined text-[20px] text-[#C548F5]">calendar_today</span>
            <span>{dia} de {NOMBRES_MES[mes - 1]} de {anio}</span>
          </div>
          {horario && (
            <div className="flex items-center gap-3 text-slate-300">
              <span className="material-symbols-outlined text-[20px] text-[#C548F5]">schedule</span>
              <span>{horario}</span>
            </div>
          )}
          {evento.lugar && (
            <div className="flex items-center gap-3 text-slate-300">
              <span className="material-symbols-outlined text-[20px] text-[#C548F5]">location_on</span>
              <span>{evento.lugar}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCerrar}
            className="flex-1 py-3 border border-white/10 text-slate-300 font-bold rounded-full hover:bg-white/5 transition-colors text-sm"
          >
            Cerrar
          </button>
          {puedeEliminar && (
            <button
              onClick={() => onEliminar(evento.id)}
              className="flex-1 py-3 bg-error/15 border border-error/30 text-error font-bold rounded-full hover:bg-error/25 transition-colors text-sm"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
