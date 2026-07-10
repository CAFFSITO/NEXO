// src/paginas/GestionTareasProfesorPage.tsx
// VISTA: Gestión de Tareas (Profesor) — Portafolio Docente.
// Conversión de gestionDeTareasProfesor.html → React + TS + Tailwind.
// El profesor supervisa el progreso de entregas y gestiona (crear/editar/eliminar)
// sus tareas. Foco en lógica y funcionalidad.

import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaTareaDocente, {
  type TareaDocente,
} from "./components/portafolio-docente/TarjetaTareaDocente";
import ModalTareaDocente, {
  type DatosTarea,
} from "./components/portafolio-docente/ModalTareaDocente";

const MATERIAS = ["Matemática", "Historia", "Biología", "Lengua", "Inglés", "Física"];
const CURSOS = ["4° Año B", "5° Año A", "5° Año C", "3° Año C", "6° Año B"];

const TAREAS_INICIALES: TareaDocente[] = [
  {
    id: "1",
    titulo: "Ecuaciones de 2° grado",
    materia: "Matemática",
    curso: "4° Año B",
    fechaVence: "2026-05-24",
    alDia: 24,
    tarde: 3,
    pendiente: 5,
  },
  {
    id: "2",
    titulo: "Revolución de Mayo",
    materia: "Historia",
    curso: "5° Año A",
    fechaVence: "2026-05-28",
    alDia: 18,
    tarde: 7,
    pendiente: 2,
  },
  {
    id: "3",
    titulo: "Práctica de Funciones",
    materia: "Matemática",
    curso: "4° Año B",
    fechaVence: "2026-06-02",
    alDia: 31,
    tarde: 1,
    pendiente: 0,
  },
];

export default function GestionTareasProfesorPage() {
  const [usuario] = useState({
    nombre: "Prof. García",
    rol: "profesor" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia",
  });

  const [tareas, setTareas] = useState<TareaDocente[]>(TAREAS_INICIALES);
  const [busqueda, setBusqueda] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [tareaEditando, setTareaEditando] = useState<TareaDocente | null>(null);

  // ── Derivados ──
  const tareasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tareas;
    return tareas.filter(
      (t) =>
        t.titulo.toLowerCase().includes(q) ||
        t.materia.toLowerCase().includes(q) ||
        t.curso.toLowerCase().includes(q)
    );
  }, [tareas, busqueda]);

  // Resumen semanal: porcentaje global de entregas hechas (al día + tarde)
  const { entregadas, totalEntregas, porcentaje } = useMemo(() => {
    const totales = tareas.reduce(
      (acc, t) => {
        acc.entregadas += t.alDia + t.tarde;
        acc.total += t.alDia + t.tarde + t.pendiente;
        return acc;
      },
      { entregadas: 0, total: 0 }
    );
    const pct = totales.total === 0 ? 0 : Math.round((totales.entregadas / totales.total) * 100);
    return { entregadas: totales.entregadas, totalEntregas: totales.total, porcentaje: pct };
  }, [tareas]);

  // Tareas "corregidas" = las que no tienen entregas pendientes
  const tareasCorregidas = useMemo(
    () => tareas.filter((t) => t.pendiente === 0).length,
    [tareas]
  );

  // ── Acciones ──
  const abrirCreacion = () => {
    setTareaEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (id: string) => {
    const tarea = tareas.find((t) => t.id === id) ?? null;
    setTareaEditando(tarea);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTareaEditando(null);
  };

  const guardarTarea = (datos: DatosTarea) => {
    if (tareaEditando) {
      // Editar: conserva estado de entregas
      setTareas((prev) =>
        prev.map((t) => (t.id === tareaEditando.id ? { ...t, ...datos } : t))
      );
    } else {
      // Crear: nueva tarea sin entregas todavía
      setTareas((prev) => [
        { id: crypto.randomUUID(), ...datos, alDia: 0, tarde: 0, pendiente: 0 },
        ...prev,
      ]);
    }
    cerrarModal();
  };

  const eliminarTarea = (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-x-hidden">
      <Sidebar
        usuario={usuario}
        rutaActiva="/portafolio/gestion"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* Top nav del portafolio docente */}
        <header className="flex justify-between items-center w-full px-8 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-black text-white font-headline">Portafolio Docente</h1>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleNavegar("/portafolio-docente")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Dashboard
              </button>
              <button className="text-[#C548F5] border-b-2 border-[#C548F5] pb-2 font-bold font-label">
                Gestión de Tareas
              </button>
              <button onClick={() => handleNavegar("/portafolio-docente/diario")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Diario Reflexivo
              </button>
              <button onClick={() => handleNavegar("/portafolio-docente/aula-virtual")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Aula Virtual
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              notifications
            </button>
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              settings
            </button>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Header vista + acciones */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-black font-headline text-white tracking-tight">
                Mis Tareas Creadas
              </h2>
              <p className="text-on-surface-variant font-body mt-1">
                Supervisión del progreso y entregas de los estudiantes.
              </p>
            </div>
            <button
              onClick={abrirCreacion}
              className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all self-start md:self-auto"
            >
              <span className="material-symbols-outlined">add</span>
              Nueva Tarea
            </button>
          </header>

          {/* Buscador */}
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título, materia o curso…"
              className="w-full bg-[#2D1B4E] border-none rounded-full pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#C548F5]"
            />
          </div>

          {/* Lista de tareas */}
          <div className="grid grid-cols-1 gap-4">
            {tareasVisibles.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-2 block">assignment</span>
                {busqueda
                  ? "No hay tareas que coincidan con la búsqueda."
                  : "Todavía no creaste ninguna tarea. Empezá con “Nueva Tarea”."}
              </div>
            ) : (
              tareasVisibles.map((tarea) => (
                <TarjetaTareaDocente
                  key={tarea.id}
                  tarea={tarea}
                  onEditar={abrirEdicion}
                  onEliminar={eliminarTarea}
                />
              ))
            )}
          </div>

          {/* Resumen (calculado en vivo) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#2D1B4E] to-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-headline font-bold text-tertiary">Resumen Semanal</h4>
                <p className="text-3xl font-black text-white mt-2">
                  {porcentaje}%{" "}
                  <span className="text-sm font-medium text-emerald-400">
                    {entregadas}/{totalEntregas} entregas realizadas
                  </span>
                </p>
                <div className="w-full bg-background/50 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span
                  className="material-symbols-outlined text-[120px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  trending_up
                </span>
              </div>
            </div>

            <div className="bg-surface-container-high p-6 rounded-xl border border-primary/20 flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-2">
                assignment_turned_in
              </span>
              <p className="text-white font-black text-2xl">{tareasCorregidas}</p>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                Tareas al día
              </p>
            </div>
          </div>
        </div>

        {/* FAB para crear tarea rápido */}
        <button
          onClick={abrirCreacion}
          aria-label="Nueva tarea"
          className="fixed bottom-8 right-8 z-[70] w-16 h-16 bg-[#C548F5] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            add
          </span>
        </button>
      </main>

      {/* Modal crear/editar */}
      <ModalTareaDocente
        abierto={modalAbierto}
        tareaEditando={tareaEditando}
        materias={MATERIAS}
        cursos={CURSOS}
        onGuardar={guardarTarea}
        onCerrar={cerrarModal}
      />
    </div>
  );
}
