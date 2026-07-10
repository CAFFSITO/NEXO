// src/paginas/components/portafolio-docente/TarjetaTareaDocente.tsx
// Tarjeta de una tarea creada por el profesor.
// Muestra materia (ícono), curso, fecha de entrega y el estado de las entregas
// (al día / tarde / pendiente), más acciones de editar y eliminar.

export interface TareaDocente {
  id: string;
  titulo: string;
  materia: string;
  curso: string;
  fechaVence: string; // ISO: "2026-05-24"
  alDia: number;
  tarde: number;
  pendiente: number;
}

// Ícono y color por materia (fallback genérico si no está mapeada)
const ICONO_POR_MATERIA: Record<string, string> = {
  Matemática: "functions",
  Historia: "history_edu",
  Biología: "biotech",
  Lengua: "menu_book",
  Inglés: "translate",
  Física: "calculate",
};

function iconoMateria(materia: string): string {
  return ICONO_POR_MATERIA[materia] ?? "assignment";
}

interface TarjetaTareaDocenteProps {
  tarea: TareaDocente;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
}

const CIRCULOS = [
  { key: "alDia", label: "AL DÍA", color: "bg-emerald-500 shadow-emerald-500/20" },
  { key: "tarde", label: "TARDE", color: "bg-amber-500 shadow-amber-500/20" },
  { key: "pendiente", label: "PENDIENTE", color: "bg-rose-500 shadow-rose-500/20" },
] as const;

export default function TarjetaTareaDocente({
  tarea,
  onEditar,
  onEliminar,
}: TarjetaTareaDocenteProps) {
  const total = tarea.alDia + tarea.tarde + tarea.pendiente;
  const entregadas = tarea.alDia + tarea.tarde;

  const fechaLegible = new Date(tarea.fechaVence).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-[#2D1B4E] p-6 rounded-xl border border-outline-variant/20 hover:border-primary/40 transition-all group flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      {/* ── Info principal ── */}
      <div className="flex gap-6 items-center">
        <div className="w-14 h-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-3xl">{iconoMateria(tarea.materia)}</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white font-headline group-hover:text-primary transition-colors">
            {tarea.titulo}
          </h3>
          <div className="flex flex-wrap gap-4 mt-1">
            <span className="text-xs font-semibold text-tertiary-fixed-dim bg-tertiary-container/20 px-3 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">school</span>
              {tarea.curso}
            </span>
            <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">calendar_today</span>
              Vence: {fechaLegible}
            </span>
          </div>
        </div>
      </div>

      {/* ── Estado de entregas + acciones ── */}
      <div className="flex items-center gap-8">
        <div className="flex gap-6 items-center">
          {CIRCULOS.map((c) => (
            <div key={c.key} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full border-4 border-[#2D1B4E] flex items-center justify-center text-white font-bold shadow-lg ${c.color}`}
              >
                {tarea[c.key]}
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 font-bold">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant mr-2 hidden xl:block">
            {entregadas}/{total} entregadas
          </span>
          <button
            onClick={() => onEditar(tarea.id)}
            className="flex items-center gap-2 bg-surface-container-high text-white px-5 py-2.5 rounded-full font-bold hover:bg-surface-bright transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            <span>Editar</span>
          </button>
          <button
            onClick={() => onEliminar(tarea.id)}
            aria-label="Eliminar tarea"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
