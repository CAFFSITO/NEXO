export interface Tendencia {
  materia: string;
  variacion: number; // porcentaje, ej: 24 => "+24%"
}

interface PanelTendenciasProps {
  tendencias: Tendencia[];
  onSeleccionar: (materia: string) => void;
}

// SidebarTendencias: materias con más actividad reciente (derivado de votos).
export default function PanelTendencias({ tendencias, onSeleccionar }: PanelTendenciasProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[16px] p-6 border border-fuchsia-900/10">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-fuchsia-500">trending_up</span>
        <h4 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Tendencias</h4>
      </div>

      <ul className="space-y-4">
        {tendencias.map((t) => (
          <li key={t.materia}>
            <button
              onClick={() => onSeleccionar(t.materia)}
              className="w-full flex items-center justify-between group cursor-pointer"
            >
              <span className="text-slate-300 group-hover:text-white transition-colors">{t.materia}</span>
              <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 text-[10px] rounded-md font-bold">
                +{t.variacion}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
