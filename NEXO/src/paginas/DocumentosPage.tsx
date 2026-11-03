// Documentos y formularios, como Google Docs / Forms:
//   · Inicio: "Crear" (documento, formulario o desde una plantilla) y la lista
//     de lo que hay en la escuela, con buscador y filtros.
//   · Editor: una hoja con bloques (título, párrafo, lista, tabla, enlace,
//     archivo, tarea con casilla y —en formularios— preguntas). Arriba, el
//     título, el estado y Guardar; al costado, Compartir, Historial,
//     Comentarios y, en formularios, Respuestas y Evaluación.
// Las reglas (versiones, conflictos, permisos, corrección) siguen en el servidor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import Desplegable from "./components/shared/Desplegable";
import { useNavegacion } from "../navegacion";
import { enviar, pedir, useDatos } from "../servicios/api";
import Selector from "./components/shared/Selector";
import { useTiempoReal } from "../servicios/tiempoReal";
import { normalizar } from "../servicios/biblioteca";
import { CamposBloque, ContenidoBloque, OpcionesEvaluacion, ResultadoRespuesta, ColaboradoresDocumento, type Bloque, type Evaluacion, type Resultado } from "./components/documentos/BloquesDocumento";

type Documento = { id: string; tipo: "documento" | "formulario"; titulo: string; contenido: Bloque[]; version: number; publicado: boolean; plantilla: boolean; autorId: string; editable?: boolean; propietario?: boolean; evaluacion?: Evaluacion };

const TIPOS_BLOQUE: { tipo: Bloque["tipo"]; nombre: string; icono: string; soloFormulario?: boolean }[] = [
  { tipo: "titulo", nombre: "Título", icono: "title" },
  { tipo: "texto", nombre: "Párrafo", icono: "notes" },
  { tipo: "lista", nombre: "Lista", icono: "format_list_bulleted" },
  { tipo: "tabla", nombre: "Tabla", icono: "table" },
  { tipo: "enlace", nombre: "Enlace", icono: "link" },
  { tipo: "archivo", nombre: "Archivo", icono: "attach_file" },
  { tipo: "accionable", nombre: "Tarea con casilla", icono: "check_box" },
  { tipo: "pregunta", nombre: "Pregunta", icono: "help", soloFormulario: true },
];
const nombreBloque = (t: Bloque["tipo"]) => TIPOS_BLOQUE.find((x) => x.tipo === t) ?? { nombre: t, icono: "notes" };
const RESPUESTAS: { id: NonNullable<Bloque["respuesta"]>; nombre: string }[] = [
  { id: "texto", nombre: "Respuesta corta" }, { id: "numero", nombre: "Número" }, { id: "seleccion", nombre: "Una opción" },
  { id: "multiple", nombre: "Varias opciones" }, { id: "fecha", nombre: "Fecha" },
];
const AYUDA_TEXTO: Partial<Record<Bloque["tipo"], string>> = {
  titulo: "Escribí el título de la sección", texto: "Escribí un párrafo…", lista: "Un ítem por renglón",
  tabla: "Nombre de la tabla", enlace: "Texto que se va a ver (por ejemplo: Programa de la materia)",
  archivo: "Descripción del archivo (opcional)", accionable: "Qué hay que hacer (por ejemplo: Leer el capítulo 2)",
  pregunta: "Escribí la pregunta",
};

export function DocumentoIntegrado({ id }: { id: string | number }) {
  const { navegar } = useNavegacion();
  const { datos, error, recargar } = useDatos<{ documento: Documento }>(`/api/documentos/${id}`);
  const ramificar = async (d: Documento, plantilla = false) => {
    const r = await enviar<{ documento: Documento }>(`/api/documentos/${d.id}/ramificar`, "POST", { plantilla });
    navegar(`/documentos?documento=${r.documento.id}`);
  };
  if (error) return <p role="alert">{error}</p>;
  if (!datos) return <p role="status">Abriendo documento…</p>;
  return <Editor key={`${datos.documento.id}-${datos.documento.version}`} inicial={datos.documento} onGuardar={() => recargar()} onRamificar={ramificar} />;
}

function IconoTipo({ tipo }: { tipo: Documento["tipo"] }) {
  return <span className={`material-symbols-outlined grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tipo === "formulario" ? "bg-violet-500/10 text-violet-300" : "bg-sky-500/10 text-sky-300"}`} aria-hidden="true">{tipo === "formulario" ? "list_alt" : "description"}</span>;
}

type Filtro = "todos" | "documento" | "formulario" | "plantilla";

function Inicio({ documentos, error, onAbrir, onCrear, onCopiar, aviso }: {
  documentos: Documento[] | null; error: string | null; aviso: string;
  onAbrir: (id: string) => void; onCrear: (tipo: Documento["tipo"]) => void; onCopiar: (d: Documento, plantilla?: boolean) => void;
}) {
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const plantillas = (documentos ?? []).filter((d) => d.plantilla);
  const lista = useMemo(() => {
    const q = normalizar(buscar.trim());
    return (documentos ?? []).filter((d) => (filtro === "todos" || (filtro === "plantilla" ? d.plantilla : d.tipo === filtro)) && (!q || normalizar(d.titulo).includes(q)));
  }, [documentos, buscar, filtro]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-8">
      <section aria-labelledby="crear-titulo">
        <h1 id="crear-titulo" className="mb-1">Documentos y formularios</h1>
        <p className="mb-5 text-sm text-on-surface-variant">Escribí guías, actas y apuntes, o armá formularios y cuestionarios con corrección automática.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            { tipo: "documento", titulo: "Documento en blanco", detalle: "Apuntes, guías, actas, programas", icono: "description", tono: "bg-sky-500/10 text-sky-300" },
            { tipo: "formulario", titulo: "Formulario en blanco", detalle: "Encuestas, inscripciones y cuestionarios con nota", icono: "list_alt", tono: "bg-violet-500/10 text-violet-300" },
          ] as const).map((c) => (
            <button key={c.tipo} type="button" onClick={() => onCrear(c.tipo)} className="nx-tarjeta flex items-start gap-3 p-4 text-left transition-colors hover:bg-surface-container-high">
              <span className={`material-symbols-outlined grid h-11 w-11 shrink-0 place-items-center rounded-lg ${c.tono}`} aria-hidden="true">{c.icono}</span>
              <span className="min-w-0"><span className="block font-semibold text-on-surface">{c.titulo}</span><span className="mt-0.5 block text-[13px] leading-snug text-on-surface-variant">{c.detalle}</span></span>
            </button>
          ))}
          <button type="button" onClick={() => setFiltro("plantilla")} className="nx-tarjeta flex items-start gap-3 p-4 text-left transition-colors hover:bg-surface-container-high">
            <span className="material-symbols-outlined grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300" aria-hidden="true">content_copy</span>
            <span className="min-w-0"><span className="block font-semibold text-on-surface">Desde una plantilla</span><span className="mt-0.5 block text-[13px] leading-snug text-on-surface-variant">{plantillas.length ? `${plantillas.length} ${plantillas.length === 1 ? "plantilla disponible" : "plantillas disponibles"}` : "Todavía no hay plantillas en tu escuela"}</span></span>
          </button>
        </div>
        {aviso && <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{aviso}</p>}
      </section>

      <section aria-labelledby="lista-titulo" className="nx-tarjeta overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-linea p-3">
          <h2 id="lista-titulo" className="mr-auto px-1 text-base font-semibold text-on-surface">En tu escuela</h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar">
            {([["todos", "Todos"], ["documento", "Documentos"], ["formulario", "Formularios"], ["plantilla", "Plantillas"]] as const).map(([id, nombre]) => (
              <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)} className={`h-8 rounded-lg px-3 text-sm font-medium ${filtro === id ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-white/5"}`}>{nombre}</button>
            ))}
          </div>
          <label className="relative w-full sm:w-64">
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: 19 }} aria-hidden="true">search</span>
            <input className="nx-campo pl-9" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por título" aria-label="Buscar documentos" />
          </label>
        </div>
        {error && <p role="alert" className="p-4 text-sm text-error">{error}</p>}
        {!documentos && !error && <p role="status" className="p-6 text-sm text-on-surface-variant">Cargando…</p>}
        {documentos && lista.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }} aria-hidden="true">{buscar ? "search_off" : "folder_open"}</span>
            <p className="font-medium text-on-surface">{buscar ? "Nada con ese título" : filtro === "plantilla" ? "Todavía no hay plantillas" : "Todavía no hay nada acá"}</p>
            <p className="max-w-sm text-sm text-on-surface-variant">{filtro === "plantilla" ? "Abrí un documento y elegí «Guardar como plantilla» para que otros puedan usarlo de base." : "Creá un documento o un formulario con los botones de arriba."}</p>
          </div>
        )}
        <ul className="divide-y divide-white/5">
          {lista.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-container-high">
              <IconoTipo tipo={d.tipo} />
              <button type="button" onClick={() => onAbrir(d.id)} className="min-w-0 flex-1 text-left">
                <span className="block font-medium text-on-surface">{d.titulo || "Sin título"}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-on-surface-variant">
                  {d.tipo === "formulario" ? "Formulario" : "Documento"} · versión {d.version}
                  {d.plantilla && <span className="rounded-full bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-300">Plantilla</span>}
                  {d.publicado && !d.plantilla && <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">Publicado</span>}
                </span>
              </button>
              {d.plantilla
                ? <button type="button" className="nx-btn nx-btn-secundario nx-btn-chico" onClick={() => onCopiar(d)}>Usar plantilla</button>
                : <button type="button" className="nexo-icon-button" onClick={() => onCopiar(d)} aria-label={`Hacer una copia de ${d.titulo}`} title="Hacer una copia"><span className="material-symbols-outlined" aria-hidden="true">content_copy</span></button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function DocumentosPage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const location = useLocation();
  const { datos, recargar, error } = useDatos<{ documentos: Documento[] }>("/api/documentos");
  const [doc, setDoc] = useState<Documento | null>(null);
  const [aviso, setAviso] = useState("");
  const abrir = async (id: string) => { try { const r = await pedir<{ documento: Documento }>(`/api/documentos/${id}`); setDoc(r.documento); setAviso(""); } catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo abrir."); } };
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("documento");
    if (!id || !/^\d+$/.test(id)) return;
    let activo = true;
    void pedir<{ documento: Documento }>(`/api/documentos/${id}`).then((r) => {
      if (activo) { setDoc(r.documento); setAviso(""); }
    }).catch((e) => {
      if (activo) setAviso(e instanceof Error ? e.message : "No se pudo abrir.");
    });
    return () => { activo = false; };
  }, [location.search]);
  const ramificar = async (d: Documento, plantilla = false) => { try { const r = await enviar<{ documento: Documento }>(`/api/documentos/${d.id}/ramificar`, "POST", { plantilla }); setDoc({ ...r.documento, editable: true }); recargar(); setAviso(""); } catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo copiar."); } };
  // Como en Google Docs: tocar "Documento en blanco" lo crea y lo abre; el título se escribe adentro.
  const crear = async (tipo: Documento["tipo"]) => {
    try { const r = await enviar<{ documento: Documento }>("/api/documentos", "POST", { tipo, titulo: tipo === "formulario" ? "Formulario sin título" : "Documento sin título", contenido: [] }); setDoc({ ...r.documento, editable: true }); recargar(); setAviso(""); }
    catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo crear."); }
  };
  if (!usuario) return null;
  return <div className="flex min-h-screen bg-fondo"><Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
    <main id="contenido-principal" tabIndex={-1} className="app-content min-w-0"><TopBar title="Documentos y formularios" />
      {doc
        ? <Editor key={`${doc.id}-${doc.version}`} inicial={doc} onGuardar={(d) => { setDoc(d); recargar(); }} onRamificar={ramificar} onVolver={() => { setDoc(null); recargar(); if (location.search) navegar("/documentos"); }} />
        : <Inicio documentos={datos?.documentos ?? null} error={error} aviso={aviso} onAbrir={(id) => void abrir(id)} onCrear={(t) => void crear(t)} onCopiar={(d) => void ramificar(d)} />}
    </main></div>;
}

type Panel = "compartir" | "historial" | "comentarios" | "respuestas" | "evaluacion";

function Editor({ inicial, onGuardar, onRamificar, onVolver }: { inicial: Documento; onGuardar: (d: Documento) => void; onRamificar: (d: Documento, plantilla?: boolean) => Promise<void>; onVolver?: () => void }) {
  const [doc, setDoc] = useState(inicial); const [error, setError] = useState(""); const [comentario, setComentario] = useState("");
  const borrador = useRef(false); const [sinGuardar, setSinGuardar] = useState(false); const [versionRemota, setVersionRemota] = useState<number | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false); const [respuesta, setRespuesta] = useState<Record<string, string | string[] | number>>({}); const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false); const [panel, setPanel] = useState<Panel | null>(null); const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [agregarEn, setAgregarEn] = useState<HTMLElement | null>(null);
  const { datos: comentarios, recargar } = useDatos<{ comentarios: { id: number; texto: string }[] }>(`/api/documentos/${doc.id}/comentarios`);
  const { datos: versiones } = useDatos<{ versiones: { version: number; creadoEn: string }[] }>(doc.editable ? `/api/documentos/${doc.id}/versiones` : null);
  const { datos: respuestas, recargar: recargarRespuestas } = useDatos<{ respuestas: { id: number; respuestas: Record<string, unknown>; resultado?: Resultado }[] }>(doc.editable && doc.tipo === "formulario" ? `/api/documentos/${doc.id}/respuestas` : null);
  const { datos: misIntentos, recargar: recargarIntentos } = useDatos<{ respuestas: { id: number; resultado?: Resultado }[] }>(doc.tipo === "formulario" ? `/api/documentos/${doc.id}/mis-respuestas` : null);
  const editando = doc.editable && !vistaPrevia;
  useTiempoReal(useCallback((evento) => {
    if (evento.tipo !== "documento-version" || evento.documentoId !== doc.id || !evento.version || evento.version <= doc.version) return;
    const version = evento.version;
    void pedir<{ documento: Documento }>(`/api/documentos/${doc.id}`).then((r) => {
      if (borrador.current) { setVersionRemota((v) => Math.max(v ?? 0, version)); return; }
      if (r.documento.version > doc.version) onGuardar(r.documento);
    }).catch(() => setVersionRemota((v) => Math.max(v ?? 0, version)));
  }, [doc.id, doc.version, onGuardar]));
  const marcar = () => { borrador.current = true; setSinGuardar(true); };
  const cambiar = (id: string, b: Partial<Bloque>) => { marcar(); setDoc((d) => ({ ...d, contenido: d.contenido.map((x) => (x.id === id ? { ...x, ...b } : x)) })); };
  const agregar = (tipo: Bloque["tipo"]) => { marcar(); setDoc((d) => ({ ...d, contenido: [...d.contenido, { id: crypto.randomUUID(), tipo, texto: "", ...(tipo === "pregunta" ? { respuesta: "texto" as const, opciones: [] } : {}) }] })); };
  const quitar = (id: string) => { marcar(); setDoc((d) => ({ ...d, contenido: d.contenido.filter((x) => x.id !== id) })); };
  const mover = (id: string, paso: -1 | 1) => { marcar(); setDoc((d) => { const i = d.contenido.findIndex((x) => x.id === id); const j = i + paso; if (i < 0 || j < 0 || j >= d.contenido.length) return d; const c = [...d.contenido]; [c[i], c[j]] = [c[j], c[i]]; return { ...d, contenido: c }; }); };
  const guardar = async () => { setGuardando(true); try { const r = await enviar<{ documento: Documento }>(`/api/documentos/${doc.id}`, "PUT", { version: doc.version, titulo: doc.titulo, contenido: doc.contenido, publicado: doc.publicado, evaluacion: doc.evaluacion ?? {} }); borrador.current = false; setSinGuardar(false); onGuardar({ ...r.documento, editable: true }); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No se guardó."); } finally { setGuardando(false); } };
  const cargarUltima = async () => { try { const r = await pedir<{ documento: Documento }>(`/api/documentos/${doc.id}`); borrador.current = false; setSinGuardar(false); onGuardar(r.documento); setVersionRemota(null); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la última versión."); } };
  const comentar = async () => { if (!comentario.trim()) return; try { await enviar(`/api/documentos/${doc.id}/comentarios`, "POST", { texto: comentario }); setComentario(""); recargar(); } catch (e) { setError(e instanceof Error ? e.message : "No se comentó."); } };
  const restaurar = async (version: number) => { try { const r = await enviar<{ documento: Documento }>(`/api/documentos/${doc.id}/restaurar`, "POST", { version, actual: doc.version }); onGuardar({ ...r.documento, editable: true }); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No se restauró."); } };
  const enviarRespuesta = async () => { try { await enviar(`/api/documentos/${doc.id}/respuestas`, "POST", { respuestas: respuesta }); setRespuesta({}); setMensaje("Respuesta enviada."); recargarRespuestas(); recargarIntentos(); } catch (e) { setMensaje(e instanceof Error ? e.message : "No se envió."); } };
  const preguntasVisibles = new Set<string>();
  for (const b of doc.contenido) if (b.tipo === "pregunta" && (!b.visibleSi || preguntasVisibles.has(b.visibleSi.id) && (b.visibleSi.operador === "igual") === (String(respuesta[b.visibleSi.id] ?? "") === b.visibleSi.valor))) preguntasVisibles.add(b.id);
  const visible = (b: Bloque) => preguntasVisibles.has(b.id);
  const esFormulario = doc.tipo === "formulario";
  const paneles: { id: Panel; nombre: string; icono: string; contador?: number }[] = [
    ...(doc.editable ? [{ id: "compartir" as const, nombre: "Compartir", icono: "group_add" }, { id: "historial" as const, nombre: "Historial", icono: "history" }] : []),
    { id: "comentarios", nombre: "Comentarios", icono: "chat", contador: comentarios?.comentarios.length },
    ...(doc.editable && esFormulario ? [{ id: "respuestas" as const, nombre: "Respuestas", icono: "inbox", contador: respuestas?.respuestas.length }, { id: "evaluacion" as const, nombre: "Evaluación", icono: "grading" }] : []),
  ];
  const textoDe = (id: string) => doc.contenido.find((b) => b.id === id)?.texto || "Pregunta";

  return (
    <div className="flex min-h-[calc(100dvh-60px)] flex-col">
      {/* Barra del documento: volver, título, estado, guardar. */}
      <div className="sticky top-[56px] z-30 flex flex-wrap items-center gap-2 border-b border-linea bg-surface-container-low px-3 py-2 sm:px-5 lg:top-[60px]">
        {onVolver && <button type="button" className="nexo-icon-button" onClick={onVolver} aria-label="Volver a la lista de documentos" title="Volver"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>}
        <span className="hidden sm:block"><IconoTipo tipo={doc.tipo} /></span>
        <div className="min-w-[11rem] flex-1">
          {doc.editable
            ? <input className="w-full rounded-md bg-transparent px-1 py-0.5 text-[17px] font-semibold text-on-surface outline-none hover:bg-white/5 focus:bg-white/5" aria-label="Título del documento" value={doc.titulo} maxLength={200} onChange={(e) => { marcar(); setDoc({ ...doc, titulo: e.target.value }); }} />
            : <h1 className="!text-[17px] px-1">{doc.titulo}</h1>}
          <p className="px-1 text-xs text-on-surface-variant">
            {esFormulario ? "Formulario" : "Documento"} · {doc.publicado ? "Publicado en la institución" : "Borrador"}{doc.plantilla ? " · Plantilla" : ""}
            {doc.editable && <> · <span className={sinGuardar ? "font-medium text-amber-300" : ""}>{sinGuardar ? "Cambios sin guardar" : `Guardado (versión ${doc.version})`}</span></>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
        {doc.editable && <button type="button" className="nx-btn nx-btn-fantasma" onClick={() => setVistaPrevia((v) => !v)}><span className="material-symbols-outlined" aria-hidden="true">{vistaPrevia ? "edit" : "visibility"}</span><span className="hidden sm:inline">{vistaPrevia ? "Editar" : "Vista previa"}</span></button>}
        {doc.editable && <button type="button" className="nx-btn nx-btn-primario" onClick={() => void guardar()} disabled={guardando || !sinGuardar}><span className="material-symbols-outlined" aria-hidden="true">save</span>{guardando ? "Guardando…" : "Guardar"}</button>}
        <button type="button" className="nexo-icon-button" aria-label="Más opciones" aria-haspopup="menu" onClick={(e) => setMenu(menu ? null : e.currentTarget)}><span className="material-symbols-outlined" aria-hidden="true">more_vert</span></button>
        {menu && <Desplegable ancla={menu} onCerrar={() => setMenu(null)} etiqueta="Opciones del documento">
          <button type="button" role="menuitem" onClick={() => void onRamificar(doc)}><span className="material-symbols-outlined" aria-hidden="true">content_copy</span>Hacer una copia</button>
          {doc.editable && <button type="button" role="menuitem" onClick={() => void onRamificar(doc, true)}><span className="material-symbols-outlined" aria-hidden="true">bookmark_add</span>Guardar como plantilla</button>}
          {paneles.map((p) => <button key={p.id} type="button" role="menuitem" onClick={() => setPanel(p.id)}><span className="material-symbols-outlined" aria-hidden="true">{p.icono}</span>{p.nombre}</button>)}
        </Desplegable>}
        </div>
      </div>

      {versionRemota !== null && <div role="status" className="mx-auto mt-3 w-full max-w-3xl rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">Otra persona guardó una versión nueva (v{versionRemota}). Los cambios en bloques distintos se combinan al guardar; si editaron el mismo bloque, habrá un conflicto. <button type="button" className="ml-1 font-semibold underline" onClick={() => void cargarUltima()}>Descartar mis cambios y ver la última</button></div>}

      <div className="flex flex-1 gap-5 px-3 py-5 sm:px-6">
        {/* La hoja. */}
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          <article className="nx-tarjeta flex flex-col gap-3 p-5 sm:p-8">
            {doc.contenido.length === 0 && editando && <p className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">El documento está vacío. Agregá un bloque con el botón de abajo: un título, un párrafo, una tabla{esFormulario ? " o una pregunta" : ""}.</p>}
            {doc.contenido.filter((b) => editando || b.tipo !== "pregunta" || visible(b)).map((b, i, todos) => editando ? (
              <section key={b.id} className="group rounded-lg border border-linea p-3 transition-colors focus-within:border-acento hover:border-outline-variant">
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }} aria-hidden="true">{nombreBloque(b.tipo).icono}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{nombreBloque(b.tipo).nombre}</span>
                  <span className="ml-auto flex gap-0.5">
                    <button type="button" className="nexo-icon-button !h-7 !w-7" onClick={() => mover(b.id, -1)} disabled={i === 0} aria-label="Subir bloque"><span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_upward</span></button>
                    <button type="button" className="nexo-icon-button !h-7 !w-7" onClick={() => mover(b.id, 1)} disabled={i === todos.length - 1} aria-label="Bajar bloque"><span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_downward</span></button>
                    <button type="button" className="nexo-icon-button !h-7 !w-7 hover:!text-error" onClick={() => quitar(b.id)} aria-label="Quitar bloque"><span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">delete</span></button>
                  </span>
                </div>
                {b.tipo === "titulo"
                  ? <input className="nx-campo !h-11 text-lg font-semibold" aria-label="Texto del título" placeholder={AYUDA_TEXTO.titulo} value={b.texto} onChange={(e) => cambiar(b.id, { texto: e.target.value })} />
                  : <textarea className="nx-campo !h-auto py-2 leading-relaxed" aria-label={`Texto: ${nombreBloque(b.tipo).nombre}`} placeholder={AYUDA_TEXTO[b.tipo]} rows={b.tipo === "texto" || b.tipo === "lista" ? 4 : 2} value={b.texto} onChange={(e) => cambiar(b.id, { texto: e.target.value })} />}
                <div className="mt-2 flex flex-col gap-2 text-sm"><CamposBloque bloque={b} cambiar={(x) => cambiar(b.id, x)} /></div>
                {b.tipo === "pregunta" && <div className="mt-3 grid gap-3 border-t border-linea pt-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-on-surface">Tipo de respuesta<Selector value={b.respuesta ?? "texto"} onChange={(e) => cambiar(b.id, { respuesta: e.target.value as Bloque["respuesta"], correcta: undefined })} className="nx-campo mt-1.5">{RESPUESTAS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Selector></label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm text-on-surface"><input type="checkbox" checked={!!b.obligatoria} onChange={(e) => cambiar(b.id, { obligatoria: e.target.checked })} /> Respuesta obligatoria</label>
                  {["seleccion", "multiple"].includes(b.respuesta ?? "") && <label className="text-sm font-medium text-on-surface sm:col-span-2">Opciones<input className="nx-campo mt-1.5" value={b.opciones?.join(", ") ?? ""} placeholder="Separalas con comas: Sí, No, A veces" onChange={(e) => cambiar(b.id, { opciones: e.target.value.split(",").map((s) => s.trim()).filter(Boolean), correcta: undefined })} /></label>}
                  <label className="text-sm font-medium text-on-surface">Mostrar<Selector value={b.visibleSi?.id ?? ""} onChange={(e) => cambiar(b.id, { visibleSi: e.target.value ? { id: e.target.value, operador: "igual", valor: "" } : undefined })} className="nx-campo mt-1.5"><option value="">Siempre</option>{doc.contenido.slice(0, doc.contenido.indexOf(b)).filter((x) => x.tipo === "pregunta").map((x) => <option key={x.id} value={x.id}>Según «{x.texto || "pregunta anterior"}»</option>)}</Selector></label>
                  {b.visibleSi && <div className="flex gap-2 self-end"><Selector value={b.visibleSi.operador} onChange={(e) => cambiar(b.id, { visibleSi: { ...b.visibleSi!, operador: e.target.value as "igual" | "distinto" } })} className="nx-campo"><option value="igual">Es igual a</option><option value="distinto">Es distinto de</option></Selector><input className="nx-campo" aria-label="Valor de condición" value={b.visibleSi.valor} onChange={(e) => cambiar(b.id, { visibleSi: { ...b.visibleSi!, valor: e.target.value } })} /></div>}
                </div>}
              </section>
            ) : (
              <div key={b.id} className="flex flex-col gap-2">
                <ContenidoBloque bloque={b} documentoId={doc.id} />
                {esFormulario && doc.publicado && b.tipo === "pregunta" && visible(b) && <CampoRespuesta bloque={b} valor={respuesta[b.id]} cambiar={(v) => setRespuesta((r) => ({ ...r, [b.id]: v }))} />}
              </div>
            ))}
            {editando && <div className="pt-1">
              <button type="button" className="nx-btn nx-btn-secundario" onClick={(e) => setAgregarEn(agregarEn ? null : e.currentTarget)} aria-haspopup="menu"><span className="material-symbols-outlined" aria-hidden="true">add</span>Agregar bloque</button>
              {agregarEn && <Desplegable ancla={agregarEn} alineado="izquierda" onCerrar={() => setAgregarEn(null)} etiqueta="Agregar bloque">
                {TIPOS_BLOQUE.filter((t) => !t.soloFormulario || esFormulario).map((t) => <button key={t.tipo} type="button" role="menuitem" onClick={() => agregar(t.tipo)}><span className="material-symbols-outlined" aria-hidden="true">{t.icono}</span>{t.nombre}</button>)}
              </Desplegable>}
            </div>}
            {!editando && esFormulario && doc.publicado && <div className="border-t border-linea pt-4"><button type="button" className="nx-btn nx-btn-primario" onClick={() => void enviarRespuesta()}>Enviar respuestas</button></div>}
            {!editando && esFormulario && !doc.publicado && <p className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface-variant">Este formulario todavía no está publicado: cuando lo publiques en «Compartir», la gente va a poder responderlo.</p>}
            {mensaje && <p role="status" className="text-sm font-medium text-on-surface">{mensaje}</p>}
            {error && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
            {esFormulario && (misIntentos?.respuestas.length ?? 0) > 0 && <section className="space-y-2 border-t border-linea pt-4"><h2 className="text-base font-semibold">Mis intentos</h2>{misIntentos!.respuestas.map((r) => <ResultadoRespuesta key={r.id} resultado={r.resultado} />)}</section>}
          </article>
        </div>

        {/* Panel lateral: botones a la derecha (computadora) y el panel abierto. */}
        <aside className="hidden w-14 shrink-0 flex-col items-center gap-1 lg:flex" aria-label="Herramientas del documento">
          {paneles.map((p) => <button key={p.id} type="button" className={`nexo-icon-button relative ${panel === p.id ? "!bg-primary/10 !text-primary" : ""}`} onClick={() => setPanel(panel === p.id ? null : p.id)} aria-pressed={panel === p.id} aria-label={p.nombre} title={p.nombre}>
            <span className="material-symbols-outlined" aria-hidden="true">{p.icono}</span>
            {!!p.contador && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-acento px-1 text-[10px] font-bold text-white">{p.contador}</span>}
          </button>)}
        </aside>
        {panel && <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-sm flex-col border-l border-linea bg-surface-container-low shadow-xl lg:sticky lg:top-[120px] lg:z-auto lg:h-[calc(100dvh-140px)] lg:rounded-xl lg:border lg:shadow-none" aria-label={paneles.find((p) => p.id === panel)?.nombre}>
          <header className="flex items-center justify-between gap-2 border-b border-linea px-4 py-3"><h2 className="text-base font-semibold">{paneles.find((p) => p.id === panel)?.nombre}</h2><button type="button" className="nexo-icon-button" onClick={() => setPanel(null)} aria-label="Cerrar panel"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {panel === "compartir" && <>
              <label className="flex items-start gap-3 rounded-lg border border-linea p-3"><input type="checkbox" className="mt-1" checked={doc.publicado} onChange={(e) => { marcar(); setDoc({ ...doc, publicado: e.target.checked }); }} /><span><span className="block font-medium text-on-surface">Publicar en la institución</span><span className="block text-on-surface-variant">{esFormulario ? "Todos pueden verlo y responderlo." : "Todos pueden leerlo."} Se aplica al guardar.</span></span></label>
              <ColaboradoresDocumento documentoId={doc.id} propietario={!!doc.propietario} />
            </>}
            {panel === "historial" && <ul className="divide-y divide-white/5">{versiones?.versiones.length ? versiones.versiones.map((v) => <li key={v.version} className="flex items-center justify-between gap-2 py-2"><span><b className="font-medium text-on-surface">Versión {v.version}</b><span className="block text-xs text-on-surface-variant">{v.creadoEn}</span></span>{v.version !== doc.version && <button type="button" className="nx-btn nx-btn-secundario nx-btn-chico" onClick={() => void restaurar(v.version)}>Restaurar</button>}</li>) : <li className="py-2 text-on-surface-variant">Todavía no hay versiones guardadas.</li>}</ul>}
            {panel === "comentarios" && <>
              {comentarios?.comentarios.length ? <ul className="space-y-2">{comentarios.comentarios.map((c) => <li key={c.id} className="rounded-lg bg-surface-container p-3">{c.texto}</li>)}</ul> : <p className="text-on-surface-variant">Todavía no hay comentarios.</p>}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void comentar(); }}><input className="nx-campo" aria-label="Comentario" placeholder="Escribí un comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} /><button type="submit" className="nx-btn nx-btn-primario">Enviar</button></form>
            </>}
            {panel === "respuestas" && (respuestas?.respuestas.length ? <ul className="space-y-3">{respuestas.respuestas.map((r, n) => <li key={r.id} className="rounded-lg border border-linea p-3"><p className="mb-2 font-medium text-on-surface">Respuesta {n + 1}</p><dl className="space-y-1">{Object.entries(r.respuestas).map(([id, v]) => <div key={id}><dt className="text-xs text-on-surface-variant">{textoDe(id)}</dt><dd className="text-on-surface">{Array.isArray(v) ? v.join(", ") : String(v)}</dd></div>)}</dl><div className="mt-2"><ResultadoRespuesta resultado={r.resultado} /></div></li>)}</ul> : <p className="text-on-surface-variant">Todavía nadie respondió.{!doc.publicado && " Publicá el formulario para empezar a recibir respuestas."}</p>)}
            {panel === "evaluacion" && <>
              <p className="text-on-surface-variant">Convertí el formulario en un cuestionario: marcá la respuesta correcta en cada pregunta y elegí acá los intentos y la nota para aprobar.</p>
              <OpcionesEvaluacion valor={doc.evaluacion ?? {}} cambiar={(evaluacion) => { marcar(); setDoc({ ...doc, evaluacion }); }} />
            </>}
          </div>
        </aside>}
      </div>
    </div>
  );
}

function CampoRespuesta({ bloque, valor, cambiar }: { bloque: Bloque; valor: string | string[] | number | undefined; cambiar: (valor: string | string[] | number) => void }) {
  if (bloque.respuesta === "seleccion") return <Selector value={String(valor ?? "")} onChange={(e) => cambiar(e.target.value)} className="nx-campo"><option value="">Elegí una opción</option>{bloque.opciones?.map((o) => <option key={o} value={o}>{o}</option>)}</Selector>;
  if (bloque.respuesta === "multiple") return <div className="flex flex-col gap-1.5">{bloque.opciones?.map((o) => <label key={o} className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray(valor) && valor.includes(o)} onChange={(e) => cambiar(e.target.checked ? [...(Array.isArray(valor) ? valor : []), o] : (Array.isArray(valor) ? valor : []).filter((x) => x !== o))} />{o}</label>)}</div>;
  return <input className="nx-campo" aria-label={bloque.texto || "Respuesta"} type={bloque.respuesta === "numero" ? "number" : bloque.respuesta === "fecha" ? "date" : "text"} value={valor ?? ""} onChange={(e) => cambiar(bloque.respuesta === "numero" ? Number(e.target.value) : e.target.value)} />;
}
