import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import GrillaMensual from "./components/familia-calendario/GrillaMensual";
import TarjetaEventoFamilia from "./components/familia-calendario/TarjetaEventoFamilia";
import LeyendaCalendario from "./components/familia-calendario/LeyendaCalendario";
import ModalDetalleEvento from "./components/familia-calendario/ModalDetalleEvento";
import { toISO } from "./components/calendario/fechas";
import type { EventoFamilia } from "./components/familia-calendario/tipos";
import { useNavegacion } from "../navegacion";

type Vista = "mes" | "agenda";

const HOY = new Date();
const HOY_ISO = toISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());

// Eventos semilla (Mayo 2025, replican el mock de Familia)
const EVENTOS_INICIALES: EventoFamilia[] = [
  {
    id: "e1",
    titulo: "Jornada de capacitación docente",
    fecha: "2025-05-20",
    tipo: "aviso",
    etiqueta: "Aviso",
    leido: true,
  },
  {
    id: "e2",
    titulo: "Acto del 25 de Mayo",
    fecha: "2025-05-23",
    tipo: "aviso",
    etiqueta: "Acto escolar",
    leido: false,
    lugar: "Patio central",
  },
  {
    id: "e3",
    titulo: "Reunión de padres — 4° B",
    fecha: "2025-05-28",
    tipo: "reunion",
    etiqueta: "Reunión",
    leido: false,
    requiereConfirmacion: true,
    confirmado: false,
    lugar: "Aula 4° B",
    horaInicio: "18:00",
    horaFin: "19:30",
  },
  {
    id: "e4",
    titulo: "Inicio período de exámenes",
    fecha: "2025-06-02",
    tipo: "examen",
    etiqueta: "Exámenes",
    leido: false,
  },
  {
    id: "e5",
    titulo: "Festival de fin de trimestre",
    fecha: "2025-06-06",
    tipo: "especial",
    etiqueta: "Evento especial",
    leido: false,
    lugar: "Salón de actos",
  },
];

export default function FamiliaCalendarioPage() {
  const [usuario] = useState({
    nombre: "Fam. Rossi",
    rol: "familia" as const,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Rossi",
  });

  // Mes mostrado: arranca en Mayo 2025 (donde viven los eventos semilla)
  const [anio, setAnio] = useState(2025);
  const [mes, setMes] = useState(4); // 0-11, 4 = Mayo
  const [vista, setVista] = useState<Vista>("mes");

  const [eventos, setEventos] = useState<EventoFamilia[]>(EVENTOS_INICIALES);
  const [eventoDetalle, setEventoDetalle] = useState<EventoFamilia | null>(null);

  // ── Navegación de meses ──
  const irMesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAnio((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mes === 11) {
      setMes(0);
      setAnio((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  // ── Acciones de solo lectura ──
  const marcarLeido = (id: string) =>
    setEventos((prev) => prev.map((ev) => (ev.id === id ? { ...ev, leido: true } : ev)));

  const confirmarAsistencia = (id: string) => {
    setEventos((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, confirmado: true, leido: true } : ev)),
    );
    // Mantiene sincronizado el modal abierto, si corresponde
    setEventoDetalle((det) =>
      det && det.id === id ? { ...det, confirmado: true, leido: true } : det,
    );
  };

  // Abrir detalle marca el evento como leído
  const abrirDetalle = (evento: EventoFamilia) => {
    marcarLeido(evento.id);
    setEventoDetalle({ ...evento, leido: true });
  };

  // ── Eventos derivados ──
  const eventosOrdenados = useMemo(
    () => [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [eventos],
  );

  // Próximos eventos: desde hoy en adelante (máximo 4). Si no hay futuros
  // respecto de la fecha real, se listan los del mes mostrado.
  const proximosEventos = useMemo(() => {
    const futuros = eventosOrdenados.filter((ev) => ev.fecha >= HOY_ISO);
    return (futuros.length > 0 ? futuros : eventosOrdenados).slice(0, 4);
  }, [eventosOrdenados]);

  const { navegar, cerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        rutaActiva="/comunidad/calendario"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-6 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-black text-white font-headline">Calendario Institucional</h1>
            <p className="text-xs text-gray-400 font-medium">Colegio San Martín — Ciclo 2025</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-[#2D1B4E] p-1 rounded-full">
              {(["mes", "agenda"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                    vista === v
                      ? "bg-[#C548F5] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {v === "mes" ? "Mensual" : "Agenda"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              <button
                aria-label="Notificaciones"
                className="material-symbols-outlined hover:text-white transition-colors"
              >
                notifications
              </button>
              <button
                aria-label="Configuración"
                className="material-symbols-outlined hover:text-white transition-colors"
              >
                settings
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Vista Mensual: grilla + próximos eventos */}
          {vista === "mes" && (
            <>
              <GrillaMensual
                anio={anio}
                mes={mes}
                eventos={eventos}
                hoyISO={HOY_ISO}
                onMesAnterior={irMesAnterior}
                onMesSiguiente={irMesSiguiente}
                onSeleccionarEvento={abrirDetalle}
              />

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 font-headline">
                    <span className="material-symbols-outlined text-[#C548F5]">event_upcoming</span>
                    Próximos eventos
                  </h3>
                </div>
                <div className="grid gap-4">
                  {proximosEventos.map((ev) => (
                    <TarjetaEventoFamilia
                      key={ev.id}
                      evento={ev}
                      onAbrir={abrirDetalle}
                      onConfirmarAsistencia={confirmarAsistencia}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Vista Agenda: todos los eventos ordenados por fecha */}
          {vista === "agenda" && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-headline">
                <span className="material-symbols-outlined text-[#C548F5]">calendar_view_day</span>
                Agenda completa
              </h3>
              <div className="grid gap-4">
                {eventosOrdenados.map((ev) => (
                  <TarjetaEventoFamilia
                    key={ev.id}
                    evento={ev}
                    onAbrir={abrirDetalle}
                    onConfirmarAsistencia={confirmarAsistencia}
                  />
                ))}
              </div>
            </section>
          )}

          <LeyendaCalendario />
        </div>
      </main>

      {eventoDetalle && (
        <ModalDetalleEvento
          evento={eventoDetalle}
          onConfirmarAsistencia={confirmarAsistencia}
          onCerrar={() => setEventoDetalle(null)}
        />
      )}
    </div>
  );
}
