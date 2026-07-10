import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TarjetaComunicado from "./components/familia-comunicados/TarjetaComunicado";
import type { Comunicado } from "./components/familia-comunicados/tipos";
import { useNavegacion } from "../navegacion";

// dd/MM del día actual, para registrar cuándo se marcó como leído
const HOY_CORTO = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

// Comunicados semilla (replican el mock del Portal de Familia)
const COMUNICADOS_INICIALES: Comunicado[] = [
  {
    id: "c1",
    titulo: "Reunión de padres — 4° B",
    fecha: "14/05/2025",
    fechaISO: "2025-05-14",
    emisor: "Administración Académica",
    emisorTipo: "admin-academico",
    adjunto: { nombre: "circular_reunion_mayo.pdf", icono: "attachment" },
    leido: false,
  },
  {
    id: "c2",
    titulo: "Aviso: cambio de horario martes 20/05",
    fecha: "12/05/2025",
    fechaISO: "2025-05-12",
    emisor: "Preceptor — Carlos Pereyra",
    emisorTipo: "preceptor",
    leido: false,
  },
  {
    id: "c3",
    titulo: "Acto del 25 de Mayo — Información",
    fecha: "05/05/2025",
    fechaISO: "2025-05-05",
    emisor: "Administración Académica",
    emisorTipo: "admin-academico",
    leido: true,
    fechaLeido: "06/05",
  },
  {
    id: "c4",
    titulo: "Bienvenida al segundo trimestre",
    fecha: "28/04/2025",
    fechaISO: "2025-04-28",
    emisor: "Preceptor — Carlos Pereyra",
    emisorTipo: "preceptor",
    leido: true,
    fechaLeido: "29/04",
  },
];

export default function FamiliaComunicadosPage() {
  const [usuario] = useState({
    nombre: "Fam. Rossi",
    rol: "familia" as const,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Rossi",
  });

  const [comunicados, setComunicados] = useState<Comunicado[]>(COMUNICADOS_INICIALES);
  const { navegar, cerrarSesion } = useNavegacion();

  // ── Marcar como leído: registra la fecha del día ──
  const marcarLeido = (id: string) =>
    setComunicados((prev) =>
      prev.map((c) => (c.id === id ? { ...c, leido: true, fechaLeido: HOY_CORTO } : c)),
    );

  // ── Derivados: separa nuevos de anteriores, ordenando por fecha desc ──
  const { nuevos, anteriores } = useMemo(() => {
    const ordenados = [...comunicados].sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));
    return {
      nuevos: ordenados.filter((c) => !c.leido),
      anteriores: ordenados.filter((c) => c.leido),
    };
  }, [comunicados]);

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        rutaActiva="/comunicados"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-fuchsia-500 font-headline font-extrabold text-xl tracking-tight">
              Comunicados
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Colegio San Martín — Familia de Julieta Rossi, 4° B
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                aria-label="Notificaciones"
                className="material-symbols-outlined text-slate-400 opacity-80 hover:opacity-100 cursor-pointer"
              >
                notifications
              </button>
              {nuevos.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-fuchsia-500 rounded-full" />
              )}
            </div>
            <button
              aria-label="Configuración"
              className="material-symbols-outlined text-slate-400 opacity-80 hover:opacity-100 cursor-pointer"
            >
              settings
            </button>
          </div>
        </header>

        {/* Content Area */}
        <section className="p-8 max-w-5xl mx-auto space-y-6">
          {/* Comunicados nuevos (no leídos) */}
          {nuevos.map((c) => (
            <TarjetaComunicado
              key={c.id}
              comunicado={c}
              onMarcarLeido={marcarLeido}
              onDescargarAdjunto={(id) => console.log("Descargar adjunto de:", id)}
            />
          ))}

          {nuevos.length === 0 && (
            <div className="bg-surface-container-low/40 rounded-xl p-8 text-center text-slate-400 text-sm">
              No tenés comunicados nuevos.
            </div>
          )}

          {/* Separador de anteriores */}
          {anteriores.length > 0 && (
            <div className="pt-4 flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase shrink-0">
                Anteriores
              </span>
              <div className="h-px bg-slate-800 w-full" />
            </div>
          )}

          {/* Comunicados anteriores (leídos) */}
          {anteriores.map((c) => (
            <TarjetaComunicado key={c.id} comunicado={c} onMarcarLeido={marcarLeido} />
          ))}
        </section>

        {/* Tarjeta flotante — Próximo Evento */}
        <div className="fixed bottom-8 right-8 bg-surface-container-highest p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-xs animate-pulse hover:animate-none">
          <div className="w-12 h-12 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400">
            <span className="material-symbols-outlined">event_upcoming</span>
          </div>
          <div>
            <p className="text-xs font-bold text-fuchsia-300">Próximo Evento</p>
            <p className="text-xs text-slate-300">Entrega de Boletines: Viernes 23 de Mayo</p>
          </div>
        </div>
      </main>
    </div>
  );
}
