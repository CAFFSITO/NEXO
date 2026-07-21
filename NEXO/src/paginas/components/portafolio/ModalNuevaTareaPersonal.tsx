import { useState } from "react";

interface ModalNuevaTareaPersonalProps {
  /** Si viene con texto, el modal está editando una tarea existente (2.C.8). */
  tituloInicial?: string;
  onGuardar: (titulo: string) => void;
  onCerrar: () => void;
}

// Modal para crear o editar una tarea personal (recordatorio del estudiante).
export default function ModalNuevaTareaPersonal({
  tituloInicial = "",
  onGuardar,
  onCerrar,
}: ModalNuevaTareaPersonalProps) {
  const [titulo, setTitulo] = useState<string>(tituloInicial);
  const editando = tituloInicial.length > 0;

  const puedeGuardar = titulo.trim().length > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    onGuardar(titulo.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-[#2D1B4E] border border-white/10 rounded-[20px] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-white font-headline">
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
              disabled={!puedeGuardar}
              className="px-6 py-2.5 bg-[#C548F5] text-black font-bold rounded-full hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editando ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
