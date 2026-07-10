import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaMeta from "./components/objetivos/TarjetaMeta";
import TarjetaRacha from "./components/objetivos/TarjetaRacha";
import ResumenCompetenciasCard from "./components/objetivos/ResumenCompetenciasCard";
import type {
  CompetenciaResumen,
  Habito,
  Meta,
} from "./components/objetivos/tiposDashboard";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const METAS_INICIALES: Meta[] = [
  {
    id: "historia",
    materia: "HISTORIA",
    titulo: "Preparar examen de Historia",
    vence: "15 ABR",
    progreso: 60,
    subtareasHechas: 3,
    subtareasTotal: 5,
    iconoDetalle: "checklist",
  },
  {
    id: "frances",
    materia: "IDIOMAS",
    titulo: "Avanzar nivel B2 de Francés",
    vence: "30 MAY",
    progreso: 25,
    subtareasHechas: 2,
    subtareasTotal: 8,
    iconoDetalle: "menu_book",
  },
];

const HABITOS_INICIALES: Habito[] = [
  { id: "lectura", nombre: "Lectura diaria", rachaDias: 7, cumplidoHoy: true, diasVisibles: 9 },
  { id: "repaso", nombre: "Repaso de notas", rachaDias: 3, cumplidoHoy: false, diasVisibles: 9 },
  { id: "meditacion", nombre: "Meditación", rachaDias: 0, cumplidoHoy: false, diasVisibles: 7 },
];

const COMPETENCIAS: CompetenciaResumen[] = [
  { id: "critico", nombre: "Pensamiento Crítico", nivel: "en-desarrollo" },
  { id: "colaboracion", nombre: "Colaboración", nivel: "avanzado" },
  { id: "autogestion", nombre: "Autogestión", nivel: "en-desarrollo" },
];

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
  const [metas] = useState<Meta[]>(METAS_INICIALES);
  const [habitos, setHabitos] = useState<Habito[]>(HABITOS_INICIALES);

  const [usuario] = useState({
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  // Métricas derivadas para el panel diario
  const habitosPendientes = useMemo(
    () => habitos.filter((h) => !h.cumplidoHoy).length,
    [habitos]
  );

  // ── Acciones ──

  // Check-in diario: suma/resta un día a la racha del hábito.
  const toggleHabito = (id: string) => {
    setHabitos((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const cumplidoHoy = !h.cumplidoHoy;
        const rachaDias = cumplidoHoy ? h.rachaDias + 1 : Math.max(0, h.rachaDias - 1);
        return { ...h, cumplidoHoy, rachaDias };
      })
    );
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();
  const abrirMeta = (id: string) => console.log("Abrir meta:", id);
  const registrarHabitosHoy = () => handleNavegar("/objetivos/habitos");
  const verTareasPendientes = () => handleNavegar("/portafolio/mis-tareas");
  const crearObjetivo = () => console.log("Abrir modal: Crear Objetivo");

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        rutaActiva={RUTA_ACTIVA}
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
                  <h2 className="text-2xl font-headline font-bold mb-4">
                    Buenos días, {usuario.nombre.split(" ")[0]} 👋
                  </h2>
                  <p className="text-on-surface-variant max-w-md mb-8 leading-relaxed">
                    Hoy es martes. Tenés <span className="text-white font-bold">3 tareas pendientes</span>{" "}
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
                <div className="grid grid-cols-1 gap-4">
                  {metas.map((meta) => (
                    <TarjetaMeta key={meta.id} meta={meta} onAbrir={abrirMeta} />
                  ))}
                </div>
              </section>
            </div>

            {/* Columna derecha: rachas + competencias */}
            <aside className="w-full lg:w-[350px] space-y-6">
              {/* Mis rachas */}
              <div className="bg-surface-container rounded-lg p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline font-bold flex items-center">
                    Mis rachas <span className="ml-2">🔥</span>
                  </h3>
                  <span className="material-symbols-outlined text-slate-400 text-lg">
                    more_horiz
                  </span>
                </div>
                <div className="space-y-6">
                  {habitos.map((habito) => (
                    <TarjetaRacha key={habito.id} habito={habito} onToggle={toggleHabito} />
                  ))}
                </div>
              </div>

              {/* Competencias */}
              <ResumenCompetenciasCard competencias={COMPETENCIAS} />
            </aside>
          </div>
        </div>

        {/* FAB: nuevo objetivo */}
        <button
          onClick={crearObjetivo}
          aria-label="Crear nuevo objetivo"
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#C548F5] text-white rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(197,72,245,0.4)] hover:scale-105 active:scale-95 transition-all z-50"
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ fontVariationSettings: "'wght' 600" }}
          >
            add
          </span>
        </button>
      </main>
    </div>
  );
}
