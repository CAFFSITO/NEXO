import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import GrillaCalendario from "./components/calendario/GrillaCalendario";
import VistaAgenda from "./components/calendario/VistaAgenda";
import PanelProximosEventos from "./components/calendario/PanelProximosEventos";
import FeriadosDelMes from "./components/calendario/FeriadosDelMes";
import ModalNuevoEvento from "./components/calendario/ModalNuevoEvento";
import ModalDetalleEvento from "./components/calendario/ModalDetalleEvento";
import { toISO } from "./components/calendario/fechas";
import type { EventoCalendario, Feriado } from "./components/calendario/tipos";
import { useNavegacion } from "../navegacion";

type Vista = "mes" | "semana" | "agenda";

// Fecha de hoy (resaltado "hoy" en la grilla)
const HOY = new Date();
const HOY_ISO = toISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());

// Eventos semilla (Abril 2025, replican el mock original)
const EVENTOS_INICIALES: EventoCalendario[] = [
  { id: "e1", titulo: "Parciales Matemática 4°B", fecha: "2025-04-15", tipo: "examen", horaInicio: "08:30", horaFin: "10:00", icono: "schedule" },
  { id: "e2", titulo: "Conferencia Neurociencia", fecha: "2025-04-17", tipo: "conferencia", lugar: "Auditorio Central", icono: "location_on" },
  { id: "e3", titulo: "Feria de Ciencias", fecha: "2025-04-22", tipo: "evento", lugar: "Toda la institución", icono: "groups" },
  { id: "e4", titulo: "Reunión de padres", fecha: "2025-04-25", tipo: "reunion", lugar: "Google Meet", icono: "videocam" },
];

const FERIADOS: Feriado[] = [
  { fecha: "2025-04-02", nombre: "Día del Veterano y de los Caídos en la Guerra de Malvinas" },
  { fecha: "2025-04-18", nombre: "Viernes Santo (Feriado Nacional)" },
];

export default function CalendarioInstitucionalPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "admin-academico";
  // CRUD del calendario institucional: solo Admin Académica. El resto lo lee.
  const puedeEditar = rol === "admin-academico";

  // Mes mostrado: arranca en Abril 2025 (donde viven los eventos semilla)
  const [anio, setAnio] = useState(2025);
  const [mes, setMes] = useState(3); // 0-11, 3 = Abril
  const [vista, setVista] = useState<Vista>("mes");

  const [eventos, setEventos] = useState<EventoCalendario[]>(EVENTOS_INICIALES);
  const [modalNuevo, setModalNuevo] = useState<{ abierto: boolean; fecha: string }>({
    abierto: false,
    fecha: "",
  });
  const [eventoDetalle, setEventoDetalle] = useState<EventoCalendario | null>(null);

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

  // ── Eventos derivados ──
  const eventosOrdenados = useMemo(
    () => [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [eventos],
  );

  // Próximos eventos: desde hoy en adelante, máximo 4
  const proximosEventos = useMemo(
    () => eventosOrdenados.filter((ev) => ev.fecha >= HOY_ISO).slice(0, 4),
    [eventosOrdenados],
  );

  // Eventos del mes mostrado (para vistas agenda/semana)
  const prefijoMes = `${anio}-${String(mes + 1).padStart(2, "0")}`;
  const eventosDelMes = useMemo(
    () => eventosOrdenados.filter((ev) => ev.fecha.startsWith(prefijoMes)),
    [eventosOrdenados, prefijoMes],
  );

  // Feriados del mes mostrado
  const feriadosDelMes = useMemo(
    () => FERIADOS.filter((f) => f.fecha.startsWith(prefijoMes)),
    [prefijoMes],
  );

  // ── CRUD ──
  const crearEvento = (nuevo: Omit<EventoCalendario, "id">) => {
    setEventos((prev) => [...prev, { ...nuevo, id: crypto.randomUUID() }]);
    setModalNuevo({ abierto: false, fecha: "" });
  };

  const eliminarEvento = (id: string) => {
    setEventos((prev) => prev.filter((ev) => ev.id !== id));
    setEventoDetalle(null);
  };

  const abrirNuevoEvento = (fecha: string) =>
    setModalNuevo({ abierto: true, fecha: fecha || toISO(anio, mes, 1) });

  const VISTAS: { id: Vista; label: string }[] = [
    { id: "mes", label: "Mes" },
    { id: "semana", label: "Semana" },
    { id: "agenda", label: "Agenda" },
  ];

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/comunidad/calendario"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-8 h-20 bg-[#1C1030]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
          <h2 className="text-2xl font-bold text-white font-headline">Calendario Institucional</h2>

          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVista(v.id)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    vista === v.id
                      ? "font-bold bg-[#C548F5] text-white"
                      : "font-medium text-slate-400 hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {puedeEditar && (
              <button
                onClick={() => abrirNuevoEvento("")}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#C548F5] hover:bg-[#b03bd9] text-black font-bold rounded-full transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nuevo evento
              </button>
            )}
          </div>
        </header>

        <div className="p-8 grid grid-cols-12 gap-8">
          {/* Vista principal según el modo seleccionado */}
          {vista === "mes" && (
            <GrillaCalendario
              anio={anio}
              mes={mes}
              eventos={eventos}
              hoyISO={HOY_ISO}
              onMesAnterior={irMesAnterior}
              onMesSiguiente={irMesSiguiente}
              onSeleccionarDia={puedeEditar ? abrirNuevoEvento : () => {}}
              onSeleccionarEvento={setEventoDetalle}
            />
          )}

          {vista === "agenda" && (
            <VistaAgenda
              titulo="Agenda completa"
              eventos={eventosOrdenados}
              onSeleccionarEvento={setEventoDetalle}
            />
          )}

          {vista === "semana" && (
            <VistaAgenda
              titulo={`Eventos de ${prefijoMes.split("-").reverse().join("/")}`}
              eventos={eventosDelMes}
              onSeleccionarEvento={setEventoDetalle}
            />
          )}

          {/* Sidebar derecho */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            <PanelProximosEventos
              eventos={proximosEventos}
              onSeleccionarEvento={setEventoDetalle}
              onVerTodos={() => setVista("agenda")}
            />

            <FeriadosDelMes feriados={feriadosDelMes} />

            {/* Tarjeta visual / acceso a planificación */}
            <div className="relative overflow-hidden rounded-3xl p-6 h-40 group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C548F5] to-[#4900a6] opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <span className="material-symbols-outlined text-white text-3xl">school</span>
                <div>
                  <p className="text-white font-bold font-headline leading-tight">
                    Módulo de Planificación Anual
                  </p>
                  <p className="text-white/70 text-xs mt-1">Sincronizado con el Ministerio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modales */}
      {modalNuevo.abierto && (
        <ModalNuevoEvento
          fechaInicial={modalNuevo.fecha}
          onGuardar={crearEvento}
          onCerrar={() => setModalNuevo({ abierto: false, fecha: "" })}
        />
      )}

      {eventoDetalle && (
        <ModalDetalleEvento
          evento={eventoDetalle}
          onEliminar={eliminarEvento}
          onCerrar={() => setEventoDetalle(null)}
          puedeEliminar={puedeEditar}
        />
      )}
    </div>
  );
}
