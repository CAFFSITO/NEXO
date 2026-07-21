import { construirGrillaMes, DIAS_SEMANA, NOMBRES_MES } from "./fechas";
import { PALETA_EVENTO, familiaDeTipo, type EventoCalendario } from "./tipos";

interface GrillaCalendarioProps {
  anio: number;
  mes: number; // 0-11
  eventos: EventoCalendario[];
  hoyISO: string;
  onMesAnterior: () => void;
  onMesSiguiente: () => void;
  onSeleccionarDia: (fechaISO: string) => void;
  onSeleccionarEvento: (evento: EventoCalendario) => void;
}

export default function GrillaCalendario({
  anio,
  mes,
  eventos,
  hoyISO,
  onMesAnterior,
  onMesSiguiente,
  onSeleccionarDia,
  onSeleccionarEvento,
}: GrillaCalendarioProps) {
  const celdas = construirGrillaMes(anio, mes);

  // Indexa los eventos por fecha para mostrarlos en su celda
  const eventosPorFecha = eventos.reduce<Record<string, EventoCalendario[]>>((acc, ev) => {
    (acc[ev.fecha] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="col-span-12 xl:col-span-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white font-headline">
            {NOMBRES_MES[mes]} {anio}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={onMesAnterior}
              aria-label="Mes anterior"
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">chevron_left</span>
            </button>
            <button
              onClick={onMesSiguiente}
              aria-label="Mes siguiente"
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {/* Encabezados de día */}
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/5"
          >
            {dia}
          </div>
        ))}

        {/* Celdas */}
        {celdas.map((celda) => {
          const eventosDia = eventosPorFecha[celda.fechaISO] ?? [];
          const esHoy = celda.fechaISO === hoyISO;
          const tieneEventos = eventosDia.length > 0;

          return (
            <button
              key={celda.fechaISO}
              onClick={() => onSeleccionarDia(celda.fechaISO)}
              className={`min-h-[120px] p-2 text-left align-top transition-colors w-full
                ${celda.esDelMes ? "bg-[#2D1B4E] hover:bg-[#3b2f50]" : "bg-white/5 text-slate-600 hover:bg-white/10"}
              `}
            >
              <span
                className={`inline-flex items-center justify-center text-sm
                  ${esHoy ? "w-6 h-6 rounded-full bg-[#C548F5] text-white font-bold" : ""}
                  ${!esHoy && celda.esDelMes ? (tieneEventos ? "text-white font-bold" : "text-slate-400") : ""}
                `}
              >
                {celda.dia}
              </span>

              {eventosDia.map((ev) => (
                <span
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeleccionarEvento(ev);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onSeleccionarEvento(ev);
                    }
                  }}
                  className={`block mt-2 px-2 py-1 rounded-lg text-[10px] leading-tight cursor-pointer ${PALETA_EVENTO[familiaDeTipo(ev.tipo)].chip}`}
                >
                  {ev.titulo}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
