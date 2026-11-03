export interface Debate {
  id: string;
  titulo: string;
  participantes: number;
  tiempo: string;
}

interface DebatesWidgetProps {
  debates: Debate[];
  onGestionar: () => void;
}

export default function DebatesWidget({ debates, onGestionar }: DebatesWidgetProps) {
  return (
    <section className="bg-lienzo rounded-lg p-6 border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-acento" />
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-headline font-bold text-white">Debates activos</h3>
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {debates.length} ABIERTOS
        </div>
      </div>
      <div className="space-y-4 mb-6">
        {debates.map((debate) => (
          <div key={debate.id} className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm font-bold text-white mb-1">{debate.titulo}</p>
            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
              <span className="material-symbols-outlined text-xs">person</span>
              {debate.participantes} participantes
              <span className="mx-1">•</span>
              {debate.tiempo}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onGestionar}
        className="w-full py-2 bg-acento/10 hover:bg-acento/20 text-acento text-xs font-bold rounded-full border border-acento/20 transition-colors"
      >
        Gestionar debates
      </button>
    </section>
  );
}
