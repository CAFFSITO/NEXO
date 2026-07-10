interface DebateActivoCardProps {
  titulo: string;
  icono: string;
  respuestas: number;
  enVivo: boolean;
  participando: boolean;
  onParticipar: () => void;
}

export default function DebateActivoCard({
  titulo,
  icono,
  respuestas,
  enVivo,
  participando,
  onParticipar,
}: DebateActivoCardProps) {
  return (
    <div className="col-span-12 md:col-span-6 bg-[#2D1B4E] rounded-lg p-8 border border-white/5 flex items-center gap-6 group">
      <div className="w-16 h-16 rounded-full bg-tertiary-container/10 flex items-center justify-center shrink-0 border border-tertiary-container/20">
        <span className="material-symbols-outlined text-tertiary text-3xl">{icono}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">
            Debate Activo
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2 font-headline group-hover:text-tertiary transition-colors">
          {titulo}
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="material-symbols-outlined text-sm text-tertiary">chat_bubble</span>
            <span className="text-sm font-medium">
              {respuestas.toLocaleString("es-AR")} respuestas
            </span>
          </div>
          {enVivo && (
            <>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs text-tertiary font-bold animate-pulse">En vivo</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onParticipar}
        disabled={participando}
        className={`px-5 py-2 rounded-full text-xs font-bold transition-colors uppercase tracking-tight ${
          participando
            ? "bg-tertiary/20 text-tertiary cursor-default"
            : "bg-white/5 text-white hover:bg-white/10"
        }`}
      >
        {participando ? "Participando" : "Participar"}
      </button>
    </div>
  );
}
