import { useEffect } from "react";
import {
  ACENTO_META,
  ESTADO_META,
  estadoDeNota,
  type Calificacion,
} from "./tiposCalificaciones";

interface ModalDevolucionProps {
  calificacion: Calificacion;
  onCerrar: () => void;
}

// Modal con la devolución del profesor para una materia.
export default function ModalDevolucion({
  calificacion,
  onCerrar,
}: ModalDevolucionProps) {
  const { materia, detalle, icono, acento, nota, devolucion } = calificacion;
  const estado = estadoDeNota(nota);
  const estadoMeta = ESTADO_META[estado];

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg bg-surface-container rounded-2xl border border-white/10 shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
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
              <span
                className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold border ${estadoMeta.badge}`}
              >
                {estadoMeta.label}
              </span>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nota */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
            Nota
          </span>
          <span className="text-4xl font-headline font-black text-white">
            {nota !== null ? nota.toFixed(1) : "—"}
          </span>
        </div>

        {/* Devolución */}
        <div>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-2">
            Devolución del profesor
          </p>
          <p className="text-on-surface text-sm leading-relaxed">{devolucion}</p>
        </div>

        {/* Acción */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onCerrar}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-headline font-bold text-sm active:scale-95 transition-transform"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
