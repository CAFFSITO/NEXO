// Resumen semanal con distribución por categoría.
// Recibe datos ya calculados desde la página (single source of truth).

import type { CategoriaQueja } from "./TarjetaQueja";

export interface DistribucionCategoria {
  categoria: CategoriaQueja;
  cantidad: number;
}

interface ResumenQuejasCardProps {
  totales: number;
  nuevas: number;
  distribucion: DistribucionCategoria[];
}

// Color de la barra según categoría.
const COLOR_BARRA: Record<CategoriaQueja, string> = {
  Metodología: "bg-primary",
  Convivencia: "bg-tertiary",
  Infraestructura: "bg-tertiary",
  Otro: "bg-outline",
};

export default function ResumenQuejasCard({
  totales,
  nuevas,
  distribucion,
}: ResumenQuejasCardProps) {
  return (
    <div className="bg-surface-container-high rounded-lg p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className="material-symbols-outlined text-6xl">analytics</span>
      </div>
      <h3 className="text-lg font-bold mb-6 font-headline text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">data_usage</span>
        Resumen Semanal
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-background rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-white">
            {String(totales).padStart(2, "0")}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Totales
          </p>
        </div>
        <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
          <p className="text-3xl font-black text-primary">
            {String(nuevas).padStart(2, "0")}
          </p>
          <p className="text-[10px] text-primary/80 uppercase tracking-widest font-bold">
            Nuevas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Distribución
        </p>
        <div className="space-y-3">
          {distribucion.map((d) => {
            const porcentaje = totales > 0 ? (d.cantidad / totales) * 100 : 0;
            return (
              <div key={d.categoria}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-on-surface">{d.categoria}</span>
                  <span className="font-bold">{d.cantidad}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full ${COLOR_BARRA[d.categoria]} rounded-full transition-all`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
