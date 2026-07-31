import { usarTendencias } from "../../../servicios/comunidad";

interface SidebarTendenciasProps {
  /** Llevar a la pestaña Tendencias. La dispara la barra entera, cada ítem y el
   *  "Ver todo": todos van al mismo lugar (/comunidad/tendencias). */
  onVer: () => void;
}

// Previsualización de Tendencias en la columna derecha del Feed.
//
// No inventa nada: usa el MISMO servicio real que la pestaña Tendencias
// (usarTendencias → /api/comunidad/tendencias). Muestra un resumen de lo más
// caliente de la propia escuela y, al tocarse, navega a la pestaña completa.
// Si no hay actividad suficiente esta semana, lo dice con honestidad.
export default function SidebarTendencias({ onVer }: SidebarTendenciasProps) {
  // Mismo alcance por defecto que abre la pestaña Tendencias ("Mi escuela").
  const { tendencias, cargando, error } = usarTendencias("mi-escuela");
  const top = (tendencias ?? []).slice(0, 5);

  return (
    <aside className="w-80 shrink-0 hidden xl:block">
      <div className="bg-[#2D1B4E]/30 rounded-[14px] border border-white/5 overflow-hidden sticky top-8">
        {/* Encabezado: también es un acceso a la pestaña completa. */}
        <button
          onClick={onVer}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group"
        >
          <span className="flex items-center gap-2 text-white font-bold">
            <span
              className="material-symbols-outlined text-[#C548F5]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            Tendencias
          </span>
          <span className="material-symbols-outlined text-white/30 text-lg group-hover:text-[#C548F5] transition-colors">
            chevron_right
          </span>
        </button>

        <div className="p-3">
          {cargando ? (
            <p className="text-white/40 text-xs px-3 py-4">Cargando tendencias…</p>
          ) : error ? (
            <p className="text-white/40 text-xs px-3 py-4">
              No se pudieron cargar las tendencias.
            </p>
          ) : top.length === 0 ? (
            <p className="text-white/40 text-xs px-3 py-4">
              Todavía no hay actividad suficiente para calcular tendencias esta semana.
            </p>
          ) : (
            <div className="space-y-1">
              {top.map((t, i) => (
                <button
                  key={`${t.tipo}-${t.id}`}
                  onClick={onVer}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-white/5 transition-colors group"
                >
                  <span className="text-lg font-black text-[#C548F5]/50 w-5 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#C548F5]/80">
                      {t.tipo === "debate" ? "Debate" : "Publicación"}
                    </span>
                    <p className="text-white/90 text-xs font-medium truncate group-hover:text-[#C548F5]">
                      {t.titulo}
                    </p>
                  </div>
                  <span className="flex items-center gap-0.5 text-orange-400 shrink-0 text-[11px] font-bold">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_fire_department
                    </span>
                    {t.puntaje}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ver todo: el tercer acceso a la pestaña Tendencias. */}
        {top.length > 0 && (
          <button
            onClick={onVer}
            className="w-full text-center px-6 py-3 border-t border-white/5 text-xs font-bold text-[#C548F5] hover:bg-[#C548F5]/10 transition-colors"
          >
            Ver todas las tendencias
          </button>
        )}
      </div>
    </aside>
  );
}
