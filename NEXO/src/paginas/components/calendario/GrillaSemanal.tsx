import { useState } from "react";
import {
  construirSemana,
  sumarDiasISO,
  horaEntera,
  formatearRangoHorario,
  DIAS_SEMANA,
  NOMBRES_MES,
} from "./fechas";
import { PALETA_EVENTO, familiaDeTipo, type EventoCalendario } from "./tipos";

interface GrillaSemanalProps {
  /** Fecha ISO desde la que arranca la semana mostrada (se usa su semana). */
  fechaAncla: string;
  eventos: EventoCalendario[];
  hoyISO: string;
  onSeleccionarDia: (fechaISO: string) => void;
  onSeleccionarEvento: (evento: EventoCalendario) => void;
}

// Franja horaria de la grilla (horario escolar típico). Los eventos con hora
// fuera de este rango igual aparecen: se agrupan en la primera/última fila.
const HORAS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 … 21:00

// Vista Semana real, tipo Google Calendar (Error 6.E.3): 7 columnas de día y un
// eje de horas. No es la lista de agenda reciclada que había antes; es una
// grilla donde cada evento cae en su día y su hora. Navega por semana, aparte
// del mes. Los eventos sin horario van a una franja "Sin horario" arriba.
export default function GrillaSemanal({
  fechaAncla,
  eventos,
  hoyISO,
  onSeleccionarDia,
  onSeleccionarEvento,
}: GrillaSemanalProps) {
  const [ancla, setAncla] = useState(fechaAncla);
  const dias = construirSemana(ancla);

  const eventosDe = (fechaISO: string) => eventos.filter((e) => e.fecha === fechaISO);

  const primero = dias[0];
  const ultimo = dias[6];
  const rotulo =
    primero.fechaISO.slice(0, 7) === ultimo.fechaISO.slice(0, 7)
      ? `${primero.dia} – ${ultimo.dia} de ${NOMBRES_MES[Number(primero.fechaISO.slice(5, 7)) - 1]}`
      : `${primero.dia} ${NOMBRES_MES[Number(primero.fechaISO.slice(5, 7)) - 1].slice(0, 3)} – ${ultimo.dia} ${NOMBRES_MES[Number(ultimo.fechaISO.slice(5, 7)) - 1].slice(0, 3)}`;

  const chip = (ev: EventoCalendario) => (
    <button
      key={ev.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionarEvento(ev);
      }}
      className={`block w-full text-left px-1.5 py-1 mb-1 rounded-md text-[10px] leading-tight ${PALETA_EVENTO[familiaDeTipo(ev.tipo)].chip}`}
    >
      {ev.horaInicio && <span className="font-bold">{formatearRangoHorario(ev.horaInicio, ev.horaFin)} </span>}
      {ev.titulo}
    </button>
  );

  return (
    <div className="col-span-12 xl:col-span-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white font-headline">{rotulo}</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setAncla((f) => sumarDiasISO(f, -7))}
              aria-label="Semana anterior"
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">chevron_left</span>
            </button>
            <button
              onClick={() => setAncla((f) => sumarDiasISO(f, 7))}
              aria-label="Semana siguiente"
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>
        <button
          onClick={() => setAncla(hoyISO)}
          className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Hoy
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {/* Encabezado: los 7 días con su número */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10">
          <div className="bg-white/5" />
          {dias.map((d, i) => {
            const esHoy = d.fechaISO === hoyISO;
            return (
              <button
                key={d.fechaISO}
                onClick={() => onSeleccionarDia(d.fechaISO)}
                className="p-3 text-center bg-white/5 hover:bg-white/10 transition-colors border-l border-white/5"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{DIAS_SEMANA[i]}</div>
                <div
                  className={`mt-1 inline-flex items-center justify-center text-sm ${
                    esHoy ? "w-7 h-7 rounded-full bg-[#C548F5] text-white font-bold" : "text-slate-300"
                  }`}
                >
                  {d.dia}
                </div>
              </button>
            );
          })}
        </div>

        {/* Franja de eventos sin horario */}
        {dias.some((d) => eventosDe(d.fechaISO).some((e) => horaEntera(e.horaInicio) === null)) && (
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10">
            <div className="p-2 text-[9px] text-slate-500 uppercase tracking-wider flex items-center justify-center bg-white/5 text-center">
              Sin horario
            </div>
            {dias.map((d) => (
              <div key={d.fechaISO} className="p-1.5 border-l border-white/5 min-h-[44px]">
                {eventosDe(d.fechaISO)
                  .filter((e) => horaEntera(e.horaInicio) === null)
                  .map(chip)}
              </div>
            ))}
          </div>
        )}

        {/* Eje horario: una fila por hora, 7 columnas de día */}
        <div className="max-h-[560px] overflow-y-auto">
          {HORAS.map((h) => (
            <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/5 last:border-b-0">
              <div className="p-1.5 text-[10px] text-slate-500 text-right pr-2 bg-white/5">
                {String(h).padStart(2, "0")}:00
              </div>
              {dias.map((d) => {
                // La primera fila (07) también recoge lo anterior a las 7; la
                // última (21), lo posterior a las 21: nada queda sin mostrarse.
                const eventosHora = eventosDe(d.fechaISO).filter((e) => {
                  const he = horaEntera(e.horaInicio);
                  if (he === null) return false;
                  if (h === HORAS[0]) return he <= h;
                  if (h === HORAS[HORAS.length - 1]) return he >= h;
                  return he === h;
                });
                return (
                  <button
                    key={d.fechaISO}
                    onClick={() => onSeleccionarDia(d.fechaISO)}
                    className="p-1 border-l border-white/5 min-h-[52px] text-left align-top hover:bg-white/5 transition-colors"
                  >
                    {eventosHora.map(chip)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
