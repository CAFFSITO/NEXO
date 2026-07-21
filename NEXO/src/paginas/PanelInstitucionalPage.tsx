// src/paginas/PanelInstitucionalPage.tsx
// VISTA: Panel Institucional (Panel Principal) — acceso Admin Académica 🟣.
// Conversión de EstructuraCarpetasNexo/Directivo/Panel_principal/panelInstitucionalDirectivo.html.
// Home del directivo: métricas clave + actividad reciente + alertas + pulso + accesos rápidos.
// Foco en lógica/funcionalidad: estado de búsqueda, alertas "avisadas" y accesos navegables.

import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TarjetaMetrica from "./components/panel-directivo/TarjetaMetrica";
import ActividadHoy, { type ItemActividad } from "./components/panel-directivo/ActividadHoy";
import AlertasSistema, { type Alerta } from "./components/panel-directivo/AlertasSistema";
import PulsoInstitucion, { type MetricaPulso } from "./components/panel-directivo/PulsoInstitucion";
import AccesosRapidos, { type AccesoRapido } from "./components/panel-directivo/AccesosRapidos";
import { useNavegacion } from "../navegacion";
import { usarPanelInstitucional } from "../servicios/panel";
import { subtituloInstitucional, usarInstitucion } from "../servicios/institucion";
import { textoRelativo } from "../servicios/fechas";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Todos los números de este panel eran inventados: "342 estudiantes activos"
// (el colegio tiene 6), "+12%", "94% de entregas en término", "participación
// 78%", "comprensión 81%", y una actividad fija ("Clase iniciada — Matemática
// Avanzada 5to B, hace 5 min") que decía lo mismo a cualquier hora. Ahora todo
// se cuenta en la base (ver `servidor/panel.js`).

const ACCESOS: AccesoRapido[] = [
  { id: "perfiles", icono: "manage_accounts", label: "Gestionar perfiles" },
  { id: "calendario", icono: "event_note", label: "Ver calendario" },
  { id: "reporte", icono: "file_download", label: "Exportar reporte" },
];

// Color e ícono del nodo de la línea de tiempo según el tipo real de actividad.
const ESTILO_ACTIVIDAD: Record<string, string> = {
  entrega: "bg-tertiary",
  correccion: "bg-emerald-500",
  debate: "bg-blue-500",
  recurso: "bg-fuchsia-600",
  clase: "bg-purple-500",
};

// ─── PÁGINA ─────────────────────────────────────────────

export default function PanelInstitucionalPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = usarPanelInstitucional();
  const { institucion } = usarInstitucion();

  const [busqueda, setBusqueda] = useState("");

  // Las métricas del encabezado, contadas en la base.
  const metricas = useMemo(() => {
    const m = datos?.metricas;
    if (!m) return [];
    return [
      { id: "alumnos", icono: "person", iconoColor: "text-fuchsia-400", valor: String(m.estudiantes), etiqueta: "Estudiantes activos" },
      { id: "docentes", icono: "cast_for_education", iconoColor: "text-tertiary", valor: String(m.docentes), etiqueta: "Docentes" },
      {
        id: "entregas",
        icono: "task_alt",
        iconoColor: "text-green-400",
        // "—" cuando todavía no hay ninguna entrega: un 0% sería una acusación
        // falsa. La cifra sale de comparar cada entrega con su fecha límite.
        valor: m.entregasEnTermino === null ? "—" : `${m.entregasEnTermino}%`,
        etiqueta: "Tareas entregadas en término",
      },
    ];
  }, [datos]);

  const actividad = useMemo<ItemActividad[]>(() => {
    return (datos?.actividad ?? []).map((a, i) => ({
      id: String(i),
      titulo: a.titulo,
      detalle: a.detalle,
      tiempo: textoRelativo(a.cuando),
      color: ESTILO_ACTIVIDAD[a.tipo] ?? "bg-slate-500",
    }));
  }, [datos]);

  // El pulso muestra solo lo que se puede medir hoy. La "comprensión promedio"
  // se sacó: se mediría con las clases en vivo, que son la Etapa 9. Mostrar un
  // número inventado en su lugar es justamente lo que esta etapa desarma.
  const pulso = useMemo<MetricaPulso[]>(() => {
    const p = datos?.pulso;
    if (!p) return [];
    const lista: MetricaPulso[] = [
      { id: "p1", label: "Participación en Comunidad", valor: p.participacionComunidad, valorColor: "text-fuchsia-400", gradiente: "from-fuchsia-600 to-tertiary-container" },
    ];
    if (p.entregasEnTermino !== null) {
      lista.push({ id: "p2", label: "Entregas a tiempo", valor: p.entregasEnTermino, valorColor: "text-tertiary", gradiente: "from-tertiary to-primary" });
    }
    return lista;
  }, [datos]);

  // Las alertas reales que la base sabe detectar: trabajos sin corregir,
  // denuncias sin resolver, cursos sin preceptor, recursos esperando revisión.
  const alertas = useMemo<Alerta[]>(() => {
    const a = datos?.alertas;
    if (!a) return [];
    const lista: Alerta[] = [];
    if (a.sinCorregir > 0)
      lista.push({ id: "sc", icono: "grading", mensaje: `${a.sinCorregir} ${a.sinCorregir === 1 ? "trabajo entregado sin corregir" : "trabajos entregados sin corregir"}.` });
    if (a.cursosSinPreceptor > 0)
      lista.push({ id: "sp", icono: "person_off", mensaje: `${a.cursosSinPreceptor} ${a.cursosSinPreceptor === 1 ? "curso sin preceptor asignado" : "cursos sin preceptor asignado"}.`, ruta: "/admin/cursos" });
    if (a.denunciasAbiertas > 0)
      lista.push({ id: "dn", icono: "flag", mensaje: `${a.denunciasAbiertas} ${a.denunciasAbiertas === 1 ? "denuncia sin resolver" : "denuncias sin resolver"} en la comunidad.`, ruta: "/comunidad" });
    if (a.recursosEnCola > 0)
      lista.push({ id: "cr", icono: "hourglass_top", mensaje: `${a.recursosEnCola} ${a.recursosEnCola === 1 ? "recurso esperando revisión" : "recursos esperando revisión"} en biblioteca.`, ruta: "/biblioteca/institucional" });
    return lista;
  }, [datos]);

  const manejarAcceso = (id: string) => {
    const rutas: Record<string, string> = {
      perfiles: "/admin/perfiles",
      calendario: "/comunidad/calendario",
      // "/comunidad/reportes-auditoria" no existía en el mapa de rutas: el
      // acceso rápido era un clic muerto (Error 12.8). Reportes es /reportes.
      reporte: "/reportes",
    };
    navegar(rutas[id] ?? id);
  };

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* ── Top app bar ── */}
        <header className="flex justify-between items-center px-10 h-16 sticky top-0 bg-[#1C1030]/80 backdrop-blur-md border-b border-fuchsia-900/10 z-40">
          <h1 className="text-fuchsia-500 font-headline font-bold">Panel Principal</h1>
          <div className="flex items-center gap-6">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-slate-400 text-sm">search</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-slate-900/50 border-none rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-300 w-64 focus:ring-1 focus:ring-fuchsia-500 transition-all"
                placeholder="Buscar expedientes, alumnos..."
                type="text"
              />
            </div>
            <div className="flex gap-4">
              <button className="text-slate-400 hover:text-fuchsia-400 transition-colors opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="text-slate-400 hover:text-fuchsia-400 transition-colors opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Contenido ── */}
        <section className="flex-1 px-10 pt-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <h2 className="text-3xl font-headline font-extrabold text-white leading-tight">Panel Institucional</h2>
              {/* Decía "Colegio San Martín — Ciclo 2025" a mano (Error 13.7). */}
              <p className="text-slate-400 font-medium">{subtituloInstitucional(institucion)}</p>
            </header>

            {cargando && <Cargando que="el panel de la institución" />}
            {error && <Fallo error={error} onReintentar={recargar} />}

            {/* El administrador de plataforma no tiene un colegio, así que este
                panel no es el suyo. La separación tajante de los dos paneles es
                la Etapa 3; hasta entonces, un aviso honesto en vez de cifras
                inventadas de una escuela que no le corresponde (sección 1.1). */}
            {!cargando && !error && datos?.sinInstitucion && (
              <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[20px] p-12 text-center text-slate-400">
                Este panel es de la dirección de un colegio. Como administrador de
                plataforma, no ves los datos internos de las escuelas.
              </div>
            )}

            {!cargando && !error && !datos?.sinInstitucion && (
              <>
                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {metricas.map((m) => (
                    <TarjetaMetrica key={m.id} {...m} />
                  ))}
                </div>

                {/* Distribución en 2 columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <ActividadHoy items={actividad} />
                    <AlertasSistema alertas={alertas} onIr={navegar} />
                  </div>

                  <div className="space-y-6">
                    <PulsoInstitucion metricas={pulso} />
                    <AccesosRapidos accesos={ACCESOS} onAccion={manejarAcceso} />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
