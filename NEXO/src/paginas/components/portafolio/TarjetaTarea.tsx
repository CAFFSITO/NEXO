import {
  colorMateria,
  colorVencimiento,
  diasHasta,
  ESTADO_META,
  estadoEfectivo,
  textoVencimiento,
  type TareaAcademica,
} from "./tiposTareas";

interface TarjetaTareaProps {
  tarea: TareaAcademica;
  onVerDetalle: (id: string) => void;
  onEntregar: (id: string) => void;
  onVerFeedback: (id: string) => void;
}

// Tarjeta de una tarea académica (asignada por un profesor).
export default function TarjetaTarea({
  tarea,
  onVerDetalle,
  onEntregar,
  onVerFeedback,
}: TarjetaTareaProps) {
  const estado = estadoEfectivo(tarea);
  const dias = diasHasta(tarea.fechaLimite);
  const entregada = estado === "entregada";
  const vencida = estado === "vencida";

  return (
    <div
      className={`bg-[#2D1B4E] rounded-[14px] p-6 hover:shadow-xl transition-all group ${
        vencida
          ? "border-l-[3px] border-red-500"
          : "border border-transparent hover:border-[#C548F5]/30"
      } ${entregada ? "opacity-80 hover:opacity-100" : ""}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-3">
          {/* Badges: materia + estado */}
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${colorMateria(
                tarea.materia
              )}`}
            >
              {tarea.materia.toUpperCase()}
            </span>
            <span
              className={`px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${ESTADO_META[estado].badge}`}
            >
              {ESTADO_META[estado].label}
            </span>
          </div>

          {/* Título */}
          <h3
            className={`text-xl font-bold font-headline ${
              entregada
                ? "text-slate-400 line-through decoration-slate-600"
                : "text-white"
            }`}
          >
            {tarea.titulo}
          </h3>

          {/* Metadatos según estado */}
          {entregada ? (
            <div className="flex items-center gap-1.5 text-sm text-green-500 font-semibold">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>
                {tarea.nota !== undefined ? `Calificada ${tarea.nota}/10` : "Entregada"}
              </span>
            </div>
          ) : vencida ? (
            <div className="flex items-center gap-1.5 text-sm text-red-500">
              <span className="material-symbols-outlined text-lg">warning</span>
              <span>{textoVencimiento(dias)}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg">person</span>
                <span>{tarea.profesor}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${colorVencimiento(dias)}`}>
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span>{textoVencimiento(dias)}</span>
              </div>
              {tarea.metodoEstudio && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg">neurology</span>
                  <span>{tarea.metodoEstudio}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        {entregada ? (
          <button
            onClick={() => onVerFeedback(tarea.id)}
            className="px-4 py-2 text-slate-300 font-semibold hover:text-white transition-colors shrink-0"
          >
            Ver feedback
          </button>
        ) : (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onVerDetalle(tarea.id)}
              className="px-4 py-2 text-slate-300 font-semibold hover:text-white transition-colors"
            >
              Ver detalle
            </button>
            <button
              onClick={() => onEntregar(tarea.id)}
              className="px-6 py-2 bg-[#C548F5] text-black font-bold rounded-full hover:bg-white transition-colors"
            >
              Entregar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
