import { NIVELES, type NivelCompetencia } from "./tiposCompetencia";

interface EscalaCompetenciaProps {
  nivel: NivelCompetencia;
  onCambiarNivel?: (nivel: NivelCompetencia) => void;
}

// Escala visual Inicial → Experto. El nivel actual se marca en magenta con un punto.
// Si se pasa onCambiarNivel, cada celda es interactiva (subir/bajar de nivel).
export default function EscalaCompetencia({ nivel, onCambiarNivel }: EscalaCompetenciaProps) {
  return (
    <div className="mb-8">
      <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
        Nivel Actual
      </p>
      <div className="grid grid-cols-4 gap-2">
        {NIVELES.map(({ id, label }) => {
          const activo = id === nivel;
          const Cell = onCambiarNivel ? "button" : "div";
          return (
            <Cell
              key={id}
              onClick={onCambiarNivel ? () => onCambiarNivel(id) : undefined}
              className={`relative h-10 rounded-lg flex items-center justify-center text-center text-[10px] font-bold transition-colors ${
                activo
                  ? "bg-[#C548F5] text-white"
                  : "bg-[#1C1030] text-slate-500"
              } ${onCambiarNivel ? "cursor-pointer hover:text-slate-300" : ""}`}
            >
              {label}
              {activo && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#C548F5] rounded-full border-2 border-[#2D1B4E]" />
              )}
            </Cell>
          );
        })}
      </div>
    </div>
  );
}
