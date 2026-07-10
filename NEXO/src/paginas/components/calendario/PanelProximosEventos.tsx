import { ABREV_MES } from "./fechas";
import { PALETA_EVENTO, type EventoCalendario } from "./tipos";

interface PanelProximosEventosProps {
  eventos: EventoCalendario[];
  onSeleccionarEvento: (evento: EventoCalendario) => void;
  onVerTodos: () => void;
}

export default function PanelProximosEventos({
  eventos,
  onSeleccionarEvento,
  onVerTodos,
}: PanelProximosEventosProps) {
  return (
    <div className="bg-secondary rounded-3xl p-6 shadow-xl border border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white font-headline">Próximos eventos</h3>
        <span className="material-symbols-outlined text-[#C548F5]">event_note</span>
      </div>

      <div className="space-y-4">
        {eventos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No hay eventos próximos.</p>
        )}

        {eventos.map((ev) => {
          const paleta = PALETA_EVENTO[ev.tipo];
          const [, mesStr, diaStr] = ev.fecha.split("-");
          const detalle = ev.horaInicio
            ? `${ev.horaInicio}${ev.horaFin ? ` - ${ev.horaFin}` : ""}`
            : ev.lugar ?? "";

          return (
            <button
              key={ev.id}
              onClick={() => onSeleccionarEvento(ev)}
              className="flex gap-4 p-3 rounded-2xl bg-[#1C1030] hover:bg-white/5 transition-colors group w-full text-left"
            >
              <div
                className={`flex flex-col items-center justify-center min-w-[50px] h-[50px] rounded-xl ${paleta.caja}`}
              >
                <span className="text-xs font-bold">{ABREV_MES[Number(mesStr) - 1]}</span>
                <span className="text-lg font-black font-headline">{Number(diaStr)}</span>
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold text-white mb-1 transition-colors ${paleta.texto}`}>
                  {ev.titulo}
                </h4>
                {detalle && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">{ev.icono}</span>
                    <span>{detalle}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onVerTodos}
        className="w-full mt-6 py-3 border border-[#C548F5] text-[#C548F5] font-bold rounded-full hover:bg-[#C548F5]/10 transition-colors text-sm"
      >
        Ver todos
      </button>
    </div>
  );
}
