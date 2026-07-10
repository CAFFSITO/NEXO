import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaHabito from "./components/objetivos/TarjetaHabito";
import ModalNuevoHabito from "./components/objetivos/ModalNuevoHabito";
import type { HabitoDetallado } from "./components/objetivos/tiposDashboard";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

// historial: últimos 10 días (true = cumplido). El último elemento es "hoy".
const HABITOS_INICIALES: HabitoDetallado[] = [
  {
    id: "lectura",
    nombre: "Lectura diaria",
    frecuencia: "diario",
    rachaDias: 8,
    cumplidoHoy: true,
    historial: [true, true, false, true, true, true, true, true, true, false],
  },
  {
    id: "repaso",
    nombre: "Repaso de notas",
    frecuencia: "diario",
    rachaDias: 3,
    cumplidoHoy: true,
    historial: [false, true, false, true, false, false, true, true, true, false],
  },
  {
    id: "meditacion",
    nombre: "Meditación",
    frecuencia: "diario",
    rachaDias: 0,
    cumplidoHoy: false,
    historial: Array<boolean>(10).fill(false),
  },
  {
    id: "ejercicio",
    nombre: "Ejercicio físico",
    frecuencia: "diario",
    rachaDias: 12,
    cumplidoHoy: true,
    historial: [true, true, true, true, false, true, true, true, true, true],
  },
];

// Sub-navegación del módulo Objetivos (igual que el resto de la sección)
const SUBNAV = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

const RUTA_ACTIVA = "/objetivos/habitos";

// ─── PÁGINA ─────────────────────────────────────────────

export default function HabitosPage() {
  const [habitos, setHabitos] = useState<HabitoDetallado[]>(HABITOS_INICIALES);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [usuario] = useState({
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
  });

  // Hábitos con racha activa esta semana (para la tarjeta de insight del pie)
  const habitosActivos = useMemo(
    () => habitos.filter((h) => h.rachaDias > 0).length,
    [habitos]
  );

  // ── Acciones ──

  // Check-in de hoy: invierte el cumplimiento, refleja el cambio en el último
  // punto del historial y ajusta la racha (suma si cumple, resta si lo deshace).
  const toggleHabito = (id: string) => {
    setHabitos((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const cumplidoHoy = !h.cumplidoHoy;
        const rachaDias = cumplidoHoy ? h.rachaDias + 1 : Math.max(0, h.rachaDias - 1);
        const historial = [...h.historial];
        if (historial.length > 0) historial[historial.length - 1] = cumplidoHoy;
        return { ...h, cumplidoHoy, rachaDias, historial };
      })
    );
  };

  const agregarHabito = (habito: HabitoDetallado) => {
    setHabitos((prev) => [...prev, habito]);
    setModalAbierto(false);
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        rutaActiva="/objetivos"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Objetivos Personales" subtitle="Hábitos" />

        {/* Sub-navegación del módulo */}
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
          <section className="max-w-5xl w-full mx-auto space-y-8">
            {/* Encabezado de la vista */}
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black font-headline text-white tracking-tight">
                  Mis Hábitos de Estudio
                </h1>
                <p className="text-white/60 mt-1">
                  Mantené la constancia y alcanzá tus metas académicas.
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(true)}
                className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-[#C548F5]/20"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nuevo Hábito
              </button>
            </div>

            {/* Grilla de hábitos */}
            {habitos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habitos.map((habito) => (
                  <TarjetaHabito key={habito.id} habito={habito} onToggle={toggleHabito} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-white/40">
                Todavía no tenés hábitos. Creá el primero con “Nuevo Hábito”.
              </div>
            )}

            {/* Tarjeta de insight (pie) */}
            <footer className="mt-12">
              <div className="bg-[#1C1030] border border-[#C548F5]/20 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#C548F5]/20 flex items-center justify-center text-[#C548F5] shrink-0">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>
                <p className="text-white/80 font-medium">
                  Mantuviste{" "}
                  <span className="text-[#C548F5] font-bold">
                    {habitosActivos} {habitosActivos === 1 ? "hábito activo" : "hábitos activos"}
                  </span>{" "}
                  esta semana. {habitosActivos > 0 ? "¡Vas muy bien!" : "¡Empezá hoy!"}
                </p>
              </div>
            </footer>
          </section>
        </div>
      </main>

      {modalAbierto && (
        <ModalNuevoHabito onGuardar={agregarHabito} onCerrar={() => setModalAbierto(false)} />
      )}
    </div>
  );
}
