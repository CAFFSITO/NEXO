import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaMetaGestion from "./components/objetivos/TarjetaMetaGestion";
import ModalNuevaMeta from "./components/objetivos/ModalNuevaMeta";
import ModalDetalleMeta from "./components/objetivos/ModalDetalleMeta";
import { progresoDeMeta } from "./components/objetivos/tiposDashboard";
import type { Meta, DatosNuevaMeta } from "../servicios/objetivos";
import {
  usarObjetivos,
  usarResumen,
  crearMeta,
  editarMeta,
  archivarMeta,
  cambiarEstadoMeta,
} from "../servicios/objetivos";
import { diasHasta } from "../servicios/fechas";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// La creación, el completado y las subtareas ahora viajan a la base (Etapa 5).
// El calculador de fechas único (`servicios/fechas`) hace que una meta vencida
// se vea vencida, y el resumen semanal deja de ser un promedio simple: lo
// calcula el servidor comparando la semana con la anterior (Error 2.D.10).

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

export default function MisMetasPage() {
  const { datos, cargando, error, recargar } = usarObjetivos();
  const { resumen, recargar: recargarResumen } = usarResumen();
  const [filtro, setFiltro] = useState<FiltroEstado>("todas");
  const [modalNueva, setModalNueva] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editarId, setEditarId] = useState<string | null>(null);
  const [verReporte, setVerReporte] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();

  const metas = useMemo(() => datos?.metas ?? [], [datos]);

  const refrescar = () => {
    recargar();
    recargarResumen();
  };

  const metasFiltradas = useMemo(
    () => (filtro === "todas" ? metas : metas.filter((m) => m.estado === filtro)),
    [metas, filtro]
  );

  const progresoSemanal = useMemo(() => {
    if (metas.length === 0) return 0;
    const suma = metas.reduce((acc, m) => acc + progresoDeMeta(m), 0);
    return Math.round(suma / metas.length);
  }, [metas]);

  // Próximo hito: la meta en curso más próxima a vencer (Error 2.D.11). Con
  // fechas reales, si la más próxima ya venció sale con días negativos y la
  // tarjeta la marca vencida (nunca "faltan 300 días", Error 2.D.14).
  const proximoHito = useMemo(() => {
    const enCurso = metas
      .filter((m) => m.estado === "en-curso")
      .map((m) => ({ meta: m, dias: diasHasta(m.venceEl) }))
      .filter((x): x is { meta: Meta; dias: number } => x.dias !== null)
      .sort((a, b) => a.dias - b.dias);
    return enCurso[0] ?? null;
  }, [metas]);

  const metaDetalle = metas.find((m) => m.id === detalleId) ?? null;
  const metaEditar = metas.find((m) => m.id === editarId) ?? null;

  // Completar / reabrir de verdad (Error 2.D.15). Si quedan subtareas, el
  // servidor pide confirmación; recién ahí se completan (no se falsean solas).
  const toggleCompletada = async (id: string) => {
    const meta = metas.find((m) => m.id === id);
    if (!meta) return;
    const completar = meta.estado !== "completada";
    setAviso(null);
    try {
      const r = await cambiarEstadoMeta(id, completar);
      if (r.requiereConfirmacion) {
        const ok = window.confirm(
          `Esta meta tiene ${r.pendientes} subtarea(s) sin completar. ¿Marcar la meta y todas sus subtareas como completadas?`
        );
        if (!ok) return;
        await cambiarEstadoMeta(id, true, true);
      }
      refrescar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    }
  };

  const guardarNueva = async (d: DatosNuevaMeta) => {
    await crearMeta(d);
    setModalNueva(false);
    refrescar();
  };

  const guardarEdicion = async (d: DatosNuevaMeta) => {
    if (!editarId) return;
    await editarMeta(editarId, d);
    setEditarId(null);
    refrescar();
  };

  const archivar = async (id: string) => {
    if (!window.confirm("¿Archivar esta meta? Dejará de mostrarse.")) return;
    try {
      await archivarMeta(id);
      setDetalleId(null);
      refrescar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo archivar.");
    }
  };

  if (!usuario) return null;

  const CIRC = 2 * Math.PI * 40;
  const offsetSemanal = CIRC * (1 - progresoSemanal / 100);

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-hidden">
      <Sidebar usuario={usuario} onNavegar={handleNavegar} onCerrarSesion={handleCerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Objetivos Personales" subtitle="Mis Metas" />

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
                onClick={() => setModalNueva(true)}
                className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Nueva Meta
              </button>
            </div>

            {aviso && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {aviso}
              </div>
            )}

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

            {cargando ? (
              <Cargando que="tus metas" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : metasFiltradas.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {metasFiltradas.map((meta) => (
                  <TarjetaMetaGestion
                    key={meta.id}
                    meta={meta}
                    diasRestantes={diasHasta(meta.venceEl)}
                    onToggleCompletada={toggleCompletada}
                    onAbrir={setDetalleId}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">flag</span>
                <p className="text-slate-400 text-sm">No tenés metas en esta categoría todavía.</p>
              </div>
            )}

            {/* Analytics: resumen semanal (algoritmo del servidor) + próximo hito */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-8">
                <h3 className="text-white font-bold font-headline mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C548F5]">insights</span>
                  Resumen Semanal
                </h3>
                <div className="flex items-center gap-8">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle className="text-background" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                      <circle
                        className="text-[#C548F5] transition-all duration-500"
                        cx="48" cy="48" fill="transparent" r="40" stroke="currentColor"
                        strokeDasharray={CIRC} strokeDashoffset={offsetSemanal} strokeWidth="8"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white font-headline">
                      {progresoSemanal}%
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {resumen?.semana.mensaje ?? "Calculando tu semana…"}
                    </p>
                    <button
                      onClick={() => setVerReporte((v) => !v)}
                      className="text-[#C548F5] text-xs font-bold hover:underline"
                    >
                      {verReporte ? "Ocultar reporte" : "Ver reporte detallado"}
                    </button>
                  </div>
                </div>
                {verReporte && resumen && (
                  <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                    <Dato etiqueta="Subtareas esta semana" valor={resumen.semana.subtareasCompletadas} />
                    <Dato etiqueta="Semana pasada" valor={resumen.semana.subtareasSemanaPrevia} />
                    <Dato etiqueta="Metas terminadas" valor={resumen.semana.metasTerminadas} />
                    <Dato etiqueta="Ritmo (subtareas/día)" valor={resumen.semana.ritmoPorDia} />
                  </div>
                )}
              </div>

              {/* Próximo hito */}
              <div className="bg-gradient-to-br from-[#4900a6]/20 to-transparent border border-[#C548F5]/10 rounded-[20px] p-8 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#C548F5] rounded-xl shadow-lg shadow-purple-500/40">
                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
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
                      <span className={proximoHito.dias < 0 ? "text-red-400" : ""}>
                        {proximoHito.dias < 0
                          ? `Vencida hace ${Math.abs(proximoHito.dias)} día${proximoHito.dias === -1 ? "" : "s"}`
                          : proximoHito.dias === 0
                            ? "¡Vence hoy!"
                            : `Quedan ${proximoHito.dias} día${proximoHito.dias === 1 ? "" : "s"}`}
                      </span>
                      <span className={proximoHito.dias < 3 ? "text-red-400" : ""}>
                        {proximoHito.dias < 0 ? "Atrasada" : proximoHito.dias < 3 ? "Urgente" : "En marcha"}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${proximoHito.dias < 3 ? "bg-red-400" : "bg-[#C548F5]"}`}
                        style={{ width: `${Math.min(100, Math.max(10, 100 - (proximoHito.dias / 14) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {modalNueva && (
        <ModalNuevaMeta onGuardar={guardarNueva} onCerrar={() => setModalNueva(false)} />
      )}

      {metaEditar && (
        <ModalNuevaMeta
          modoEdicion
          inicial={{
            titulo: metaEditar.titulo,
            categoria: metaEditar.categoria,
            materiaId: metaEditar.materiaId,
            unidadId: metaEditar.unidadId,
            venceEl: metaEditar.venceEl,
          }}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditarId(null)}
        />
      )}

      {metaDetalle && (
        <ModalDetalleMeta
          meta={metaDetalle}
          onCambio={refrescar}
          onCerrar={() => setDetalleId(null)}
          onEditar={() => {
            setEditarId(metaDetalle.id);
            setDetalleId(null);
          }}
          onArchivar={() => archivar(metaDetalle.id)}
        />
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="bg-[#1C1030] rounded-lg px-3 py-2">
      <p className="text-white font-bold text-lg">{valor}</p>
      <p className="text-slate-400">{etiqueta}</p>
    </div>
  );
}
