// src/paginas/GestionTareasProfesorPage.tsx
// VISTA: Gestión de Tareas (Profesor) — Portafolio Docente.
//
// Ahora todo sale de la base (Etapa 4). Antes esta pantalla traía tres tareas de
// ejemplo escritas a mano, un profesor fijo ("Prof. García") y listas de
// materias y cursos inventadas. Hoy:
//   · quién sos sale de la sesión (useNavegacion),
//   · tus tareas y cátedras salen del servidor (/api/tareas/*),
//   · crear, editar y eliminar escriben de verdad,
//   · "Corregir" abre el panel con la lista real del curso (14.7 paso 4).

import { useMemo, useState } from "react";
import { useDatos } from "../servicios/api";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaTareaBase from "./components/shared/tareas/TarjetaTareaBase";
import ModalDetalleTarea from "./components/shared/tareas/ModalDetalleTarea";
import { colorMateria } from "./components/shared/tareas/tiposTareas";
import ModalTareaDocente from "./components/portafolio-docente/ModalTareaDocente";
import ModalPanelCorreccion from "./components/portafolio-docente/ModalPanelCorreccion";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";
import { textoVencimiento, colorVencimiento } from "../servicios/fechas";
import {
  crearTarea,
  editarTarea,
  eliminarTarea,
  type Catedra,
  type TareaDocente,
  type DatosNuevaTarea,
} from "../servicios/tareas";

export default function GestionTareasProfesorPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  const estadoCatedras = useDatos<{ catedras: Catedra[] }>("/api/tareas/catedras");
  const estadoTareas = useDatos<{ tareas: TareaDocente[] }>("/api/tareas/docente");
  const catedras = estadoCatedras.datos?.catedras ?? [];
  const tareas = useMemo(() => estadoTareas.datos?.tareas ?? [], [estadoTareas.datos]);
  const cargando = estadoCatedras.cargando || estadoTareas.cargando;
  const error = estadoCatedras.error ?? estadoTareas.error;

  const [busqueda, setBusqueda] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [tareaEditando, setTareaEditando] = useState<TareaDocente | null>(null);
  const [correccionId, setCorreccionId] = useState<string | null>(null);
  // Qué tarea se abrió en "Ver detalle" (modal compartido con el estudiante).
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const cargar = () => { estadoCatedras.recargar(); estadoTareas.recargar(); };

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

  // Resumen semanal: porcentaje global de entregas hechas (al día + tarde),
  // calculado sobre los conteos reales que devuelve el servidor.
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

  const tareasAlDia = useMemo(() => tareas.filter((t) => t.pendiente === 0).length, [tareas]);

  // ── Acciones ──
  const abrirCreacion = () => {
    setTareaEditando(null);
    setModalAbierto(true);
  };
  const abrirEdicion = (id: string) => {
    setTareaEditando(tareas.find((t) => t.id === id) ?? null);
    setModalAbierto(true);
  };
  const cerrarModal = () => {
    setModalAbierto(false);
    setTareaEditando(null);
  };

  const guardarTarea = async (datos: DatosNuevaTarea) => {
    if (tareaEditando) {
      await editarTarea(tareaEditando.id, {
        titulo: datos.titulo,
        consigna: datos.consigna,
        fechaLimite: datos.fechaLimite,
        metodoEstudio: datos.metodoEstudio,
        tipoAsignacion: datos.tipoAsignacion,
      });
    } else {
      await crearTarea(datos);
    }
    cerrarModal();
    cargar();
  };

  const borrarTarea = async (id: string) => {
    await eliminarTarea(id);
    cargar();
  };

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-x-hidden">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        {/* Top nav del portafolio docente */}
        <header className="flex justify-between items-center w-full px-8 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-black text-white font-headline">Portafolio Docente</h1>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleNavegar("/portafolio-docente")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Dashboard
              </button>
              <button aria-current="page" onClick={() => handleNavegar("/portafolio/gestion")} className="text-[#C548F5] border-b-2 border-[#C548F5] pb-2 font-bold font-label">
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

          {/* Mis materias: entrar al detalle de la cátedra (horarios, avisos).
              Es donde el profesor publica y gestiona los avisos de su curso. */}
          {!cargando && !error && catedras.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                Mis materias
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catedras.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleNavegar(`/portafolio/materia?catedra=${c.id}`)}
                    className="text-left bg-[#2D1B4E] border border-white/5 hover:border-[#C548F5]/40 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{c.materia}</p>
                      <span className="material-symbols-outlined text-white/30 group-hover:text-[#C548F5] transition-colors">
                        chevron_right
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      {c.curso} · {c.alumnos} {c.alumnos === 1 ? "alumno" : "alumnos"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de tareas */}
          {cargando ? (
            <Cargando que="tus tareas" />
          ) : error ? (
            <Fallo error={error} onReintentar={cargar} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {tareasVisibles.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-2 block">assignment</span>
                    {busqueda
                      ? "No hay tareas que coincidan con la búsqueda."
                      : "Todavía no creaste ninguna tarea. Empezá con “Nueva Tarea”."}
                  </div>
                ) : (
                  tareasVisibles.map((tarea) => {
                    const total = tarea.alDia + tarea.tarde + tarea.pendiente;
                    const entregadas = tarea.alDia + tarea.tarde;
                    // La MISMA tarjeta base que ve el estudiante, con los badges,
                    // metadatos y acciones propios del profesor por props.
                    return (
                      <TarjetaTareaBase
                        key={tarea.id}
                        className="border border-outline-variant/20 hover:border-primary/40"
                        badges={
                          <div className="flex gap-2">
                            <span
                              className={`px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${colorMateria(
                                tarea.materia
                              )}`}
                            >
                              {tarea.materia.toUpperCase()}
                            </span>
                            <span className="px-3 py-1 text-[10px] font-bold rounded-full tracking-wider bg-[#1C1030] text-slate-300">
                              {entregadas}/{total} ENTREGADAS
                            </span>
                          </div>
                        }
                        titulo={
                          <h3 className="text-xl font-bold font-headline text-white group-hover:text-primary transition-colors">
                            {tarea.titulo}
                          </h3>
                        }
                        meta={
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-lg">school</span>
                              <span>{tarea.curso}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 ${colorVencimiento(tarea.fechaLimite)}`}>
                              <span className="material-symbols-outlined text-lg">schedule</span>
                              <span>{textoVencimiento(tarea.fechaLimite)}</span>
                            </div>
                            {/* Estado de entregas real (al día / tarde / pendiente). */}
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                {tarea.alDia} al día
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                {tarea.tarde} tarde
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                {tarea.pendiente} pend.
                              </span>
                            </div>
                          </div>
                        }
                        acciones={
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setDetalleId(tarea.id)}
                              className="px-4 py-2 text-slate-300 font-semibold hover:text-white transition-colors"
                            >
                              Ver detalle
                            </button>
                            <button
                              onClick={() => setCorreccionId(tarea.id)}
                              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity active:scale-95"
                            >
                              <span className="material-symbols-outlined text-lg">grading</span>
                              <span>Corregir</span>
                            </button>
                            <button
                              onClick={() => abrirEdicion(tarea.id)}
                              aria-label="Editar tarea"
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-white hover:bg-surface-bright transition-colors active:scale-95"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => borrarTarea(tarea.id)}
                              aria-label="Eliminar tarea"
                              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-95"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        }
                      />
                    );
                  })
                )}
              </div>

              {/* Resumen (calculado en vivo sobre datos reales) */}
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
                  <p className="text-white font-black text-2xl">{tareasAlDia}</p>
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                    Tareas al día
                  </p>
                </div>
              </div>
            </>
          )}
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
      {modalAbierto && <ModalTareaDocente
        key={tareaEditando?.id ?? "nueva"}
        abierto={modalAbierto}
        tareaEditando={tareaEditando}
        catedras={catedras}
        onGuardar={guardarTarea}
        onCerrar={cerrarModal}
      />}

      {/* Detalle de la tarea (mismo modal que el estudiante, en modo docente:
          consigna de solo lectura + las acciones propias del profesor). */}
      {detalleId && (() => {
        const tarea = tareas.find((t) => t.id === detalleId);
        if (!tarea) return null;
        return (
          <ModalDetalleTarea
            tareaDocente={tarea}
            onCerrar={() => setDetalleId(null)}
            acciones={
              <>
                <button
                  onClick={() => {
                    setDetalleId(null);
                    abrirEdicion(tarea.id);
                  }}
                  className="flex items-center gap-2 bg-surface-container-high text-white px-5 py-2.5 rounded-full font-bold hover:bg-surface-bright transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Editar tarea
                </button>
                <button
                  onClick={() => {
                    setDetalleId(null);
                    setCorreccionId(tarea.id);
                  }}
                  className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">grading</span>
                  Corregir entregas
                </button>
              </>
            }
          />
        );
      })()}

      {/* Panel de corrección */}
      {correccionId && (
        <ModalPanelCorreccion
          tareaId={correccionId}
          onCerrar={() => setCorreccionId(null)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
