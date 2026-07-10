interface DebateDestacadoCardProps {
  titulo: string;
  participaciones: number;
  rankingTrending: number;
  avataresParticipantes: string[];
  totalRestante: number;
  unido: boolean;
  onUnirse: () => void;
}

export default function DebateDestacadoCard({
  titulo,
  participaciones,
  rankingTrending,
  avataresParticipantes,
  totalRestante,
  unido,
  onUnirse,
}: DebateDestacadoCardProps) {
  return (
    <div className="col-span-12 lg:col-span-8 bg-[#2D1B4E] rounded-lg overflow-hidden border border-white/5 group relative h-[420px]">
      {/* Fondo decorativo (placeholder del recurso) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#3D2A6B] via-[#2D1B4E] to-[#1C1030] flex items-center justify-center">
        <span className="material-symbols-outlined text-[#C548F5]/20 text-[180px]">
          forum
        </span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#1C1030] via-transparent to-transparent z-10" />

      <div className="absolute top-6 left-6 z-20 flex gap-2">
        <span className="px-3 py-1 bg-[#C548F5] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
          Debate
        </span>
        <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold rounded-full flex items-center gap-1">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          Trending #{rankingTrending}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-8 z-20">
        <h2 className="text-3xl font-extrabold text-white mb-4 font-headline leading-tight max-w-2xl">
          {titulo}
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-lg">forum</span>
            <span className="font-bold text-lg">
              {participaciones >= 1000
                ? `${(participaciones / 1000).toFixed(1)}k`
                : participaciones}
            </span>
            <span className="text-xs text-slate-400 font-medium">participaciones</span>
          </div>
          <div className="flex -space-x-3">
            {avataresParticipantes.map((avatar, i) => (
              <img
                key={i}
                alt="Participante"
                className="w-8 h-8 rounded-full border-2 border-[#2D1B4E] object-cover"
                src={avatar}
              />
            ))}
            {totalRestante > 0 && (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-[#2D1B4E] flex items-center justify-center text-[10px] text-white">
                +{totalRestante >= 1000 ? `${Math.floor(totalRestante / 1000)}k` : totalRestante}
              </div>
            )}
          </div>
          <button
            onClick={onUnirse}
            disabled={unido}
            className={`ml-auto px-6 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
              unido
                ? "bg-surface-container-highest text-slate-300 cursor-default"
                : "bg-[#C548F5] hover:bg-[#d15aff] text-white"
            }`}
          >
            {unido ? "Ya participás" : "Unirse al debate"}
          </button>
        </div>
      </div>
    </div>
  );
}
