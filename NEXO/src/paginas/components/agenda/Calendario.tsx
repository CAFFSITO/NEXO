// El calendario con jerarquía, completo: día, semana, mes, año y agenda; capas
// por tipo de evento y por nivel de la jerarquía; búsqueda; supervisión para la
// dirección; arrastrar para mover; próximos eventos, feriados y exportar a .ics.
// Lo usan el calendario de la comunidad y el de las familias.

import { useMemo, useState } from "react";
import {
  editarEvento,
  useCalendario,
  type EventoServidor,
} from "../../../servicios/calendario";
import { limpiarEnfoque, verEnfoque } from "../../../servicios/enfoque";
import { construirGrillaMes, construirSemana } from "../calendario/fechas";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { capitalizar, cuandoEvento, diaSemana, fechaCorta, fechaLarga, hoyISO, NOMBRES_MES, SEMANA, sumarDiasISO, toISO } from "./agendaUtil";
import VistaMes from "./VistaMes";
import VistaTiempo from "./VistaTiempo";
import VistaAnio from "./VistaAnio";
import VistaAgenda from "./VistaAgenda";
import DetalleEvento from "./DetalleEvento";
import EditorEvento, { type PedidoEditor } from "./EditorEvento";
import "./agenda.css";

type Vista = "dia" | "semana" | "mes" | "anio" | "agenda";
const VISTAS: { id: Vista; nombre: string }[] = [
  { id: "dia", nombre: "Día" }, { id: "semana", nombre: "Semana" }, { id: "mes", nombre: "Mes" },
  { id: "anio", nombre: "Año" }, { id: "agenda", nombre: "Agenda" },
];
const POLITICA = {
  "nivel-y-abajo": "le mostrás eventos a tu nivel y a los de abajo",
  abajo: "le mostrás eventos a los niveles de abajo",
  personal: "tus eventos son personales",
} as const;

const HOY = hoyISO();
const CLAVE_PREFERENCIAS = "nexo:calendario";

interface Preferencias { vista: Vista; categoriasOff: string[]; origenOff: string[]; mostrarOcultos: boolean }
function leerPreferencias(): Preferencias {
  const base: Preferencias = { vista: "mes", categoriasOff: [], origenOff: [], mostrarOcultos: false };
  try {
    const crudo = window.localStorage.getItem(CLAVE_PREFERENCIAS);
    return crudo ? { ...base, ...(JSON.parse(crudo) as Partial<Preferencias>) } : base;
  } catch {
    return base;
  }
}
function guardarPreferencias(p: Preferencias) {
  try { window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(p)); } catch { /* sin almacenamiento: no pasa nada */ }
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Calendario({ titulo }: { titulo: string }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leerPreferencias);
  const [ancla, setAncla] = useState(HOY);
  const [buscar, setBuscar] = useState("");
  const [supervision, setSupervision] = useState(false);
  const [editor, setEditor] = useState<PedidoEditor | null>(null);
  const [detalle, setDetalle] = useState<EventoServidor | null>(null);
  const [enfoqueUsado, setEnfoqueUsado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const { vista, categoriasOff, origenOff, mostrarOcultos } = preferencias;
  const preferir = (cambio: Partial<Preferencias>) => {
    const nuevas = { ...preferencias, ...cambio };
    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
  };

  const anio = Number(ancla.slice(0, 4));
  const mes = Number(ancla.slice(5, 7)) - 1;
  const { datos, cargando, error, recargar } = useCalendario({ desde: `${anio - 1}-12-01`, hasta: `${anio + 1}-01-31`, supervision });
  // Si el servidor quedó con una versión anterior (se actualizó la pantalla
  // pero no se reinició el servidor), sus datos no traen la jerarquía: se avisa
  // en vez de romper la vista.
  const desactualizado = datos !== null && (!datos.nivel || !Array.isArray(datos.niveles) || !Array.isArray(datos.categorias));
  const eventos = useMemo(() => (desactualizado ? [] : datos?.eventos ?? []), [datos, desactualizado]);
  const categorias = useMemo(() => datos?.categorias ?? [], [datos]);

  // Abrir el evento de una notificación, una sola vez.
  const pendiente = !enfoqueUsado ? verEnfoque("evento") : null;
  const deEnfoque = pendiente && datos
    ? eventos.filter((e) => e.eventoId === pendiente).sort((a, b) => Number(a.fecha < HOY) - Number(b.fecha < HOY))[0] ?? null
    : null;
  const abierto = detalle ?? deEnfoque;
  const cerrarDetalle = () => {
    setDetalle(null);
    if (pendiente) { limpiarEnfoque(); setEnfoqueUsado(true); }
  };

  const q = sinAcentos(buscar.trim());
  const visibles = useMemo(() => eventos.filter((e) =>
    !categoriasOff.includes(e.categoria) &&
    !origenOff.includes(e.personal ? "personal" : `nivel:${e.nivel?.id ?? ""}`) &&
    (mostrarOcultos || !e.oculto) &&
    (!q || sinAcentos(`${e.titulo} ${e.descripcion} ${e.lugar ?? ""} ${e.creador}`).includes(q))), [eventos, categoriasOff, origenOff, mostrarOcultos, q]);

  const ocultos = eventos.filter((e) => e.oculto).length;
  const cuenta = (pred: (e: EventoServidor) => boolean) => eventos.filter(pred).length;

  const mover = (paso: number) => {
    if (vista === "dia") setAncla(sumarDiasISO(ancla, paso));
    else if (vista === "semana") setAncla(sumarDiasISO(ancla, 7 * paso));
    else if (vista === "agenda") setAncla(sumarDiasISO(ancla, 30 * paso));
    else if (vista === "anio") setAncla(toISO(anio + paso, mes, 1));
    else { const d = new Date(anio, mes + paso, 1); setAncla(toISO(d.getFullYear(), d.getMonth(), 1)); }
  };
  const semana = construirSemana(ancla).map((c) => c.fechaISO);
  const periodo = vista === "dia" ? capitalizar(fechaLarga(ancla, true))
    : vista === "semana" ? `${Number(semana[0].slice(8))} de ${NOMBRES_MES[Number(semana[0].slice(5, 7)) - 1]} – ${Number(semana[6].slice(8))} de ${NOMBRES_MES[Number(semana[6].slice(5, 7)) - 1]} de ${semana[6].slice(0, 4)}`
    : vista === "anio" ? String(anio)
    : vista === "agenda" ? `Desde el ${fechaLarga(ancla)}`
    : `${capitalizar(NOMBRES_MES[mes])} ${anio}`;

  const nuevo = (fecha: string, hora?: string) => setEditor({ modo: "nuevo", fecha, hora });
  const verDia = (fecha: string) => { setAncla(fecha); preferir({ vista: "dia" }); };

  const moverEvento = async (ev: EventoServidor, fecha: string) => {
    try {
      await editarEvento(ev.eventoId, {
        titulo: ev.titulo, tipo: ev.tipo, color: ev.color, fecha, todoElDia: ev.todoElDia,
        horaInicio: ev.horaInicio, horaFin: ev.horaFin, lugar: ev.lugar ?? "", enlace: ev.enlace ?? "",
        descripcion: ev.descripcion, recordatorios: ev.recordatorios, obligatorio: ev.obligatorio,
        pideConfirmacion: ev.pideConfirmacion, audiencia: ev.destinos ?? [],
      });
      setAviso({ tipo: "ok", texto: `«${ev.titulo}» pasó al ${fechaLarga(fecha)}.` });
      recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo mover el evento." });
    }
  };

  const proximos = visibles.filter((e) => (e.fechaFin ?? e.fecha) >= HOY && !e.supervision).slice(0, 5);
  const prefijoMes = `${anio}-${String(mes + 1).padStart(2, "0")}`;
  const feriadosMes = (datos?.feriados ?? []).filter((f) => f.fecha.startsWith(prefijoMes));

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-white">{titulo}</h1>
            {datos && !desactualizado && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant/70">
                <span className="a-chip !py-0.5"><span className="material-symbols-outlined" aria-hidden="true">account_tree</span>{datos.nivel.nombre}</span>
                {POLITICA[datos.nivel.politica]}
              </p>
            )}
          </div>
          {!desactualizado && (
            <button type="button" className="a-boton" onClick={() => nuevo(vista === "mes" || vista === "anio" ? (ancla.startsWith(HOY.slice(0, 7)) ? HOY : toISO(anio, mes, 1)) : ancla)}>
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              {datos && !datos.comparte ? "Nuevo evento personal" : "Nuevo evento"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button type="button" className="a-icono-boton" onClick={() => mover(-1)} aria-label="Anterior"><span className="material-symbols-outlined">chevron_left</span></button>
            <button type="button" className="a-boton-fantasma a-boton-chico" onClick={() => setAncla(HOY)}>Hoy</button>
            <button type="button" className="a-icono-boton" onClick={() => mover(1)} aria-label="Siguiente"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <h2 className="min-w-[10rem] flex-1 font-headline text-xl font-bold text-white" aria-live="polite">{periodo}</h2>
          <div className="relative w-full sm:w-56">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" aria-hidden="true">search</span>
            <input className="a-input !py-2 !pl-10 !text-[13px]" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar eventos…" aria-label="Buscar eventos" />
          </div>
          <div className="a-segmentos" role="tablist" aria-label="Vista">
            {VISTAS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} className="a-segmento" onClick={() => preferir({ vista: v.id })}>{v.nombre}</button>)}
          </div>
        </div>
        {aviso && (
          <p role="status" className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${aviso.tipo === "ok" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-rose-500/25 bg-rose-500/10 text-rose-100"}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{aviso.tipo === "ok" ? "check_circle" : "error"}</span>
            <span className="flex-1">{aviso.texto}</span>
            <button type="button" className="a-icono-boton !h-7 !w-7" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><span className="material-symbols-outlined">close</span></button>
          </p>
        )}
      </header>

      {error && !datos && <Fallo error={error} onReintentar={recargar} />}
      {desactualizado && <Fallo error={"El servidor de NEXO sigue corriendo una versión anterior. Cerralo (Ctrl+C en la terminal de «npm run dev») y volvé a ejecutarlo: al arrancar actualiza la base sola. Después recargá esta página."} onReintentar={recargar} />}
      {cargando && !datos && <Cargando que="el calendario" />}

      {datos && !desactualizado && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
          <div className={`min-w-0 transition-opacity ${cargando ? "opacity-60" : ""}`}>
            {q && <p className="mb-3 text-sm text-on-surface-variant/70">{visibles.length} {visibles.length === 1 ? "evento coincide" : "eventos coinciden"} con «{buscar}».</p>}
            {vista === "mes" && <VistaMes anio={anio} mes={mes} eventos={visibles} feriados={datos.feriados} hoy={HOY} onDia={(f) => nuevo(f)} onVerDia={verDia} onEvento={setDetalle} onMover={(ev, f) => void moverEvento(ev, f)} />}
            {vista === "semana" && <VistaTiempo dias={semana} eventos={visibles} feriados={datos.feriados} hoy={HOY} onHueco={nuevo} onEvento={setDetalle} onVerDia={verDia} />}
            {vista === "dia" && <VistaTiempo dias={[ancla]} eventos={visibles} feriados={datos.feriados} hoy={HOY} onHueco={nuevo} onEvento={setDetalle} />}
            {vista === "anio" && <VistaAnio anio={anio} eventos={visibles} feriados={datos.feriados} hoy={HOY} onVerDia={verDia} />}
            {vista === "agenda" && <VistaAgenda eventos={visibles} desde={ancla} hoy={HOY} onEvento={setDetalle} vacio={q ? "Nada coincide con la búsqueda." : "No hay eventos desde esta fecha."} />}
          </div>

          {/* Panel lateral */}
          <aside className="flex flex-col gap-4" aria-label="Capas y próximos eventos">
            <MiniMes ancla={ancla} hoy={HOY} eventos={visibles} onElegir={(f) => { setAncla(f); if (vista === "anio") preferir({ vista: "mes" }); }} />

            <section className="a-panel p-4" aria-label="Tu lugar en la jerarquía">
              <p className="a-subtitulo mb-3">Jerarquía</p>
              <ol className="flex flex-col gap-1.5">
                {datos.niveles.map((n) => {
                  const clave = `nivel:${n.id}`;
                  const activo = !origenOff.includes(clave);
                  const total = cuenta((e) => !e.personal && e.nivel?.id === n.id);
                  return (
                    <li key={n.id}>
                      <button type="button" aria-pressed={activo} onClick={() => preferir({ origenOff: activo ? [...origenOff, clave] : origenOff.filter((x) => x !== clave) })}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] transition hover:bg-white/5 ${activo ? "text-white" : "text-on-surface-variant/40 line-through"}`}>
                        <span className="a-escalon" aria-hidden="true">{n.indice + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{n.nombre}</span>
                        {n.id === datos.nivel.id && <span className="rounded-full bg-acento/25 px-1.5 text-[9.5px] font-bold uppercase text-primary">vos</span>}
                        <span className="tabular-nums text-on-surface-variant/50">{total}</span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button type="button" aria-pressed={!origenOff.includes("personal")} onClick={() => preferir({ origenOff: origenOff.includes("personal") ? origenOff.filter((x) => x !== "personal") : [...origenOff, "personal"] })}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] transition hover:bg-white/5 ${!origenOff.includes("personal") ? "text-white" : "text-on-surface-variant/40 line-through"}`}>
                    <span className="material-symbols-outlined w-[22px] text-center text-base" aria-hidden="true">lock</span>
                    <span className="flex-1">Personales</span>
                    <span className="tabular-nums text-on-surface-variant/50">{cuenta((e) => e.personal)}</span>
                  </button>
                </li>
              </ol>
            </section>

            <section className="a-panel p-4" aria-label="Tipos de evento">
              <p className="a-subtitulo mb-3">Tipos</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((c) => {
                  const activo = !categoriasOff.includes(c.id);
                  return (
                    <button key={c.id} type="button" className="a-chip a-chip-boton" style={{ ["--chip" as string]: c.color }} aria-pressed={activo}
                      onClick={() => preferir({ categoriasOff: activo ? [...categoriasOff, c.id] : categoriasOff.filter((x) => x !== c.id) })}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: activo ? c.color : "transparent", border: `1.5px solid ${c.color}` }} aria-hidden="true" />
                      {c.nombre}<span className="tabular-nums opacity-60">{cuenta((e) => e.categoria === c.id)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3 text-[12.5px] text-on-surface-variant">
                <label className="flex items-center gap-2">
                  <button type="button" role="switch" aria-checked={mostrarOcultos} className="a-interruptor" onClick={() => preferir({ mostrarOcultos: !mostrarOcultos })} aria-label="Mostrar los que ocultaste" />
                  Mostrar los que ocultaste ({ocultos})
                </label>
                {datos.puedeSupervisar && (
                  <label className="flex items-center gap-2">
                    <button type="button" role="switch" aria-checked={supervision} className="a-interruptor" onClick={() => setSupervision(!supervision)} aria-label="Supervisión" />
                    <span>Supervisión: ver lo que cada nivel le muestra a otros (nunca lo personal)</span>
                  </label>
                )}
              </div>
            </section>

            <section className="a-panel p-4" aria-label="Próximos eventos">
              <p className="a-subtitulo mb-3">Próximos</p>
              {proximos.length === 0 ? <p className="text-[12.5px] text-on-surface-variant/60">Nada por delante.</p> : (
                <ul className="flex flex-col gap-1">
                  {proximos.map((e) => (
                    <li key={e.id}>
                      <button type="button" className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/5" onClick={() => setDetalle(e)}>
                        <span className="grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center" style={{ background: e.color + "26", color: e.color }}>
                          <span className="text-[9px] font-bold uppercase">{NOMBRES_MES[Number(e.fecha.slice(5, 7)) - 1].slice(0, 3)}</span>
                          <span className="font-headline text-base font-bold leading-none">{Number(e.fecha.slice(8))}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-white">{e.titulo}</span>
                          <span className="block truncate text-[11px] text-on-surface-variant/60">{cuandoEvento(e)}{e.lugar ? ` · ${e.lugar}` : ""}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {feriadosMes.length > 0 && (
              <section className="a-panel p-4" aria-label="Feriados del mes">
                <p className="a-subtitulo mb-2">Feriados de {NOMBRES_MES[mes]}</p>
                <ul className="flex flex-col gap-1 text-[12.5px]">
                  {feriadosMes.map((f) => <li key={f.fecha} className="flex gap-2"><span className="w-11 shrink-0 tabular-nums text-rose-300">{fechaCorta(f.fecha)}</span><span className="text-on-surface-variant">{f.nombre}</span></li>)}
                </ul>
              </section>
            )}

            <a className="a-boton-fantasma a-boton-chico self-start" href={`/api/calendario/exportar.ics?desde=${anio}-01-01&hasta=${anio}-12-31`} download>
              <span className="material-symbols-outlined" aria-hidden="true">ios_share</span>Exportar {anio} a otro calendario (.ics)
            </a>
          </aside>
        </div>
      )}

      {abierto && !editor && (
        <DetalleEvento
          key={abierto.id}
          evento={abierto}
          categorias={categorias}
          onCerrar={cerrarDetalle}
          onEditar={(ev) => { cerrarDetalle(); setEditor({ modo: "editar", evento: ev }); }}
          onDuplicar={(ev) => { cerrarDetalle(); setEditor({ modo: "duplicar", evento: ev }); }}
          onCambio={recargar}
        />
      )}
      {editor && (
        <EditorEvento
          pedido={editor}
          categorias={categorias}
          onCerrar={() => setEditor(null)}
          onGuardado={(texto) => { setEditor(null); setAviso({ tipo: "ok", texto }); recargar(); }}
        />
      )}
    </div>
  );
}

/** El mes chico del costado, para saltar a cualquier día. */
function MiniMes({ ancla, hoy, eventos, onElegir }: { ancla: string; hoy: string; eventos: EventoServidor[]; onElegir: (fecha: string) => void }) {
  const anio = Number(ancla.slice(0, 4));
  const mes = Number(ancla.slice(5, 7)) - 1;
  const conEventos = new Set(eventos.map((e) => e.fecha));
  const irA = (paso: number) => { const d = new Date(anio, mes + paso, 1); onElegir(toISO(d.getFullYear(), d.getMonth(), 1)); };
  return (
    <section className="a-panel p-4" aria-label="Mes chico">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-headline text-sm font-bold text-white">{capitalizar(NOMBRES_MES[mes])} {anio}</p>
        <div className="flex">
          <button type="button" className="a-icono-boton !h-7 !w-7" onClick={() => irA(-1)} aria-label="Mes anterior"><span className="material-symbols-outlined">chevron_left</span></button>
          <button type="button" className="a-icono-boton !h-7 !w-7" onClick={() => irA(1)} aria-label="Mes siguiente"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {SEMANA.map((d) => <span key={d.dia} className="text-[9.5px] font-bold text-on-surface-variant/40">{d.corto}</span>)}
        {construirGrillaMes(anio, mes).map((c) => (
          <button key={c.fechaISO} type="button" onClick={() => onElegir(c.fechaISO)} aria-label={fechaLarga(c.fechaISO)}
            className={`relative grid aspect-square place-items-center rounded-lg text-[11px] transition hover:bg-white/10 ${c.esDelMes ? "text-on-surface-variant" : "text-on-surface-variant/25"} ${c.fechaISO === hoy ? "!bg-acento font-bold !text-white" : ""} ${c.fechaISO === ancla && c.fechaISO !== hoy ? "ring-1 ring-acento" : ""} ${[0, 6].includes(diaSemana(c.fechaISO)) ? "opacity-80" : ""}`}>
            {c.dia}
            {conEventos.has(c.fechaISO) && c.fechaISO !== hoy && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}
