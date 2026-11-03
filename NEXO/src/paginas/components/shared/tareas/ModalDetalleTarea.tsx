// src/paginas/components/shared/tareas/ModalDetalleTarea.tsx
// Detalle de una tarea académica. Es COMPARTIDO por dos roles (antes vivía en
// components/portafolio/, solo para el estudiante):
//
//   · ESTUDIANTE (por defecto, con `tareaId`): abre la tarea desde el servidor y,
//     según el estado, muestra el flujo de entrega o la devolución:
//       - Sin entregar → formulario: subir archivos + comentario + Entregar.
//       - Entregada    → lo que entregué, con opción de anular (si no está corregida).
//       - Corregida    → mi nota y la devolución del profesor.
//     (Este flujo NO cambió al mudar el archivo: mismos datos, mismo servidor.)
//
//   · PROFESOR (con `tareaDocente`): detalle de SOLO LECTURA de la consigna que
//     él mismo escribió (título, materia/curso, vencimiento, consigna, método) y
//     sus acciones propias (editar, corregir) que entran por el slot `acciones`.
//     No hay formulario de entrega: el profesor no entrega, gestiona.
//
// Todo pasa por el servidor (servicios/tareas.ts): la pantalla no inventa nada.

import { useState, type ReactNode } from "react";
import {
  entregarTarea,
  anularEntrega,
  type DetalleTarea,
  type TareaDocente,
  type VersionEntrega,
} from "../../../../servicios/tareas";
import { subirArchivo, urlDescarga, tamanoLegible } from "../../../../servicios/archivos";
import { ErrorDeApi, useDatos } from "../../../../servicios/api";
import { textoVencimiento, colorVencimiento, textoRelativo } from "../../../../servicios/fechas";
import BotonConversacionContextual from "../BotonConversacionContextual";
import { OpinionesPares } from "../../portafolio/RevisionesPares";
import EstudioMultimedia from "../../multimedia/EstudioMultimedia";
import RecursosVinculados from "../../biblioteca/RecursosVinculados";
import ProyectosVinculados from '../../proyectos/ProyectosVinculados';

interface Props {
  onCerrar: () => void;
  // ── Modo estudiante ──
  /** Id de la tarea a abrir. Presente = modo estudiante (con flujo de entrega). */
  tareaId?: string;
  /** Se llama tras entregar o anular, para que la lista de fondo se refresque. */
  onCambio?: () => void;
  // ── Modo profesor ──
  /** Tarea ya conocida por el docente. Presente = modo profesor (solo lectura). */
  tareaDocente?: TareaDocente;
  /** Acciones propias del docente (editar, corregir), como slot en el pie. */
  acciones?: ReactNode;
}

export default function ModalDetalleTarea({
  tareaId,
  onCerrar,
  onCambio,
  tareaDocente,
  acciones,
}: Props) {
  const esDocente = tareaDocente != null;

  const { datos: detalle, cargando, error, recargar: cargar } = useDatos<DetalleTarea>(!esDocente && tareaId ? `/api/tareas/${tareaId}` : null);
  const { datos: historial, recargar: cargarHistorial } = useDatos<{ versiones: VersionEntrega[] }>(!esDocente && tareaId ? `/api/tareas/${tareaId}/entregas/historial` : null);

  // Estado del formulario de entrega (solo se usa en modo estudiante)
  const [comentario, setComentario] = useState("");
  const [seleccionados, setSeleccionados] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [preparandoRevision, setPreparandoRevision] = useState(false);
  const [avisoEntrega, setAvisoEntrega] = useState<string | null>(null);



  const agregarArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevos = Array.from(e.target.files ?? []);
    setSeleccionados((prev) => [...prev, ...nuevos]);
    e.target.value = ""; // permitir volver a elegir el mismo archivo
  };

  const quitarArchivo = (i: number) =>
    setSeleccionados((prev) => prev.filter((_, idx) => idx !== i));

  const entregar = async () => {
    if (!tareaId) return;
    setEnviando(true);
    setAvisoEntrega(null);
    try {
      // Primero suben los archivos al servicio de archivos; después la entrega
      // referencia los ids que devolvió. Si la subida falla, no se crea una
      // entrega a medias.
      const ids: string[] = [];
      for (const f of seleccionados) {
        const subido = await subirArchivo(f);
        ids.push(subido.id);
      }
      await entregarTarea(tareaId, comentario.trim(), ids, preparandoRevision);
      setSeleccionados([]);
      setComentario("");
      onCambio?.();
      cargar();
      cargarHistorial();
      setPreparandoRevision(false);
    } catch (e: unknown) {
      setAvisoEntrega(
        e instanceof ErrorDeApi ? e.message : "No se pudo completar la entrega."
      );
    } finally {
      setEnviando(false);
    }
  };

  const anular = async () => {
    if (!tareaId) return;
    setEnviando(true);
    setAvisoEntrega(null);
    try {
      await anularEntrega(tareaId);
      onCambio?.();
      cargar();
    } catch (e: unknown) {
      setAvisoEntrega(
        e instanceof ErrorDeApi ? e.message : "No se pudo anular la entrega."
      );
    } finally {
      setEnviando(false);
    }
  };

  const titulo = esDocente ? tareaDocente.titulo : detalle?.tarea.titulo ?? "Detalle de la tarea";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-lienzo border border-white/10 rounded-[20px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-lienzo z-10">
          <h3 className="text-xl font-extrabold text-white font-headline pr-4">
            {titulo}
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {(tareaDocente || detalle) && <BotonConversacionContextual tipo="tarea" id={tareaDocente?.id ?? tareaId!} etiqueta="Conversación de la tarea" />}
          {(tareaDocente || detalle) && <RecursosVinculados tipo="tarea" id={tareaDocente?.id ?? tareaId!} />}
          {(tareaDocente || detalle) && <ProyectosVinculados tipo="tarea" id={tareaDocente?.id ?? tareaId!} />}
          {detalle?.entrega && <BotonConversacionContextual tipo="entrega" id={detalle.entrega.id} etiqueta="Conversar con el docente sobre mi entrega" />}
          {esDocente ? (
            <DetalleDocente tarea={tareaDocente} acciones={acciones} />
          ) : cargando ? (
            <p className="text-slate-400 text-sm">Abriendo la tarea…</p>
          ) : error ? (
            <p className="text-rose-400 text-sm">{error}</p>
          ) : detalle ? (
            <>
              {/* Metadatos */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-fondo text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  {detalle.tarea.materia}
                </span>
                <span className="px-3 py-1 rounded-full bg-fondo text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">person</span>
                  {detalle.tarea.profesor}
                </span>
                <span
                  className={`px-3 py-1 rounded-full bg-fondo flex items-center gap-1.5 ${colorVencimiento(
                    detalle.tarea.fechaLimite
                  )}`}
                >
                  <span className="material-symbols-outlined text-base">schedule</span>
                  {textoVencimiento(detalle.tarea.fechaLimite)}
                </span>
                {detalle.tarea.tipoAsignacion === "grupal" && (
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">groups</span>
                    Grupal
                  </span>
                )}
              </div>

              {/* Consigna */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Consigna
                </h4>
                <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
                  {detalle.tarea.consigna || "El profesor no dejó una consigna escrita."}
                </p>
              </section>

              {detalle.tarea.metodoEstudio && (
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Método de estudio sugerido
                  </h4>
                  <p className="text-slate-200 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-acento">
                      neurology
                    </span>
                    {detalle.tarea.metodoEstudio}
                  </p>
                </section>
              )}
              {detalle.tarea.tipoAsignacion === "grupal" && <section className="rounded-xl border border-white/10 bg-fondo p-3 text-sm"><strong>Equipo:</strong> {detalle.equipo ? `${detalle.equipo.nombre} · ${detalle.equipo.miembros.join(", ")}` : "El docente aún no te asignó a un equipo."}<p className="text-xs text-slate-400 mt-1">Una entrega y una devolución compartidas por todo el equipo.</p></section>}

              {/* Adjuntos del profesor */}
              {detalle.tarea.adjuntos.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Material de la tarea
                  </h4>
                  <ul className="space-y-2">
                    {detalle.tarea.adjuntos.map((a) => (
                      <ArchivoDescargable key={a.id} archivo={a} />
                    ))}
                  </ul>
                </section>
              )}

              <hr className="border-white/10" />

              {/* Entrega */}
              {detalle.entrega ? (
                <><EntregaHecha
                  entrega={detalle.entrega}
                  onAnular={anular}
                  enviando={enviando}
                /><OpinionesPares entregaId={detalle.entrega.id} />{detalle.entrega.corregida && <div className="space-y-3"><button type="button" onClick={() => setPreparandoRevision(!preparandoRevision)} className="text-acento text-sm font-semibold">{preparandoRevision ? "Cancelar nueva versión" : "Mejorar y volver a entregar"}</button>{preparandoRevision && <FormularioEntrega comentario={comentario} setComentario={setComentario} seleccionados={seleccionados} onAgregar={agregarArchivos} onQuitar={quitarArchivo} onArchivo={archivo => setSeleccionados(prev => [...prev, archivo])} onEntregar={entregar} enviando={enviando} />}</div>}</>
              ) : detalle.tarea.tipoAsignacion !== "grupal" || detalle.equipo ? (
                <FormularioEntrega
                  comentario={comentario}
                  setComentario={setComentario}
                  seleccionados={seleccionados}
                  onAgregar={agregarArchivos}
                  onQuitar={quitarArchivo}
                  onArchivo={archivo => setSeleccionados(prev => [...prev, archivo])}
                  onEntregar={entregar}
                  enviando={enviando}
                />
              ) : null}
              {!!historial?.versiones.length && <section className="border-t border-white/10 pt-4 space-y-3"><h4 className="font-bold text-sm">Historial de entregas</h4>{historial.versiones.map((version, i) => <article key={version.id} className="rounded-xl bg-fondo p-3 text-sm"><p className="font-semibold">Versión {historial.versiones.length - i} · {version.estado}</p><p className="whitespace-pre-wrap">{version.comentario}</p>{version.nota !== null && <p>Nota: {version.nota}/10 · {version.devolucion}</p>}{version.archivos.map(a => <ArchivoDescargable key={a.id} archivo={a} />)}</article>)}</section>}

              {avisoEntrega && (
                <p className="text-sm text-rose-400 font-medium">{avisoEntrega}</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Piezas internas ────────────────────────────────────

// Detalle de solo lectura para el PROFESOR: la consigna que él escribió, con sus
// acciones (editar/corregir) en el pie. Reusa la misma cáscara del modal y las
// mismas secciones visuales (chips + consigna + método) que ve el estudiante.
function DetalleDocente({
  tarea,
  acciones,
}: {
  tarea: TareaDocente;
  acciones?: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="px-3 py-1 rounded-full bg-fondo text-slate-300 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">menu_book</span>
          {tarea.materia}
        </span>
        <span className="px-3 py-1 rounded-full bg-fondo text-slate-300 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">school</span>
          {tarea.curso}
        </span>
        <span
          className={`px-3 py-1 rounded-full bg-fondo flex items-center gap-1.5 ${colorVencimiento(
            tarea.fechaLimite
          )}`}
        >
          <span className="material-symbols-outlined text-base">schedule</span>
          {textoVencimiento(tarea.fechaLimite)}
        </span>
        {tarea.tipoAsignacion === "grupal" && (
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">groups</span>
            Grupal
          </span>
        )}
      </div>

      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Consigna
        </h4>
        <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
          {tarea.consigna || "No dejaste una consigna escrita."}
        </p>
      </section>

      {tarea.metodoEstudio && (
        <section>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Método de estudio sugerido
          </h4>
          <p className="text-slate-200 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-acento">neurology</span>
            {tarea.metodoEstudio}
          </p>
        </section>
      )}

      {acciones && (
        <>
          <hr className="border-white/10" />
          <div className="flex flex-wrap items-center justify-end gap-3">{acciones}</div>
        </>
      )}
    </>
  );
}

function ArchivoDescargable({
  archivo,
}: {
  archivo: { id: string; nombre: string; tamanoBytes: number };
}) {
  return (
    <li>
      <a
        href={urlDescarga(archivo.id)}
        className="flex items-center gap-3 bg-fondo rounded-[10px] px-4 py-3 hover:bg-[#241640] transition-colors group"
      >
        <span className="material-symbols-outlined text-acento">description</span>
        <span className="text-slate-200 text-sm flex-1 truncate group-hover:text-white">
          {archivo.nombre}
        </span>
        <span className="text-slate-500 text-xs">{tamanoLegible(archivo.tamanoBytes)}</span>
        <span className="material-symbols-outlined text-slate-400 text-lg">download</span>
      </a>
    </li>
  );
}

function EntregaHecha({
  entrega,
  onAnular,
  enviando,
}: {
  entrega: NonNullable<DetalleTarea["entrega"]>;
  onAnular: () => void;
  enviando: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-green-400 font-semibold">
        <span className="material-symbols-outlined">check_circle</span>
        Entregada {textoRelativo(entrega.entregadoEn).toLowerCase()}
      </div>

      {entrega.comentario && (
        <p className="text-slate-300 text-sm bg-fondo rounded-[10px] p-4">
          {entrega.comentario}
        </p>
      )}

      {entrega.archivos.length > 0 && (
        <ul className="space-y-2">
          {entrega.archivos.map((a) => (
            <ArchivoDescargable key={a.id} archivo={a} />
          ))}
        </ul>
      )}

      {/* Devolución del profesor (Error 2.C.6) */}
      {entrega.corregida ? (
        <div className="bg-gradient-to-br from-fondo to-[#241640] rounded-[14px] p-5 border border-acento/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Devolución del profesor
            </h4>
            <span className="text-2xl font-black text-acento">
              {entrega.nota}
              <span className="text-sm text-slate-400">/10</span>
            </span>
          </div>
          <p className="text-slate-200 text-sm whitespace-pre-wrap">
            {entrega.devolucion || "El profesor no dejó un comentario escrito."}
          </p>
          {Object.entries(entrega.criterios ?? {}).map(([criterio, texto]) => <p key={criterio} className="mt-3 text-sm text-slate-200"><strong>{criterio}:</strong> {texto}</p>)}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 bg-fondo rounded-[10px] px-4 py-3">
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-amber-400">
              hourglass_top
            </span>
            Corrección en camino: el profesor todavía no la revisó.
          </p>
          {/* Anular solo tiene sentido mientras no esté corregida (14.7 paso 3). */}
          <button
            onClick={onAnular}
            disabled={enviando}
            className="px-4 py-2 text-rose-400 font-semibold hover:text-rose-300 hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-40 shrink-0"
          >
            Anular entrega
          </button>
        </div>
      )}
    </section>
  );
}

function FormularioEntrega({
  comentario,
  setComentario,
  seleccionados,
  onAgregar,
  onQuitar,
  onArchivo,
  onEntregar,
  enviando,
}: {
  comentario: string;
  setComentario: (v: string) => void;
  seleccionados: File[];
  onAgregar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitar: (i: number) => void;
  onArchivo: (archivo: File) => void;
  onEntregar: () => void;
  enviando: boolean;
}) {
  return (
    <section className="space-y-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Tu entrega
      </h4>

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentario para el profesor (opcional)…"
        rows={3}
        className="w-full bg-fondo border-none rounded-[10px] py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-acento transition-all resize-none"
      />
      <details><summary className="cursor-pointer text-sm text-acento">Grabar o analizar audio y video</summary><EstudioMultimedia onArchivo={onArchivo} /></details>

      {/* Archivos elegidos, todavía sin subir */}
      {seleccionados.length > 0 && (
        <ul className="space-y-2">
          {seleccionados.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-3 bg-fondo rounded-[10px] px-4 py-2.5"
            >
              <span className="material-symbols-outlined text-acento">draft</span>
              <span className="text-slate-200 text-sm flex-1 truncate">{f.name}</span>
              <span className="text-slate-500 text-xs">{tamanoLegible(f.size)}</span>
              <button
                onClick={() => onQuitar(i)}
                aria-label="Quitar archivo"
                className="text-slate-500 hover:text-rose-400 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-600 hover:border-acento text-slate-300 hover:text-white rounded-[10px] cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-lg">attach_file</span>
          Adjuntar archivo
          <input type="file" multiple onChange={onAgregar} className="hidden" />
        </label>

        <button
          onClick={onEntregar}
          disabled={enviando}
          className="px-6 py-2.5 bg-acento text-black font-bold rounded-full hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {enviando ? "Entregando…" : "Entregar"}
        </button>
      </div>
    </section>
  );
}
