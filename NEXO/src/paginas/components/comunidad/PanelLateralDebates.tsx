export interface Tendencia {
  hashtag: string;
  detalle: string;
}

export interface DebateReciente {
  iniciales: string;
  resumen: string;
  autor: string;
  tiempo: string;
}

interface PanelLateralDebatesProps {
  tendencias: Tendencia[];
  recientes: DebateReciente[];
  onTendenciaClick: (hashtag: string) => void;
}

export default function PanelLateralDebates({
  tendencias,
  recientes,
  onTendenciaClick,
}: PanelLateralDebatesProps) {
  return (
    <aside className="w-80 space-y-6 hidden xl:block">
      {/* Tendencias */}
      <div className="bg-[#2D1B4E]/30 rounded-[14px] p-6 border border-white/5">
        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C548F5]">trending_up</span>
          Tendencias
        </h4>
        <div className="space-y-4">
          {tendencias.map((t) => (
            <button
              key={t.hashtag}
              onClick={() => onTendenciaClick(t.hashtag)}
              className="group cursor-pointer text-left block w-full"
            >
              <p className="text-[#C548F5] text-sm font-bold group-hover:underline">
                {t.hashtag}
              </p>
              <p className="text-white/40 text-[10px]">{t.detalle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Debates recientes */}
      <div className="bg-[#2D1B4E]/30 rounded-[14px] p-6 border border-white/5">
        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C548F5]">history</span>
          Debates recientes
        </h4>
        <div className="space-y-4">
          {recientes.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1C1030] flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0">
                {r.iniciales}
              </div>
              <div>
                <p className="text-white text-xs font-medium line-clamp-2">{r.resumen}</p>
                <p className="text-white/30 text-[10px] mt-1">
                  {r.autor} · {r.tiempo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Próximo evento */}
      <div className="relative overflow-hidden rounded-[14px] p-6 h-48 flex flex-col justify-end group">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#3D2A6B] to-[#1C1030]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1030] via-[#1C1030]/60 to-transparent z-0" />
        <div className="relative z-10">
          <span className="text-[10px] font-black text-[#C548F5] uppercase tracking-widest">
            Mañana · 10:00 AM
          </span>
          <h4 className="text-white font-bold text-lg mt-1">Conferencia Neurociencia</h4>
          <p className="text-white/60 text-xs mt-2">Ponente: Dr. Hans Müller</p>
        </div>
      </div>
    </aside>
  );
}
