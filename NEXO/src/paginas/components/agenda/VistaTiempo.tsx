// Día y semana: una grilla de horas con los eventos ubicados en su horario (los
// que se pisan, uno al lado del otro), una fila de "todo el día" arriba y la
// línea de la hora actual. Tocar un hueco crea un evento en esa hora.

import { useEffect, useRef, useState } from "react";
import type { EventoServidor, Feriado } from "../../../servicios/calendario";
import { fechaCorta, iconoOrigen, NOMBRES_DIA, diaSemana, porDia } from "./agendaUtil";
import { ChipEvento } from "./VistaMes";

interface Props {
  dias: string[];
  eventos: EventoServidor[];
  feriados: Feriado[];
  hoy: string;
  onHueco: (fecha: string, hora: string) => void;
  onEvento: (ev: EventoServidor) => void;
  onVerDia?: (fecha: string) => void;
}

const ALTO_HORA = 52;
const minutos = (hora: string) => { const [h, m] = hora.split(":").map(Number); return h * 60 + m; };

/** La hora actual, refrescada cada minuto (fuera del render). */
function useAhora() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    const primero = window.setTimeout(() => setAhora(new Date()), 0);
    const cada = window.setInterval(() => setAhora(new Date()), 60000);
    return () => { window.clearTimeout(primero); window.clearInterval(cada); };
  }, []);
  return ahora;
}

/** Columnas para los eventos que se pisan: cada uno con su lugar y el ancho del grupo. */
function acomodar(lista: EventoServidor[]) {
  const conHora = lista
    .filter((e) => !e.todoElDia && !e.fechaFin && e.horaInicio)
    .map((e) => {
      const inicio = minutos(e.horaInicio!);
      const fin = Math.max(inicio + 25, e.horaFin ? minutos(e.horaFin) : inicio + 60);
      return { e, inicio, fin, col: 0, cols: 1 };
    })
    .sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  let grupo: typeof conHora = [];
  let finGrupo = -1;
  const cerrar = () => {
    const cols = Math.max(1, ...grupo.map((x) => x.col + 1));
    for (const x of grupo) x.cols = cols;
    grupo = [];
  };
  for (const x of conHora) {
    if (x.inicio >= finGrupo) cerrar();
    const ocupadas = new Set(grupo.filter((g) => g.fin > x.inicio).map((g) => g.col));
    let col = 0;
    while (ocupadas.has(col)) col++;
    x.col = col;
    grupo.push(x);
    finGrupo = Math.max(finGrupo, x.fin);
  }
  cerrar();
  return conHora;
}

export default function VistaTiempo({ dias, eventos, feriados, hoy, onHueco, onEvento, onVerDia }: Props) {
  const porFecha = porDia(eventos);
  const feriadoDe = new Map(feriados.map((f) => [f.fecha, f.nombre]));
  const ahora = useAhora();
  const caja = useRef<HTMLDivElement>(null);

  // Arranca mirando la mañana (las 7), no la medianoche.
  useEffect(() => {
    if (caja.current) caja.current.scrollTop = ALTO_HORA * 7 - 8;
  }, []);

  const columnas = `56px repeat(${dias.length}, minmax(0, 1fr))`;
  const minutoAhora = ahora ? ahora.getHours() * 60 + ahora.getMinutes() : null;

  return (
    <div className="a-panel overflow-hidden">
      {/* Cabecera con los días y la fila de todo el día */}
      <div className="grid border-b border-white/5" style={{ gridTemplateColumns: columnas }}>
        <div />
        {dias.map((d) => (
          <button key={d} type="button" className="px-2 py-3 text-center hover:bg-white/[0.03]" onClick={() => onVerDia?.(d)} disabled={!onVerDia}>
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/55">{NOMBRES_DIA[diaSemana(d)].slice(0, 3)}</span>
            <span className={`mt-1 inline-grid h-9 w-9 place-items-center rounded-full font-headline text-lg font-bold ${d === hoy ? "bg-acento text-white shadow-[0_0_16px_var(--nexo-acento)]" : "text-white"}`}>{Number(d.slice(8))}</span>
            {dias.length === 1 && <span className="block text-[11px] text-on-surface-variant/55">{fechaCorta(d)}</span>}
          </button>
        ))}
        <div className="px-2 py-2 text-right text-[9.5px] text-on-surface-variant/45 self-center">todo el día</div>
        {dias.map((d) => {
          const lista = (porFecha.get(d) ?? []).filter((e) => e.todoElDia || e.fechaFin);
          const feriado = feriadoDe.get(d);
          return (
            <div key={d} className="flex min-h-[34px] flex-col gap-1 border-l border-white/5 p-1">
              {feriado && <p className="a-feriado truncate px-1" title={feriado}>{feriado}</p>}
              {lista.map((ev) => <ChipEvento key={ev.id} ev={ev} onClick={() => onEvento(ev)} />)}
            </div>
          );
        })}
      </div>

      {/* La grilla de horas */}
      <div ref={caja} className="max-h-[640px] overflow-y-auto">
        <div className="a-tiempo" style={{ gridTemplateColumns: columnas }}>
          <div>
            {Array.from({ length: 24 }, (_, h) => <div key={h} className="a-tiempo-hora">{h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}</div>)}
          </div>
          {dias.map((d) => (
            <div
              key={d}
              className={`a-tiempo-col ${d === hoy ? "is-hoy" : ""}`}
              style={{ height: ALTO_HORA * 24 }}
              onClick={(e) => {
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                const media = Math.max(0, Math.min(47, Math.floor(y / (ALTO_HORA / 2))));
                onHueco(d, `${String(Math.floor(media / 2)).padStart(2, "0")}:${media % 2 ? "30" : "00"}`);
              }}
            >
              {acomodar(porFecha.get(d) ?? []).map(({ e, inicio, fin, col, cols }) => (
                <button
                  key={e.id}
                  type="button"
                  className={`a-bloque ${e.supervision ? "is-supervision" : ""} ${e.oculto ? "opacity-40" : ""}`}
                  style={{
                    ["--ev" as string]: e.color,
                    top: (inicio / 60) * ALTO_HORA + 1,
                    height: Math.max(22, ((fin - inicio) / 60) * ALTO_HORA - 2),
                    left: `calc(${(col / cols) * 100}% + 3px)`,
                    width: `calc(${100 / cols}% - 6px)`,
                  }}
                  onClick={(ev) => { ev.stopPropagation(); onEvento(e); }}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined !text-[12px] opacity-70" aria-hidden="true">{iconoOrigen(e)}</span>
                    <span className="truncate">{e.titulo}</span>
                  </span>
                  <span className="block opacity-70 tabular-nums">{e.horaInicio}{e.horaFin ? ` – ${e.horaFin}` : ""}</span>
                  {e.lugar && fin - inicio >= 60 && <span className="block truncate opacity-60">{e.lugar}</span>}
                </button>
              ))}
              {d === hoy && minutoAhora !== null && <span className="a-ahora" style={{ top: (minutoAhora / 60) * ALTO_HORA }} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
