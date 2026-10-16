// La agenda: lo que viene, día por día, con todo lo importante de cada evento a
// la vista (de qué nivel viene, para quién es, si pide confirmación).

import type { EventoServidor } from "../../../servicios/calendario";
import { capitalizar, cuandoEvento, fechaLarga, iconoOrigen } from "./agendaUtil";

interface Props {
  eventos: EventoServidor[];
  desde: string;
  hoy: string;
  onEvento: (ev: EventoServidor) => void;
  vacio: string;
}

const RESPUESTA = { si: "Vas", quizas: "Quizás", no: "No vas" } as const;

export default function VistaAgenda({ eventos, desde, hoy, onEvento, vacio }: Props) {
  const proximos = eventos.filter((e) => (e.fechaFin ?? e.fecha) >= desde).slice(0, 150);
  const grupos: { fecha: string; lista: EventoServidor[] }[] = [];
  for (const ev of proximos) {
    const clave = ev.fecha < desde ? desde : ev.fecha;
    const g = grupos[grupos.length - 1];
    if (g?.fecha === clave) g.lista.push(ev);
    else grupos.push({ fecha: clave, lista: [ev] });
  }
  if (!grupos.length) {
    return (
      <div className="a-panel flex flex-col items-center gap-2 p-10 text-center text-sm text-on-surface-variant/70">
        <span className="material-symbols-outlined text-4xl text-acento" aria-hidden="true">event_available</span>
        {vacio}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {grupos.map((g) => (
        <section key={g.fecha} className="a-panel p-4 a-aparecer" aria-label={fechaLarga(g.fecha)}>
          <h3 className={`mb-3 flex items-center gap-2 font-headline text-sm font-bold ${g.fecha === hoy ? "text-primary" : "text-white"}`}>
            {g.fecha === hoy && <span className="rounded-full bg-acento px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">Hoy</span>}
            {capitalizar(fechaLarga(g.fecha))}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {g.lista.map((ev) => (
              <li key={ev.id}>
                <button type="button" onClick={() => onEvento(ev)} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] ${ev.oculto ? "opacity-45" : ""}`}>
                  <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: ev.color }} aria-hidden="true" />
                  <span className="w-24 shrink-0 pt-0.5 text-[12px] tabular-nums text-on-surface-variant/70">{cuandoEvento(ev)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <span className="truncate">{ev.titulo}</span>
                      {ev.obligatorio && <span className="material-symbols-outlined text-base text-amber-300" title="Obligatorio" aria-label="Obligatorio">priority_high</span>}
                      {ev.recurrente && <span className="material-symbols-outlined text-base text-on-surface-variant/50" title={ev.recurrenciaTexto} aria-label="Se repite">repeat</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant/60">
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined !text-[13px]" aria-hidden="true">{iconoOrigen(ev)}</span>{ev.personal ? "Personal" : ev.nivel?.nombre}</span>
                      {!ev.personal && <span>· {ev.audiencia.map((a) => a.etiqueta).slice(0, 2).join(", ")}{ev.audiencia.length > 2 ? ` y ${ev.audiencia.length - 2} más` : ""}</span>}
                      {ev.lugar && <span>· {ev.lugar}</span>}
                      {ev.supervision && <span className="rounded-full border border-dashed border-white/25 px-1.5">supervisión</span>}
                    </span>
                  </span>
                  {ev.pideConfirmacion && !ev.esMio && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${ev.miRespuesta ? "bg-white/10 text-white" : "bg-amber-400/15 text-amber-200"}`}>
                      {ev.miRespuesta ? RESPUESTA[ev.miRespuesta] : "Confirmá"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
