import { ABREV_MES, NOMBRES_MES, formatearRangoHorario } from "./fechas";
import { PALETA_EVENTO, familiaDeTipo, type EventoCalendario } from "./tipos";

interface VistaAgendaProps {
  titulo: string;
  eventos: EventoCalendario[]; // se asumen ya ordenados por fecha
  onSeleccionarEvento: (evento: EventoCalendario) => void;
}

export default function VistaAgenda({ titulo, eventos, onSeleccionarEvento }: VistaAgendaProps) {
  return (
    <div className="col-span-12 xl:col-span-8">
      <h3 className="text-xl font-bold text-white font-headline mb-6">{titulo}</h3>

      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl divide-y divide-white/5">
        {eventos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">
            No hay eventos en este período.
          </p>
        )}

        {eventos.map((ev) => {
          const paleta = PALETA_EVENTO[familiaDeTipo(ev.tipo)];
          const [anio, mes, dia] = ev.fecha.split("-").map(Number);
          const horario = formatearRangoHorario(ev.horaInicio, ev.horaFin);

          return (
            <button
              key={ev.id}
              onClick={() => onSeleccionarEvento(ev)}
              className="flex items-center gap-4 p-4 w-full text-left hover:bg-white/5 transition-colors group first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div
                className={`flex flex-col items-center justify-center min-w-[50px] h-[50px] rounded-xl ${paleta.caja}`}
              >
                <span className="text-xs font-bold">{ABREV_MES[mes - 1]}</span>
                <span className="text-lg font-black font-headline">{dia}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold text-white mb-1 transition-colors ${paleta.texto}`}>
                  {ev.titulo}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{dia} {NOMBRES_MES[mes - 1]} {anio}</span>
                  {horario && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {horario}
                    </span>
                  )}
                  {ev.lugar && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {ev.lugar}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${paleta.chip}`}
              >
                {paleta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
