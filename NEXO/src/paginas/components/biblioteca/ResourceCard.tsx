export type EstadoRecurso = "verificado" | "revision";

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
}: ResourceCardProps) {
  const accion = accionPorTipo(fileType);
  const esEnlace = fileType.toUpperCase() === "LINK";

  return (
    <div className="group bg-[#2D1B4E] border border-[#2D1B4E] hover:border-[#C548F5]/50 transition-all p-6 rounded-lg flex flex-col gap-4 relative overflow-hidden">
      {estado === "verificado" && (
        <div className="absolute top-0 right-0 p-4">
          <span className="bg-[#2e7d32]/20 text-[#4ade80] text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
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

      <div className="w-12 h-12 bg-[#1C1030] rounded-xl flex items-center justify-center text-[#C548F5] group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{category}</span>
        <h3 className="text-xl font-bold font-headline text-white leading-tight">{title}</h3>
      </div>

      {author && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-[#1C1030] flex items-center justify-center border border-[#2D1B4E] overflow-hidden">
            {authorIcon ? (
              <img src={authorIcon} alt={author} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-xs text-gray-400">{authorFallbackIcon}</span>
            )}
          </div>
          <span className="text-xs text-gray-300">{author}</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[#1C1030] flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {esEnlace ? "Enlace Externo" : `${fileType} • ${fileSize}`}
        </span>
        <button
          onClick={onAction}
          className="text-[#C548F5] hover:underline text-sm font-bold flex items-center gap-1"
        >
          {accion.label}
          <span className="material-symbols-outlined text-sm">{accion.icon}</span>
        </button>
      </div>
    </div>
  );
}
