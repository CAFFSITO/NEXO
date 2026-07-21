import type { Rol } from "../shared/roles";
import type { Debate, ObjetoVotable } from "../../../servicios/comunidad";
import { textoRelativo } from "../../../servicios/fechas";
import MenuTresPuntos from "./MenuTresPuntos";

export type PosturaVoto = "a-favor" | "en-contra";

interface TarjetaDebateProps {
  debate: Debate;
  rolLector: Rol;
  usuarioId: number;
  onVotar: (id: string, postura: PosturaVoto) => void;
  onParticipar: (id: string) => void;
  onAbrir: (id: string) => void;
  onDenunciar: (tipo: ObjetoVotable, id: string) => void;
  onEliminar: (tipo: ObjetoVotable, id: string) => void;
}

// Tarjeta de debate. Las barras "a favor / en contra" muestran las posturas
// reales de quienes participaron (`debate_participantes`), no números escritos
// a mano ("152 a favor").
//
// Diferencia clave del producto (14.5): las barras son las POSTURAS de los
// participantes. Fijar una postura EXIGE participar primero (Error 2.B.6): quien
// no participó ve el resultado pero las barras no le responden. Recién con
// "Participar" se habilitan "a favor / en contra". El menú de tres puntos y el
// hilo de comentarios son los mismos que en el feed (sección 1.4).
export default function TarjetaDebate({
  debate,
  rolLector,
  usuarioId,
  onVotar,
  onParticipar,
  onAbrir,
  onDenunciar,
  onEliminar,
}: TarjetaDebateProps) {
  const total = debate.votosAFavor + debate.votosEnContra;
  const pctFavor = total === 0 ? 0 : Math.round((debate.votosAFavor / total) * 100);
  const pctContra = total === 0 ? 0 : 100 - pctFavor;
  // Solo se puede fijar postura si ya participó y el debate sigue abierto.
  const puedeFijarPostura = debate.estoyParticipando && debate.abierto;

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
        <MenuTresPuntos
          rol={rolLector}
          objetoTipo="debate"
          objetoId={debate.id}
          esAutor={debate.autorId === String(usuarioId)}
          onDenunciar={onDenunciar}
          onEliminar={onEliminar}
        />
      </div>

      <button
        type="button"
        onClick={() => onAbrir(debate.id)}
        className="text-left w-full"
      >
        <h3 className="text-xl font-bold text-white mb-2 leading-tight hover:text-[#C548F5] transition-colors">
          {debate.titulo}
        </h3>
      </button>
      {debate.descripcion && (
        <p className="text-white/50 text-sm mb-6 line-clamp-2">{debate.descripcion}</p>
      )}

      <div className="space-y-4 mb-6">
        {/* A favor */}
        <button
          type="button"
          disabled={!puedeFijarPostura}
          onClick={() => onVotar(debate.id, "a-favor")}
          className="w-full text-left space-y-1 group disabled:cursor-default"
        >
          <div className="flex justify-between text-xs font-medium mb-1">
            <span
              className={`flex items-center gap-1 text-green-400 ${
                debate.miPostura === "a-favor" ? "font-bold" : ""
              }`}
            >
              {debate.miPostura === "a-favor" && (
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
          disabled={!puedeFijarPostura}
          onClick={() => onVotar(debate.id, "en-contra")}
          className="w-full text-left space-y-1 group disabled:cursor-default"
        >
          <div className="flex justify-between text-xs font-medium mb-1">
            <span
              className={`flex items-center gap-1 text-red-400 ${
                debate.miPostura === "en-contra" ? "font-bold" : ""
              }`}
            >
              {debate.miPostura === "en-contra" && (
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
          <button
            type="button"
            onClick={() => onAbrir(debate.id)}
            className="flex items-center gap-1 hover:text-[#C548F5] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">mode_comment</span>
            {debate.comentarios} comentarios
          </button>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {textoRelativo(debate.creadoEn)}
          </span>
        </div>
        <button
          onClick={() => onParticipar(debate.id)}
          className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
            debate.estoyParticipando
              ? "bg-[#C548F5] text-white"
              : "border border-[#C548F5] text-[#C548F5] hover:bg-[#C548F5] hover:text-white"
          }`}
        >
          {debate.estoyParticipando ? "Participando" : "Participar"}
        </button>
      </div>
    </div>
  );
}
