import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCalificacion from "./components/portafolio/TarjetaCalificacion";
import ResumenCalificaciones from "./components/portafolio/ResumenCalificaciones";
import ModalDevolucion from "./components/portafolio/ModalDevolucion";
import {
  calcularPromedio,
  estadoDeNota,
  type Calificacion,
  type EstadoCalificacion,
} from "./components/portafolio/tiposCalificaciones";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const CALIFICACIONES_INICIALES: Calificacion[] = [
  {
    id: "matematica",
    materia: "Matemática",
    icono: "functions",
    acento: "primary",
    nota: 9.5,
    actualizado: "Hace 2 días",
    devolucion:
      "Excelente resolución de los sistemas de ecuaciones. Prestá atención a la prolijidad en el desarrollo, pero el razonamiento fue impecable.",
  },
  {
    id: "historia",
    materia: "Historia",
    icono: "history_edu",
    acento: "error",
    nota: 4.0,
    actualizado: "Ayer",
    devolucion:
      "El trabajo evidencia falta de lectura de las fuentes primarias. Repasá las causas de la Revolución de Mayo y volvé a entregar la actividad complementaria.",
  },
  {
    id: "biologia",
    materia: "Biología",
    detalle: "Células procariotas",
    icono: "biotech",
    acento: "tertiary",
    nota: 8.0,
    actualizado: "Hace 1 semana",
    devolucion:
      "Muy buena descripción de la estructura celular. Podés profundizar en las diferencias con las células eucariotas para el próximo informe.",
  },
  {
    id: "lengua",
    materia: "Lengua",
    detalle: "Ensayo argumentativo",
    icono: "menu_book",
    acento: "secondary",
    nota: null,
    actualizado: "Entregado ayer",
    devolucion: "",
  },
];

// Sub-navegación del módulo Portafolio (estudiante)
const SUBNAV = [
  { label: "Mis Cursos", ruta: "/portafolio/cursos" },
  { label: "Mis Tareas", ruta: "/portafolio/mis-tareas" },
  { label: "Calificaciones", ruta: "/portafolio/calificaciones" },
];

// Filtros disponibles
const FILTROS: { label: string; valor: EstadoCalificacion | "todas" }[] = [
  { label: "Todas", valor: "todas" },
  { label: "Aprobadas", valor: "aprobado" },
  { label: "Desaprobadas", valor: "desaprobado" },
  { label: "Pendientes", valor: "pendiente" },
];

// ─── PÁGINA ─────────────────────────────────────────────

export default function CalificacionesPage() {
  const [calificaciones] = useState<Calificacion[]>(CALIFICACIONES_INICIALES);
  const [filtro, setFiltro] = useState<EstadoCalificacion | "todas">("todas");
  const [devolucionActivaId, setDevolucionActivaId] = useState<string | null>(null);

  const [usuario] = useState({
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  // ── Lógica derivada ──
  const promedio = useMemo(() => calcularPromedio(calificaciones), [calificaciones]);

  const materiasPendientes = useMemo(
    () => calificaciones.filter((c) => c.nota === null).length,
    [calificaciones]
  );

  const calificacionesVisibles = useMemo(
    () =>
      filtro === "todas"
        ? calificaciones
        : calificaciones.filter((c) => estadoDeNota(c.nota) === filtro),
    [calificaciones, filtro]
  );

  const devolucionActiva =
    calificaciones.find((c) => c.id === devolucionActivaId) ?? null;

  // ── Acciones ──
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/portafolio/mis-tareas"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Portafolio de Aprendizaje" subtitle="Calificaciones" />

        {/* Sub-navegación del módulo */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {SUBNAV.map((tab) => {
            const activa = tab.ruta === "/portafolio/calificaciones";
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

        <div className="flex-1 overflow-y-auto px-10 pt-8 pb-12 bg-[#190d2d] relative">
          {/* Decoración de fondo */}
          <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-40">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-tertiary/20 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Encabezado */}
            <header className="mb-8">
              <h1 className="text-4xl font-headline font-extrabold text-white tracking-tight">
                Mis Calificaciones
              </h1>
              <p className="text-on-surface-variant mt-2 text-sm">
                Resumen del rendimiento académico en el portafolio actual.
              </p>
            </header>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-6">
              {FILTROS.map((f) => {
                const activo = filtro === f.valor;
                return (
                  <button
                    key={f.valor}
                    onClick={() => setFiltro(f.valor)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activo
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-transparent text-on-surface-variant border-white/10 hover:border-white/30"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Lista de calificaciones */}
            <div className="grid grid-cols-1 gap-4">
              {calificacionesVisibles.length > 0 ? (
                calificacionesVisibles.map((c) => (
                  <TarjetaCalificacion
                    key={c.id}
                    calificacion={c}
                    onVerDevolucion={setDevolucionActivaId}
                  />
                ))
              ) : (
                <div className="bg-surface-container rounded-lg p-10 border border-white/5 text-center text-on-surface-variant">
                  No hay materias en esta categoría.
                </div>
              )}
            </div>

            {/* Resumen (promedio calculado + pendientes) */}
            <ResumenCalificaciones
              promedio={promedio}
              tendencia="+0.5 este mes"
              materiasPendientes={materiasPendientes}
            />
          </div>
        </div>
      </main>

      {/* Modal de devolución */}
      {devolucionActiva && (
        <ModalDevolucion
          calificacion={devolucionActiva}
          onCerrar={() => setDevolucionActivaId(null)}
        />
      )}
    </div>
  );
}
