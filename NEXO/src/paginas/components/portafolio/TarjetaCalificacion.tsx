import {
  ACENTO_META,
  ESTADO_META,
  estadoDeNota,
  type Calificacion,
} from "./tiposCalificaciones";

interface TarjetaCalificacionProps {
  calificacion: Calificacion;
  onVerDevolucion: (id: string) => void;
}

// Tarjeta de una materia con su nota, estado (derivado) y acceso a la devolución.
export default function TarjetaCalificacion({
  calificacion,
  onVerDevolucion,
}: TarjetaCalificacionProps) {
  const { materia, detalle, icono, acento, nota, actualizado } = calificacion;
  const estado = estadoDeNota(nota);
  const estadoMeta = ESTADO_META[estado];

  // El hover del borde acompaña el resultado (error si desaprobado)
  const hoverBorde =
    estado === "desaprobado" ? "hover:border-error/30" : "hover:border-primary/30";

  return (
    <div
      className={`bg-surface-container rounded-lg p-6 flex flex-col md:flex-row items-center justify-between border border-white/5 transition-all group ${hoverBorde}`}
    >
      {/* Materia + ícono */}
      <div className="flex items-center gap-5 mb-4 md:mb-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${ACENTO_META[acento]}`}
        >
          <span className="material-symbols-outlined">{icono}</span>
        </div>
        <div>
          <h3 className="text-lg font-headline font-bold text-white">
            {materia}
            {detalle && (
              <span className="text-on-surface-variant font-normal"> ({detalle})</span>
            )}
          </h3>
          <p className="text-on-surface-variant text-xs">
            Última actualización: {actualizado}
          </p>
        </div>
      </div>

      {/* Estado + nota */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${estadoMeta.badge}`}
          >
            {estadoMeta.label}
          </span>
          <button
            onClick={() => onVerDevolucion(calificacion.id)}
            disabled={nota === null}
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
          >
            Ver devolución
            <span className="material-symbols-outlined text-base">arrow_forward_ios</span>
          </button>
        </div>
        <div className="h-8 w-px bg-white/10 hidden md:block" />
        <div className="text-right hidden sm:block min-w-[50px]">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
            Nota
          </p>
          <p className="text-2xl font-headline font-black text-white">
            {nota !== null ? nota.toFixed(1) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
