import { badgeDeMeta, paletaDeMateria, progresoDeMeta } from "./tiposDashboard";
import type { Meta } from "../../../servicios/objetivos";
import { fechaCorta } from "../../../servicios/fechas";

interface TarjetaMetaGestionProps {
  meta: Meta;
  /** Días hasta el vencimiento. Negativo = vencida. Lo calcula la página con el
      calculador único, para que sea el mismo número en toda la aplicación. */
  diasRestantes: number | null;
  onToggleCompletada: (id: string) => void;
  onAbrir?: (id: string) => void;
}

// Tarjeta de la vista "Gestión de Metas": muestra materia, vencimiento,
// progreso derivado de subtareas y estado (en curso / completada / vencida).
//
// Cambios de la Etapa 2:
//   · El progreso se cuenta de las subtareas; no viene escrito al lado (2.D.15).
//   · Una meta vencida se ve vencida — antes no existía ese estado y una meta
//     atrasada figuraba "en marcha" (2.D.14).
//   · Se fueron "colaboradores" y "recursos", que eran números inventados sin
//     respaldo en la base; el pie muestra las subtareas, que sí existen.
export default function TarjetaMetaGestion({
  meta,
  diasRestantes,
  onToggleCompletada,
  onAbrir,
}: TarjetaMetaGestionProps) {
  const etiqueta = badgeDeMeta(meta.materia, meta.categoria);
  const paleta = paletaDeMateria(etiqueta);
  const progreso = progresoDeMeta(meta);
  const completada = meta.estado === "completada";
  const vencida = !completada && diasRestantes !== null && diasRestantes < 0;

  const colorVence = vencida
    ? "text-red-400"
    : diasRestantes !== null && diasRestantes < 3
      ? "text-red-400"
      : diasRestantes !== null && diasRestantes <= 7
        ? "text-yellow-400"
        : "text-emerald-400";

  return (
    <div
      className={`bg-[#2D1B4E] rounded-[14px] p-6 shadow-2xl border flex flex-col transition-all ${
        completada
          ? "bg-[#2D1B4E]/60 opacity-90 grayscale-[0.2] hover:grayscale-0 border-white/5"
          : vencida
            ? "border-red-500/40 hover:border-red-500"
            : "border-white/5 hover:border-[#C548F5]/30"
      }`}
    >
      {/* ── Header: materia + estado + vencimiento ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1 text-[10px] font-black rounded-full tracking-wider ${paleta.badgeBg} ${paleta.badgeText}`}
          >
            {etiqueta}
          </span>
          {completada && (
            <span className="px-3 py-1 bg-emerald-500 text-background text-[10px] font-black rounded-full tracking-wider flex items-center gap-1">
              COMPLETADA
              <span
                className="material-symbols-outlined text-[10px]"
                style={{ fontVariationSettings: "'wght' 700" }}
              >
                check
              </span>
            </span>
          )}
          {vencida && (
            <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full tracking-wider">
              VENCIDA
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!completada && (
            <span className={`text-[10px] font-bold uppercase ${colorVence}`}>
              VENCE EL {fechaCorta(meta.venceEl).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleCompletada(meta.id)}
            title={completada ? "Reabrir meta" : "Marcar como completada"}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">
              {completada ? "restart_alt" : "task_alt"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Título + progreso ── */}
      <div className="flex-1">
        <button
          type="button"
          onClick={() => onAbrir?.(meta.id)}
          className={`text-left text-lg font-bold headline-font mb-6 transition-colors ${
            completada
              ? "text-gray-400 line-through decoration-emerald-500/50 decoration-2"
              : "text-white hover:text-[#C548F5]"
          }`}
        >
          {meta.titulo}
        </button>
        <div className="space-y-4">
          <div className="flex justify-between items-end mb-1">
            <span
              className={`text-xs font-medium italic ${
                completada ? "text-emerald-400" : "text-gray-400"
              }`}
            >
              {meta.subtareasHechas}/{meta.subtareasTotal} subtareas
            </span>
            <span
              className={`text-xs font-bold ${
                completada ? "text-emerald-400" : "text-[#C548F5]"
              }`}
            >
              {progreso}%
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completada
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : "bg-[#C548F5] shadow-[0_0_8px_rgba(197,72,245,0.6)]"
              }`}
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Pie: unidad / materia / finalización ── */}
      <div className="mt-8 flex items-center justify-between">
        {completada ? (
          <span className="text-[10px] text-gray-500">
            Finalizada el {fechaCorta(meta.completadaEn)}
          </span>
        ) : meta.unidad ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-gray-500">book</span>
            <span className="text-[10px] text-gray-500">{meta.unidad}</span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-500">{meta.categoria}</span>
        )}
        {!completada && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] ${
              vencida ? "bg-red-500/20 text-red-400" : "bg-background text-gray-400"
            }`}
          >
            {vencida ? "Atrasada" : "En curso"}
          </span>
        )}
      </div>
    </div>
  );
}
