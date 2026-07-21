import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import GrillaMensual from "./components/familia-calendario/GrillaMensual";
import TarjetaEventoFamilia from "./components/familia-calendario/TarjetaEventoFamilia";
import LeyendaCalendario from "./components/familia-calendario/LeyendaCalendario";
import ModalDetalleEvento from "./components/familia-calendario/ModalDetalleEvento";
import { toISO } from "./components/calendario/fechas";
import {
  familiaEvento,
  PALETA_FAMILIA,
  type EventoFamilia,
} from "./components/familia-calendario/tipos";
import { useNavegacion } from "../navegacion";
import { usarCalendario } from "../servicios/calendario";
import { subtituloInstitucional, usarInstitucion } from "../servicios/institucion";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

type Vista = "mes" | "agenda";

const HOY = new Date();
const HOY_ISO = toISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());

// Se fueron los cinco eventos inventados de mayo/junio de 2025 y el mes de
// arranque clavado en mayo de 2025. La familia ve los mismos eventos que le
// llegan por `/api/calendario` (el servidor ya aplica quién puede ver qué), y
// el calendario abre en el mes de hoy (Error 6.E.10).

export default function FamiliaCalendarioPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = usarCalendario();
  const { institucion } = usarInstitucion();

  // Abre en el mes actual, no en un mes fijo del pasado.
  const [anio, setAnio] = useState(HOY.getFullYear());
  const [mes, setMes] = useState(HOY.getMonth());
  const [vista, setVista] = useState<Vista>("mes");

  const [eventoDetalle, setEventoDetalle] = useState<EventoFamilia | null>(null);

  // Los eventos de la base, vestidos para esta vista. "leído" y "confirmar
  // asistencia" son estados por familia que todavía no se guardan (Etapa 7): se
  // muestran como no leídos, sin inventar un estado que no existe.
  const eventos = useMemo<EventoFamilia[]>(() => {
    return (datos?.eventos ?? []).map((e) => {
      const tipo = familiaEvento(e.tipo);
      return {
        id: e.id,
        titulo: e.titulo,
        fecha: e.fecha,
        tipo,
        etiqueta: PALETA_FAMILIA[tipo].label,
        leido: false,
        lugar: e.lugar,
        horaInicio: e.horaInicio,
        horaFin: e.horaFin,
      };
    });
  }, [datos]);

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

  const abrirDetalle = (evento: EventoFamilia) => setEventoDetalle(evento);

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

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-6 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-black text-white font-headline">Calendario Institucional</h1>
            {/* Decía "Colegio San Martín — Ciclo 2025" a mano (Error 13.7). */}
            <p className="text-xs text-gray-400 font-medium">{subtituloInstitucional(institucion)}</p>
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
          {cargando && <Cargando que="el calendario" />}
          {error && <Fallo error={error} onReintentar={recargar} />}

          {/* Vista Mensual: grilla + próximos eventos */}
          {!cargando && !error && vista === "mes" && (
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
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Vista Agenda: todos los eventos ordenados por fecha */}
          {!cargando && !error && vista === "agenda" && (
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
          onCerrar={() => setEventoDetalle(null)}
        />
      )}
    </div>
  );
}
