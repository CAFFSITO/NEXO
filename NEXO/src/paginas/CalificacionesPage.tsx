import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCalificacion from "./components/portafolio/TarjetaCalificacion";
import ResumenCalificaciones from "./components/portafolio/ResumenCalificaciones";
import ModalDevolucion from "./components/portafolio/ModalDevolucion";
import ModalDetalleTarea from "./components/portafolio/ModalDetalleTarea";
import SubNavPortafolio from "./components/portafolio/SubNavPortafolio";
import {
  estiloMateria,
  type Calificacion,
  type EstadoCalificacion,
} from "./components/portafolio/tiposCalificaciones";
import { calcularPromedio, estadoDeNota, usarPortafolio } from "../servicios/portafolio";
import { textoRelativo } from "../servicios/fechas";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Las cuatro materias inventadas que vivían acá se fueron. Esta pantalla pide
// `/api/portafolio`, exactamente la misma ventanilla que Mis Tareas, y arma sus
// tarjetas con esas filas. Ese es todo el arreglo del Error 13.1: no hay dos
// listas que puedan discrepar, hay una.

// Filtros disponibles
const FILTROS: { label: string; valor: EstadoCalificacion | "todas" }[] = [
  { label: "Todas", valor: "todas" },
  { label: "Aprobadas", valor: "aprobado" },
  { label: "Desaprobadas", valor: "desaprobado" },
  { label: "Pendientes", valor: "pendiente" },
];

// ─── PÁGINA ─────────────────────────────────────────────

export default function CalificacionesPage() {
  const { datos, cargando, error, recargar } = usarPortafolio();
  const [filtro, setFiltro] = useState<EstadoCalificacion | "todas">("todas");
  const [devolucionActivaId, setDevolucionActivaId] = useState<string | null>(null);
  // La tarea que se abre al tocar "Correcciones en camino" (Error 2.C.7).
  const [tareaDetalleId, setTareaDetalleId] = useState<string | null>(null);

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  // Las calificaciones SON las tareas del portafolio: cada trabajo entregado es
  // una fila con su nota (o sin ella, si el profesor todavía no corrigió). Solo
  // se muestran las entregadas: una tarea que ni siquiera se entregó no es una
  // calificación pendiente, es una tarea pendiente y vive en Mis Tareas.
  const calificaciones = useMemo<Calificacion[]>(() => {
    if (!datos) return [];
    return datos.tareas
      .filter((t) => t.estado === "entregada")
      .map((t) => {
        const estilo = estiloMateria(t.materia);
        return {
          id: t.id,
          materia: t.materia,
          detalle: t.titulo,
          icono: estilo.icono,
          acento: estilo.acento,
          nota: t.nota,
          // "Hace 2 días" se calcula de la fecha real de la corrección (o de la
          // entrega, si todavía no la corrigieron). Antes era texto escrito a
          // mano: decía "Ayer" para siempre.
          actualizado: t.corregidoEn
            ? textoRelativo(t.corregidoEn)
            : `Entregado ${textoRelativo(t.entregadoEn).toLowerCase()}`,
          devolucion: t.devolucion,
        };
      });
  }, [datos]);

  // ── Lógica derivada ──
  // El promedio se calcula con la misma función que usa el resto del
  // portafolio, sobre las mismas notas.
  const promedio = useMemo(
    () => calcularPromedio(datos?.tareas.filter((t) => t.estado === "entregada") ?? []),
    [datos]
  );

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

  // La primera entrega que sigue esperando corrección (entregada, sin nota):
  // es a donde lleva "Correcciones en camino".
  const primeraPendiente = useMemo(
    () =>
      datos?.tareas.find((t) => t.estado === "entregada" && t.nota === null) ?? null,
    [datos]
  );

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Portafolio de Aprendizaje" subtitle="Calificaciones" />

        {/* Sub-navegación del módulo */}
        <SubNavPortafolio rutaActiva="/portafolio/calificaciones" />

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
            {cargando ? (
              <Cargando que="tus calificaciones" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : (
              <>
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
                      {filtro === "todas"
                        ? "Todavía no entregaste ningún trabajo."
                        : "No hay materias en esta categoría."}
                    </div>
                  )}
                </div>

                {/* Resumen (promedio calculado + pendientes) */}
                <ResumenCalificaciones
                  promedio={promedio}
                  materiasPendientes={materiasPendientes}
                  onIrACorreccion={
                    primeraPendiente
                      ? () => setTareaDetalleId(primeraPendiente.id)
                      : undefined
                  }
                />
              </>
            )}
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

      {/* Detalle de la tarea al tocar "Correcciones en camino" */}
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
