export type PosturaVoto = "a-favor" | "en-contra";

export interface Debate {
  id: string;
  titulo: string;
  votosAFavor: number;
  votosEnContra: number;
  comentarios: number;
  tiempo: string;
  abierto: boolean;
  miVoto?: PosturaVoto;
}

interface TarjetaDebateProps {
  debate: Debate;
  onVotar: (id: string, postura: PosturaVoto) => void;
  onParticipar: (id: string) => void;
}

export default function TarjetaDebate({ debate, onVotar, onParticipar }: TarjetaDebateProps) {
  const total = debate.votosAFavor + debate.votosEnContra;
  const pctFavor = total === 0 ? 0 : Math.round((debate.votosAFavor / total) * 100);
  const pctContra = total === 0 ? 0 : 100 - pctFavor;

  return (
    <div className="bg-[#2D1B4E] rounded-[14px] p-6 hover:bg-[#36235b] transition-all border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <span
          className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
            debate.abierto
              ? "bg-orange-500/20 text-orange-400"
              : "bg-white/10 text-white/50"
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">chat</span>
          {debate.abierto ? "Debate abierto" : "Debate cerrado"}
        </span>
        <button className="text-white/40 hover:text-white transition-colors">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      <h3 className="text-xl font-bold text-white mb-6 leading-tight">{debate.titulo}</h3>

      <div className="space-y-4 mb-6">
        {/* A favor */}
        <button
          type="button"
          disabled={!debate.abierto}
          onClick={() => onVotar(debate.id, "a-favor")}
          className="w-full text-left space-y-1 group disabled:cursor-default"
        >
          <div className="flex justify-between text-xs font-medium mb-1">
            <span
              className={`flex items-center gap-1 text-green-400 ${
                debate.miVoto === "a-favor" ? "font-bold" : ""
              }`}
            >
              {debate.miVoto === "a-favor" && (
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
              )}
              A favor ({debate.votosAFavor})
            </span>
            <span className="text-white/60">{pctFavor}%</span>
          </div>
          <div className="w-full bg-[#1C1030] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${pctFavor}%` }}
            />
          </div>
        </button>

        {/* En contra */}
        <button
          type="button"
          disabled={!debate.abierto}
          onClick={() => onVotar(debate.id, "en-contra")}
          className="w-full text-left space-y-1 group disabled:cursor-default"
        >
          <div className="flex justify-between text-xs font-medium mb-1">
            <span
              className={`flex items-center gap-1 text-red-400 ${
                debate.miVoto === "en-contra" ? "font-bold" : ""
              }`}
            >
              {debate.miVoto === "en-contra" && (
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
              )}
              En contra ({debate.votosEnContra})
            </span>
            <span className="text-white/60">{pctContra}%</span>
          </div>
          <div className="w-full bg-[#1C1030] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${pctContra}%` }}
            />
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-4 text-white/60 text-xs">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">mode_comment</span>
            {debate.comentarios} comentarios
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {debate.tiempo}
          </span>
        </div>
        <button
          onClick={() => onParticipar(debate.id)}
          className="border border-[#C548F5] text-[#C548F5] hover:bg-[#C548F5] hover:text-white px-6 py-2 rounded-full text-xs font-bold transition-all"
        >
          Participar
        </button>
      </div>
    </div>
  );
}
