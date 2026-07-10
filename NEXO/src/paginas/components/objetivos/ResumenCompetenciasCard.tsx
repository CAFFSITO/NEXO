import { LABEL_NIVEL } from "./tiposCompetencia";
import { SEGMENTOS_POR_NIVEL, type CompetenciaResumen } from "./tiposDashboard";

interface ResumenCompetenciasCardProps {
  competencias: CompetenciaResumen[];
}

// Resumen compacto de competencias con escala de 4 segmentos por nivel.
export default function ResumenCompetenciasCard({
  competencias,
}: ResumenCompetenciasCardProps) {
  return (
    <div className="bg-surface-container rounded-lg p-6 border border-white/5">
      <h3 className="font-headline font-bold mb-6">Competencias</h3>

      <div className="space-y-8">
        {competencias.map((comp) => {
          const llenos = SEGMENTOS_POR_NIVEL[comp.nivel];
          return (
            <div key={comp.id}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold">{comp.nombre}</span>
                <span className="text-[10px] font-bold text-violet-400 uppercase">
                  {LABEL_NIVEL[comp.nivel]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full ${
                      i < llenos ? "bg-[#C548F5]" : "bg-surface-container-highest"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>Escala</span>
        <div className="flex gap-2">
          <span>INI</span>
          <span>DES</span>
          <span>AVA</span>
          <span>EXP</span>
        </div>
      </div>
    </div>
  );
}
