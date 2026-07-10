import { ICONO_EMISOR, type Comunicado } from "./tipos";

interface TarjetaComunicadoProps {
  comunicado: Comunicado;
  onMarcarLeido: (id: string) => void;
  onDescargarAdjunto?: (id: string) => void;
}

// Tarjeta de un comunicado del Portal de Familia.
// Cambia de estilo según esté leído o no.
export default function TarjetaComunicado({
  comunicado,
  onMarcarLeido,
  onDescargarAdjunto,
}: TarjetaComunicadoProps) {
  const { id, titulo, fecha, emisor, emisorTipo, adjunto, leido, fechaLeido } = comunicado;
  const iconoEmisor = ICONO_EMISOR[emisorTipo];

  if (leido) {
    // ── Estado: LEÍDO (atenuado) ──
    return (
      <div className="bg-surface-container-low/40 rounded-xl p-5 opacity-60 grayscale-[0.2] transition-all hover:opacity-100 hover:grayscale-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              LEÍDO
            </span>
            <h3 className="text-on-surface font-bold text-lg">{titulo}</h3>
          </div>
          <span className="text-slate-400 text-xs font-medium">{fecha}</span>
        </div>
        <div className="flex items-center gap-2 mb-6 text-slate-400 font-medium text-sm">
          <span className="material-symbols-outlined text-sm">{iconoEmisor}</span>
          <span>{emisor}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span>Leído{fechaLeido ? ` el ${fechaLeido}` : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: NO LEÍDO (destacado) ──
  return (
    <div className="bg-surface-container-low border-l-4 border-[#C548F5] rounded-xl p-5 shadow-lg shadow-black/20 hover:shadow-fuchsia-500/5 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="bg-[#C548F5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            NUEVO
          </span>
          <h3 className="text-on-surface font-bold text-lg">{titulo}</h3>
        </div>
        <span className="text-slate-400 text-xs font-medium">{fecha}</span>
      </div>
      <div className="flex items-center gap-2 mb-6 text-secondary font-medium text-sm">
        <span className="material-symbols-outlined text-sm">{iconoEmisor}</span>
        <span>{emisor}</span>
      </div>
      <div className={`flex items-center ${adjunto ? "justify-between" : "justify-end"}`}>
        {adjunto && (
          <button
            type="button"
            onClick={() => onDescargarAdjunto?.(id)}
            className="flex items-center gap-2 bg-slate-950/50 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined text-fuchsia-400">
              {adjunto.icono ?? "attachment"}
            </span>
            <span className="text-xs text-slate-300">{adjunto.nombre}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onMarcarLeido(id)}
          className="bg-primary-container text-on-primary-container px-4 py-2 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
        >
          Marcar como leído
        </button>
      </div>
    </div>
  );
}
