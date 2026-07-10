// Tarjeta de tendencias: tema más mencionado + variación respecto al período anterior.

import type { CategoriaQueja } from "./TarjetaQueja";

interface TendenciasQuejasCardProps {
  temaMasMencionado: CategoriaQueja | null;
  variacionPorcentual: number; // ej: 20 → "aumentaron 20%"
}

export default function TendenciasQuejasCard({
  temaMasMencionado,
  variacionPorcentual,
}: TendenciasQuejasCardProps) {
  const subio = variacionPorcentual >= 0;

  return (
    <div className="bg-surface-container rounded-lg p-6 border border-surface-container-highest">
      <h3 className="text-lg font-bold mb-4 font-headline text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-orange-500">trending_up</span>
        Tendencias
      </h3>
      <div className="space-y-4">
        <div className="p-3 bg-background/50 rounded-xl">
          <p className="text-sm text-on-surface leading-tight">
            El tema más mencionado es{" "}
            <span className="text-primary font-bold">
              {temaMasMencionado ?? "—"}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-4 p-3 bg-error-container/20 rounded-xl border border-error-container/30">
          <div className="bg-error-container p-2 rounded-full">
            <span className="material-symbols-outlined text-white text-lg">
              {subio ? "arrow_upward" : "arrow_downward"}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              Quejas {subio ? "aumentaron" : "disminuyeron"}{" "}
              {Math.abs(variacionPorcentual)}%
            </p>
            <p className="text-[11px] text-error">Respecto al mes anterior</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-container-highest">
          <div className="flex gap-2 items-start opacity-70">
            <span className="material-symbols-outlined text-slate-500 text-sm mt-0.5">
              info
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              Esta información también la ve la Administración Académica para el
              planeamiento institucional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
