// Tarjeta de una queja estudiantil anónima.
// Dos estados visuales: "nueva" (destacada, accionable) y "vista" (atenuada).

export type CategoriaQueja =
  | "Metodología"
  | "Convivencia"
  | "Infraestructura"
  | "Otro";

export interface Queja {
  id: string;
  categoria: CategoriaQueja;
  texto: string;
  tiempo: string;
  vista: boolean;
}

interface TarjetaQuejaProps {
  queja: Queja;
  onMarcarVista: (id: string) => void;
}

export default function TarjetaQueja({ queja, onMarcarVista }: TarjetaQuejaProps) {
  const { id, categoria, texto, tiempo, vista } = queja;

  if (vista) {
    return (
      <div className="bg-surface/60 border border-surface-container-high rounded-lg p-5 flex gap-5 opacity-70 transition-all">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-slate-600">
            <span className="material-symbols-outlined text-2xl">person_outline</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="bg-slate-700/30 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">
                VISTA
              </span>
              <span className="bg-surface-container-highest text-on-surface-variant text-[11px] font-semibold px-3 py-0.5 rounded-full">
                {categoria}
              </span>
            </div>
            <span className="text-xs text-slate-600">{tiempo}</span>
          </div>
          <p className="text-on-surface-variant leading-relaxed text-[15px] mb-2 italic">
            {texto}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surface-container-highest rounded-lg p-5 flex gap-5 group hover:border-primary/30 transition-all shadow-sm">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-slate-500">
          <span className="material-symbols-outlined text-2xl">person_outline</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">
              NUEVA
            </span>
            <span className="bg-secondary-container text-secondary text-[11px] font-semibold px-3 py-0.5 rounded-full">
              {categoria}
            </span>
          </div>
          <span className="text-xs text-slate-500">{tiempo}</span>
        </div>
        <p className="text-on-surface leading-relaxed text-[15px] mb-4">{texto}</p>
        <div className="flex justify-end">
          <button
            onClick={() => onMarcarVista(id)}
            className="text-xs font-bold text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1.5 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            Marcar como vista
          </button>
        </div>
      </div>
    </div>
  );
}
