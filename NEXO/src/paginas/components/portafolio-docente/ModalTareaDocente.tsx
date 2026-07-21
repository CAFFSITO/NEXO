// src/paginas/components/portafolio-docente/ModalTareaDocente.tsx
// Crear o editar una tarea del profesor, ahora RICA (Errores 2.C.3 y 3.C.1):
// materia+curso elegidos de las cátedras reales del docente, consigna, fecha de
// calendario, método de estudio sugerido, tipo de asignación y adjuntos.
//
// Antes esto era título + materia/curso de una lista escrita a mano + una fecha.
// Ahora la cátedra sale de `/api/tareas/catedras` (las que realmente doy) y los
// adjuntos pasan por el servicio de archivos.

import { useEffect, useState } from "react";
import type { Catedra, DatosNuevaTarea, TareaDocente } from "../../../servicios/tareas";
import { subirArchivo, tamanoLegible } from "../../../servicios/archivos";
import { ErrorDeApi } from "../../../servicios/api";

interface ModalTareaDocenteProps {
  abierto: boolean;
  /** Si viene una tarea, es edición; si no, creación. */
  tareaEditando: TareaDocente | null;
  catedras: Catedra[];
  /** Recibe los datos ya listos (adjuntos = ids de archivos ya subidos). */
  onGuardar: (datos: DatosNuevaTarea) => Promise<void>;
  onCerrar: () => void;
}

type FormTarea = {
  catedraId: string;
  titulo: string;
  consigna: string;
  fechaLimite: string;
  metodoEstudio: string;
  tipoAsignacion: "individual" | "grupal";
};

const VACIO: FormTarea = {
  catedraId: "",
  titulo: "",
  consigna: "",
  fechaLimite: "",
  metodoEstudio: "",
  tipoAsignacion: "individual",
};

export default function ModalTareaDocente({
  abierto,
  tareaEditando,
  catedras,
  onGuardar,
  onCerrar,
}: ModalTareaDocenteProps) {
  const [datos, setDatos] = useState(VACIO);
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const esEdicion = tareaEditando !== null;

  useEffect(() => {
    if (!abierto) return;
    if (tareaEditando) {
      setDatos({
        catedraId: tareaEditando.catedraId,
        titulo: tareaEditando.titulo,
        consigna: tareaEditando.consigna,
        fechaLimite: tareaEditando.fechaLimite,
        metodoEstudio: tareaEditando.metodoEstudio,
        tipoAsignacion: tareaEditando.tipoAsignacion,
      });
    } else {
      setDatos({ ...VACIO, catedraId: catedras[0]?.id ?? "" });
    }
    setAdjuntos([]);
    setError("");
  }, [abierto, tareaEditando, catedras]);

  if (!abierto) return null;

  const actualizar = (campo: keyof typeof VACIO, valor: string) =>
    setDatos((prev) => ({ ...prev, [campo]: valor }));

  const agregarAdjuntos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdjuntos((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = "";
  };
  const quitarAdjunto = (i: number) =>
    setAdjuntos((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!datos.titulo.trim() || !datos.catedraId || !datos.fechaLimite) {
      setError("Completá materia/curso, título y fecha de entrega.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      // Los adjuntos suben primero; la tarea se crea con los ids que devuelven.
      const ids: string[] = [];
      for (const f of adjuntos) {
        const subido = await subirArchivo(f);
        ids.push(subido.id);
      }
      await onGuardar({
        catedraId: datos.catedraId,
        titulo: datos.titulo.trim(),
        consigna: datos.consigna.trim(),
        fechaLimite: datos.fechaLimite,
        metodoEstudio: datos.metodoEstudio.trim(),
        tipoAsignacion: datos.tipoAsignacion,
        adjuntos: ids,
      });
    } catch (err: unknown) {
      setError(err instanceof ErrorDeApi ? err.message : "No se pudo guardar la tarea.");
      setGuardando(false);
    }
  };

  const catedraEditada = catedras.find((c) => c.id === datos.catedraId);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#2D1B4E] rounded-2xl border border-outline-variant/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 sticky top-0 bg-[#2D1B4E] z-10">
          <h3 className="text-xl font-bold text-white font-headline">
            {esEdicion ? "Editar tarea" : "Nueva tarea"}
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Materia + curso: en edición no se cambia (movería la tarea de curso) */}
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-1">
              Materia y curso
            </label>
            {esEdicion ? (
              <p className="w-full bg-[#1C1030]/60 border border-outline-variant/20 rounded-lg px-4 py-2.5 text-slate-300">
                {catedraEditada
                  ? `${catedraEditada.materia} — ${catedraEditada.curso}`
                  : `${tareaEditando?.materia} — ${tareaEditando?.curso}`}
              </p>
            ) : (
              <select
                value={datos.catedraId}
                onChange={(e) => actualizar("catedraId", e.target.value)}
                className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
              >
                {catedras.length === 0 && <option value="">No tenés cátedras asignadas</option>}
                {catedras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.materia} — {c.curso} ({c.alumnos} alumnos)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="titulo" className="block text-sm font-semibold text-on-surface-variant mb-1">
              Título
            </label>
            <input
              id="titulo"
              type="text"
              value={datos.titulo}
              onChange={(e) => actualizar("titulo", e.target.value)}
              placeholder="Ej: Ecuaciones de 2° grado"
              className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
            />
          </div>

          <div>
            <label htmlFor="consigna" className="block text-sm font-semibold text-on-surface-variant mb-1">
              Consigna
            </label>
            <textarea
              id="consigna"
              value={datos.consigna}
              onChange={(e) => actualizar("consigna", e.target.value)}
              rows={4}
              placeholder="Qué tienen que hacer los estudiantes…"
              className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#C548F5] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha" className="block text-sm font-semibold text-on-surface-variant mb-1">
                Fecha de entrega
              </label>
              <input
                id="fecha"
                type="date"
                value={datos.fechaLimite}
                onChange={(e) => actualizar("fechaLimite", e.target.value)}
                className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5] [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="tipo" className="block text-sm font-semibold text-on-surface-variant mb-1">
                Tipo de asignación
              </label>
              <select
                id="tipo"
                value={datos.tipoAsignacion}
                onChange={(e) => actualizar("tipoAsignacion", e.target.value)}
                className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
              >
                <option value="individual">Individual</option>
                <option value="grupal">Grupal</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="metodo" className="block text-sm font-semibold text-on-surface-variant mb-1">
              Método de estudio sugerido (opcional)
            </label>
            <input
              id="metodo"
              type="text"
              value={datos.metodoEstudio}
              onChange={(e) => actualizar("metodoEstudio", e.target.value)}
              placeholder="Ej: Práctica espaciada, mapas conceptuales…"
              className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
            />
          </div>

          {/* Adjuntos solo al crear (editar los adjuntos existentes es de otra
              etapa; acá se suman al crear la consigna). */}
          {!esEdicion && (
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-1">
                Material adjunto (opcional)
              </label>
              {adjuntos.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {adjuntos.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 bg-[#1C1030] rounded-lg px-3 py-2"
                    >
                      <span className="material-symbols-outlined text-[#C548F5] text-lg">draft</span>
                      <span className="text-slate-200 text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-slate-500 text-xs">{tamanoLegible(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => quitarAdjunto(i)}
                        aria-label="Quitar adjunto"
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-600 hover:border-[#C548F5] text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors text-sm">
                <span className="material-symbols-outlined text-lg">attach_file</span>
                Adjuntar archivo
                <input type="file" multiple onChange={agregarAdjuntos} className="hidden" />
              </label>
            </div>
          )}

          {error && <p className="text-sm text-rose-400 font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-5 py-2.5 rounded-full font-bold text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">
                {esEdicion ? "save" : "add"}
              </span>
              {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
