import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import GrillaCalendario from "./components/calendario/GrillaCalendario";
import GrillaSemanal from "./components/calendario/GrillaSemanal";
import VistaAgenda from "./components/calendario/VistaAgenda";
import PanelProximosEventos from "./components/calendario/PanelProximosEventos";
import FeriadosDelMes from "./components/calendario/FeriadosDelMes";
import ModalNuevoEvento from "./components/calendario/ModalNuevoEvento";
import ModalDetalleEvento from "./components/calendario/ModalDetalleEvento";
import { toISO } from "./components/calendario/fechas";
import type { EventoCalendario } from "./components/calendario/tipos";
import { useNavegacion } from "../navegacion";
import {
  usarCalendario,
  crearEvento,
  borrarEvento,
  type DatosNuevoEvento,
  type Visibilidad,
} from "../servicios/calendario";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

type Vista = "mes" | "semana" | "agenda";

// Fecha de hoy (resaltado "hoy" en la grilla)
const HOY = new Date();
const HOY_ISO = toISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());

// Se fueron los cuatro eventos y los dos feriados de ABRIL DE 2025 escritos a
// mano, y con ellos el mes de arranque clavado en abril de 2025 (Error 6.E.10):
// abrir el calendario era viajar más de un año al pasado. Ahora abre en el mes
// de hoy y los eventos salen de la base, ya filtrados por quién puede verlos.

export default function CalendarioInstitucionalPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "admin-academico";

  const { datos, cargando, error, recargar } = usarCalendario();

  // Quién puede crear/editar lo decide el SERVIDOR (ROLES_EDITAN en
  // calendario.js): dirección, preceptor, centro y profesor, cada uno con las
  // capas de visibilidad que le corresponden. Antes esto estaba clavado en
  // "solo admin-academico", y el preceptor —que también llega a esta pantalla—
  // no podía crear el evento de su curso aunque el servidor se lo permitía.
  const puedeEditar = datos?.puedeEditar ?? false;

  // El calendario abre en el mes actual (Error 6.E.10), no en un mes fijo.
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [mes, setMes] = useState(HOY.getMonth());
  const [vista, setVista] = useState<Vista>("mes");

  // Los eventos vienen del servidor, ya filtrados por quién puede verlos. Crear
  // y borrar escriben de verdad (Etapa 7) y después se vuelve a pedir la lista:
  // la fuente de verdad es la base, no un estado local que la copie.
  const eventos = useMemo<EventoCalendario[]>(
    () =>
      datos?.eventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        fecha: e.fecha,
        tipo: e.tipo,
        horaInicio: e.horaInicio,
        horaFin: e.horaFin,
        lugar: e.lugar,
        descripcion: e.descripcion,
        creador: e.creador,
      })) ?? [],
    [datos],
  );
  const feriados = datos?.feriados ?? [];

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

  // Prefijo "AAAA-MM" del mes mostrado, para los feriados de ese mes.
  const prefijoMes = `${anio}-${String(mes + 1).padStart(2, "0")}`;

  // Feriados del mes mostrado (reales, de la tabla `feriados`)
  const feriadosDelMes = useMemo(
    () => feriados.filter((f) => f.fecha.startsWith(prefijoMes)),
    [feriados, prefijoMes],
  );

  // ── CRUD real (Etapa 7) ──
  // La fila viaja a la base con sus capas de visibilidad; el modal muestra el
  // error del servidor si algo falla, y acá se cierra y se recarga si salió bien.
  const guardarEvento = async (nuevo: DatosNuevoEvento, visibilidades: Visibilidad[]) => {
    await crearEvento(nuevo, visibilidades);
    setModalNuevo({ abierto: false, fecha: "" });
    recargar();
  };

  const eliminarEvento = async (id: string) => {
    try {
      await borrarEvento(id);
    } finally {
      // Salió bien o el servidor lo rechazó: en ambos casos se vuelve a pedir la
      // lista, que es la única fuente de verdad (si lo rechazó, el evento sigue).
      setEventoDetalle(null);
      recargar();
    }
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

        {cargando && (
          <div className="p-8">
            <Cargando que="el calendario" />
          </div>
        )}
        {error && (
          <div className="p-8">
            <Fallo error={error} onReintentar={recargar} />
          </div>
        )}

        <div className={`p-8 grid grid-cols-12 gap-8 ${cargando || error ? "hidden" : ""}`}>
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
            <GrillaSemanal
              fechaAncla={anio === HOY.getFullYear() && mes === HOY.getMonth() ? HOY_ISO : toISO(anio, mes, 1)}
              eventos={eventos}
              hoyISO={HOY_ISO}
              onSeleccionarDia={puedeEditar ? abrirNuevoEvento : () => {}}
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
            {/* Se quitó la tarjeta "Módulo de Planificación Anual — Sincronizado
                con el Ministerio" (Error 6.E.6): prometía una integración que no
                existe. No se reemplaza por nada: no había función detrás. */}
          </div>
        </div>
      </main>

      {/* Modales */}
      {modalNuevo.abierto && (
        <ModalNuevoEvento
          fechaInicial={modalNuevo.fecha}
          onGuardar={guardarEvento}
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
