// Un evento abierto: cuándo, dónde, de qué nivel viene y para quién es. Quien lo
// recibe confirma asistencia, elige sus propios recordatorios u oculta lo que no
// es obligatorio. Quien lo puede editar ve las confirmaciones y lo edita,
// duplica o borra (en una serie: solo este, este y los siguientes o todos).

import { useEffect, useState, type ReactNode } from "react";
import {
  borrarEvento,
  preferenciasEvento,
  responderEvento,
  useConfirmaciones,
  type AlcanceCambio,
  type Categoria,
  type EventoServidor,
  type Respuesta,
} from "../../../servicios/calendario";
import { capitalizar, cuandoEvento, etiquetaRecordatorio, fechaLarga, iconoOrigen, OPCIONES_RECORDATORIO } from "./agendaUtil";

interface Props {
  evento: EventoServidor;
  categorias: Categoria[];
  onCerrar: () => void;
  onEditar: (ev: EventoServidor) => void;
  onDuplicar: (ev: EventoServidor) => void;
  onCambio: () => void;
}

const RESPUESTAS: { id: Respuesta; texto: string; icono: string }[] = [
  { id: "si", texto: "Voy", icono: "check_circle" },
  { id: "quizas", texto: "Quizás", icono: "help" },
  { id: "no", texto: "No voy", icono: "cancel" },
];

export function ElegirAlcance({ valor, onCambiar, verbo }: { valor: AlcanceCambio; onCambiar: (a: AlcanceCambio) => void; verbo: string }) {
  const opciones: { id: AlcanceCambio; texto: string }[] = [
    { id: "este", texto: `${verbo} solo este` },
    { id: "siguientes", texto: "Este y los siguientes" },
    { id: "serie", texto: "Todos los de la serie" },
  ];
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Qué eventos de la serie">
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onCambiar(o.id)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white hover:bg-white/5">
          <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${valor === o.id ? "border-acento" : "border-white/30"}`} aria-hidden="true">
            {valor === o.id && <span className="h-2 w-2 rounded-full bg-acento" />}
          </span>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export default function DetalleEvento({ evento: ev, categorias, onCerrar, onEditar, onDuplicar, onCambio }: Props) {
  const categoria = categorias.find((c) => c.id === ev.categoria);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(ev.miRespuesta);
  const [oculto, setOculto] = useState(ev.oculto);
  const [misRecordatorios, setMisRecordatorios] = useState<number[] | null>(ev.misRecordatorios);
  const [borrando, setBorrando] = useState(false);
  const [alcance, setAlcance] = useState<AlcanceCambio>("este");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verConfirmaciones = ev.pideConfirmacion && ev.puedeEditar;
  const { datos: confirmaciones } = useConfirmaciones(verConfirmaciones ? ev.eventoId : null);
  const recordatorios = misRecordatorios ?? ev.recordatorios;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  const accion = async (fn: () => Promise<unknown>) => {
    setOcupado(true);
    setError(null);
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo.");
    } finally {
      setOcupado(false);
    }
  };

  const responder = (r: Respuesta) => {
    const nueva = respuesta === r ? null : r;
    setRespuesta(nueva);
    void accion(() => responderEvento(ev.eventoId, nueva));
  };
  const cambiarRecordatorios = (lista: number[]) => {
    setMisRecordatorios(lista);
    void accion(() => preferenciasEvento(ev.eventoId, { recordatorios: lista }));
  };
  const borrar = () => accion(async () => {
    await borrarEvento(ev.eventoId, ev.recurrente ? alcance : "serie", ev.ocurrencia);
    onCerrar();
  });

  return (
    <div className="a-velo" onClick={onCerrar}>
      <article className="a-dialogo" role="dialog" aria-modal="true" aria-labelledby="a-detalle-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-t-[26px] p-6 pb-5" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${ev.color} 30%, transparent), transparent 70%)` }}>
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: ev.color + "33", color: ev.color }} aria-hidden="true">
              <span className="material-symbols-outlined">{categoria?.icono ?? "event"}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ev.color }}>{categoria?.nombre ?? ev.tipo}</p>
              <h2 id="a-detalle-titulo" className="font-headline text-2xl font-bold leading-tight text-white">{ev.titulo}</h2>
              <p className="mt-1 text-sm text-on-surface-variant/80">{capitalizar(fechaLarga(ev.fecha))} · {cuandoEvento(ev)}</p>
              {ev.recurrente && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">repeat</span>{ev.recurrenciaTexto}{ev.modificada ? " · esta fecha fue cambiada" : ""}
                </p>
              )}
            </div>
            <button type="button" className="a-icono-boton" onClick={onCerrar} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="a-chip"><span className="material-symbols-outlined" aria-hidden="true">{iconoOrigen(ev)}</span>{ev.personal ? "Personal: solo lo ves vos" : `De ${ev.nivel?.nombre ?? "la escuela"}`}</span>
            {ev.obligatorio && <span className="a-chip !border-amber-400/40 !text-amber-200"><span className="material-symbols-outlined" aria-hidden="true">priority_high</span>Obligatorio</span>}
            {ev.supervision && <span className="a-chip !border-dashed"><span className="material-symbols-outlined" aria-hidden="true">visibility</span>Lo ves por supervisión</span>}
            {oculto && <span className="a-chip"><span className="material-symbols-outlined" aria-hidden="true">visibility_off</span>Oculto en tu calendario</span>}
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 pt-2">
          {ev.pideConfirmacion && !ev.esMio && !ev.supervision && (
            <section aria-label="Confirmar asistencia">
              <p className="a-subtitulo mb-2">¿Vas a ir?</p>
              <div className="flex gap-2">
                {RESPUESTAS.map((r) => (
                  <button key={r.id} type="button" className={`a-respuesta ${r.id}`} aria-pressed={respuesta === r.id} onClick={() => responder(r.id)} disabled={ocupado}>
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">{r.icono}</span>{r.texto}
                  </button>
                ))}
              </div>
            </section>
          )}

          <dl className="grid gap-3 text-sm">
            {ev.lugar && <Fila icono="location_on" titulo="Lugar">{ev.lugar}</Fila>}
            {ev.enlace && (
              <Fila icono="videocam" titulo="Enlace">
                <a href={ev.enlace} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline break-all">{ev.enlace}</a>
              </Fila>
            )}
            <Fila icono="person" titulo="Organiza">{ev.esMio ? "Vos" : ev.creador}</Fila>
            {!ev.personal && (
              <Fila icono="groups" titulo="Para">
                <span className="flex flex-wrap gap-1.5">{ev.audiencia.map((a, i) => <span key={i} className="a-chip">{a.etiqueta}</span>)}</span>
              </Fila>
            )}
            {ev.descripcion && <Fila icono="notes" titulo="Detalle"><p className="whitespace-pre-line text-on-surface-variant">{ev.descripcion}</p></Fila>}
            {ev.archivo && (
              <Fila icono="attach_file" titulo="Adjunto">
                <a href={`/api/archivos/${ev.archivo.id}`} className="font-semibold text-primary hover:underline">{ev.archivo.nombre}</a>
              </Fila>
            )}
          </dl>

          {verConfirmaciones && (
            <section className="rounded-2xl border border-white/5 bg-black/20 p-4" aria-label="Confirmaciones">
              <p className="a-subtitulo mb-3">Confirmaciones</p>
              {!confirmaciones ? (
                <p className="text-xs text-on-surface-variant/60">Contando…</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {([["si", "Van", "text-emerald-300"], ["quizas", "Quizás", "text-amber-200"], ["no", "No van", "text-rose-300"], ["pendientes", "Sin responder", "text-on-surface-variant"]] as const).map(([k, texto, color]) => (
                      <div key={k} className="rounded-xl bg-white/5 py-2.5">
                        <p className={`a-cifra ${color}`}>{confirmaciones.resumen[k]}</p>
                        <p className="mt-1 text-[10.5px] text-on-surface-variant/60">{texto}</p>
                      </div>
                    ))}
                  </div>
                  <details className="mt-3 text-[12.5px]">
                    <summary className="cursor-pointer text-primary">Ver quién respondió ({confirmaciones.resumen.total} invitados)</summary>
                    <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                      {confirmaciones.personas.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
                          <span className="truncate text-white">{p.nombre}</span>
                          <span className="shrink-0 text-[11px] text-on-surface-variant/60">{p.respuesta === "si" ? "Va" : p.respuesta === "no" ? "No va" : p.respuesta === "quizas" ? "Quizás" : "—"}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </section>
          )}

          {!ev.supervision && (
            <section aria-label="Tus recordatorios">
              <div className="mb-2 flex items-center justify-between">
                <p className="a-subtitulo">Tus recordatorios</p>
                {misRecordatorios && <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => { setMisRecordatorios(null); void accion(() => preferenciasEvento(ev.eventoId, { recordatorios: null })); }}>Usar los del evento</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {OPCIONES_RECORDATORIO.map((m) => (
                  <button key={m} type="button" className="a-chip a-chip-boton" aria-pressed={recordatorios.includes(m)} disabled={ocupado || (!recordatorios.includes(m) && recordatorios.length >= 5)}
                    onClick={() => cambiarRecordatorios(recordatorios.includes(m) ? recordatorios.filter((x) => x !== m) : [...recordatorios, m].sort((a, b) => a - b))}>
                    <span className="material-symbols-outlined" aria-hidden="true">notifications</span>{etiquetaRecordatorio(m)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p>}

          {borrando && (
            <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4" aria-label="Borrar evento">
              <p className="mb-2 text-sm font-semibold text-rose-100">{ev.recurrente ? "¿Qué querés borrar?" : "¿Borrar este evento? Desaparece para todos los que lo ven."}</p>
              {ev.recurrente && <ElegirAlcance valor={alcance} onCambiar={setAlcance} verbo="Borrar" />}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="a-boton-fantasma a-boton-chico" onClick={() => setBorrando(false)}>Cancelar</button>
                <button type="button" className="a-boton a-boton-chico !bg-none !bg-rose-400 !text-rose-950" onClick={() => void borrar()} disabled={ocupado}>
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>Borrar
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 p-5">
          <div className="flex gap-2">
            {!ev.esMio && !ev.obligatorio && !ev.supervision && (
              <button type="button" className="a-boton-fantasma a-boton-chico" disabled={ocupado}
                onClick={() => { const nuevo = !oculto; setOculto(nuevo); void accion(() => preferenciasEvento(ev.eventoId, { oculto: nuevo })); }}>
                <span className="material-symbols-outlined" aria-hidden="true">{oculto ? "visibility" : "visibility_off"}</span>
                {oculto ? "Volver a mostrar" : "Ocultar de mi calendario"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="a-boton-fantasma a-boton-chico" onClick={() => onDuplicar(ev)}>
              <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>Duplicar
            </button>
            {ev.puedeEditar && (
              <>
                <button type="button" className="a-boton-fantasma a-boton-chico hover:!border-rose-400/50 hover:!text-rose-200" onClick={() => setBorrando(true)}>
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>Borrar
                </button>
                <button type="button" className="a-boton a-boton-chico" onClick={() => onEditar(ev)}>
                  <span className="material-symbols-outlined" aria-hidden="true">edit</span>Editar
                </button>
              </>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}

function Fila({ icono, titulo, children }: { icono: string; titulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 text-lg text-on-surface-variant/50" aria-hidden="true">{icono}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/45">{titulo}</dt>
        <dd className="mt-0.5 text-white">{children}</dd>
      </div>
    </div>
  );
}
