// El mes: semanas de lunes a domingo, hasta tres eventos por día (y "+N más"),
// feriados, y arrastrar un evento propio a otro día para moverlo.

import { useState } from "react";
import type { EventoServidor, Feriado } from "../../../servicios/calendario";
import { construirGrillaMes } from "../calendario/fechas";
import { iconoOrigen, porDia, SEMANA } from "./agendaUtil";

interface Props {
  anio: number;
  mes: number;
  eventos: EventoServidor[];
  feriados: Feriado[];
  hoy: string;
  onDia: (fecha: string) => void;
  onVerDia: (fecha: string) => void;
  onEvento: (ev: EventoServidor) => void;
  onMover: (ev: EventoServidor, fecha: string) => void;
}

const MAXIMO = 3;

export function ChipEvento({ ev, onClick, arrastrable, onArrastrar }: {
  ev: EventoServidor;
  onClick: () => void;
  arrastrable?: boolean;
  onArrastrar?: (activo: boolean) => void;
}) {
  const lleno = ev.todoElDia || Boolean(ev.fechaFin);
  return (
    <button
      type="button"
      className={`a-ev ${lleno ? "is-lleno" : ""} ${ev.oculto ? "is-oculto" : ""} ${ev.supervision ? "is-supervision" : ""}`}
      style={{ ["--ev" as string]: ev.color }}
      title={`${ev.titulo}${ev.horaInicio ? ` · ${ev.horaInicio}` : ""}${ev.nivel ? ` · ${ev.nivel.nombre}` : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      draggable={arrastrable}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", ev.id); e.dataTransfer.effectAllowed = "move"; onArrastrar?.(true); }}
      onDragEnd={() => onArrastrar?.(false)}
    >
      <span className="material-symbols-outlined" aria-hidden="true">{iconoOrigen(ev)}</span>
      {!lleno && ev.horaInicio && <span className="a-ev-hora">{ev.horaInicio}</span>}
      <span className="a-ev-titulo">{ev.titulo}</span>
      {ev.obligatorio && <span className="material-symbols-outlined" aria-label="Obligatorio">priority_high</span>}
      {ev.recurrente && <span className="material-symbols-outlined" aria-label="Se repite">repeat</span>}
    </button>
  );
}

export default function VistaMes({ anio, mes, eventos, feriados, hoy, onDia, onVerDia, onEvento, onMover }: Props) {
  const celdas = construirGrillaMes(anio, mes);
  const dias = porDia(eventos);
  const feriadoDe = new Map(feriados.map((f) => [f.fecha, f.nombre]));
  const [arrastrado, setArrastrado] = useState<EventoServidor | null>(null);
  const [destino, setDestino] = useState<string | null>(null);

  return (
    <div className="a-panel overflow-hidden">
      <div className="a-mes" role="grid" aria-label="Mes">
        {SEMANA.map((d) => <div key={d.dia} className="a-mes-cabecera" role="columnheader">{d.nombre}</div>)}
        {celdas.map((c) => {
          const lista = dias.get(c.fechaISO) ?? [];
          const feriado = feriadoDe.get(c.fechaISO);
          return (
            <div
              key={c.fechaISO}
              role="gridcell"
              aria-label={c.fechaISO}
              className={`a-celda ${c.esDelMes ? "" : "is-fuera"} ${c.fechaISO === hoy ? "is-hoy" : ""} ${destino === c.fechaISO ? "is-destino" : ""}`}
              onClick={() => onDia(c.fechaISO)}
              onDragOver={(e) => { if (arrastrado) { e.preventDefault(); setDestino(c.fechaISO); } }}
              onDragLeave={() => setDestino((d) => (d === c.fechaISO ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                if (arrastrado && arrastrado.fecha !== c.fechaISO) onMover(arrastrado, c.fechaISO);
                setArrastrado(null);
                setDestino(null);
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <button type="button" className="a-celda-dia hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onVerDia(c.fechaISO); }} aria-label={`Ver el día ${c.dia}`}>{c.dia}</button>
                {lista.length > 0 && <span className="text-[9.5px] text-on-surface-variant/40 tabular-nums sm:hidden">{lista.length}</span>}
              </div>
              {feriado && <p className="a-feriado truncate" title={feriado}>{feriado}</p>}
              {lista.slice(0, MAXIMO).map((ev) => (
                <ChipEvento
                  key={ev.id + c.fechaISO}
                  ev={ev}
                  onClick={() => onEvento(ev)}
                  arrastrable={ev.puedeEditar && !ev.recurrente && !ev.fechaFin}
                  onArrastrar={(activo) => setArrastrado(activo ? ev : null)}
                />
              ))}
              {lista.length > MAXIMO && (
                <button type="button" className="text-left text-[10.5px] font-semibold text-primary hover:underline px-1" onClick={(e) => { e.stopPropagation(); onVerDia(c.fechaISO); }}>
                  +{lista.length - MAXIMO} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
