import { useMemo } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaMeta from "./components/objetivos/TarjetaMeta";
import TarjetaRacha from "./components/objetivos/TarjetaRacha";
import ResumenCompetenciasCard from "./components/objetivos/ResumenCompetenciasCard";
import { usarObjetivos, registrarHabito } from "../servicios/objetivos";
import { usarPortafolio } from "../servicios/portafolio";
import { diaDeHoy, saludoSegunLaHora } from "../servicios/fechas";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Se fueron de acá: dos metas, tres hábitos y tres competencias inventados. Los
// tres hábitos eran, además, una versión distinta de los cuatro que mostraba la
// sección Hábitos, con rachas distintas para el mismo hábito (Error 13.5).

// Sub-navegación del módulo Objetivos
const SUBNAV = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

const RUTA_ACTIVA = "/objetivos";

// ─── PÁGINA ─────────────────────────────────────────────

export default function DashboardObjetivosPage() {
  const { datos, cargando, error, recargar } = usarObjetivos();

  // El Dashboard pide TAMBIÉN el portafolio, que es de donde salen las tareas
  // pendientes del saludo. Es la misma ventanilla que usa Mis Tareas: por eso
  // el número del saludo y el de Mis Tareas no pueden discrepar, que es lo que
  // pide el Error 2.D.13 ("leída de la misma información que usa Mis Tareas").
  const { datos: portafolio } = usarPortafolio();

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  const metas = useMemo(
    // El Dashboard muestra las metas ACTIVAS: una meta ya completada no es algo
    // que haya que seguir mirando en la portada.
    () => (datos?.metas ?? []).filter((m) => m.estado === "en-curso"),
    [datos]
  );
  const habitos = useMemo(() => datos?.habitos ?? [], [datos]);

  // Métricas derivadas para el panel diario
  const habitosPendientes = useMemo(
    () => habitos.filter((h) => !h.cumplidoHoy).length,
    [habitos]
  );

  // Todo lo que todavía no entregaste. El panel decía "3 tareas pendientes"
  // con el 3 escrito a mano.
  const tareasPendientes = useMemo(
    () => (portafolio?.tareas ?? []).filter((t) => t.estado !== "entregada").length,
    [portafolio]
  );

  // ── Acciones ──
  // El check de "Mis rachas" registra el hábito con el MISMO servicio que usa
  // la sección Hábitos (registrarHabito → /api/objetivos): marcarlo acá o allá
  // es exactamente lo mismo, así que las dos pantallas no pueden discrepar
  // (Errores 2.D.1 y 13.5).
  const toggleHabito = async (id: string) => {
    const h = habitos.find((x) => x.id === id);
    if (!h) return;
    try {
      await registrarHabito(id, !h.cumplidoHoy);
      recargar();
    } catch {
      // El estado real lo dice el servidor: recargar muestra lo que quedó.
      recargar();
    }
  };

  // Abrir una meta = ir a Mis Metas, donde vive su detalle y edición.
  const abrirMeta = () => handleNavegar("/objetivos/metas");
  const registrarHabitosHoy = () => handleNavegar("/objetivos/habitos");
  const verTareasPendientes = () => handleNavegar("/portafolio/mis-tareas");

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Objetivos Personales" subtitle="Dashboard" />

        {/* Sub-navegación del módulo */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {SUBNAV.map((tab) => {
            const activa = tab.ruta === RUTA_ACTIVA;
            return (
              <button
                key={tab.ruta}
                onClick={() => handleNavegar(tab.ruta)}
                className={`pb-1 font-headline text-sm font-medium transition-all ${
                  activa
                    ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Columna izquierda: panel diario + metas */}
            <div className="flex-1 space-y-8">
              {/* Panel diario */}
              <section className="relative overflow-hidden rounded-lg p-8 bg-gradient-to-br from-[#2D1B4E] to-[#1C1030] border border-[#C548F5]/20">
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#C548F5]/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-4">
                    <span
                      className="material-symbols-outlined text-[#C548F5]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="text-[#C548F5] font-bold text-xs tracking-widest uppercase">
                      Panel diario
                    </span>
                  </div>
                  {/* El saludo decía "Buenos días" a las diez de la noche y
                      "Hoy es martes" los siete días de la semana, y las "3
                      tareas pendientes" eran un 3 escrito a mano (Error
                      2.D.13). Ahora las cuatro cosas son ciertas: el saludo
                      mira la hora, el día es el día, y las tareas se cuentan
                      del portafolio — el mismo que muestra Mis Tareas. */}
                  <h2 className="text-2xl font-headline font-bold mb-4">
                    {saludoSegunLaHora()}, {usuario.nombre.split(" ")[0]} 👋
                  </h2>
                  <p className="text-on-surface-variant max-w-md mb-8 leading-relaxed">
                    Hoy es {diaDeHoy()}. Tenés{" "}
                    <span className="text-white font-bold">
                      {tareasPendientes} {tareasPendientes === 1 ? "tarea pendiente" : "tareas pendientes"}
                    </span>{" "}
                    y{" "}
                    <span className="text-white font-bold">
                      {habitosPendientes} {habitosPendientes === 1 ? "hábito" : "hábitos"}
                    </span>{" "}
                    por registrar.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={registrarHabitosHoy}
                      className="px-5 py-2.5 border border-[#C548F5] text-[#C548F5] rounded-full text-sm font-bold hover:bg-[#C548F5]/10 transition-colors"
                    >
                      Registrar hábitos de hoy
                    </button>
                    <button
                      onClick={verTareasPendientes}
                      className="px-5 py-2.5 border border-slate-600 text-slate-300 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors"
                    >
                      Ver tareas pendientes
                    </button>
                  </div>
                </div>
              </section>

              {/* Metas activas */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h3 className="text-xl font-headline font-bold">Metas activas</h3>
                  <button
                    onClick={() => handleNavegar("/objetivos/metas")}
                    className="text-xs font-bold text-[#C548F5] hover:underline tracking-tighter"
                  >
                    VER TODAS
                  </button>
                </div>
                {cargando ? (
                  <Cargando que="tus metas" />
                ) : error ? (
                  <Fallo error={error} onReintentar={recargar} />
                ) : metas.length === 0 ? (
                  <p className="text-slate-400 text-sm">No tenés metas en curso.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {metas.map((meta) => (
                      <TarjetaMeta key={meta.id} meta={meta} onAbrir={abrirMeta} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Columna derecha: rachas + competencias */}
            <aside className="w-full lg:w-[350px] space-y-6">
              {/* Mis rachas. Muestra los MISMOS hábitos que la sección Hábitos,
                  traídos de la misma ventanilla: es la vista resumida de lo que
                  pasa ahí, no una isla aparte (Errores 2.D.1 y 13.5). */}
              <div className="bg-surface-container rounded-lg p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline font-bold flex items-center">
                    Mis rachas <span className="ml-2">🔥</span>
                  </h3>
                  <button
                    onClick={registrarHabitosHoy}
                    className="text-xs font-bold text-[#C548F5] hover:underline tracking-tighter"
                  >
                    VER TODOS
                  </button>
                </div>
                <div className="space-y-6">
                  {habitos.length === 0 && !cargando ? (
                    <p className="text-slate-400 text-sm">Todavía no tenés hábitos.</p>
                  ) : (
                    habitos.map((habito) => (
                      <TarjetaRacha key={habito.id} habito={habito} onToggle={toggleHabito} />
                    ))
                  )}
                </div>
              </div>

              {/* Competencias */}
              <ResumenCompetenciasCard competencias={datos?.competencias ?? []} />
            </aside>
          </div>
        </div>

        {/* Acá vivía un botón flotante "+" que no hacía absolutamente nada: su
            único efecto era escribir una línea invisible en la consola. Se
            elimina, como pide el Error 2.D.4 — crear metas ya vive en Mis
            Metas, así que el botón no tenía ni siquiera un lugar al que ir. */}
      </main>
    </div>
  );
}
