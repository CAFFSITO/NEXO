// src/paginas/components/cursos/ModalNuevoCurso.tsx
// Modal de alta de curso. Valida año/división únicos antes de crear.
// Sigue la arquitectura: un estudiante pertenece a un curso, el preceptor es opcional al crear.

import { useState } from "react";
import type { Curso } from "./TarjetaCurso";

type NuevoCurso = Omit<Curso, "id" | "activo">;

interface ModalNuevoCursoProps {
  abierto: boolean;
  cursosExistentes: Curso[];
  onCerrar: () => void;
  onCrear: (curso: NuevoCurso) => void;
}

const ANIOS = [1, 2, 3, 4, 5, 6, 7];
const DIVISIONES = ["A", "B", "C", "D", "E"];

export default function ModalNuevoCurso({
  abierto,
  cursosExistentes,
  onCerrar,
  onCrear,
}: ModalNuevoCursoProps) {
  const [anio, setAnio] = useState<number>(1);
  const [division, setDivision] = useState<string>("A");
  const [preceptor, setPreceptor] = useState<string>("");
  const [error, setError] = useState<string>("");

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const duplicado = cursosExistentes.some((c) => c.anio === anio && c.division === division);
    if (duplicado) {
      setError(`El curso ${anio}°${division} ya existe.`);
      return;
    }
    onCrear({
      anio,
      division,
      preceptor: preceptor.trim() === "" ? null : preceptor.trim(),
      estudiantes: 0,
      materias: 0,
    });
    resetear();
  };

  const resetear = () => {
    setAnio(1);
    setDivision("A");
    setPreceptor("");
    setError("");
  };

  const handleCerrar = () => {
    resetear();
    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleCerrar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-bold text-white font-headline">Nuevo curso</h3>
          <button
            type="button"
            onClick={handleCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Año</span>
            <select
              value={anio}
              onChange={(e) => {
                setAnio(Number(e.target.value));
                setError("");
              }}
              className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
            >
              {ANIOS.map((a) => (
                <option key={a} value={a}>
                  {a}°
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">
              División
            </span>
            <select
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setError("");
              }}
              className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
            >
              {DIVISIONES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Preceptor (opcional)
          </span>
          <input
            type="text"
            value={preceptor}
            onChange={(e) => setPreceptor(e.target.value)}
            placeholder="Ej: Preceptor López"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleCerrar}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#C548F5] hover:bg-[#C548F5]/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95"
          >
            Crear curso
          </button>
        </div>
      </form>
    </div>
  );
}
