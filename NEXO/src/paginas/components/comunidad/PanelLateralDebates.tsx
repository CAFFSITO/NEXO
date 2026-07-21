import { textoRelativo } from "../../../servicios/fechas";
import type { Debate } from "../../../servicios/comunidad";

interface PanelLateralDebatesProps {
  /** Los debates reales, para armar la lista de recientes. */
  debates: Debate[];
  onAbrirDebate: (id: string) => void;
}

// Panel lateral de la pestaña Debates.
//
// Antes tenía tres bloques inventados: unas "Tendencias" con hashtags falsos
// (#NeuroPlasticidad, #HackathonNexo), unos "Debates recientes" de gente que no
// existe (Marco Solís, Lucía Pérez) y una tarjeta de "Conferencia Neurociencia
// con el Dr. Hans Müller mañana a las 10". Los tres se van: los hashtags
// duplicaban la pestaña Tendencias (que ya tiene su lógica real), y los otros
// dos eran datos escritos a mano. Queda un solo bloque, y es real: los debates
// más recientes de la comunidad.
export default function PanelLateralDebates({ debates, onAbrirDebate }: PanelLateralDebatesProps) {
  const recientes = [...debates]
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .slice(0, 5);

  const iniciales = (nombre: string) =>
    nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <aside className="w-80 space-y-6 hidden xl:block">
      <div className="bg-[#2D1B4E]/30 rounded-[14px] p-6 border border-white/5">
        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C548F5]">history</span>
          Debates recientes
        </h4>
        {recientes.length === 0 ? (
          <p className="text-white/40 text-xs">Todavía no hay debates.</p>
        ) : (
          <div className="space-y-4">
            {recientes.map((d) => (
              <button
                key={d.id}
                onClick={() => onAbrirDebate(d.id)}
                className="flex items-start gap-3 text-left w-full group"
              >
                <div className="w-8 h-8 rounded-full bg-[#1C1030] flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0">
                  {iniciales(d.autor)}
                </div>
                <div>
                  <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-[#C548F5]">
                    {d.titulo}
                  </p>
                  <p className="text-white/30 text-[10px] mt-1">
                    {d.autor} · {textoRelativo(d.creadoEn)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
