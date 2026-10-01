import { useState } from "react";
import { useDialogo } from "../../../servicios/useDialogo";

interface ModalNuevaTareaPersonalProps {
  /** Si viene con texto, el modal está editando una tarea existente (2.C.8). */
  tituloInicial?: string;
  descripcionInicial?: string;
  fechaInicial?: string | null;
  onGuardar: (titulo: string, descripcion: string, fecha: string | null) => Promise<void>;
  onCerrar: () => void;
}

// Modal para crear o editar una tarea personal (recordatorio del estudiante).
export default function ModalNuevaTareaPersonal({
  tituloInicial = "",
  descripcionInicial = "",
  fechaInicial = "",
  onGuardar,
  onCerrar,
}: ModalNuevaTareaPersonalProps) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const [titulo, setTitulo] = useState<string>(tituloInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [fecha, setFecha] = useState(fechaInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const editando = tituloInicial.length > 0;

  const puedeGuardar = titulo.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar || guardando) return;
    setGuardando(true); setError("");
    try { await onGuardar(titulo.trim(), descripcion.trim(), fecha || null); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la tarea."); }
    finally { setGuardando(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="titulo-modal-personal"
        ref={dialogo}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#2D1B4E] border border-white/10 rounded-[20px] p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id="titulo-modal-personal" className="text-xl font-extrabold text-white font-headline">
            {editando ? "Editar tarea personal" : "Nueva tarea personal"}
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="titulo-tarea-personal"
            className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
          >
            ¿Qué querés recordar?
          </label>
          <input
            id="titulo-tarea-personal"
            type="text"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Repasar vocabulario Inglés"
            className="w-full bg-[#1C1030] border-none rounded-[10px] py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-[#C548F5] transition-all mb-6"
          />

          <label className="block text-sm mb-4">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={10000} rows={3} className="block w-full bg-background rounded-xl p-3 mt-2" /></label>
          <label className="block text-sm mb-5">Fecha límite · opcional<input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="block w-full bg-background rounded-xl p-3 mt-2" /></label>
          {error && <p role="alert" className="text-error text-sm mb-4">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="px-5 py-2.5 text-slate-300 font-semibold hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeGuardar || guardando}
              className="px-6 py-2.5 bg-[#C548F5] text-black font-bold rounded-full hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando…" : editando ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
