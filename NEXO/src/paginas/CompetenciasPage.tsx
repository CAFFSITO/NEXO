import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCompetencia from "./components/objetivos/TarjetaCompetencia";
import ModalAgregarEvidencia, {
  type TrabajoDisponible,
} from "./components/objetivos/ModalAgregarEvidencia";
import {
  colorDeCompetencia,
  type Competencia,
} from "./components/objetivos/tiposCompetencia";
import {
  usarObjetivos,
  cambiarNivelCompetencia,
  eliminarEvidencia,
  type NivelCompetencia,
} from "../servicios/objetivos";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Se fueron las cuatro competencias inventadas. Una de ellas, "Comunicación",
// tenía nivel "inicial", un valor que la base rechaza (la escala real es
// iniciado → dominado). Ahora las competencias salen de `competencia_avances`:
// solo aparecen las que el estudiante de verdad empezó, con su nivel real.

// Un ícono por competencia según su nombre. El ícono es decoración, no un dato
// del colegio: no tiene sentido guardarlo en la base.
const ICONOS: Record<string, string> = {
  "Pensamiento Crítico": "psychology",
  "Análisis de fuentes": "search",
  Argumentación: "forum",
  Colaboración: "groups",
  "Trabajo en equipo": "diversity_3",
  Autogestión: "bolt",
};

// Sub-navegación del módulo Objetivos
const SUBNAV = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

// El selector de "agregar evidencia" se conecta al portafolio en la Etapa 5
// (por eso va vacío por ahora: sin escritura, no hay a dónde guardar).
const TRABAJOS_DISPONIBLES: TrabajoDisponible[] = [];

// ─── PÁGINA ─────────────────────────────────────────────

export default function CompetenciasPage() {
  const { datos, cargando, error, recargar } = usarObjetivos();
  const [competenciaActivaId, setCompetenciaActivaId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  // Cada competencia de la base, vestida para la tarjeta: su ícono y su color
  // se eligen de forma estable por nombre.
  const competencias = useMemo<Competencia[]>(() => {
    return (datos?.competencias ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      icono: ICONOS[c.nombre] ?? "workspace_premium",
      color: colorDeCompetencia(c.nombre),
      nivel: c.nivel,
      evidencias: c.evidencias.map((e) => ({ id: e.id, titulo: e.titulo })),
    }));
  }, [datos]);

  const competenciaActiva = competencias.find((c) => c.id === competenciaActivaId) ?? null;

  // ── Acciones ──
  // Cambiar el nivel y borrar una evidencia son escritura real contra nexo.db
  // (Error 2.D.12): antes solo tocaban la memoria de la pantalla y se perdían al
  // cambiar de sección. Ahora persisten y la lista se refresca desde el servidor.
  const cambiarNivel = async (competenciaId: string, nivel: NivelCompetencia) => {
    setAviso(null);
    try {
      await cambiarNivelCompetencia(competenciaId, nivel);
      recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo cambiar el nivel.");
    }
  };

  const quitarEvidencia = async (evidenciaId: string) => {
    setAviso(null);
    try {
      await eliminarEvidencia(evidenciaId);
      recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo borrar la evidencia.");
    }
  };

  const guardarEvidencia = () => setCompetenciaActivaId(null);

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
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

          {aviso && (
            <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {aviso}
            </div>
          )}

          {/* Matriz de competencias */}
          {cargando ? (
            <Cargando que="tus competencias" />
          ) : error ? (
            <Fallo error={error} onReintentar={recargar} />
          ) : competencias.length === 0 ? (
            <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
                workspace_premium
              </span>
              <p className="text-slate-400 text-sm">
                Todavía no empezaste a trabajar ninguna competencia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {competencias.map((competencia) => (
                <TarjetaCompetencia
                  key={competencia.id}
                  competencia={competencia}
                  onCambiarNivel={(nivel) => cambiarNivel(competencia.id, nivel)}
                  onAgregarEvidencia={() => setCompetenciaActivaId(competencia.id)}
                  onEliminarEvidencia={quitarEvidencia}
                />
              ))}
            </div>
          )}

          {/* Acá había un banner que ofrecía "Analizar mi Perfil con IA" para
              alcanzar el nivel "Experto". Se saca en esta etapa por dos motivos:
              no hay IA real detrás (el botón solo escribía en la consola, y la
              IA real es la Etapa 8), y "Experto" no es un nivel de la escala —
              la base va de iniciado a dominado. Un botón que promete algo que
              no existe es, otra vez, la maqueta que esta reconstrucción viene a
              desarmar. */}
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
