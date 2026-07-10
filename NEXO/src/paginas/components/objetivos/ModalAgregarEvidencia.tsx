import { useState } from "react";
import type { Evidencia } from "./tiposCompetencia";

// Trabajos disponibles desde el Portafolio para vincular como evidencia
export interface TrabajoDisponible {
  id: string;
  titulo: string;
  icono: string;
}

interface ModalAgregarEvidenciaProps {
  competenciaNombre: string;
  trabajos: TrabajoDisponible[];
  onGuardar: (evidencia: Evidencia) => void;
  onCerrar: () => void;
}

export default function ModalAgregarEvidencia({
  competenciaNombre,
  trabajos,
  onGuardar,
  onCerrar,
}: ModalAgregarEvidenciaProps) {
  const [trabajoId, setTrabajoId] = useState<string>("");
  const [reflexion, setReflexion] = useState<string>("");

  const trabajoSeleccionado = trabajos.find((t) => t.id === trabajoId);
  const puedeGuardar = trabajoSeleccionado !== undefined && reflexion.trim().length > 0;

  const handleGuardar = () => {
    if (!trabajoSeleccionado) return;
    onGuardar({
      id: crypto.randomUUID(),
      titulo: trabajoSeleccionado.titulo,
      icono: trabajoSeleccionado.icono,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-[#2D1B4E] rounded-[20px] border border-purple-900/30 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold font-headline text-white">Agregar Evidencia</h2>
            <p className="text-xs text-slate-400 mt-1">
              Para <span className="text-[#C548F5] font-bold">{competenciaNombre}</span>
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Selector de trabajo */}
        <div className="mb-5">
          <label
            htmlFor="selector-trabajo"
            className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Trabajo o proyecto
          </label>
          <select
            id="selector-trabajo"
            value={trabajoId}
            onChange={(e) => setTrabajoId(e.target.value)}
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none"
          >
            <option value="">Seleccioná un trabajo…</option>
            {trabajos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </div>

        {/* Editor de reflexión metacognitiva */}
        <div className="mb-6">
          <label
            htmlFor="editor-reflexion"
            className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"
          >
            Reflexión
          </label>
          <textarea
            id="editor-reflexion"
            value={reflexion}
            onChange={(e) => setReflexion(e.target.value)}
            rows={4}
            placeholder="¿Cómo demuestro esta competencia en este trabajo?"
            className="w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none resize-none placeholder-slate-500"
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="px-6 py-2.5 bg-[#C548F5] hover:bg-[#b039df] text-white rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar evidencia
          </button>
        </div>
      </div>
    </div>
  );
}
