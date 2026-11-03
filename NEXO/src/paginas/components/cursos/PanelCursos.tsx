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
import TablaCursos from "./TablaCursos";
import EstadoCicloLectivo from "./EstadoCicloLectivo";
import ReporteSemanalCard from "./ReporteSemanalCard";
import ModalNuevoCurso from "./ModalNuevoCurso";
import ModalDetalleCurso from "./ModalDetalleCurso";
import { useCursos } from "../../../servicios/perfiles";
import { crearCurso, type DatosCurso } from "../../../servicios/gestionAcademica";
import { generarInstitucional, descargarArchivo } from "../../../servicios/reportes";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { useFuncion } from "../../../servicios/instancia";

export default function PanelCursos() {
  const { datos, cargando, error, recargar } = useCursos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [aviso, setAviso] = useState("");
  const [exito, setExito] = useState("");
  const cursos = useMemo(() => datos?.cursos ?? [], [datos]);
  // Sin "Cátedras e inscripciones" la escuela usa los cursos solo para ordenar a
  // los preceptores: no hay alumnos, materias ni tareas que mostrar.
  const conAlumnos = useFuncion("cursos.organizar");

  // ── Handlers ──
  // Crear y volver a la lista (sin abrir el curso): se confirma con un aviso.
  const handleCrearCurso = async (nuevo: DatosCurso) => {
    await crearCurso(nuevo);
    setModalAbierto(false);
    setExito(`Listo: se creó el curso ${nuevo.anio}° ${nuevo.division}.`);
    recargar();
  };

  // "Ver detalle" abre la vista de solo lectura del curso. Los cursos creados en
  // memoria (id "nuevo-...") todavía no están en la base, así que no tienen
  // detalle que pedir: se ignora el clic hasta que se persistan (Etapa 3).
  const handleVerDetalle = (id: string) => {
    setDetalleId(id);
  };

  const handleGenerarPDF = async () => {
    if (generandoPDF) return;
    setGenerandoPDF(true);
    setAviso("");
    try {
      const reporte = await generarInstitucional({ cursos: true, entregas: true, calificaciones: true });
      await descargarArchivo(reporte.archivoId, reporte.nombreArchivo);
    } catch (fallo) {
      setAviso(fallo instanceof Error ? fallo.message : "No se pudo generar el reporte.");
    } finally { setGenerandoPDF(false); }
  };

  if (cargando && !datos) return <Cargando que="los cursos del colegio" />;
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
      {aviso && <p role="alert" className="mb-5 rounded-xl bg-rose-500/10 px-4 py-3 text-rose-300">{aviso}</p>}
      {exito && (
        <div role="status" className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-300">
          <span className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            {exito}
          </span>
          <button type="button" onClick={() => setExito("")} className="text-emerald-200/70 hover:text-white" aria-label="Cerrar el aviso">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      )}
      {/* ── Encabezado + acción ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-on-surface">Cursos</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {conAlumnos ? "Divisiones, preceptores y cupo de estudiantes de cada curso." : "Los cursos de la escuela, con su turno y su preceptor a cargo."}
          </p>
        </div>
        <button type="button" onClick={() => setModalAbierto(true)} className="nx-btn nx-btn-primario">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Nuevo curso
        </button>
      </div>

      <TablaCursos cursos={cursos} conAlumnos={conAlumnos} onVerDetalle={handleVerDetalle} onNuevo={() => setModalAbierto(true)} />

      {/* ── Dashboard inferior (alumnos, materias y tareas) ── */}
      {conAlumnos && <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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
      </div>}

      {modalAbierto && <ModalNuevoCurso
        abierto={modalAbierto}
        cursosExistentes={cursos}
        onCerrar={() => setModalAbierto(false)}
        onCrear={handleCrearCurso}
      />}

      {detalleId && <ModalDetalleCurso key={detalleId} cursoId={detalleId} onCambio={recargar} onCerrar={() => setDetalleId(null)} />}
    </>
  );
}
