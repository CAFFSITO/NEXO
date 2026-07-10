interface ResumenCalificacionesProps {
  promedio: number | null;
  tendencia?: string; // Ej: "+0.5 este mes"
  materiasPendientes: number;
}

// Bloque inferior: promedio general (calculado) + aviso de pendientes.
export default function ResumenCalificaciones({
  promedio,
  tendencia,
  materiasPendientes,
}: ResumenCalificacionesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {/* Promedio general */}
      <div className="bg-[#2D1B4E] rounded-xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-10 -mt-10" />
        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          Promedio General
        </p>
        <p className="text-5xl font-headline font-black text-white mt-4">
          {promedio !== null ? promedio.toFixed(1) : "—"}
        </p>
        {tendencia && (
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
            <span className="material-symbols-outlined text-base">trending_up</span>
            <span>{tendencia}</span>
          </div>
        )}
      </div>

      {/* Materias pendientes de corrección */}
      <div className="bg-surface-container rounded-xl p-8 border border-white/5 col-span-2 flex items-center justify-between">
        <div className="max-w-xs">
          <h4 className="text-white font-headline font-bold text-lg">
            {materiasPendientes > 0
              ? "Correcciones en camino"
              : "Todo al día"}
          </h4>
          <p className="text-on-surface-variant text-sm mt-2">
            {materiasPendientes > 0
              ? `Tenés ${materiasPendientes} ${
                  materiasPendientes === 1 ? "materia" : "materias"
                } esperando la devolución del profesor.`
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
      </div>
    </div>
  );
}
