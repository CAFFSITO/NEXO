import { badgeDeMeta, paletaDeMateria, progresoDeMeta } from "./tiposDashboard";
import type { Meta } from "../../../servicios/objetivos";
import { estaVencida, fechaCorta, textoVencimiento } from "../../../servicios/fechas";

interface TarjetaMetaProps {
  meta: Meta;
  onAbrir?: (id: string) => void;
}

// Tarjeta de meta activa con badge de materia, barra de progreso y subtareas.
//
// El progreso ya no viene escrito al lado del "3 de 5": se cuenta de las
// subtareas, así que los dos números no pueden discrepar (Error 2.D.15).
export default function TarjetaMeta({ meta, onAbrir }: TarjetaMetaProps) {
  const etiqueta = badgeDeMeta(meta.materia, meta.categoria);
  const paleta = paletaDeMateria(etiqueta);
  const progreso = progresoDeMeta(meta);
  // Una meta cuya fecha pasó está vencida y se ve vencida. Antes la aplicación
  // suponía que una fecha pasada era del año que viene y mostraba "quedan 286
  // días" sobre una meta atrasada (Error 2.D.14).
  const vencida = meta.estado === "en-curso" && estaVencida(meta.venceEl);

  return (
    <button
      type="button"
      onClick={() => onAbrir?.(meta.id)}
      className={`w-full text-left bg-surface-container rounded-lg p-6 border transition-all ${
        vencida
          ? "border-red-500/40 hover:border-red-500"
          : "border-white/5 hover:border-[#C548F5]/30"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <span
            className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold ${paleta.badgeBg} ${paleta.badgeText}`}
          >
            {etiqueta}
          </span>
          <h4 className="font-bold text-lg">{meta.titulo}</h4>
        </div>
        <div className="text-right">
          <span
            className={`text-[10px] font-medium block ${
              vencida ? "text-red-400 font-bold" : "text-slate-400"
            }`}
          >
            VENCE EL {fechaCorta(meta.venceEl).toUpperCase()}
          </span>
          <span className={`text-[10px] ${vencida ? "text-red-400" : "text-slate-500"}`}>
            {textoVencimiento(meta.venceEl)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Progreso actual</span>
          <span className="font-bold text-[#C548F5]">{progreso}%</span>
        </div>
        <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#C548F5] h-full rounded-full shadow-[0_0_8px_rgba(197,72,245,0.5)] transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <div className="flex items-center text-xs text-on-surface-variant pt-1">
          <span className="material-symbols-outlined text-sm mr-1.5">checklist</span>
          {meta.subtareasHechas} de {meta.subtareasTotal} subtareas completadas
        </div>
      </div>
    </button>
  );
}
