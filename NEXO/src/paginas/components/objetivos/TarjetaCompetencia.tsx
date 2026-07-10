import EscalaCompetencia from "./EscalaCompetencia";
import {
  PALETAS,
  LABEL_NIVEL,
  type Competencia,
  type NivelCompetencia,
} from "./tiposCompetencia";

interface TarjetaCompetenciaProps {
  competencia: Competencia;
  onCambiarNivel: (nivel: NivelCompetencia) => void;
  onAgregarEvidencia: () => void;
  onEliminarEvidencia: (evidenciaId: string) => void;
}

export default function TarjetaCompetencia({
  competencia,
  onCambiarNivel,
  onAgregarEvidencia,
  onEliminarEvidencia,
}: TarjetaCompetenciaProps) {
  const paleta = PALETAS[competencia.color];
  const sinEvidencias = competencia.evidencias.length === 0;

  return (
    <div className="bg-[#2D1B4E] rounded-[20px] p-6 border border-purple-900/20 hover:border-primary/40 transition-all group">
      {/* Header: ícono + nombre + descripción + badge de nivel */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${paleta.iconoBg} ${paleta.iconoText}`}
            >
              <span className="material-symbols-outlined">{competencia.icono}</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-white">{competencia.nombre}</h3>
          </div>
          <p className={`text-xs ml-13 ${paleta.descText}`}>{competencia.descripcion}</p>
        </div>
        <span
          className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${paleta.badgeBg} ${paleta.badgeText} ${paleta.badgeBorder}`}
        >
          {LABEL_NIVEL[competencia.nivel]}
        </span>
      </div>

      {/* Escala de nivel interactiva */}
      <EscalaCompetencia nivel={competencia.nivel} onCambiarNivel={onCambiarNivel} />

      {/* Evidencias */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Evidencias</p>
        <div className="flex flex-wrap gap-2 items-center">
          {sinEvidencias ? (
            <div className="flex items-center gap-2 bg-[#1C1030]/50 border border-dashed border-slate-700 px-3 py-2 rounded-full">
              <span className="text-xs font-medium text-slate-500 italic">
                Sin evidencias registradas
              </span>
            </div>
          ) : (
            competencia.evidencias.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 bg-[#1C1030] border border-purple-500/30 px-3 py-2 rounded-full group/chip"
              >
                <span className={`material-symbols-outlined text-[16px] ${paleta.iconoText}`}>
                  {ev.icono}
                </span>
                <span className="text-xs font-medium text-slate-200">{ev.titulo}</span>
                <button
                  onClick={() => onEliminarEvidencia(ev.id)}
                  className="opacity-0 group-hover/chip:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                  aria-label={`Eliminar evidencia ${ev.titulo}`}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))
          )}
          <button
            onClick={onAgregarEvidencia}
            className="flex items-center gap-1.5 px-3 py-2 text-[#C548F5] hover:bg-[#C548F5]/10 rounded-full transition-colors text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Agregar evidencia
          </button>
        </div>
      </div>
    </div>
  );
}
