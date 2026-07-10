import {
  PALETAS_MATERIA,
  PALETA_MATERIA_DEFAULT,
  colorUrgencia,
  progresoMeta,
  type MetaGestion,
} from "./tiposDashboard";

interface TarjetaMetaGestionProps {
  meta: MetaGestion;
  diasRestantes: number | null;
  onToggleCompletada: (id: string) => void;
  onAbrir?: (id: string) => void;
}

// Tarjeta de la vista "Gestión de Metas": muestra materia, vencimiento,
// progreso derivado de subtareas y estado (en curso / completada).
export default function TarjetaMetaGestion({
  meta,
  diasRestantes,
  onToggleCompletada,
  onAbrir,
}: TarjetaMetaGestionProps) {
  const paleta = PALETAS_MATERIA[meta.materia] ?? PALETA_MATERIA_DEFAULT;
  const progreso = progresoMeta(meta);
  const completada = meta.estado === "completada";

  return (
    <div
      className={`bg-[#2D1B4E] rounded-[14px] p-6 shadow-2xl border border-white/5 flex flex-col transition-all ${
        completada
          ? "bg-[#2D1B4E]/60 opacity-90 grayscale-[0.2] hover:grayscale-0"
          : "hover:border-[#C548F5]/30"
      }`}
    >
      {/* ── Header: materia + estado + vencimiento ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1 text-[10px] font-black rounded-full tracking-wider ${paleta.badgeBg} ${paleta.badgeText}`}
          >
            {meta.materia}
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
        </div>
        <div className="flex flex-col items-end gap-1">
          {!completada && (
            <span
              className={`text-[10px] font-bold uppercase ${colorUrgencia(diasRestantes)}`}
            >
              VENCE EL {meta.vence}
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
              {meta.subtareasHechas}/{meta.subtareasTotal} {meta.unidadSubtarea}
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

      {/* ── Pie: colaboradores / recursos / finalización ── */}
      <div className="mt-8 flex items-center justify-between">
        {completada ? (
          <>
            <span className="text-[10px] text-gray-500">
              Finalizado el {meta.finalizadoEl}
            </span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-emerald-400 text-xs"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            </div>
          </>
        ) : meta.colaboradores > 0 ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-gray-500">group</span>
            <span className="text-[10px] text-gray-500">
              {meta.colaboradores} colaboradores
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-gray-500">attachment</span>
            <span className="text-[10px] text-gray-500">{meta.recursos} recursos</span>
          </div>
        )}
        {!completada && (
          <span className="px-2 py-0.5 bg-background rounded text-[10px] text-gray-400">
            En curso
          </span>
        )}
      </div>
    </div>
  );
}
