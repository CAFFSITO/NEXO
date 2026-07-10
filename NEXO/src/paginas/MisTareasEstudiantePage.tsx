import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaTarea from "./components/portafolio/TarjetaTarea";
import TarjetaTareaPersonal from "./components/portafolio/TarjetaTareaPersonal";
import ModalNuevaTareaPersonal from "./components/portafolio/ModalNuevaTareaPersonal";
import {
  diasHasta,
  estadoEfectivo,
  FILTROS,
  type FiltroTarea,
  type TareaAcademica,
  type TareaPersonal,
} from "./components/portafolio/tiposTareas";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const TAREAS_INICIALES: TareaAcademica[] = [
  {
    id: "mate-ecuaciones",
    materia: "Matemática",
    titulo: "Ecuaciones de Segundo Grado",
    profesor: "Prof. Gómez",
    fechaLimite: "15 ABR",
    estado: "pendiente",
    metodoEstudio: "Práctica espaciada",
  },
  {
    id: "historia-mayo",
    materia: "Historia",
    titulo: "Revolución de Mayo",
    profesor: "Prof. García",
    fechaLimite: "10 MAR",
    estado: "pendiente",
  },
  {
    id: "lengua-ensayo",
    materia: "Lengua",
    titulo: "Ensayo argumentativo sobre Cortázar",
    profesor: "Prof. Méndez",
    fechaLimite: "20 ABR",
    estado: "en-progreso",
  },
  {
    id: "bio-celulas",
    materia: "Biología",
    titulo: "Células Procariontes",
    profesor: "Prof. López",
    fechaLimite: "05 MAR",
    estado: "entregada",
    nota: 9.5,
  },
];

const TAREAS_PERSONALES_INICIALES: TareaPersonal[] = [
  { id: "personal-ingles", titulo: "Repasar vocabulario Inglés", completada: false },
];

// Sub-navegación del módulo Portafolio (Estudiante)
const SUBNAV = [
  { label: "Mis Cursos", ruta: "/portafolio/mis-cursos" },
  { label: "Mis Tareas", ruta: "/portafolio/mis-tareas" },
  { label: "Calificaciones", ruta: "/portafolio/calificaciones" },
];

const RUTA_ACTIVA = "/portafolio/mis-tareas";

type Orden = "fecha" | "materia";

// ─── PÁGINA ─────────────────────────────────────────────

export default function MisTareasEstudiantePage() {
  const [tareas, setTareas] = useState<TareaAcademica[]>(TAREAS_INICIALES);
  const [personales, setPersonales] = useState<TareaPersonal[]>(
    TAREAS_PERSONALES_INICIALES
  );
  const [busqueda, setBusqueda] = useState<string>("");
  const [filtro, setFiltro] = useState<FiltroTarea>("todas");
  const [orden, setOrden] = useState<Orden>("fecha");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);

  const [usuario] = useState({
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  // ── Conteo por filtro (para los pills) ──
  const conteos = useMemo(() => {
    const base: Record<FiltroTarea, number> = {
      todas: tareas.length,
      pendiente: 0,
      "en-progreso": 0,
      entregada: 0,
      vencida: 0,
    };
    for (const t of tareas) base[estadoEfectivo(t)] += 1;
    return base;
  }, [tareas]);

  // ── Lista visible: filtrada + buscada + ordenada ──
  const tareasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const filtradas = tareas.filter((t) => {
      const coincideFiltro = filtro === "todas" || estadoEfectivo(t) === filtro;
      const coincideBusqueda =
        q === "" ||
        t.titulo.toLowerCase().includes(q) ||
        t.materia.toLowerCase().includes(q) ||
        t.profesor.toLowerCase().includes(q);
      return coincideFiltro && coincideBusqueda;
    });

    return [...filtradas].sort((a, b) => {
      if (orden === "materia") return a.materia.localeCompare(b.materia);
      // Por fecha: las más próximas a vencer primero; null al final.
      const da = diasHasta(a.fechaLimite);
      const db = diasHasta(b.fechaLimite);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [tareas, filtro, busqueda, orden]);

  // Las personales solo se muestran en "Todas".
  const personalesVisibles = filtro === "todas" ? personales : [];

  // ── Acciones de navegación ──
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  // ── Acciones de tareas académicas ──
  const entregar = (id: string) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: "entregada" } : t))
    );
  };
  const verDetalle = (id: string) => console.log("Ver detalle de tarea:", id);
  const verFeedback = (id: string) => console.log("Ver feedback de tarea:", id);

  // ── Acciones de tareas personales ──
  const togglePersonal = (id: string) => {
    setPersonales((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t))
    );
  };
  const eliminarPersonal = (id: string) => {
    setPersonales((prev) => prev.filter((t) => t.id !== id));
  };
  const agregarPersonal = (titulo: string) => {
    setPersonales((prev) => [
      { id: `personal-${Date.now()}`, titulo, completada: false },
      ...prev,
    ]);
    setModalAbierto(false);
  };

  const sinResultados = tareasVisibles.length === 0 && personalesVisibles.length === 0;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-hidden">
      <Sidebar
        usuario={usuario}
        rutaActiva="/portafolio"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Portafolio de aprendizaje" subtitle="Mis Tareas" />

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
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-[30px] font-extrabold text-white font-headline leading-tight">
                  Mis Tareas
                </h1>
                <p className="text-slate-400 font-body">
                  {usuario.curso} — Ciclo 2025
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(true)}
                className="px-6 py-2.5 border-2 border-[#C548F5] text-[#C548F5] font-bold rounded-full hover:bg-[#C548F5]/10 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nueva tarea personal
              </button>
            </div>

            {/* Búsqueda + Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
              <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    search
                  </span>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar tareas..."
                    className="w-full bg-[#2D1B4E] border-none rounded-[10px] py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-[#C548F5] transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {FILTROS.map((f) => {
                    const activo = filtro === f.valor;
                    return (
                      <button
                        key={f.valor}
                        onClick={() => setFiltro(f.valor)}
                        className={`px-5 py-2 rounded-full text-sm transition-colors ${
                          activo
                            ? "bg-[#C548F5] text-white font-bold"
                            : "bg-[#2D1B4E] text-slate-300 font-medium hover:bg-[#3d2568]"
                        }`}
                      >
                        {f.label} ({conteos[f.valor]})
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setOrden((o) => (o === "fecha" ? "materia" : "fecha"))}
                className="flex items-center gap-2 text-slate-300 hover:text-white bg-[#2D1B4E] px-4 py-2 rounded-full transition-colors"
              >
                <span className="text-sm font-medium">
                  Ordenar por {orden === "fecha" ? "fecha" : "materia"}
                </span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
            </div>

            {/* Lista de tareas */}
            {sinResultados ? (
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
                  task_alt
                </span>
                <p className="text-slate-400 text-sm">
                  No hay tareas que coincidan con tu búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tareasVisibles.map((tarea) => (
                  <TarjetaTarea
                    key={tarea.id}
                    tarea={tarea}
                    onVerDetalle={verDetalle}
                    onEntregar={entregar}
                    onVerFeedback={verFeedback}
                  />
                ))}
                {personalesVisibles.map((tarea) => (
                  <TarjetaTareaPersonal
                    key={tarea.id}
                    tarea={tarea}
                    onToggle={togglePersonal}
                    onEliminar={eliminarPersonal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fondo decorativo */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-[#C548F5] rounded-full blur-[150px] opacity-[0.03]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-[#4900a6] rounded-full blur-[120px] opacity-[0.05]" />
      </div>

      {modalAbierto && (
        <ModalNuevaTareaPersonal
          onGuardar={agregarPersonal}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
