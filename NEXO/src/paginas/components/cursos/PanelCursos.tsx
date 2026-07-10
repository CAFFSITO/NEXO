// src/paginas/components/cursos/PanelCursos.tsx
// Contenido (sin chrome: sidebar/header) de la pestaña "Cursos" de Gestión Institucional.
// Concentra la lógica: estado de cursos, búsqueda, alta vía modal, métricas derivadas y reporte.
// Reutilizado tanto por CursosActivosPage (vista standalone) como por GestionInstitucionalPage (tabs).

import { useMemo, useState } from "react";
import TarjetaCurso, { type Curso } from "./TarjetaCurso";
import EstadoCicloLectivo from "./EstadoCicloLectivo";
import ReporteSemanalCard from "./ReporteSemanalCard";
import ModalNuevoCurso from "./ModalNuevoCurso";

const CURSOS_INICIALES: Curso[] = [
  { id: "c1", anio: 4, division: "A", preceptor: "Preceptor López", estudiantes: 28, materias: 12, activo: true },
  { id: "c2", anio: 4, division: "B", preceptor: "Preceptora Martínez", estudiantes: 30, materias: 11, activo: true },
  { id: "c3", anio: 3, division: "A", preceptor: "Preceptor Suárez", estudiantes: 25, materias: 10, activo: true },
  { id: "c4", anio: 3, division: "B", preceptor: null, estudiantes: 22, materias: 10, activo: true },
];

const REPORTE_HIGHLIGHTS = ["Optimización de horarios", "Asistencia: 92% global"];

export default function PanelCursos() {
  const [cursos, setCursos] = useState<Curso[]>(CURSOS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // ── Filtro por año/división/preceptor ──
  const cursosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return cursos;
    return cursos.filter((c) => {
      const etiqueta = `${c.anio}°${c.division}`.toLowerCase();
      const preceptor = (c.preceptor ?? "sin preceptor").toLowerCase();
      return etiqueta.includes(q) || preceptor.includes(q);
    });
  }, [cursos, busqueda]);

  // ── Métricas derivadas del estado real ──
  const totalEstudiantes = useMemo(
    () => cursos.reduce((sum, c) => sum + c.estudiantes, 0),
    [cursos]
  );
  const cursosSinPreceptor = useMemo(
    () => cursos.filter((c) => c.preceptor === null).length,
    [cursos]
  );
  const progreso = 65;

  // ── Handlers ──
  const handleCrearCurso = (nuevo: Omit<Curso, "id" | "activo">) => {
    setCursos((prev) => [...prev, { ...nuevo, id: `c${Date.now()}`, activo: true }]);
    setModalAbierto(false);
  };

  const handleVerDetalle = (id: string) => {
    console.log("Ver detalle del curso:", id);
  };

  const handleGenerarPDF = () => {
    setGenerandoPDF(true);
    // Simula la generación asíncrona del reporte (servicio de archivos / backend).
    setTimeout(() => setGenerandoPDF(false), 1500);
  };

  return (
    <>
      {/* ── Hero header + acción ── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-headline">Cursos Activos</h2>
          <p className="text-on-surface-variant/70 mt-1">
            Gestión y monitoreo de las divisiones académicas.
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-[#C548F5] hover:bg-[#C548F5]/90 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 self-start md:self-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo curso
        </button>
      </div>

      {/* ── Buscador + alerta de cursos sin preceptor ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por año, división o preceptor…"
            className="w-full bg-[#2D1B4E] border border-surface-variant rounded-full pl-10 pr-4 py-3 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none transition-colors"
          />
        </div>
        {cursosSinPreceptor > 0 && (
          <div className="flex items-center gap-2 bg-error/10 text-error px-4 py-3 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-base">warning</span>
            {cursosSinPreceptor} curso{cursosSinPreceptor > 1 ? "s" : ""} sin preceptor
          </div>
        )}
      </div>

      {/* ── Grilla de cursos ── */}
      {cursosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {cursosFiltrados.map((curso) => (
            <TarjetaCurso key={curso.id} curso={curso} onVerDetalle={handleVerDetalle} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant mb-12">
          <span className="material-symbols-outlined text-5xl mb-2 block">search_off</span>
          No se encontraron cursos para “{busqueda}”.
        </div>
      )}

      {/* ── Dashboard inferior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <EstadoCicloLectivo
          progreso={progreso}
          inscripciones={totalEstudiantes}
          docentes={86}
          aulas={cursos.length * 6}
        />
        <ReporteSemanalCard
          highlights={REPORTE_HIGHLIGHTS}
          generando={generandoPDF}
          onGenerarPDF={handleGenerarPDF}
        />
      </div>

      <ModalNuevoCurso
        abierto={modalAbierto}
        cursosExistentes={cursos}
        onCerrar={() => setModalAbierto(false)}
        onCrear={handleCrearCurso}
      />
    </>
  );
}
