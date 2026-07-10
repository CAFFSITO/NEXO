import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaMetaGestion from "./components/objetivos/TarjetaMetaGestion";
import ModalNuevaMeta from "./components/objetivos/ModalNuevaMeta";
import { progresoMeta, type MetaGestion } from "./components/objetivos/tiposDashboard";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const METAS_INICIALES: MetaGestion[] = [
  {
    id: "historia",
    materia: "HISTORIA",
    titulo: "Preparar examen de Historia",
    vence: "15 ABR",
    estado: "en-curso",
    subtareasHechas: 3,
    subtareasTotal: 5,
    unidadSubtarea: "subtareas",
    colaboradores: 2,
    recursos: 3,
  },
  {
    id: "frances",
    materia: "IDIOMAS",
    titulo: "Avanzar nivel B2 de Francés",
    vence: "30 MAY",
    estado: "en-curso",
    subtareasHechas: 2,
    subtareasTotal: 8,
    unidadSubtarea: "unidades",
    colaboradores: 0,
    recursos: 4,
  },
  {
    id: "biologia",
    materia: "BIOLOGÍA",
    titulo: "Informe de Células Madre",
    vence: "12 MAR",
    estado: "completada",
    subtareasHechas: 5,
    subtareasTotal: 5,
    unidadSubtarea: "subtareas",
    colaboradores: 0,
    recursos: 2,
    finalizadoEl: "12 Mar",
  },
];

// Sub-navegación del módulo Objetivos
const SUBNAV = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

const RUTA_ACTIVA = "/objetivos/metas";

type FiltroEstado = "todas" | "en-curso" | "completada";

const FILTROS: { valor: FiltroEstado; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "en-curso", label: "En curso" },
  { valor: "completada", label: "Completadas" },
];

// Abreviaturas de meses en español → índice (0-11).
const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

// Días restantes hasta el vencimiento (texto "15 ABR"). null si no se puede parsear.
function diasHasta(vence: string): number | null {
  const partes = vence.trim().toUpperCase().split(/\s+/);
  if (partes.length < 2) return null;
  const dia = Number(partes[0]);
  const mes = MESES[partes[1]];
  if (Number.isNaN(dia) || mes === undefined) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let objetivo = new Date(hoy.getFullYear(), mes, dia);
  // Si la fecha ya pasó este año, se asume el próximo ciclo lectivo.
  if (objetivo < hoy) objetivo = new Date(hoy.getFullYear() + 1, mes, dia);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

// ─── PÁGINA ─────────────────────────────────────────────

export default function MisMetasPage() {
  const [metas, setMetas] = useState<MetaGestion[]>(METAS_INICIALES);
  const [filtro, setFiltro] = useState<FiltroEstado>("todas");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);

  const [usuario] = useState({
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  // ── Métricas derivadas ──

  const metasFiltradas = useMemo(
    () => (filtro === "todas" ? metas : metas.filter((m) => m.estado === filtro)),
    [metas, filtro]
  );

  // Progreso semanal: promedio de progreso de todas las metas.
  const progresoSemanal = useMemo(() => {
    if (metas.length === 0) return 0;
    const suma = metas.reduce((acc, m) => acc + progresoMeta(m), 0);
    return Math.round(suma / metas.length);
  }, [metas]);

  // Próximo hito: meta en curso con el vencimiento más cercano.
  const proximoHito = useMemo(() => {
    const enCurso = metas
      .filter((m) => m.estado === "en-curso")
      .map((m) => ({ meta: m, dias: diasHasta(m.vence) }))
      .filter((x): x is { meta: MetaGestion; dias: number } => x.dias !== null)
      .sort((a, b) => a.dias - b.dias);
    return enCurso[0] ?? null;
  }, [metas]);

  // ── Acciones ──

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  const toggleCompletada = (id: string) => {
    setMetas((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const completada = m.estado !== "completada";
        return completada
          ? {
              ...m,
              estado: "completada",
              subtareasHechas: m.subtareasTotal,
              finalizadoEl: new Date().toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
              }),
            }
          : { ...m, estado: "en-curso", finalizadoEl: undefined };
      })
    );
  };

  const agregarMeta = (meta: MetaGestion) => {
    setMetas((prev) => [meta, ...prev]);
    setModalAbierto(false);
  };

  const abrirMeta = (id: string) => console.log("Abrir detalle de meta:", id);

  // Constantes del círculo de progreso semanal (r = 40).
  const CIRC = 2 * Math.PI * 40;
  const offsetSemanal = CIRC * (1 - progresoSemanal / 100);

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-hidden">
      <Sidebar
        usuario={usuario}
        rutaActiva="/objetivos"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Objetivos Personales" subtitle="Mis Metas" />

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
          <div className="max-w-6xl mx-auto">
            {/* Header de la vista */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-extrabold font-headline tracking-tight text-white">
                  Gestión de Metas
                </h1>
                <p className="text-on-surface-variant text-sm mt-1">
                  Seguí tu progreso académico y personal.
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(true)}
                className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Nueva Meta
              </button>
            </div>

            {/* Filtros por estado */}
            <div className="flex items-center gap-2 mb-6">
              {FILTROS.map((f) => {
                const activo = filtro === f.valor;
                const cuenta =
                  f.valor === "todas"
                    ? metas.length
                    : metas.filter((m) => m.estado === f.valor).length;
                return (
                  <button
                    key={f.valor}
                    onClick={() => setFiltro(f.valor)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      activo
                        ? "bg-[#C548F5] text-white shadow-lg shadow-purple-500/20"
                        : "bg-[#2D1B4E] text-slate-400 hover:text-white"
                    }`}
                  >
                    {f.label} ({cuenta})
                  </button>
                );
              })}
            </div>

            {/* Grid de metas */}
            {metasFiltradas.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {metasFiltradas.map((meta) => (
                  <TarjetaMetaGestion
                    key={meta.id}
                    meta={meta}
                    diasRestantes={diasHasta(meta.vence)}
                    onToggleCompletada={toggleCompletada}
                    onAbrir={abrirMeta}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
                  flag
                </span>
                <p className="text-slate-400 text-sm">
                  No tenés metas en esta categoría todavía.
                </p>
              </div>
            )}

            {/* Analytics: resumen semanal + próximo hito */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resumen semanal */}
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-8">
                <h3 className="text-white font-bold font-headline mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C548F5]">insights</span>
                  Resumen Semanal
                </h3>
                <div className="flex items-center gap-8">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        className="text-background"
                        cx="48"
                        cy="48"
                        fill="transparent"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        className="text-[#C548F5] transition-all duration-500"
                        cx="48"
                        cy="48"
                        fill="transparent"
                        r="40"
                        stroke="currentColor"
                        strokeDasharray={CIRC}
                        strokeDashoffset={offsetSemanal}
                        strokeWidth="8"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white font-headline">
                      {progresoSemanal}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      ¡Vas por buen camino, {usuario.nombre.split(" ")[0]}! Tenés un progreso
                      promedio del <span className="text-white font-bold">{progresoSemanal}%</span>{" "}
                      en tus metas.
                    </p>
                    <button className="text-[#C548F5] text-xs font-bold hover:underline">
                      Ver reporte detallado
                    </button>
                  </div>
                </div>
              </div>

              {/* Próximo hito */}
              <div className="bg-gradient-to-br from-[#4900a6]/20 to-transparent border border-[#C548F5]/10 rounded-[20px] p-8 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#C548F5] rounded-xl shadow-lg shadow-purple-500/40">
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      emoji_events
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold font-headline">Próximo Hito</h4>
                    <p className="text-xs text-on-surface-variant">
                      {proximoHito ? proximoHito.meta.titulo : "Sin metas pendientes 🎉"}
                    </p>
                  </div>
                </div>
                {proximoHito && (
                  <div className="mt-6">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">
                      <span>
                        {proximoHito.dias <= 0
                          ? "¡Vence hoy!"
                          : `Quedan ${proximoHito.dias} día${proximoHito.dias === 1 ? "" : "s"}`}
                      </span>
                      <span className={proximoHito.dias < 3 ? "text-red-400" : ""}>
                        {proximoHito.dias < 3 ? "Urgente" : "En marcha"}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          proximoHito.dias < 3 ? "bg-red-400" : "bg-[#C548F5]"
                        }`}
                        style={{
                          // Barra más llena cuanto más cerca el vencimiento (tope 14 días).
                          width: `${Math.min(100, Math.max(10, 100 - (proximoHito.dias / 14) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {modalAbierto && (
        <ModalNuevaMeta onGuardar={agregarMeta} onCerrar={() => setModalAbierto(false)} />
      )}
    </div>
  );
}
