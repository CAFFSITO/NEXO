// src/paginas/PanelInstitucionalPage.tsx
// VISTA: Panel Institucional (Panel Principal) — acceso Admin Académica 🟣.
// Conversión de EstructuraCarpetasNexo/Directivo/Panel_principal/panelInstitucionalDirectivo.html.
// Home del directivo: métricas clave + actividad reciente + alertas + pulso + accesos rápidos.
// Foco en lógica/funcionalidad: estado de búsqueda, alertas "avisadas" y accesos navegables.

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TarjetaMetrica from "./components/panel-directivo/TarjetaMetrica";
import ActividadHoy, { type ItemActividad } from "./components/panel-directivo/ActividadHoy";
import AlertasSistema, { type Alerta } from "./components/panel-directivo/AlertasSistema";
import PulsoInstitucion, { type MetricaPulso } from "./components/panel-directivo/PulsoInstitucion";
import AccesosRapidos, { type AccesoRapido } from "./components/panel-directivo/AccesosRapidos";
import { useNavegacion } from "../navegacion";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const METRICAS = [
  { id: "alumnos", icono: "person", iconoColor: "text-fuchsia-400", valor: "342", etiqueta: "Estudiantes activos", delta: "+12%" },
  { id: "docentes", icono: "cast_for_education", iconoColor: "text-tertiary", valor: "28", etiqueta: "Docentes" },
  { id: "entregas", icono: "task_alt", iconoColor: "text-green-400", valor: "94%", etiqueta: "Tareas entregadas en término" },
];

const ACTIVIDAD: ItemActividad[] = [
  { id: "a1", titulo: "Clase iniciada", detalle: "Matemática Avanzada - 5to B", tiempo: "Hace 5 min", color: "bg-fuchsia-600" },
  { id: "a2", titulo: "Tarea entregada", detalle: '12 alumnos completaron "Historia del Siglo XX"', tiempo: "Hace 15 min", color: "bg-tertiary" },
  { id: "a3", titulo: "Debate abierto", detalle: 'Nuevo tópico: "Ética en la IA" en Comunidad', tiempo: "Hace 1 h", color: "bg-blue-500" },
  { id: "a4", titulo: "Nuevo recurso biblioteca", detalle: "PDF: Guía de Laboratorio de Química v2", tiempo: "Hace 2 h", color: "bg-emerald-500" },
  { id: "a5", titulo: "Alerta de inasistencia", detalle: "Registro automático: Falta sin aviso detectada", tiempo: "Hace 3 h", color: "bg-red-500" },
];

const ALERTAS_INICIALES: Alerta[] = [
  { id: "al1", icono: "edit_calendar", mensaje: "Prof. Méndez no registró el parte de clase del lunes.", avisada: false },
];

const PULSO: MetricaPulso[] = [
  { id: "p1", label: "Participación en Comunidad", valor: 78, valorColor: "text-fuchsia-400", gradiente: "from-fuchsia-600 to-tertiary-container" },
  { id: "p2", label: "Entregas a tiempo", valor: 94, valorColor: "text-tertiary", gradiente: "from-tertiary to-primary" },
  { id: "p3", label: "Comprensión promedio", valor: 81, valorColor: "text-blue-400", gradiente: "from-blue-500 to-fuchsia-400" },
];

const ACCESOS: AccesoRapido[] = [
  { id: "perfiles", icono: "manage_accounts", label: "Gestionar perfiles" },
  { id: "calendario", icono: "event_note", label: "Ver calendario" },
  { id: "reporte", icono: "file_download", label: "Exportar reporte" },
];

// ─── PÁGINA ─────────────────────────────────────────────

export default function PanelInstitucionalPage() {
  const { navegar, cerrarSesion } = useNavegacion();
  const [usuario] = useState({
    nombre: "Directora Romero",
    rol: "admin-academico" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Romero",
  });

  const [busqueda, setBusqueda] = useState("");
  const [alertas, setAlertas] = useState<Alerta[]>(ALERTAS_INICIALES);

  const marcarAvisada = (id: string) =>
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, avisada: true } : a)));

  const manejarAcceso = (id: string) => {
    const rutas: Record<string, string> = {
      perfiles: "/admin/perfiles",
      calendario: "/comunidad/calendario",
      reporte: "/comunidad/reportes-auditoria",
    };
    navegar(rutas[id] ?? id);
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        rutaActiva="/admin/panel"
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
              <p className="text-slate-400 font-medium">Colegio San Martín — Ciclo 2025</p>
            </header>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {METRICAS.map((m) => (
                <TarjetaMetrica key={m.id} {...m} />
              ))}
            </div>

            {/* Distribución en 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ActividadHoy items={ACTIVIDAD} />
                <AlertasSistema alertas={alertas} onAvisar={marcarAvisada} />
              </div>

              <div className="space-y-6">
                <PulsoInstitucion metricas={PULSO} />
                <AccesosRapidos accesos={ACCESOS} onAccion={manejarAcceso} />

                {/* Elemento decorativo institucional */}
                <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 to-indigo-900 rounded-[20px] p-6 h-48 flex flex-col justify-end">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <span className="material-symbols-outlined text-8xl">school</span>
                  </div>
                  <p className="relative z-10 text-white font-headline font-bold text-lg leading-tight">
                    Misión Académica 2025
                  </p>
                  <p className="relative z-10 text-white/80 text-xs mt-2 italic">
                    "Excelencia en la educación a través de la conexión humana."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
