import { ICONO_POR_TIPO, type RecursoNacional, type Voto } from "./tiposNacional";

interface TarjetaRecursoNacionalProps {
  recurso: RecursoNacional;
  // Voto actual del usuario sobre este recurso
  voto: Voto;
  onVotar: (id: string, tipo: "positivo" | "negativo") => void;
  onAbrir: (id: string) => void;
}

// Tarjeta de recurso de la Biblioteca Nacional.
// Muestra ícono según tipo, materia, escuela origen y acciones de voto (VotarRecurso).
export default function TarjetaRecursoNacional({
  recurso,
  voto,
  onVotar,
  onAbrir,
}: TarjetaRecursoNacionalProps) {
  // Total de positivos mostrado = base + 1 si el usuario votó positivo
  const positivos = recurso.votosPositivos + (voto === "positivo" ? 1 : 0);

  return (
    <div className="bg-[#2D1B4E] rounded-[16px] p-5 flex items-start gap-5 hover:bg-[#341f5a] transition-all border border-transparent hover:border-fuchsia-500/20 group">
      <div className="w-12 h-12 bg-fuchsia-500/10 rounded-xl flex items-center justify-center text-fuchsia-400 group-hover:bg-fuchsia-500 group-hover:text-white transition-all">
        <span className="material-symbols-outlined text-3xl">{ICONO_POR_TIPO[recurso.tipo]}</span>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-headline font-bold text-white text-lg">{recurso.titulo}</h3>

          <div className="flex items-center gap-3">
            {/* VotarPositivo — un solo voto por usuario, se puede alternar */}
            <button
              onClick={() => onVotar(recurso.id, "positivo")}
              aria-pressed={voto === "positivo"}
              className={`flex items-center gap-1 transition-colors ${
                voto === "positivo" ? "text-fuchsia-400" : "text-slate-400 hover:text-fuchsia-400"
              }`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={voto === "positivo" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                thumb_up
              </span>
              <span className="text-xs font-bold">{positivos}</span>
            </button>

            {/* VotarNegativo — un solo voto por usuario, se puede alternar */}
            <button
              onClick={() => onVotar(recurso.id, "negativo")}
              aria-pressed={voto === "negativo"}
              className={`flex items-center gap-1 transition-colors ${
                voto === "negativo" ? "text-fuchsia-400" : "text-slate-400 hover:text-fuchsia-400"
              }`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={voto === "negativo" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                thumb_down
              </span>
            </button>
          </div>
        </div>

        <p className="text-fuchsia-500 font-bold text-xs uppercase tracking-wider mb-1">{recurso.materia}</p>
        <p className="text-slate-400 text-sm mb-4">{recurso.escuela}</p>

        <button
          onClick={() => onAbrir(recurso.id)}
          className="px-6 py-2 border-2 border-fuchsia-500/30 text-fuchsia-300 rounded-full text-sm font-bold hover:bg-fuchsia-500 hover:text-white transition-all active:scale-95"
        >
          Abrir
        </button>
      </div>
    </div>
  );
}
