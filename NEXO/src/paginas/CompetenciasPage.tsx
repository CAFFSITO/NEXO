import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCompetencia from "./components/objetivos/TarjetaCompetencia";
import ModalAgregarEvidencia, {
  type TrabajoDisponible,
} from "./components/objetivos/ModalAgregarEvidencia";
import type {
  Competencia,
  Evidencia,
  NivelCompetencia,
} from "./components/objetivos/tiposCompetencia";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const COMPETENCIAS_INICIALES: Competencia[] = [
  {
    id: "pensamiento-critico",
    nombre: "Pensamiento Crítico",
    descripcion: "Analizar y evaluar la consistencia de los razonamientos.",
    icono: "psychology",
    color: "purple",
    nivel: "en-desarrollo",
    evidencias: [{ id: "e1", titulo: "Debate sobre microbiota", icono: "article" }],
  },
  {
    id: "colaboracion",
    nombre: "Colaboración",
    descripcion: "Trabajar de manera efectiva con otros hacia una meta común.",
    icono: "groups",
    color: "blue",
    nivel: "avanzado",
    evidencias: [{ id: "e2", titulo: "Trabajo grupal Biología", icono: "folder_shared" }],
  },
  {
    id: "autogestion",
    nombre: "Autogestión",
    descripcion: "Organizar y priorizar tareas para alcanzar objetivos.",
    icono: "bolt",
    color: "amber",
    nivel: "en-desarrollo",
    evidencias: [],
  },
  {
    id: "comunicacion",
    nombre: "Comunicación",
    descripcion: "Expresar ideas de forma clara y asertiva en diversos medios.",
    icono: "forum",
    color: "teal",
    nivel: "inicial",
    evidencias: [],
  },
];

// Trabajos del Portafolio disponibles para vincular como evidencia
const TRABAJOS_DISPONIBLES: TrabajoDisponible[] = [
  { id: "t1", titulo: "Ensayo de Historia Argentina", icono: "description" },
  { id: "t2", titulo: "Proyecto de Física Aplicada", icono: "science" },
  { id: "t3", titulo: "Exposición oral de Lengua", icono: "record_voice_over" },
  { id: "t4", titulo: "Informe de laboratorio Química", icono: "biotech" },
];

// Sub-navegación del módulo Objetivos
const SUBNAV = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

// ─── PÁGINA ─────────────────────────────────────────────

export default function CompetenciasPage() {
  const [competencias, setCompetencias] = useState<Competencia[]>(COMPETENCIAS_INICIALES);
  const [competenciaActivaId, setCompetenciaActivaId] = useState<string | null>(null);

  const [usuario] = useState({
    nombre: "Mateo García",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mateo",
  });

  const competenciaActiva = competencias.find((c) => c.id === competenciaActivaId) ?? null;

  // ── Acciones ──

  const cambiarNivel = (competenciaId: string, nivel: NivelCompetencia) => {
    setCompetencias((prev) =>
      prev.map((c) => (c.id === competenciaId ? { ...c, nivel } : c))
    );
  };

  const eliminarEvidencia = (competenciaId: string, evidenciaId: string) => {
    setCompetencias((prev) =>
      prev.map((c) =>
        c.id === competenciaId
          ? { ...c, evidencias: c.evidencias.filter((e) => e.id !== evidenciaId) }
          : c
      )
    );
  };

  const guardarEvidencia = (evidencia: Evidencia) => {
    if (!competenciaActivaId) return;
    setCompetencias((prev) =>
      prev.map((c) =>
        c.id === competenciaActivaId
          ? { ...c, evidencias: [...c.evidencias, evidencia] }
          : c
      )
    );
    setCompetenciaActivaId(null);
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();
  const analizarConIA = () => console.log("Analizando perfil de competencias con IA…");

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/objetivos"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Objetivos Personales" subtitle="Competencias" />

        {/* Sub-navegación del módulo */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {SUBNAV.map((tab) => {
            const activa = tab.ruta === "/objetivos/competencias";
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

        <div className="flex-1 overflow-y-auto px-10 pt-8 pb-12 bg-[#190d2d]">
          {/* Encabezado */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold font-headline text-white mb-2">Mis Competencias</h1>
            <p className="text-slate-400 font-medium">
              Registrá y evidenciá tu desarrollo académico y personal
            </p>
          </div>

          {/* Matriz de competencias */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {competencias.map((competencia) => (
              <TarjetaCompetencia
                key={competencia.id}
                competencia={competencia}
                onCambiarNivel={(nivel) => cambiarNivel(competencia.id, nivel)}
                onAgregarEvidencia={() => setCompetenciaActivaId(competencia.id)}
                onEliminarEvidencia={(evidenciaId) =>
                  eliminarEvidencia(competencia.id, evidenciaId)
                }
              />
            ))}
          </div>

          {/* Banner IA */}
          <section className="mt-12 bg-gradient-to-r from-[#2D1B4E] to-[#1C1030] p-8 rounded-[2rem] border border-purple-500/10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-bold font-headline text-white mb-3">
                  Tu potencial no tiene límites
                </h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  NEXO utiliza Inteligencia Artificial para analizar tus evidencias y sugerirte las
                  mejores estrategias para alcanzar el nivel "Experto" en tus competencias.
                </p>
                <button
                  onClick={analizarConIA}
                  className="bg-[#C548F5] hover:bg-[#b039df] text-white px-8 py-3 rounded-full font-bold text-sm transition-all shadow-lg shadow-[#C548F5]/20"
                >
                  Analizar mi Perfil con IA
                </button>
              </div>
              <div className="relative w-full md:w-64 h-48 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#C548F5]/30 to-[#4900a6]/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/80 text-7xl">auto_awesome</span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1030] to-transparent" />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Modal de evidencia */}
      {competenciaActiva && (
        <ModalAgregarEvidencia
          competenciaNombre={competenciaActiva.nombre}
          trabajos={TRABAJOS_DISPONIBLES}
          onGuardar={guardarEvidencia}
          onCerrar={() => setCompetenciaActivaId(null)}
        />
      )}
    </div>
  );
}
