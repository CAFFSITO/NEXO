// src/paginas/components/materias/ModalNuevaMateria.tsx
// Modal de alta de materia. Valida nombre único y horas válidas antes de crear.
// El profesor responsable es opcional al crear (puede asignarse luego).

import { useState } from "react";
import type { Materia } from "./tipos";

type NuevaMateria = Omit<Materia, "id">;

interface ModalNuevaMateriaProps {
  abierto: boolean;
  materiasExistentes: Materia[];
  onCerrar: () => void;
  onCrear: (materia: NuevaMateria) => void;
}

export default function ModalNuevaMateria({
  abierto,
  materiasExistentes,
  onCerrar,
  onCrear,
}: ModalNuevaMateriaProps) {
  const [nombre, setNombre] = useState("");
  const [profesor, setProfesor] = useState("");
  const [horas, setHoras] = useState<number>(4);
  const [error, setError] = useState("");

  if (!abierto) return null;

  const resetear = () => {
    setNombre("");
    setProfesor("");
    setHoras(4);
    setError("");
  };

  const handleCerrar = () => {
    resetear();
    onCerrar();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio === "") {
      setError("El nombre de la materia es obligatorio.");
      return;
    }
    const duplicado = materiasExistentes.some(
      (m) => m.nombre.toLowerCase() === limpio.toLowerCase(),
    );
    if (duplicado) {
      setError(`La materia “${limpio}” ya existe.`);
      return;
    }
    if (horas < 1 || horas > 20) {
      setError("Las horas semanales deben estar entre 1 y 20.");
      return;
    }
    onCrear({
      nombre: limpio,
      profesor: profesor.trim() === "" ? null : profesor.trim(),
      cursos: 0,
      horasSemanales: horas,
    });
    resetear();
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
          <h3 className="text-2xl font-bold text-white font-headline">Nueva materia</h3>
          <button
            type="button"
            onClick={handleCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Nombre</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError("");
            }}
            placeholder="Ej: Matemática"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Profesor responsable (opcional)
          </span>
          <input
            type="text"
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
            placeholder="Ej: Prof. García"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Horas semanales
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={horas}
            onChange={(e) => {
              setHoras(Number(e.target.value));
              setError("");
            }}
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
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
            Crear materia
          </button>
        </div>
      </form>
    </div>
  );
}
