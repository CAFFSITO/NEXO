import { useState } from "react";
import { FRECUENCIA_LABELS } from "./tiposDashboard";

interface ModalNuevoHabitoProps {
  onGuardar: (nombre: string, frecuencia: "diario" | "semanal") => Promise<void> | void;
  onCerrar: () => void;
}

// Las frecuencias que acepta la base (`habitos.frecuencia`): diario o semanal.
// La pantalla ofrecía además "días específicos", que la base rechaza — era una
// opción que nunca podría haberse guardado.
const FRECUENCIAS = ["diario", "semanal"] as const;

// Modal "Crear Hábito" (Etapa 5): el hábito viaja a la base y aparece al instante
// en Hábitos y en el Dashboard, que leen la misma tabla.
export default function ModalNuevoHabito({ onGuardar, onCerrar }: ModalNuevoHabitoProps) {
  const [nombre, setNombre] = useState<string>("");
  const [frecuencia, setFrecuencia] = useState<(typeof FRECUENCIAS)[number]>("diario");

  const puedeGuardar = nombre.trim().length > 0;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    onGuardar(nombre.trim(), frecuencia);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleGuardar();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#2D1B4E] rounded-[20px] border border-purple-900/30 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold font-headline text-white">Nuevo Hábito</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sumá una rutina y empezá a construir tu racha.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nombre del hábito */}
        <div className="mb-5">
          <label
            htmlFor="nombre-habito"
            className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Nombre del hábito
          </label>
          <input
            id="nombre-habito"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            placeholder="Ej: Estudiar 30 min sin distracciones"
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none placeholder-slate-500"
          />
        </div>

        {/* Selector de frecuencia */}
        <div className="mb-6">
          <label
            htmlFor="frecuencia-habito"
            className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Frecuencia
          </label>
          <select
            id="frecuencia-habito"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value as (typeof FRECUENCIAS)[number])}
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none"
          >
            {FRECUENCIAS.map((f) => (
              <option key={f} value={f}>
                {FRECUENCIA_LABELS[f]}
              </option>
            ))}
          </select>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeGuardar}
            className="px-6 py-2.5 bg-[#C548F5] hover:bg-[#b039df] text-white rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar hábito
          </button>
        </div>
      </form>
    </div>
  );
}
