export interface CategoriaQueja {
  categoria: string;
  cantidad: number;
}

interface QuejasWidgetProps {
  categorias: CategoriaQueja[];
  nuevas: number;
  onVerTodas: () => void;
}

export default function QuejasWidget({ categorias, nuevas, onVerTodas }: QuejasWidgetProps) {
  const maxCantidad = Math.max(...categorias.map((c) => c.cantidad), 1);

  return (
    <section className="bg-[#2D1B4E] rounded-lg p-6 border border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-headline font-bold text-white">Quejas Recientes</h3>
        {nuevas > 0 && (
          <span className="bg-[#B00020] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {nuevas} NUEVAS
          </span>
        )}
      </div>
      <div className="space-y-3 mb-6">
        {categorias.map((c) => (
          <div key={c.categoria} className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant min-w-[90px]">{c.categoria}</span>
            <div className="flex-1 mx-3 h-1 bg-surface-container rounded-full overflow-hidden">
              <div
                className="bg-[#C548F5] h-full transition-all"
                style={{ width: `${(c.cantidad / maxCantidad) * 100}%` }}
              />
            </div>
            <span className="text-white font-bold">{c.cantidad}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onVerTodas}
        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-full border border-white/10 transition-colors"
      >
        Ver todas las quejas
      </button>
    </section>
  );
}
