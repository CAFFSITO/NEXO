interface ResumenCalificacionesProps {
  promedio: number | null;
  materiasPendientes: number;
  /**
   * Llevar a la tarea que está esperando corrección (Error 2.C.7). Si viene, la
   * tarjeta "Correcciones en camino" se vuelve pulsable; antes era un cartel
   * muerto que no llevaba a ningún lado.
   */
  onIrACorreccion?: () => void;
}

// Bloque inferior: promedio general (calculado) + aviso de pendientes.
//
// Tenía una tercera cosa: una flechita verde que decía "+0.5 este mes". No
// salía de ningún lado — era un texto fijo, así que subía medio punto todos los
// meses para siempre, incluso con el promedio en caída. Calcular la tendencia
// de verdad (comparar con el mes anterior) es un algoritmo y va con el resto de
// los algoritmos de progreso; hasta entonces, mejor no decir nada que mentir.
export default function ResumenCalificaciones({
  promedio,
  materiasPendientes,
  onIrACorreccion,
}: ResumenCalificacionesProps) {
  // Pulsable solo si hay algo a lo que llevar: sin pendientes, "Todo al día" no
  // tiene destino.
  const pulsable = materiasPendientes > 0 && Boolean(onIrACorreccion);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {/* Promedio general */}
      <div className="bg-[#2D1B4E] rounded-xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-10 -mt-10" />
        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          Promedio General
        </p>
        {/* "—" cuando no hay ninguna nota todavía: un promedio de cero sería
            una acusación falsa. */}
        <p className="text-5xl font-headline font-black text-white mt-4">
          {promedio !== null ? promedio.toFixed(1) : "—"}
        </p>
      </div>

      {/* Materias pendientes de corrección (Error 2.C.7: ahora pulsable) */}
      <button
        type="button"
        onClick={pulsable ? onIrACorreccion : undefined}
        disabled={!pulsable}
        className={`bg-surface-container rounded-xl p-8 border border-white/5 col-span-2 flex items-center justify-between text-left w-full transition-colors ${
          pulsable ? "hover:border-primary/40 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="max-w-xs">
          <h4 className="text-white font-headline font-bold text-lg flex items-center gap-2">
            {materiasPendientes > 0 ? "Correcciones en camino" : "Todo al día"}
            {pulsable && (
              <span className="material-symbols-outlined text-primary text-lg">
                arrow_forward
              </span>
            )}
          </h4>
          <p className="text-on-surface-variant text-sm mt-2">
            {materiasPendientes > 0
              ? `Tenés ${materiasPendientes} ${
                  materiasPendientes === 1 ? "materia" : "materias"
                } esperando la devolución del profesor. Tocá para ver la entrega.`
              : "No quedan materias pendientes de corrección en este portafolio."}
          </p>
        </div>
        <div className="hidden sm:block">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">
              {materiasPendientes > 0 ? "hourglass_top" : "check_circle"}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
