import type { TareaPersonal } from "./tiposTareas";

interface TarjetaTareaPersonalProps {
  tarea: TareaPersonal;
  onToggle: (id: string) => void;
  onEditar: (tarea: TareaPersonal) => void;
  onEliminar: (id: string) => void;
}

// Tarjeta de una tarea personal del estudiante (recordatorio con checkbox).
export default function TarjetaTareaPersonal({
  tarea,
  onToggle,
  onEditar,
  onEliminar,
}: TarjetaTareaPersonalProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[14px] p-6 hover:shadow-xl transition-all border border-transparent hover:border-[#4900a6]/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(tarea.id)}
            aria-pressed={tarea.completada}
            aria-label={tarea.completada ? "Marcar como pendiente" : "Marcar como completada"}
            className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
              tarea.completada
                ? "bg-[#C548F5] border-[#C548F5]"
                : "border-slate-500 hover:border-[#C548F5]"
            }`}
          >
            {tarea.completada && (
              <span className="material-symbols-outlined text-black text-base">check</span>
            )}
          </button>

          <div className="flex items-center gap-3">
            <h3
              className={`text-lg font-bold font-headline ${
                tarea.completada
                  ? "text-slate-400 line-through decoration-slate-600"
                  : "text-white"
              }`}
            >
              {tarea.titulo}
            </h3>
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[9px] font-bold rounded uppercase tracking-wider">
              PERSONAL
            </span>
          </div>
        </div>

        <div className="flex items-center">
          {/* Editar (Error 2.C.8): antes no se podía editar una tarea. */}
          <button
            onClick={() => onEditar(tarea)}
            aria-label="Editar tarea personal"
            className="text-slate-500 hover:text-[#C548F5] transition-colors p-2"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            onClick={() => onEliminar(tarea.id)}
            aria-label="Eliminar tarea personal"
            className="text-slate-500 hover:text-red-400 transition-colors p-2"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
