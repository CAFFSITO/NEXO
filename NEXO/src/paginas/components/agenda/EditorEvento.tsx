// Crear, editar o duplicar un evento. A la izquierda, el qué y el cuándo
// (categoría, color, horario, varios días, repetición, lugar, enlace); a la
// derecha, quién lo ve según la jerarquía, lo que se le pide a la gente
// (obligatorio, confirmación, aviso) y los recordatorios. Mientras se arma, el
// servidor cuenta a cuántas personas les llega y con qué choca.

import { useEffect, useMemo, useState } from "react";
import {
  crearEvento,
  editarEvento,
  revisarEvento,
  useDestinosCalendario,
  type AlcanceCambio,
  type Categoria,
  type DatosNuevoEvento,
  type Destino,
  type EventoServidor,
  type Recurrencia,
  type Revision,
} from "../../../servicios/calendario";
import { useFuncion } from "../../../servicios/instancia";
import { COLORES_EVENTO, diasEntre, etiquetaRecordatorio, fechaCorta, OPCIONES_RECORDATORIO, sumarDiasISO } from "./agendaUtil";
import EditorRepeticion from "./EditorRepeticion";
import SelectorAudiencia from "./SelectorAudiencia";
import { ElegirAlcance } from "./DetalleEvento";

export type PedidoEditor =
  | { modo: "nuevo"; fecha: string; hora?: string }
  | { modo: "editar"; evento: EventoServidor }
  | { modo: "duplicar"; evento: EventoServidor };

interface Props {
  pedido: PedidoEditor;
  categorias: Categoria[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

const masUnaHora = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(h >= 23 ? 59 : m).padStart(2, "0")}`;
};

function inicial(pedido: PedidoEditor) {
  if (pedido.modo === "nuevo") {
    const hora = pedido.hora ?? "10:00";
    return {
      titulo: "", tipo: "evento", color: null as string | null, fecha: pedido.fecha, fechaFin: null as string | null,
      todoElDia: false, horaInicio: hora, horaFin: masUnaHora(hora), recurrencia: null as Recurrencia | null,
      lugar: "", enlace: "", descripcion: "", audiencia: [] as Destino[], obligatorio: false, pideConfirmacion: false,
      avisar: false, recordatorios: [30],
    };
  }
  const ev = pedido.evento;
  return {
    titulo: ev.titulo, tipo: ev.categoria, color: ev.color, fecha: ev.fecha, fechaFin: ev.fechaFin ?? null,
    todoElDia: ev.todoElDia, horaInicio: ev.horaInicio ?? "10:00", horaFin: ev.horaFin ?? masUnaHora(ev.horaInicio ?? "10:00"),
    recurrencia: ev.recurrencia, lugar: ev.lugar ?? "", enlace: ev.enlace ?? "", descripcion: ev.descripcion,
    audiencia: ev.destinos ?? [], obligatorio: ev.obligatorio, pideConfirmacion: ev.pideConfirmacion, avisar: false,
    recordatorios: ev.recordatorios,
  };
}

export default function EditorEvento({ pedido, categorias, onCerrar, onGuardado }: Props) {
  const { destinos, error: errorDestinos } = useDestinosCalendario();
  const [f, setF] = useState(() => inicial(pedido));
  const [compartir, setCompartir] = useState(() => (pedido.modo === "nuevo" ? false : (pedido.evento.destinos ?? []).length > 0));
  const [alcance, setAlcance] = useState<AlcanceCambio>("este");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<{ clave: string; datos: Revision | null; error: string | null } | null>(null);
  const editando = pedido.modo === "editar" ? pedido.evento : null;
  const recurrenteEditado = Boolean(editando?.recurrente);
  const fRecurrentes = useFuncion("calendario.recurrentes");
  const fObligatorios = useFuncion("calendario.obligatorios");
  const fConfirmaciones = useFuncion("calendario.confirmaciones");
  const fAvisar = useFuncion("calendario.avisar");
  const fCompartir = useFuncion("calendario.compartir");
  const comparte = Boolean(destinos?.comparte) && fCompartir;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError(null); };
  const categoria = categorias.find((c) => c.id === f.tipo);
  const color = f.color ?? categoria?.color ?? "#2dd4bf";

  // Lo que viaja al servidor. En una serie, "todos" respeta el inicio de la
  // serie (si se movió la fecha, se corre la serie entera lo mismo).
  const datos = useMemo<DatosNuevoEvento>(() => {
    let fecha = f.fecha;
    let fechaFin = f.fechaFin;
    if (editando?.recurrente && alcance === "serie") {
      const corrimiento = diasEntre(editando.fecha, f.fecha);
      fecha = sumarDiasISO(editando.inicioSerie, corrimiento);
      if (f.fechaFin) fechaFin = sumarDiasISO(fecha, diasEntre(f.fecha, f.fechaFin));
    }
    const conAudiencia = comparte && compartir;
    return {
      titulo: f.titulo.trim(), tipo: f.tipo, color: f.color, fecha, fechaFin, todoElDia: f.todoElDia,
      horaInicio: f.todoElDia ? undefined : f.horaInicio, horaFin: f.todoElDia ? undefined : f.horaFin,
      recurrencia: recurrenteEditado && alcance === "este" ? editando!.recurrencia : f.recurrencia,
      lugar: f.lugar.trim(), enlace: f.enlace.trim(), descripcion: f.descripcion.trim(),
      audiencia: conAudiencia ? f.audiencia : [], recordatorios: f.recordatorios,
      obligatorio: conAudiencia && f.obligatorio, pideConfirmacion: conAudiencia && f.pideConfirmacion, avisar: conAudiencia && f.avisar,
    };
  }, [f, compartir, comparte, alcance, editando, recurrenteEditado]);

  // A cuántos les llega y con qué choca (con una pausa, mientras se escribe).
  const claveRevision = JSON.stringify({ ...datos, titulo: datos.titulo || "Evento", descripcion: "" });
  const revisar = comparte && compartir;
  useEffect(() => {
    if (!destinos || !revisar) return;
    let vigente = true;
    const t = window.setTimeout(async () => {
      try {
        const r = await revisarEvento(JSON.parse(claveRevision) as DatosNuevoEvento, editando?.eventoId);
        if (vigente) setRevision({ clave: claveRevision, datos: r, error: null });
      } catch (e) {
        if (vigente) setRevision({ clave: claveRevision, datos: null, error: e instanceof Error ? e.message : "No se pudo revisar." });
      }
    }, 550);
    return () => { vigente = false; window.clearTimeout(t); };
  }, [claveRevision, destinos, revisar, editando?.eventoId]);

  const revisionVigente = revision?.clave === claveRevision ? revision.datos : null;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [guardando, onCerrar]);

  const guardar = async () => {
    if (!datos.titulo) { setError("Ponele un título al evento."); return; }
    if (comparte && compartir && datos.audiencia!.length === 0) { setError("Elegí a quién se lo mostrás, o marcá «Solo yo»."); return; }
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await editarEvento(editando.eventoId, datos, recurrenteEditado ? alcance : "serie", editando.ocurrencia);
        onGuardado(recurrenteEditado && alcance === "este" ? "Se cambió solo esta fecha." : "Evento actualizado.");
      } else {
        await crearEvento(datos);
        onGuardado(datos.audiencia!.length ? `Evento creado: le llega a ${revisionVigente?.personas ?? "tus"} ${revisionVigente?.personas === 1 ? "persona" : "personas"}.` : "Evento personal creado: solo lo ves vos.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  const titulo = pedido.modo === "editar" ? "Editar evento" : pedido.modo === "duplicar" ? "Duplicar evento" : "Nuevo evento";

  return (
    <div className="a-velo" onClick={() => { if (!guardando) onCerrar(); }}>
      <div className="a-dialogo is-ancho" role="dialog" aria-modal="true" aria-labelledby="a-editor-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-white/5 px-6 py-4" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 22%, transparent), transparent 60%)` }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: color + "33", color }} aria-hidden="true">
            <span className="material-symbols-outlined">{categoria?.icono ?? "event"}</span>
          </span>
          <h2 id="a-editor-titulo" className="flex-1 font-headline text-lg font-bold text-white">{titulo}</h2>
          <button type="button" className="a-icono-boton" onClick={onCerrar} disabled={guardando} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Qué y cuándo */}
          <div className="flex flex-col gap-5">
            <input className="a-input a-input-titulo" value={f.titulo} maxLength={140} placeholder="Título del evento" autoFocus aria-label="Título" onChange={(e) => set("titulo", e.target.value)} />

            <div>
              <p className="a-subtitulo mb-2">Tipo</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((c) => (
                  <button key={c.id} type="button" className="a-chip a-chip-boton" style={{ ["--chip" as string]: c.color }} aria-pressed={f.tipo === c.id} onClick={() => set("tipo", c.id)}>
                    <span className="material-symbols-outlined" style={{ color: c.color }} aria-hidden="true">{c.icono}</span>{c.nombre}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Color">
                {COLORES_EVENTO.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={color === c}
                    className={`h-6 w-6 rounded-full border-2 transition ${color === c ? "scale-110 border-blanco" : "border-transparent"}`}
                    style={{ background: c }} onClick={() => set("color", c === categoria?.color ? null : c)} />
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-on-surface-variant/70">{f.fechaFin ? "Empieza" : "Fecha"}</span>
                <input type="date" className="a-input" value={f.fecha} onChange={(e) => {
                  const nueva = e.target.value;
                  if (!nueva) return;
                  setF((x) => ({ ...x, fecha: nueva, fechaFin: x.fechaFin && x.fechaFin < nueva ? nueva : x.fechaFin }));
                }} />
              </label>
              {f.fechaFin ? (
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant/70">
                    Termina
                    <button type="button" className="text-primary hover:underline" onClick={() => set("fechaFin", null)}>mismo día</button>
                  </span>
                  <input type="date" className="a-input" value={f.fechaFin} min={f.fecha} onChange={(e) => set("fechaFin", e.target.value || null)} />
                </label>
              ) : (
                <div className="flex items-end">
                  <button type="button" className="a-boton-fantasma a-boton-chico" onClick={() => set("fechaFin", sumarDiasISO(f.fecha, 1))}>
                    <span className="material-symbols-outlined" aria-hidden="true">date_range</span>Dura varios días
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-white">
                <button type="button" role="switch" aria-checked={f.todoElDia} className="a-interruptor" onClick={() => set("todoElDia", !f.todoElDia)} aria-label="Todo el día" />
                Todo el día
              </label>
              {!f.todoElDia && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-on-surface-variant/70">Desde</span>
                    <input type="time" className="a-input !w-32" value={f.horaInicio} onChange={(e) => {
                      const v = e.target.value;
                      setF((x) => ({ ...x, horaInicio: v, horaFin: !x.fechaFin && x.horaFin <= v ? masUnaHora(v) : x.horaFin }));
                    }} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-on-surface-variant/70">Hasta</span>
                    <input type="time" className="a-input !w-32" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} />
                  </label>
                </>
              )}
            </div>

            {fRecurrentes && !(recurrenteEditado && alcance === "este") && (
              <div>
                <p className="a-subtitulo mb-2">Repetición</p>
                <EditorRepeticion fecha={f.fecha} valor={f.recurrencia} onCambiar={(r) => set("recurrencia", r)} />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-on-surface-variant/70">Lugar</span>
                <input className="a-input" value={f.lugar} maxLength={140} placeholder="Aula, SUM, patio…" onChange={(e) => set("lugar", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-on-surface-variant/70">Enlace (videollamada o página)</span>
                <input className="a-input" value={f.enlace} placeholder="https://…" onChange={(e) => set("enlace", e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-on-surface-variant/70">Detalle</span>
              <textarea className="a-input min-h-[88px]" value={f.descripcion} maxLength={4000} placeholder="Qué traer, cómo prepararse, a quién preguntar…" onChange={(e) => set("descripcion", e.target.value)} />
            </label>
          </div>

          {/* Quién lo ve y qué se le pide */}
          <div className="flex flex-col gap-5">
            <section aria-label="Quién lo ve">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="a-subtitulo">¿Quién lo ve?</p>
                {comparte && (
                  <div className="a-segmentos" role="radiogroup" aria-label="Personal o compartido">
                    <button type="button" role="radio" aria-checked={!compartir} className="a-segmento" onClick={() => setCompartir(false)}>Solo yo</button>
                    <button type="button" role="radio" aria-checked={compartir} className="a-segmento" onClick={() => setCompartir(true)}>Compartir</button>
                  </div>
                )}
              </div>
              {errorDestinos && <p className="text-sm text-rose-200">{errorDestinos}</p>}
              {!destinos && !errorDestinos && <p className="text-sm text-on-surface-variant/60">Cargando tu lugar en la jerarquía…</p>}
              {destinos && (!comparte || !compartir) && (
                <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">lock</span>
                  <p><b className="text-white">Solo lo ves vos.</b> {destinos.comparte ? "Es un evento personal: nadie más lo ve, ni siquiera la dirección." : `En tu nivel («${destinos.nivel.nombre}») los eventos son personales.`}</p>
                </div>
              )}
              {destinos && comparte && compartir && <SelectorAudiencia destinos={destinos} valor={f.audiencia} onCambiar={(l) => set("audiencia", l)} />}
              {destinos?.limiteCentro && compartir && (
                <p className="mt-2 text-[11.5px] text-on-surface-variant/60">El Centro de Estudiantes publica hasta {destinos.limiteCentro.limite} eventos por mes (este mes: {destinos.limiteCentro.usados}).</p>
              )}
            </section>

            {comparte && compartir && (fObligatorios || fConfirmaciones || fAvisar) && (
              <section className="flex flex-col gap-2" aria-label="Opciones para los destinatarios">
                {fObligatorios && <Opcion icono="priority_high" titulo="Obligatorio" texto="Nadie lo puede ocultar de su calendario." valor={f.obligatorio} onCambiar={(v) => set("obligatorio", v)} />}
                {fConfirmaciones && <Opcion icono="how_to_reg" titulo="Pedir confirmación" texto="Cada persona responde voy, quizás o no voy; vos ves la cuenta." valor={f.pideConfirmacion} onCambiar={(v) => set("pideConfirmacion", v)} />}
                {fAvisar && <Opcion icono="campaign" titulo={editando ? "Avisar del cambio" : "Avisar ahora"} texto="Les llega una notificación en este momento." valor={f.avisar} onCambiar={(v) => set("avisar", v)} />}
              </section>
            )}

            <section aria-label="Recordatorios">
              <p className="a-subtitulo mb-2">Recordatorios {comparte && compartir ? "(para todos los que lo ven)" : ""}</p>
              <div className="flex flex-wrap gap-1.5">
                {OPCIONES_RECORDATORIO.map((m) => (
                  <button key={m} type="button" className="a-chip a-chip-boton" aria-pressed={f.recordatorios.includes(m)} disabled={!f.recordatorios.includes(m) && f.recordatorios.length >= 5}
                    onClick={() => set("recordatorios", f.recordatorios.includes(m) ? f.recordatorios.filter((x) => x !== m) : [...f.recordatorios, m].sort((a, b) => a - b))}>
                    <span className="material-symbols-outlined" aria-hidden="true">notifications</span>{etiquetaRecordatorio(m)}
                  </button>
                ))}
              </div>
            </section>

            {/* Revisión en vivo (solo si se comparte: lo personal no le llega a nadie más) */}
            {revisar && <section className="rounded-2xl border border-white/5 bg-black/20 p-4" aria-live="polite" aria-label="Revisión">
              {!revisionVigente ? (
                <p className="flex items-center gap-2 text-xs text-on-surface-variant/60">
                  {revision?.clave === claveRevision && revision.error
                    ? <><span className="material-symbols-outlined text-base text-rose-300" aria-hidden="true">error</span><span className="text-rose-200">{revision.error}</span></>
                    : <><span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>Calculando a quién le llega…</>}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <p className="a-cifra text-white">{revisionVigente.personas}</p>
                      <p className="text-[11px] text-on-surface-variant/60">{revisionVigente.personas === 1 ? "persona lo va a ver" : "personas lo van a ver"} (además de vos)</p>
                    </div>
                    {datos.recurrencia && (
                      <div>
                        <p className="a-cifra text-white">{revisionVigente.ocurrencias}</p>
                        <p className="text-[11px] text-on-surface-variant/60">veces en el próximo año</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {revisionVigente.porNivel.map((n) => <span key={n.nivel} className="a-chip !text-[10.5px]">{n.nivel}: {n.personas}</span>)}
                    </div>
                  </div>
                  {revisionVigente.choques.length > 0 && (
                    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-100">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">event_busy</span>Choca con otros eventos de esas personas
                      </p>
                      <ul className="flex flex-col gap-1 text-[12px] text-amber-100/85">
                        {revisionVigente.choques.map((c, i) => (
                          <li key={i}>{fechaCorta(c.fecha)}{c.horaInicio ? ` ${c.horaInicio}` : ""} · {c.titulo} · {c.afectados} {c.afectados === 1 ? "persona" : "personas"}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>}
          </div>
        </div>

        {error && <p className="mx-6 mb-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p>}

        <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-white/5 px-6 py-4">
          <div>{recurrenteEditado && <><p className="a-subtitulo mb-1">Aplicar a</p><ElegirAlcance valor={alcance} onCambiar={setAlcance} verbo="Cambiar" /></>}</div>
          <div className="flex gap-2">
            <button type="button" className="a-boton-fantasma" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button type="button" className="a-boton" onClick={() => void guardar()} disabled={guardando || !destinos}>
              <span className={`material-symbols-outlined ${guardando ? "animate-spin" : ""}`} aria-hidden="true">{guardando ? "progress_activity" : "event_available"}</span>
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear evento"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Opcion({ icono, titulo, texto, valor, onCambiar }: { icono: string; titulo: string; texto: string; valor: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
      <span className="material-symbols-outlined text-primary" aria-hidden="true">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-[11.5px] text-on-surface-variant/60">{texto}</p>
      </div>
      <button type="button" role="switch" aria-checked={valor} aria-label={titulo} className="a-interruptor" onClick={() => onCambiar(!valor)} />
    </div>
  );
}
