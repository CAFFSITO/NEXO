import { ICONO_POR_TIPO, type RecursoNacional, type Voto } from "./tiposNacional";

interface TarjetaRecursoNacionalProps {
  recurso: RecursoNacional;
  // Voto actual del usuario sobre este recurso
  voto: Voto;
  onVotar: (id: string, tipo: "positivo" | "negativo") => void;
  onAbrir: (id: string) => void;
  onLeer?: (id: string) => void;
}

// Tarjeta de recurso de la Biblioteca Nacional.
// Muestra ícono según tipo, materia, escuela origen y acciones de voto (VotarRecurso).
export default function TarjetaRecursoNacional({
  recurso,
  voto,
  onVotar,
  onAbrir,
  onLeer,
}: TarjetaRecursoNacionalProps) {
  // Los conteos ya son los totales reales del servidor (incluyen el voto propio);
  // `voto` solo decide el resaltado del botón, no suma ni resta al número.
  const positivos = recurso.votosPositivos;
  const negativos = recurso.votosNegativos;

  return (
    <div className="bg-lienzo rounded-xl p-5 flex items-start gap-5 hover:bg-surface-container-high transition-all border border-transparent hover:border-primary/20 group">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-acento group-hover:text-white transition-all">
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
                voto === "positivo" ? "text-primary" : "text-slate-400 hover:text-primary"
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
                voto === "negativo" ? "text-primary" : "text-slate-400 hover:text-primary"
              }`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={voto === "negativo" ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                thumb_down
              </span>
              <span className="text-xs font-bold">{negativos}</span>
            </button>
          </div>
        </div>

        <p className="text-primary font-bold text-xs uppercase tracking-wider mb-1">{recurso.materia}</p>
        <p className="text-slate-400 text-sm mb-4">{recurso.escuela}</p>

        <button
          onClick={() => onAbrir(recurso.id)}
          className="px-6 py-2 border-2 border-primary/30 text-primary rounded-lg text-sm font-bold hover:bg-acento hover:text-white transition-all"
        >
          Abrir
        </button>
        {onLeer && <button type="button" onClick={() => onLeer(recurso.id)} className="ml-3 text-primary text-sm">Leer y anotar</button>}
      </div>
    </div>
  );
}
