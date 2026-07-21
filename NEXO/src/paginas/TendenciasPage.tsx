import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import {
  usarTendencias,
  type AlcanceTendencias,
} from "../servicios/comunidad";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

// Toda la pantalla era inventada: cuatro tarjetas fijas (un "debate destacado"
// con 2400 participaciones, un artículo de computación cuántica con 1800
// lecturas, una publicación de "dev_marco") que no salían de ninguna medición.
//
// La lógica real que pedía el Error 2.B.9 ya vive en la base: la vista
// `v_tendencias` calcula un puntaje por objeto de los últimos 7 días (balance de
// votos + posturas nuevas + comentarios). Esta pantalla ahora muestra ese
// ranking. Se conserva la idea visual (un listado de lo que está en tendencia),
// pero cada fila es real y está ordenada por su puntaje verdadero.

// El alcance reemplaza los nombres viejos "Global" y "Mi Red" por lo que de
// verdad significan en un entorno escolar (Error 2.B.10).
const ALCANCES: { valor: AlcanceTendencias; label: string }[] = [
  { valor: "mi-escuela", label: "Mi escuela" },
  { valor: "todas-las-escuelas", label: "Todas las escuelas" },
];

export default function TendenciasPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";

  const [alcance, setAlcance] = useState<AlcanceTendencias>("mi-escuela");
  const { tendencias, cargando, error, recargar } = usarTendencias(alcance);
  const usuarioId = usuario?.id ?? 0;

  // Cada tendencia es pulsable y expandible (Error 2.B.11): abre el detalle
  // completo del debate o de la publicación en tendencia, con su hilo de
  // comentarios. El contenido de otra escuela ("Todas las escuelas") solo se
  // abre si es de la propia comunidad; si no, el detalle lo avisa.
  const [detalle, setDetalle] = useState<{ tipo: "debate" | "publicacion"; id: string } | null>(null);

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Tendencias" />

        {/* Sub-navegación del módulo (Feed / Debates / Tendencias): navegación
            real, para poder ir y volver desde cualquiera (Error 2.B.14). */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {[
            { label: "Feed", ruta: "/comunidad" },
            { label: "Debates", ruta: "/comunidad/debates" },
            { label: "Tendencias", ruta: "/comunidad/tendencias" },
          ].map((t) => (
            <button
              key={t.ruta}
              onClick={() => handleNavegar(t.ruta)}
              className={`pb-1 font-headline text-sm font-medium transition-all ${
                t.ruta === "/comunidad/tendencias"
                  ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#1C1030]">
          <div className="max-w-4xl mx-auto">
            {/* Header + toggle de alcance */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 text-[#C548F5] mb-2">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                  <span className="text-xs font-bold tracking-[0.2em] uppercase">
                    Popular ahora
                  </span>
                </div>
                <h1 className="text-4xl font-extrabold text-white font-headline tracking-tight">
                  Tendencias del momento
                </h1>
              </div>

              <div className="flex bg-surface-container rounded-full p-1 border border-white/5">
                {ALCANCES.map((opcion) => (
                  <button
                    key={opcion.valor}
                    onClick={() => setAlcance(opcion.valor)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                      alcance === opcion.valor
                        ? "bg-[#C548F5] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ranking real */}
            {cargando ? (
              <Cargando que="las tendencias" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : !tendencias || tendencias.length === 0 ? (
              <Vacio
                icono="local_fire_department"
                mensaje="Todavía no hay actividad suficiente para calcular tendencias esta semana."
              />
            ) : (
              <div className="space-y-3">
                {tendencias.map((t, i) => (
                  <button
                    key={`${t.tipo}-${t.id}`}
                    onClick={() => setDetalle({ tipo: t.tipo, id: t.id })}
                    className="w-full text-left bg-[#2D1B4E] hover:bg-[#36235b] rounded-[14px] p-5 border border-white/5 hover:border-[#C548F5]/30 transition-all flex items-center gap-5"
                  >
                    <span className="text-2xl font-black text-[#C548F5]/60 w-8 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C548F5]/15 text-[#C548F5]">
                          {t.tipo === "debate" ? "Debate" : "Publicación"}
                        </span>
                        {alcance === "todas-las-escuelas" && (
                          <span className="text-[10px] text-white/40">{t.institucion}</span>
                        )}
                      </div>
                      <p className="text-white font-medium truncate">{t.titulo}</p>
                    </div>
                    <div className="flex items-center gap-1 text-orange-400 shrink-0">
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        local_fire_department
                      </span>
                      <span className="font-bold text-sm">{t.puntaje}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {detalle && (
        <ModalDetalleComunidad
          tipo={detalle.tipo}
          id={detalle.id}
          rol={rol}
          usuarioId={usuarioId}
          onCerrar={() => setDetalle(null)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}
