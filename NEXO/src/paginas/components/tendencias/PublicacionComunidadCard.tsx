interface PublicacionComunidadCardProps {
  titulo: string;
  icono: string;
  likes: number;
  autor: string;
  guardado: boolean;
  onToggleGuardado: () => void;
  onLike?: () => void;
}

export default function PublicacionComunidadCard({
  titulo,
  icono,
  likes,
  autor,
  guardado,
  onToggleGuardado,
  onLike,
}: PublicacionComunidadCardProps) {
  return (
    <div className="col-span-12 md:col-span-6 bg-[#2D1B4E] rounded-lg p-8 border border-white/5 flex items-center gap-6 group">
      <div className="w-16 h-16 rounded-full bg-[#C548F5]/10 flex items-center justify-center shrink-0 border border-[#C548F5]/20">
        <span className="material-symbols-outlined text-[#C548F5] text-3xl">{icono}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-[#C548F5] uppercase tracking-widest">
            Publicación de Comunidad
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2 font-headline group-hover:text-[#C548F5] transition-colors">
          {titulo}
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            disabled={!onLike}
            className="flex items-center gap-1.5 text-slate-400 hover:text-[#C548F5] transition-colors disabled:cursor-default disabled:hover:text-slate-400"
          >
            <span
              className="material-symbols-outlined text-sm text-[#C548F5]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            <span className="text-sm font-medium">
              {likes.toLocaleString("es-AR")} likes
            </span>
          </button>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-slate-400 text-xs">Publicado por @{autor}</span>
        </div>
      </div>
      <button
        onClick={onToggleGuardado}
        aria-pressed={guardado}
        title={guardado ? "Quitar de guardados" : "Guardar"}
        className="p-2 rounded-full border border-white/5 hover:bg-white/5 transition-colors"
      >
        <span
          className="material-symbols-outlined text-slate-400"
          style={guardado ? { fontVariationSettings: "'FILL' 1", color: "#C548F5" } : undefined}
        >
          bookmark
        </span>
      </button>
    </div>
  );
}
