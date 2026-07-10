import { useState } from "react";
import { PALETAS_MATERIA, type MetaGestion } from "./tiposDashboard";

interface ModalNuevaMetaProps {
  onGuardar: (meta: MetaGestion) => void;
  onCerrar: () => void;
}

// Materias disponibles para el badge (las que tienen paleta definida).
const MATERIAS = Object.keys(PALETAS_MATERIA);

// Modal "Nueva Meta": título + materia + vencimiento + total de subtareas.
// Crea una MetaGestion en curso con progreso 0.
export default function ModalNuevaMeta({ onGuardar, onCerrar }: ModalNuevaMetaProps) {
  const [titulo, setTitulo] = useState<string>("");
  const [materia, setMateria] = useState<string>(MATERIAS[0]);
  const [vence, setVence] = useState<string>("");
  const [subtareasTotal, setSubtareasTotal] = useState<number>(5);
  const [unidadSubtarea, setUnidadSubtarea] = useState<string>("subtareas");

  const puedeGuardar = titulo.trim().length > 0 && vence.trim().length > 0 && subtareasTotal > 0;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    onGuardar({
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      materia,
      vence: vence.trim().toUpperCase(),
      estado: "en-curso",
      subtareasHechas: 0,
      subtareasTotal,
      unidadSubtarea: unidadSubtarea.trim() || "subtareas",
      colaboradores: 0,
      recursos: 0,
    });
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
            <h2 className="text-xl font-bold font-headline text-white">Nueva Meta</h2>
            <p className="text-xs text-slate-400 mt-1">
              Definí un objetivo y seguí tu progreso académico.
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

        {/* Título */}
        <div className="mb-5">
          <label
            htmlFor="titulo-meta"
            className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Título de la meta
          </label>
          <input
            id="titulo-meta"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
            placeholder="Ej: Preparar examen de Historia"
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none placeholder-slate-500"
          />
        </div>

        {/* Materia + vencimiento */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label
              htmlFor="materia-meta"
              className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
            >
              Materia
            </label>
            <select
              id="materia-meta"
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none"
            >
              {MATERIAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="vence-meta"
              className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
            >
              Vence el
            </label>
            <input
              id="vence-meta"
              type="text"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              placeholder="Ej: 15 ABR"
              className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none placeholder-slate-500"
            />
          </div>
        </div>

        {/* Subtareas: cantidad + unidad */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label
              htmlFor="subtareas-meta"
              className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
            >
              Cantidad
            </label>
            <input
              id="subtareas-meta"
              type="number"
              min={1}
              value={subtareasTotal}
              onChange={(e) => setSubtareasTotal(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="unidad-meta"
              className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
            >
              Unidad
            </label>
            <input
              id="unidad-meta"
              type="text"
              value={unidadSubtarea}
              onChange={(e) => setUnidadSubtarea(e.target.value)}
              placeholder="subtareas"
              className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none placeholder-slate-500"
            />
          </div>
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
            Crear meta
          </button>
        </div>
      </form>
    </div>
  );
}
