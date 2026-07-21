// src/paginas/components/portafolio/ModalDetalleTarea.tsx
// Detalle de una tarea académica para el ESTUDIANTE (Errores 2.C.4 a 2.C.6).
//
// Antes "Ver detalle" y "Entregar" eran un console.log: no abrían nada y no
// entregaban nada. Acá vive el detalle completo (consigna, adjuntos del docente,
// método sugerido) y, según el estado, el flujo de entrega o la devolución:
//   · Sin entregar → formulario: subir archivos + comentario + Entregar.
//   · Entregada    → lo que entregué, con opción de anular (si no está corregida).
//   · Corregida    → mi nota y la devolución del profesor.
//
// Todo pasa por el servidor (servicios/tareas.ts): la pantalla no inventa nada.

import { useCallback, useEffect, useState } from "react";
import {
  traerDetalle,
  entregarTarea,
  anularEntrega,
  type DetalleTarea,
} from "../../../servicios/tareas";
import { subirArchivo, urlDescarga, tamanoLegible } from "../../../servicios/archivos";
import { ErrorDeApi } from "../../../servicios/api";
import { textoVencimiento, colorVencimiento, textoRelativo } from "../../../servicios/fechas";

interface Props {
  tareaId: string;
  onCerrar: () => void;
  /** Se llama tras entregar o anular, para que la lista de fondo se refresque. */
  onCambio: () => void;
}

export default function ModalDetalleTarea({ tareaId, onCerrar, onCambio }: Props) {
  const [detalle, setDetalle] = useState<DetalleTarea | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario de entrega
  const [comentario, setComentario] = useState("");
  const [seleccionados, setSeleccionados] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [avisoEntrega, setAvisoEntrega] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    traerDetalle(tareaId)
      .then((d) => {
        setDetalle(d);
        setCargando(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No se pudo abrir la tarea.");
        setCargando(false);
      });
  }, [tareaId]);

  useEffect(() => cargar(), [cargar]);

  const agregarArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevos = Array.from(e.target.files ?? []);
    setSeleccionados((prev) => [...prev, ...nuevos]);
    e.target.value = ""; // permitir volver a elegir el mismo archivo
  };

  const quitarArchivo = (i: number) =>
    setSeleccionados((prev) => prev.filter((_, idx) => idx !== i));

  const entregar = async () => {
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
      await entregarTarea(tareaId, comentario.trim(), ids);
      setSeleccionados([]);
      setComentario("");
      onCambio();
      cargar();
    } catch (e: unknown) {
      setAvisoEntrega(
        e instanceof ErrorDeApi ? e.message : "No se pudo completar la entrega."
      );
    } finally {
      setEnviando(false);
    }
  };

  const anular = async () => {
    setEnviando(true);
    setAvisoEntrega(null);
    try {
      await anularEntrega(tareaId);
      onCambio();
      cargar();
    } catch (e: unknown) {
      setAvisoEntrega(
        e instanceof ErrorDeApi ? e.message : "No se pudo anular la entrega."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#2D1B4E] border border-white/10 rounded-[20px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between p-6 border-b border-white/10 sticky top-0 bg-[#2D1B4E] z-10">
          <h3 className="text-xl font-extrabold text-white font-headline pr-4">
            {detalle?.tarea.titulo ?? "Detalle de la tarea"}
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
          {cargando ? (
            <p className="text-slate-400 text-sm">Abriendo la tarea…</p>
          ) : error ? (
            <p className="text-rose-400 text-sm">{error}</p>
          ) : detalle ? (
            <>
              {/* Metadatos */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-[#1C1030] text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  {detalle.tarea.materia}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#1C1030] text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">person</span>
                  {detalle.tarea.profesor}
                </span>
                <span
                  className={`px-3 py-1 rounded-full bg-[#1C1030] flex items-center gap-1.5 ${colorVencimiento(
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
                    <span className="material-symbols-outlined text-lg text-[#C548F5]">
                      neurology
                    </span>
                    {detalle.tarea.metodoEstudio}
                  </p>
                </section>
              )}

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
                <EntregaHecha
                  entrega={detalle.entrega}
                  onAnular={anular}
                  enviando={enviando}
                />
              ) : (
                <FormularioEntrega
                  comentario={comentario}
                  setComentario={setComentario}
                  seleccionados={seleccionados}
                  onAgregar={agregarArchivos}
                  onQuitar={quitarArchivo}
                  onEntregar={entregar}
                  enviando={enviando}
                />
              )}

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

function ArchivoDescargable({
  archivo,
}: {
  archivo: { id: string; nombre: string; tamanoBytes: number };
}) {
  return (
    <li>
      <a
        href={urlDescarga(archivo.id)}
        className="flex items-center gap-3 bg-[#1C1030] rounded-[10px] px-4 py-3 hover:bg-[#241640] transition-colors group"
      >
        <span className="material-symbols-outlined text-[#C548F5]">description</span>
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
        <p className="text-slate-300 text-sm bg-[#1C1030] rounded-[10px] p-4">
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
        <div className="bg-gradient-to-br from-[#1C1030] to-[#241640] rounded-[14px] p-5 border border-[#C548F5]/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Devolución del profesor
            </h4>
            <span className="text-2xl font-black text-[#C548F5]">
              {entrega.nota}
              <span className="text-sm text-slate-400">/10</span>
            </span>
          </div>
          <p className="text-slate-200 text-sm whitespace-pre-wrap">
            {entrega.devolucion || "El profesor no dejó un comentario escrito."}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 bg-[#1C1030] rounded-[10px] px-4 py-3">
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
  onEntregar,
  enviando,
}: {
  comentario: string;
  setComentario: (v: string) => void;
  seleccionados: File[];
  onAgregar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitar: (i: number) => void;
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
        className="w-full bg-[#1C1030] border-none rounded-[10px] py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-[#C548F5] transition-all resize-none"
      />

      {/* Archivos elegidos, todavía sin subir */}
      {seleccionados.length > 0 && (
        <ul className="space-y-2">
          {seleccionados.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-3 bg-[#1C1030] rounded-[10px] px-4 py-2.5"
            >
              <span className="material-symbols-outlined text-[#C548F5]">draft</span>
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
        <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-600 hover:border-[#C548F5] text-slate-300 hover:text-white rounded-[10px] cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-lg">attach_file</span>
          Adjuntar archivo
          <input type="file" multiple onChange={onAgregar} className="hidden" />
        </label>

        <button
          onClick={onEntregar}
          disabled={enviando}
          className="px-6 py-2.5 bg-[#C548F5] text-black font-bold rounded-full hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {enviando ? "Entregando…" : "Entregar"}
        </button>
      </div>
    </section>
  );
}
