import { useCallback, useState } from "react";
import { crearCanal, guardarCanal, unirseCanal, salirCanal, useCanales, useContactosChat, type Canal, type CrearCanal } from "../../../servicios/chat";
import { useTiempoReal } from "../../../servicios/tiempoReal";
import { useDialogo } from "../../../servicios/useDialogo";
import { ErrorDeApi, useDatos } from "../../../servicios/api";
import { normalizar } from "../../../servicios/biblioteca";
import Selector from "../shared/Selector";
import { Cargando, Fallo, Vacio } from "../shared/EstadoCarga";

const campo = "w-full bg-fondo border border-white/20 rounded-xl px-3 py-2 text-white";
const nombres: Record<Canal["clase"], string> = { canal: "Canal", foro: "Foro", hilo: "Tema", ayuda: "Pedido de ayuda", sugerencias: "Sugerencias", contexto: "Conversación contextual" };

export default function CanalesDialogo({ inicial, onCerrar, onAbrir, onCambio }: { inicial?: Canal; onCerrar: () => void; onAbrir: (id: string) => void; onCambio: () => void }) {
  const [foroSeleccionado, setForo] = useState<Canal | undefined>(inicial?.clase === "foro" ? inicial : undefined);
  const { datos: detalleForo, error: errorForo, cargando: cargandoForo, recargar: recargarForo } = useDatos<{ canal: Canal }>(foroSeleccionado ? `/api/chat/canales/${foroSeleccionado.id}` : null);
  const foro = detalleForo?.canal ?? foroSeleccionado;
  const [editar, setEditar] = useState<Canal | "nuevo" | null>(inicial && inicial.clase !== "foro" ? inicial : null);
  const [busqueda, setBusqueda] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const { datos, cargando, error, recargar: recargarCanales } = useCanales(foroSeleccionado?.id);
  const recargar = useCallback(() => { recargarCanales(); recargarForo(); }, [recargarCanales, recargarForo]);
  const dialogo = useDialogo<HTMLElement>(() => { if (!abriendo) onCerrar(); });
  useTiempoReal(useCallback(e => { if (e.tipo === "conversaciones-actualizadas" || e.tipo === "conectado") recargar(); }, [recargar]));
  const entrar = async (c: Canal) => {
    if (abriendo) return;
    setAbriendo(true); setErrorAccion("");
    try {
      const actual = c.miembro ? c : (await unirseCanal(c.id)).canal;
      onCambio();
      if (actual.clase === "foro") { setForo(actual); setBusqueda(""); }
      else onAbrir(actual.id);
    } catch (e) { setErrorAccion(e instanceof Error ? e.message : "No se pudo abrir el espacio."); }
    finally { setAbriendo(false); }
  };
  const lista = (datos?.canales ?? []).filter(c => normalizar(`${c.nombre} ${c.descripcion}`).includes(normalizar(busqueda)));
  const salir = async (c: Canal) => {
    if (abriendo) return;
    setAbriendo(true); setErrorAccion("");
    try { await salirCanal(c.id); if (foroSeleccionado?.id === c.id) setForo(undefined); recargar(); onCambio(); }
    catch (e) { setErrorAccion(e instanceof Error ? e.message : "No se pudo salir."); }
    finally { setAbriendo(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/70 p-3 sm:p-6 flex items-center justify-center">
    <section ref={dialogo} role="dialog" aria-modal="true" aria-labelledby="canales-titulo" className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto bg-[#24143b] border border-white/15 rounded-2xl p-5 text-white space-y-5">
      <header className="flex justify-between gap-3 items-center"><h2 id="canales-titulo" className="text-xl font-bold">{editar ? editar === "nuevo" ? foro ? "Nuevo tema" : "Nuevo espacio" : "Configurar espacio" : foro?.nombre ?? "Canales, foros y ayuda"}</h2><button type="button" disabled={abriendo} onClick={onCerrar} aria-label="Cerrar espacios" className="p-2">✕</button></header>
      {editar ? <EditorCanal key={editar === "nuevo" ? `nuevo-${foro?.id ?? ""}` : `${editar.id}-${editar.version}`} canal={editar === "nuevo" ? undefined : editar} foro={foro} onCancelar={() => setEditar(null)} onGuardar={c => { onCambio(); recargar(); setEditar(null); if (c.clase === "foro") setForo(c); else onAbrir(c.id); }} /> : <>
        {foro ? <><button type="button" onClick={() => { setForo(undefined); setBusqueda(""); }} className="text-primary">← Todos los espacios</button><p className="text-sm text-slate-300">{foro.descripcion}</p></> : <p className="text-sm text-slate-300">Unite a espacios sociales, abrí temas o pedí ayuda. Participar es voluntario.</p>}
        <div className="flex flex-wrap gap-3"><input aria-label="Buscar espacios" placeholder="Buscar por nombre o descripción" className={`${campo} flex-1 min-w-40`} value={busqueda} onChange={e => setBusqueda(e.target.value)} /><button type="button" onClick={recargar} className="px-3 py-2 rounded-xl bg-white/10">Actualizar</button>{(!foro || !cargandoForo && !errorForo && foro.miembro && foro.estado === "abierto" && (!foro.soloLectura || foro.administrable)) && <button type="button" onClick={() => setEditar("nuevo")} className="px-4 py-2 rounded-xl bg-primary font-bold">{foro ? "Nuevo tema" : "+ Crear espacio"}</button>}{foro?.administrable && <button type="button" onClick={() => setEditar(foro)} className="px-3 py-2 rounded-xl bg-white/10">Configurar foro</button>}</div>
        {errorForo && <p role="alert" className="text-red-300">{errorForo}</p>}{errorAccion && <p role="alert" className="text-red-300">{errorAccion}</p>}
        {cargando ? <Cargando que="los espacios" /> : error ? <Fallo error={error} onReintentar={recargar} /> : !lista.length ? <Vacio icono="forum" mensaje="Todavía no hay espacios que coincidan." /> : <div className="space-y-3">{lista.map(c => <article key={c.id} className="rounded-xl border border-white/10 p-4 space-y-2"><div className="flex justify-between gap-2"><h3 className="font-bold break-words">{c.nombre}</h3><span className="text-xs text-slate-300">{c.estado}</span></div><p className="text-xs text-primary">{nombres[c.clase]} · {c.visibilidad === "privada" ? "Privado" : "Institución"}{c.soloLectura ? " · Escritura restringida" : ""}{c.clase === "foro" ? ` · ${c.temas ?? 0} temas` : ""}</p><p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{c.descripcion}</p><div className="flex gap-4"><button type="button" disabled={abriendo} onClick={() => void entrar(c)} className="text-primary font-bold">{c.miembro ? c.clase === "foro" ? "Ver temas" : "Abrir conversación" : "Unirme"}</button>{c.puedeSalir && <button type="button" disabled={abriendo} onClick={() => void salir(c)} className="text-sm text-slate-300">Salir del espacio</button>}{c.administrable && <button type="button" onClick={() => setEditar(c)} className="text-sm text-slate-300">Configurar</button>}</div></article>)}</div>}
      </>}
    </section>
  </div>;
}

function EditorCanal({ canal, foro, onGuardar, onCancelar }: { canal?: Canal; foro?: Canal; onGuardar: (canal: Canal) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState(canal?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(canal?.descripcion ?? "");
  const [clase, setClase] = useState<Canal["clase"]>(canal?.clase ?? (foro ? "hilo" : "canal"));
  const [visibilidad, setVisibilidad] = useState<Canal["visibilidad"]>(canal?.visibilidad ?? foro?.visibilidad ?? "institucion");
  const [soloLectura, setSoloLectura] = useState(canal?.soloLectura ?? false);
  const [estado, setEstado] = useState<Canal["estado"]>(canal?.estado ?? "abierto");
  const [miembros, setMiembros] = useState<string[]>(canal?.participantes.map(p => String(p.id)) ?? []);
  const [editadosMiembros, setEditadosMiembros] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const [error, setError] = useState("");
  const puedeElegirMiembros = clase !== "ayuda" && clase !== "hilo" && (!canal?.contexto || canal.contexto.tipo === "meta");
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); if (guardando || conflicto) return;
    setGuardando(true); setError("");
    try {
      const r = canal ? await guardarCanal(canal.id, { version: canal.version, nombre, descripcion, estado, soloLectura, ...(puedeElegirMiembros && editadosMiembros ? { miembros } : {}) })
        : await crearCanal({ nombre, descripcion, clase: clase as CrearCanal["clase"], visibilidad: clase === "ayuda" ? "privada" : visibilidad, soloLectura, ...(puedeElegirMiembros ? { miembros } : {}), ...(foro ? { padreId: foro.id } : {}) });
      onGuardar(r.canal);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); setConflicto(e instanceof ErrorDeApi && e.estado === 409); }
    finally { setGuardando(false); }
  };
  return <form onSubmit={guardar} className="space-y-4"><fieldset disabled={guardando || conflicto} className="space-y-4">
    <label className="block text-sm">Nombre<input className={campo} required maxLength={120} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
    <label className="block text-sm">Descripción<textarea className={campo} maxLength={2000} rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></label>
    {!canal && !foro && <label className="block text-sm">Tipo<Selector className={campo} value={clase} onChange={e => setClase(e.target.value as Canal["clase"])}>{(["canal", "foro", "ayuda", "sugerencias"] as const).map(t => <option key={t} value={t}>{nombres[t]}</option>)}</Selector></label>}
    {!canal && !foro && clase !== "ayuda" && <label className="block text-sm">Visibilidad<Selector className={campo} value={visibilidad} onChange={e => setVisibilidad(e.target.value as Canal["visibilidad"])}><option value="institucion">Disponible para la institución</option><option value="privada">Solo participantes elegidos</option></Selector></label>}
    {clase === "ayuda" && <p className="text-sm text-slate-300">Este pedido identifica tu cuenta y se comparte en privado con la dirección. Las quejas anónimas conservan su espacio separado.</p>}
    {canal && <label className="block text-sm">Estado<Selector className={campo} value={estado} onChange={e => setEstado(e.target.value as Canal["estado"])}><option value="abierto">Abierto</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></Selector></label>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soloLectura} onChange={e => setSoloLectura(e.target.checked)} />Solo administradores pueden {clase === "foro" ? "crear temas" : "escribir"}</label>
    {puedeElegirMiembros && <Participantes elegidos={miembros} onCambiar={ids => { setMiembros(ids); setEditadosMiembros(true); }} />}
  </fieldset>{error && <p role="alert" className="text-red-300">{error}</p>}{conflicto && <p className="text-sm">Volvé a la lista y actualizá para cargar la última versión; el borrador no se guardó.</p>}<div className="flex gap-3"><button type="submit" disabled={guardando || conflicto} className="px-4 py-2 rounded-xl bg-primary disabled:opacity-50">{guardando ? "Guardando…" : canal ? "Guardar cambios" : "Crear"}</button><button type="button" disabled={guardando} onClick={onCancelar} className="px-4 py-2 rounded-xl bg-white/10">Volver a la lista</button></div></form>;
}

function Participantes({ elegidos, onCambiar }: { elegidos: string[]; onCambiar: (ids: string[]) => void }) {
  const { contactos, cargando, error, recargar } = useContactosChat();
  const [busqueda, setBusqueda] = useState("");
  return <fieldset className="border border-white/10 rounded-xl p-3 space-y-2"><legend className="text-sm">Participantes invitados ({elegidos.length})</legend><p className="text-xs text-slate-400">La cuenta creadora permanece en el espacio. En espacios institucionales otras personas pueden unirse.</p><input className={campo} aria-label="Buscar participantes" placeholder="Buscar personas" value={busqueda} onChange={e => setBusqueda(e.target.value)} />{cargando ? <Cargando que="contactos" /> : error ? <Fallo error={error} onReintentar={recargar} /> : <div className="max-h-40 overflow-y-auto space-y-2">{contactos.filter(c => normalizar(c.nombre).includes(normalizar(busqueda))).map(c => <label key={c.id} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={elegidos.includes(c.id)} onChange={e => onCambiar(e.target.checked ? [...elegidos, c.id] : elegidos.filter(id => id !== c.id))} />{c.nombre}</label>)}</div>}</fieldset>;
}
