// src/paginas/components/portafolio-docente/ModalTareaDocente.tsx
// Modal para crear o editar una tarea del profesor.
// Valida campos obligatorios antes de guardar.

import { useEffect, useState } from "react";
import type { TareaDocente } from "./TarjetaTareaDocente";

// Datos editables por el profesor (el estado de entregas no se edita a mano)
export type DatosTarea = Pick<
  TareaDocente,
  "titulo" | "materia" | "curso" | "fechaVence"
>;

interface ModalTareaDocenteProps {
  abierto: boolean;
  // Si viene una tarea, el modal está en modo edición; si no, en modo creación
  tareaEditando: TareaDocente | null;
  materias: string[];
  cursos: string[];
  onGuardar: (datos: DatosTarea) => void;
  onCerrar: () => void;
}

const DATOS_VACIOS: DatosTarea = {
  titulo: "",
  materia: "",
  curso: "",
  fechaVence: "",
};

export default function ModalTareaDocente({
  abierto,
  tareaEditando,
  materias,
  cursos,
  onGuardar,
  onCerrar,
}: ModalTareaDocenteProps) {
  const [datos, setDatos] = useState<DatosTarea>(DATOS_VACIOS);
  const [error, setError] = useState<string>("");

  // Cada vez que se abre, precargar datos (edición) o limpiar (creación)
  useEffect(() => {
    if (!abierto) return;
    if (tareaEditando) {
      const { titulo, materia, curso, fechaVence } = tareaEditando;
      setDatos({ titulo, materia, curso, fechaVence });
    } else {
      setDatos(DATOS_VACIOS);
    }
    setError("");
  }, [abierto, tareaEditando]);

  if (!abierto) return null;

  const actualizar = (campo: keyof DatosTarea, valor: string) =>
    setDatos((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!datos.titulo.trim() || !datos.materia || !datos.curso || !datos.fechaVence) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    onGuardar({ ...datos, titulo: datos.titulo.trim() });
  };

  const esEdicion = tareaEditando !== null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg bg-[#2D1B4E] rounded-2xl border border-outline-variant/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="materia" className="block text-sm font-semibold text-on-surface-variant mb-1">
                Materia
              </label>
              <select
                id="materia"
                value={datos.materia}
                onChange={(e) => actualizar("materia", e.target.value)}
                className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
              >
                <option value="">Seleccionar…</option>
                {materias.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="curso" className="block text-sm font-semibold text-on-surface-variant mb-1">
                Curso
              </label>
              <select
                id="curso"
                value={datos.curso}
                onChange={(e) => actualizar("curso", e.target.value)}
                className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
              >
                <option value="">Seleccionar…</option>
                {cursos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fechaVence" className="block text-sm font-semibold text-on-surface-variant mb-1">
              Fecha de entrega
            </label>
            <input
              id="fechaVence"
              type="date"
              value={datos.fechaVence}
              onChange={(e) => actualizar("fechaVence", e.target.value)}
              className="w-full bg-[#1C1030] border border-outline-variant/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5] [color-scheme:dark]"
            />
          </div>

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
              className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">
                {esEdicion ? "save" : "add"}
              </span>
              {esEdicion ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
