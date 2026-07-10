import { construirGrillaMes, DIAS_SEMANA, NOMBRES_MES } from "../calendario/fechas";
import { PALETA_FAMILIA, type EventoFamilia } from "./tipos";

interface GrillaMensualProps {
  anio: number;
  mes: number; // 0-11
  eventos: EventoFamilia[];
  hoyISO: string;
  onMesAnterior: () => void;
  onMesSiguiente: () => void;
  onSeleccionarEvento: (evento: EventoFamilia) => void;
}

// Grilla mensual de solo lectura: los días muestran un punto de color por
// cada evento (no chips). Al tocar un día con eventos se abre el detalle.
export default function GrillaMensual({
  anio,
  mes,
  eventos,
  hoyISO,
  onMesAnterior,
  onMesSiguiente,
  onSeleccionarEvento,
}: GrillaMensualProps) {
  const celdas = construirGrillaMes(anio, mes);

  const eventosPorFecha = eventos.reduce<Record<string, EventoFamilia[]>>((acc, ev) => {
    (acc[ev.fecha] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <section className="bg-[#2D1B4E] rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {/* Encabezado del calendario */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-[#1C1030]/40">
        <h2 className="text-xl font-extrabold text-white font-headline">
          {NOMBRES_MES[mes]} {anio}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onMesAnterior}
            aria-label="Mes anterior"
            className="p-2 hover:bg-[#2D1B4E] rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={onMesSiguiente}
            aria-label="Mes siguiente"
            className="p-2 hover:bg-[#2D1B4E] rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-7 text-center">
        {/* Encabezados de día */}
        {DIAS_SEMANA.map((dia) => {
          const esFinde = dia === "Sáb" || dia === "Dom";
          return (
            <div
              key={dia}
              className={`py-4 text-xs font-bold uppercase tracking-widest border-b border-white/5 ${
                esFinde ? "text-gray-700 bg-[#1C1030]/20" : "text-gray-500"
              }`}
            >
              {dia}
            </div>
          );
        })}

        {/* Celdas */}
        {celdas.map((celda, i) => {
          const eventosDia = eventosPorFecha[celda.fechaISO] ?? [];
          const tieneEventos = eventosDia.length > 0;
          const esHoy = celda.fechaISO === hoyISO;
          const fecha = new Date(`${celda.fechaISO}T00:00:00`);
          const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
          // Última columna de cada fila no lleva borde derecho
          const sinBordeDerecho = (i + 1) % 7 === 0;

          const clickeable = tieneEventos;
          const Etiqueta = clickeable ? "button" : "div";

          return (
            <Etiqueta
              key={celda.fechaISO}
              {...(clickeable
                ? { onClick: () => onSeleccionarEvento(eventosDia[0]) }
                : {})}
              className={`h-24 md:h-32 border-b border-white/5 p-2 relative align-top text-left
                ${sinBordeDerecho ? "" : "border-r"}
                ${esFinde ? "bg-[#1C1030]/20" : ""}
                ${clickeable ? "group cursor-pointer hover:bg-white/5 transition-colors" : ""}
              `}
            >
              <span
                className={`inline-flex items-center justify-center text-sm
                  ${esHoy ? "w-6 h-6 rounded-full bg-[#C548F5] text-white font-bold" : ""}
                  ${!esHoy && celda.esDelMes ? (esFinde ? "text-white/10" : "text-white/40") : ""}
                  ${!esHoy && !celda.esDelMes ? "text-gray-600" : ""}
                `}
              >
                {celda.dia}
              </span>

              {/* Puntos de eventos */}
              {eventosDia.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {eventosDia.map((ev) => (
                    <span
                      key={ev.id}
                      className={`w-2 h-2 rounded-full ${PALETA_FAMILIA[ev.tipo].punto}`}
                    />
                  ))}
                </div>
              )}
            </Etiqueta>
          );
        })}
      </div>
    </section>
  );
}
