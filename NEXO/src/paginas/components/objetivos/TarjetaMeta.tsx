import {
  PALETAS_MATERIA,
  PALETA_MATERIA_DEFAULT,
  type Meta,
} from "./tiposDashboard";

interface TarjetaMetaProps {
  meta: Meta;
  onAbrir?: (id: string) => void;
}

// Tarjeta de meta activa con badge de materia, barra de progreso y subtareas.
export default function TarjetaMeta({ meta, onAbrir }: TarjetaMetaProps) {
  const paleta = PALETAS_MATERIA[meta.materia] ?? PALETA_MATERIA_DEFAULT;

  return (
    <button
      type="button"
      onClick={() => onAbrir?.(meta.id)}
      className="w-full text-left bg-surface-container rounded-lg p-6 border border-white/5 hover:border-[#C548F5]/30 transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <span
            className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold ${paleta.badgeBg} ${paleta.badgeText}`}
          >
            {meta.materia}
          </span>
          <h4 className="font-bold text-lg">{meta.titulo}</h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-medium block">
            VENCE EL {meta.vence}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Progreso actual</span>
          <span className="font-bold text-[#C548F5]">{meta.progreso}%</span>
        </div>
        <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#C548F5] h-full rounded-full shadow-[0_0_8px_rgba(197,72,245,0.5)] transition-all"
            style={{ width: `${meta.progreso}%` }}
          />
        </div>
        <div className="flex items-center text-xs text-on-surface-variant pt-1">
          <span className="material-symbols-outlined text-sm mr-1.5">{meta.iconoDetalle}</span>
          {meta.subtareasHechas} de {meta.subtareasTotal} subtareas completadas
        </div>
      </div>
    </button>
  );
}
