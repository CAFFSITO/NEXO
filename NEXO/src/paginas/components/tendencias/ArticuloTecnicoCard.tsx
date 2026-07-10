interface ArticuloTecnicoCardProps {
  titulo: string;
  descripcion: string;
  lecturas: number;
  icono: string;
  onAbrir: () => void;
}

export default function ArticuloTecnicoCard({
  titulo,
  descripcion,
  lecturas,
  icono,
  onAbrir,
}: ArticuloTecnicoCardProps) {
  const lecturasLabel =
    lecturas >= 1000 ? `${(lecturas / 1000).toFixed(1)}k` : `${lecturas}`;

  return (
    <button
      onClick={onAbrir}
      className="col-span-12 lg:col-span-4 bg-[#2D1B4E] rounded-lg p-6 border border-white/5 flex flex-col group h-[420px] text-left w-full"
    >
      <div className="mb-4">
        <span className="px-3 py-1 bg-surface-container-highest text-[#d2bcfa] text-[10px] font-bold rounded-full uppercase tracking-wider">
          Artículo Técnico
        </span>
      </div>
      <div className="flex-1">
        {/* Portada (placeholder del recurso) */}
        <div className="w-full h-40 rounded-lg mb-6 border border-white/10 bg-gradient-to-br from-[#3D2A6B] to-[#1C1030] flex items-center justify-center group-hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-[#C548F5]/40 text-6xl">
            {icono}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-3 font-headline leading-snug group-hover:text-[#C548F5] transition-colors">
          {titulo}
        </h3>
        <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
          {descripcion}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span className="text-sm font-semibold">{lecturasLabel} lecturas</span>
        </div>
        <span className="material-symbols-outlined text-[#C548F5] group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </button>
  );
}
