// src/paginas/components/cursos/PanelCursos.tsx
// Contenido (sin chrome: sidebar/header) de la pestaña "Cursos" de Gestión Institucional.
// Concentra la lógica: estado de cursos, búsqueda, alta vía modal, métricas derivadas y reporte.
// Reutilizado por CursosActivosPage (Gestión de Cursos de la dirección).
//
// Etapa 2: los cursos y todos sus números vienen de `/api/cursos`. Antes había
// cuatro cursos escritos a mano con "28 estudiantes" y "12 materias" que no se
// movían aunque se inscribiera gente, y con preceptores que no eran los de la
// base ("Preceptor López", "Preceptor Suárez", que no existen — Error 13.4).

import { useMemo, useState } from "react";
import TarjetaCurso from "./TarjetaCurso";
import EstadoCicloLectivo from "./EstadoCicloLectivo";
import ReporteSemanalCard from "./ReporteSemanalCard";
import ModalNuevoCurso from "./ModalNuevoCurso";
import ModalDetalleCurso from "./ModalDetalleCurso";
import { usarCursos, type Curso } from "../../../servicios/perfiles";
import { Cargando, Fallo } from "../shared/EstadoCarga";

export default function PanelCursos() {
  const { datos, cargando, error, recargar } = usarCursos();
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Alta en memoria hasta la Etapa 3, igual que en Perfiles: lo que se crea acá
  // todavía no llega a la base y se pierde al recargar.
  const [creadosLocalmente, setCreadosLocalmente] = useState<Curso[]>([]);

  const cursos = useMemo(
    () => [...(datos?.cursos ?? []), ...creadosLocalmente],
    [datos, creadosLocalmente],
  );

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

  const cursosSinPreceptor = useMemo(
    () => cursos.filter((c) => c.preceptor === null).length,
    [cursos]
  );

  // ── Handlers ──
  const handleCrearCurso = (nuevo: Omit<Curso, "id" | "activo">) => {
    setCreadosLocalmente((prev) => [
      ...prev,
      { ...nuevo, id: `nuevo-${Date.now()}`, activo: true },
    ]);
    setModalAbierto(false);
  };

  // "Ver detalle" abre la vista de solo lectura del curso. Los cursos creados en
  // memoria (id "nuevo-...") todavía no están en la base, así que no tienen
  // detalle que pedir: se ignora el clic hasta que se persistan (Etapa 3).
  const handleVerDetalle = (id: string) => {
    if (id.startsWith("nuevo-")) return;
    setDetalleId(id);
  };

  const handleGenerarPDF = () => {
    setGenerandoPDF(true);
    // Simula la generación asíncrona del reporte (servicio de archivos / backend).
    setTimeout(() => setGenerandoPDF(false), 1500);
  };

  if (cargando) return <Cargando que="los cursos del colegio" />;
  if (error) return <Fallo error={error} onReintentar={recargar} />;
  if (!datos) return null;

  // Lo que de verdad pasó en los últimos 7 días. La tarjeta de reporte tenía
  // dos titulares fijos ("Optimización de horarios", "Asistencia: 92% global")
  // que no salían de ningún lado y no cambiaban nunca.
  const highlights = [
    `${datos.semana.entregas} entregas`,
    `${datos.semana.correcciones} correcciones`,
    `${datos.semana.eventos} eventos nuevos en el calendario`,
  ];

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
          {busqueda
            ? `No se encontraron cursos para “${busqueda}”.`
            : "Todavía no hay cursos cargados."}
        </div>
      )}

      {/* ── Dashboard inferior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <EstadoCicloLectivo
          avanceCronograma={datos.ciclo.avanceCronograma}
          inscripciones={datos.ciclo.inscripciones}
          docentes={datos.ciclo.docentes}
          materias={datos.ciclo.materias}
        />
        <ReporteSemanalCard
          highlights={highlights}
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

      <ModalDetalleCurso cursoId={detalleId} onCerrar={() => setDetalleId(null)} />
    </>
  );
}
