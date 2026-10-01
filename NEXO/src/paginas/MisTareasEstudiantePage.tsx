import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaTarea from "./components/portafolio/TarjetaTarea";
import TarjetaTareaPersonal from "./components/portafolio/TarjetaTareaPersonal";
import ModalNuevaTareaPersonal from "./components/portafolio/ModalNuevaTareaPersonal";
import ModalDetalleTarea from "./components/shared/tareas/ModalDetalleTarea";
import SubNavPortafolio from "./components/portafolio/SubNavPortafolio";
import {
  estadoEfectivo,
  FILTROS,
  type FiltroTarea,
  type TareaPersonal,
} from "./components/portafolio/tiposTareas";
import { usePortafolio } from "../servicios/portafolio";
import { verEnfoque, limpiarEnfoque } from "../servicios/enfoque";
import {
  crearPersonal,
  editarPersonal,
  completarPersonal,
  eliminarPersonal as eliminarPersonalServidor,
} from "../servicios/tareas";
import { diasHasta } from "../servicios/fechas";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Los datos de ejemplo que vivían acá se fueron a la base. Eran cuatro tareas
// con profesores que no las dan (la Revolución de Mayo figuraba a nombre del
// Prof. García, que da Matemática — Error 13.2), fechas sin año ("15 ABR",
// Error 2.C.9) y una nota de Biología de 9.5 que contradecía el 8.0 que
// mostraba Calificaciones sobre el MISMO trabajo (Error 13.1).

type Orden = "fecha" | "materia";

// ─── PÁGINA ─────────────────────────────────────────────

export default function MisTareasEstudiantePage() {
  const { datos, cargando, error, recargar } = usePortafolio();
  const { institucion } = useInstitucion();

  const [busqueda, setBusqueda] = useState<string>("");
  const [filtro, setFiltro] = useState<FiltroTarea>("todas");
  const [orden, setOrden] = useState<Orden>("fecha");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  // La tarea personal que se está editando (null = el modal crea una nueva).
  const [personalEditando, setPersonalEditando] = useState<TareaPersonal | null>(null);
  const [errorPersonal, setErrorPersonal] = useState("");
  const ocupadas = useRef(new Set<string>());
  // Qué tarea académica se abrió en detalle. Es la misma vista para "Ver
  // detalle", "Entregar" y "Ver feedback": el modal muestra el flujo que
  // corresponde según el estado real de la entrega.
  const [tareaDetalleId, setTareaDetalleId] = useState<string | null>(null);

  // Quién sos sale de la sesión. Esta página tenía escrita a Julieta Rossi con
  // su curso y su avatar: entrara quien entrara, el menú decía Julieta.
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  const tareas = useMemo(() => datos?.tareas ?? [], [datos]);

  // Objetivo pendiente de una notificación de corrección: abrir el detalle de
  // ESA tarea. Se lee al montar (sin consumir) y se resuelve cuando cargan las
  // tareas; si la tarea ya no está en la lista, se avisa honesto y no se abre nada.
  const objetivoTarea = useRef(verEnfoque("tarea"));
  const objetivoResuelto = useRef(false);
  const [objetivoNoDisponible, setObjetivoNoDisponible] = useState(false);

  useEffect(() => {
    if (objetivoResuelto.current || !objetivoTarea.current) return;
    if (cargando) return; // esperar a que carguen las tareas antes de decidir
    objetivoResuelto.current = true;
    limpiarEnfoque(); // consumir: una sola vez
    const id = objetivoTarea.current;
    if (tareas.some((t) => t.id === id)) setTareaDetalleId(id);
    else setObjetivoNoDisponible(true);
  }, [cargando, tareas]);

  // Las tareas personales ahora se guardan de verdad en `tareas_personales`
  // (Etapa 4): crear, marcar, editar y borrar pasan por el servidor y después se
  // recarga la lista. Antes vivían solo en la memoria de esta pantalla y crear
  // una y recargar la borraba.
  const personales = useMemo(() => datos?.personales ?? [], [datos]);

  // ── Conteo por filtro (para los pills) ──
  const conteos = useMemo(() => {
    const base: Record<FiltroTarea, number> = {
      todas: tareas.length,
      pendiente: 0,
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

  // ── Acciones de tareas académicas ──
  // "Ver detalle", "Entregar" y "Ver feedback" abren la MISMA vista de detalle:
  // el modal decide qué mostrar (formulario de entrega, entrega hecha con opción
  // de anular, o la devolución) según el estado real. Antes cada uno era un
  // console.log que no abría nada.
  const abrirDetalle = (id: string) => setTareaDetalleId(id);

  // ── Acciones de tareas personales (ahora persistidas) ──
  const togglePersonal = async (id: string) => {
    const actual = personales.find((t) => t.id === id);
    if (!actual || ocupadas.current.has(id)) return;
    ocupadas.current.add(id);
    setErrorPersonal("");
    try { await completarPersonal(id, !actual.completada); recargar(); }
    catch (e) { setErrorPersonal(e instanceof Error ? e.message : "No se pudo actualizar la tarea."); }
    finally { ocupadas.current.delete(id); }
  };
  const eliminarPersonal = async (id: string) => {
    if (ocupadas.current.has(id)) return;
    ocupadas.current.add(id);
    setErrorPersonal("");
    try { await eliminarPersonalServidor(id); recargar(); }
    catch (e) { setErrorPersonal(e instanceof Error ? e.message : "No se pudo eliminar la tarea."); }
    finally { ocupadas.current.delete(id); }
  };
  const guardarPersonal = async (titulo: string, descripcion: string, fecha: string | null) => {
    if (personalEditando) {
      await editarPersonal(
        personalEditando.id,
        titulo,
        descripcion,
        fecha
      );
    } else {
      await crearPersonal(titulo, descripcion, fecha);
    }
    setModalAbierto(false);
    setPersonalEditando(null);
    recargar();
  };
  const abrirEdicionPersonal = (tarea: TareaPersonal) => {
    setPersonalEditando(tarea);
    setModalAbierto(true);
  };

  const sinResultados = tareasVisibles.length === 0 && personalesVisibles.length === 0;

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-hidden">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen relative">
        <TopBar title="Portafolio de aprendizaje" subtitle="Mis Tareas" />

        {/* Sub-navegación del módulo */}
        <SubNavPortafolio rutaActiva="/portafolio/mis-tareas" />

        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-8">
          <div className="max-w-6xl mx-auto">
            {errorPersonal && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{errorPersonal}</p>}
            {objetivoNoDisponible && (
              <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <span>Ese elemento ya no está disponible.</span>
                <button
                  onClick={() => setObjetivoNoDisponible(false)}
                  className="text-amber-200/80 hover:text-amber-100"
                  aria-label="Cerrar aviso"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            )}
            {/* Header de la vista */}
            <div className="flex flex-wrap gap-4 justify-between items-end mb-8">
              <div>
                <h1 className="text-[30px] font-extrabold text-white font-headline leading-tight">
                  Mis Tareas
                </h1>
                {/* Decía "Ciclo 2025" escrito a mano (Error 13.7). El curso ya
                    salía de la sesión; el ciclo ahora sale de la base. */}
                <p className="text-slate-400 font-body">
                  {[usuario.curso, subtituloInstitucional(institucion)]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              </div>
              <button
                onClick={() => {
                  setPersonalEditando(null);
                  setModalAbierto(true);
                }}
                className="px-6 py-2.5 border-2 border-[#C548F5] text-[#C548F5] font-bold rounded-full hover:bg-[#C548F5]/10 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nueva tarea personal
              </button>
            </div>

            {/* Búsqueda + Filtros */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-10">
              <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-1 min-w-[220px]">
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
                <div className="flex flex-wrap gap-2">
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
            {cargando ? (
              <Cargando que="tus tareas" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : sinResultados ? (
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
                  task_alt
                </span>
                <p className="text-slate-400 text-sm">
                  {busqueda || filtro !== "todas"
                    ? "No hay tareas que coincidan con tu búsqueda."
                    : "No tenés tareas asignadas."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tareasVisibles.map((tarea) => (
                  <TarjetaTarea
                    key={tarea.id}
                    tarea={tarea}
                    onVerDetalle={abrirDetalle}
                    onEntregar={abrirDetalle}
                    onVerFeedback={abrirDetalle}
                  />
                ))}
                {personalesVisibles.map((tarea) => (
                  <TarjetaTareaPersonal
                    key={tarea.id}
                    tarea={tarea}
                    onToggle={togglePersonal}
                    onEditar={abrirEdicionPersonal}
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
          tituloInicial={personalEditando?.titulo ?? ""}
          descripcionInicial={personalEditando?.descripcion ?? ""}
          fechaInicial={personalEditando?.fechaLimite}
          onGuardar={guardarPersonal}
          onCerrar={() => {
            setModalAbierto(false);
            setPersonalEditando(null);
          }}
        />
      )}

      {tareaDetalleId && (
        <ModalDetalleTarea
          tareaId={tareaDetalleId}
          onCerrar={() => setTareaDetalleId(null)}
          onCambio={recargar}
        />
      )}
    </div>
  );
}
