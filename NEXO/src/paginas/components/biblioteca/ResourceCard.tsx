export type EstadoRecurso = "verificado" | "revision";

/** Voto propio sobre el recurso, tal como lo devuelve el servidor. */
export type VotoRecurso = "a-favor" | "en-contra" | null;

interface ResourceCardProps {
  title: string;
  category: string;
  icon: string;
  author?: string;
  authorIcon?: string;
  authorFallbackIcon?: string;
  fileType: string;
  fileSize: string;
  estado?: EstadoRecurso;
  onAction?: () => void;
  onLeer?: () => void;
  // Votos reales del recurso (totales de la tabla `votos`, incluyen el propio).
  // Solo se muestran los controles si se pasa `onVotar`.
  votosPositivos?: number;
  votosNegativos?: number;
  miVoto?: VotoRecurso;
  onVotar?: (valor: 1 | -1) => void;
}

// Deriva label + ícono del botón según el tipo de archivo
function accionPorTipo(fileType: string): { label: string; icon: string } {
  switch (fileType.toUpperCase()) {
    case "LINK":
      return { label: "Abrir enlace", icon: "open_in_new" };
    case "DOCX":
      return { label: "Ver guía", icon: "visibility" };
    case "PDF":
    default:
      return { label: "Descargar", icon: "download" };
  }
}

export default function ResourceCard({
  title,
  category,
  icon,
  author,
  authorIcon,
  authorFallbackIcon = "account_balance",
  fileType,
  fileSize,
  estado,
  onAction,
  onLeer,
  votosPositivos = 0,
  votosNegativos = 0,
  miVoto = null,
  onVotar,
}: ResourceCardProps) {
  const accion = accionPorTipo(fileType);
  const esEnlace = fileType.toUpperCase() === "LINK";

  return (
    <div className="group bg-lienzo border border-lienzo hover:border-acento/50 transition-all p-6 rounded-lg flex flex-col gap-4 relative overflow-hidden">
      {estado === "verificado" && (
        <div className="absolute top-0 right-0 p-4">
          <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            VERIFICADO
          </span>
        </div>
      )}

      {estado === "revision" && (
        <div className="absolute top-0 right-0 p-4">
          <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs">pending</span>
            En revisión
          </span>
        </div>
      )}

      <div className="w-12 h-12 bg-fondo rounded-xl flex items-center justify-center text-acento transition-transform">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{category}</span>
        <h3 className="text-xl font-bold font-headline text-white leading-tight">{title}</h3>
      </div>

      {author && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-fondo flex items-center justify-center border border-lienzo overflow-hidden">
            {authorIcon ? (
              <img src={authorIcon} alt={author} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-xs text-gray-400">{authorFallbackIcon}</span>
            )}
          </div>
          <span className="text-xs text-gray-300">{author}</span>
        </div>
      )}

      {/* Votos del recurso (Error 2.E.9): estilo Reddit, un solo puntaje neto
          (a favor − en contra). Flecha arriba y flecha abajo se cancelan entre
          sí; un solo voto por persona, se alterna. El puntaje es real (tabla
          votos) y `miVoto` resalta la flecha. Solo aparece si hay manejador. */}
      {onVotar && (
        <div className="mt-auto flex items-center gap-1 w-fit rounded-full bg-fondo px-2 py-1">
          <button
            onClick={() => onVotar(1)}
            aria-label="Votar a favor"
            aria-pressed={miVoto === "a-favor"}
            className={`flex items-center transition-colors ${
              miVoto === "a-favor" ? "text-acento" : "text-gray-400 hover:text-acento"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={miVoto === "a-favor" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              arrow_upward
            </span>
          </button>
          <span
            className={`min-w-6 text-center text-sm font-bold tabular-nums ${
              miVoto === "a-favor"
                ? "text-acento"
                : miVoto === "en-contra"
                  ? "text-primary"
                  : "text-gray-200"
            }`}
          >
            {votosPositivos - votosNegativos}
          </span>
          <button
            onClick={() => onVotar(-1)}
            aria-label="Votar en contra"
            aria-pressed={miVoto === "en-contra"}
            className={`flex items-center transition-colors ${
              miVoto === "en-contra" ? "text-primary" : "text-gray-400 hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={miVoto === "en-contra" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              arrow_downward
            </span>
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-fondo flex justify-between items-center">
        {onLeer && <button type="button" onClick={onLeer} className="text-acento text-sm">Leer y anotar</button>}
        <span className="text-xs text-gray-500">
          {esEnlace ? "Enlace externo" : `${fileType} • ${fileSize}`}
        </span>
        <button
          onClick={onAction}
          className="text-acento hover:underline text-sm font-bold flex items-center gap-1"
        >
          {accion.label}
          <span className="material-symbols-outlined text-sm">{accion.icon}</span>
        </button>
      </div>
    </div>
  );
}
