interface ArticuloCardProps {
  titulo: string;
  resumen: string;
  tags: string[];
  autor: string;
  autorAvatarUrl?: string;
  imagenUrl?: string;
  votos: number;
  votado: boolean;
  onVotar: () => void;
  onLeerMas: () => void;
}

export default function ArticuloCard({
  titulo,
  resumen,
  tags,
  autor,
  autorAvatarUrl,
  imagenUrl,
  votos,
  votado,
  onVotar,
  onLeerMas,
}: ArticuloCardProps) {
  return (
    <article className="bg-[#2D1B4E] rounded-lg border border-white/5 overflow-hidden hover:border-[#C548F5]/30 transition-all group">
      <div className="flex h-48">
        <div className="w-1/3 overflow-hidden bg-[#1C1030]">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#C548F5]/40">
              <span className="material-symbols-outlined text-5xl">image</span>
            </div>
          )}
        </div>
        <div className="w-2/3 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-headline font-bold text-white">{titulo}</h3>
              <button className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold text-[#F97316] px-2 py-0.5 rounded-full bg-[#F97316]/10 uppercase"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-on-surface-variant text-sm line-clamp-2 mb-4">{resumen}</p>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-2">
              {autorAvatarUrl ? (
                <img src={autorAvatarUrl} alt={autor} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C548F5] to-[#F97316] flex items-center justify-center text-[10px] font-bold text-white">
                  {autor.charAt(0)}
                </div>
              )}
              <span className="text-xs font-medium text-white">{autor}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onVotar}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  votado ? "text-[#F97316]" : "text-on-surface-variant hover:text-[#F97316]"
                }`}
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={votado ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  thumb_up
                </span>
                <span className="font-bold">{votos}</span>
              </button>
              <button
                onClick={onLeerMas}
                className="text-[#C548F5] text-xs font-bold uppercase tracking-wider hover:underline"
              >
                Leer más
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
