import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TarjetaComunicado from "./components/familia-comunicados/TarjetaComunicado";
import type { Comunicado } from "./components/familia-comunicados/tipos";
import { useNavegacion } from "../navegacion";
import {
  useComunicados,
  marcarComunicadoLeido,
  responderComunicado,
} from "../servicios/calendario";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";
import { urlDescarga } from "../servicios/archivos";
import { verEnfoque, limpiarEnfoque, marcarEnfoque } from "../servicios/enfoque";
import { avisarCambioNotificaciones } from "../servicios/notificaciones";
import { aFecha } from "../servicios/fechas";

// Se fueron los cuatro comunicados inventados (todos de mayo de 2025). Los
// reales viven en la tabla `comunicados` y le llegan a la familia según su
// destino (toda la institución o el curso de su hijo/a). "Leído" es una fila en
// `comunicado_lecturas` por persona, así que el globito de no leídos ya no
// miente (Error 10.A.3).

export default function FamiliaComunicadosPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { comunicados: datos, cargando, error, recargar } = useComunicados();
  const { institucion } = useInstitucion();

  // Objetivo pendiente de una notificación de comunicado: scrollear hasta ESE
  // comunicado y resaltarlo un instante. Se lee al montar (sin consumir) y se
  // resuelve cuando cargan los datos; si ya no está, se avisa honesto.
  const objetivoComunicado = useRef(verEnfoque("comunicado"));
  const objetivoResuelto = useRef(false);
  const [resaltadoId, setResaltadoId] = useState<string | null>(null);
  const [objetivoNoDisponible, setObjetivoNoDisponible] = useState(false);

  useEffect(() => {
    if (objetivoResuelto.current || !objetivoComunicado.current) return;
    if (cargando || !datos) return; // esperar a que carguen los comunicados
    objetivoResuelto.current = true;
    limpiarEnfoque(); // consumir: una sola vez
    const id = objetivoComunicado.current;
    if (!datos.some((c) => c.id === id)) {
      setObjetivoNoDisponible(true);
      return;
    }
    setResaltadoId(id);
    // Esperar un frame a que las tarjetas estén en el DOM antes de scrollear.
    requestAnimationFrame(() => {
      document.getElementById(`comunicado-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setResaltadoId(null), 2500);
    return () => clearTimeout(t);
  }, [cargando, datos]);

  // Marcar como leído escribe una fila en `comunicado_lecturas` (Error 10.A.3):
  // el comunicado pasa a "Anteriores" y el globito de no leídos baja. Se recarga
  // para que se vea sin refrescar la página.
  const marcarLeido = async (id: string) => {
    await marcarComunicadoLeido(id);
    recargar();
    avisarCambioNotificaciones();
  };

  // "Responder" no escribe en el comunicado (Error 10.A.2): abre/retoma el chat
  // privado con quien lo emitió y lo marca como leído. Se lleva a la familia a
  // su mensajería con la conversación ya asegurada en el servidor.
  // El chat de la familia es el chat compartido real: "/familia/chat" no
  // existe en el mapa de rutas y navegar ahí era un clic muerto (Error 12.8).
  const responder = async (id: string) => {
    const { conversacionId } = await responderComunicado(id);
    marcarEnfoque("conversacion", conversacionId);
    navegar("/chat");
  };

  // Descargar el adjunto descarga de verdad: /api/archivos/:id, con el
  // permiso validado por el servidor antes de entregar el archivo.
  const descargarAdjunto = (id: string) => {
    const c = (datos ?? []).find((x) => x.id === id);
    if (c?.archivoId) window.open(urlDescarga(c.archivoId), "_blank");
  };

  // Adapta los comunicados del servidor a lo que dibuja la tarjeta.
  const { nuevos, anteriores } = useMemo(() => {
    const lista: Comunicado[] = (datos ?? []).map((c) => ({
      id: c.id,
      titulo: c.titulo,
      contenido: c.contenido,
      fecha: aFecha(c.enviadoEn)?.toLocaleDateString("es-AR") ?? "",
      fechaISO: c.enviadoEn.slice(0, 10),
      emisor: c.emisor,
      emisorTipo: c.emisorRol === "preceptor" ? "preceptor" : "admin-academico",
      adjunto: c.archivo && c.archivoId ? { nombre: c.archivo, icono: "attachment" } : undefined,
      leido: c.leido,
      fijado: c.fijado,
    }));
    // Los fijados por la dirección van arriba (dato real); dentro de cada grupo,
    // por fecha descendente.
    const ordenados = lista.sort((a, b) =>
      Number(b.fijado ?? false) - Number(a.fijado ?? false) ||
      b.fechaISO.localeCompare(a.fechaISO),
    );
    return {
      nuevos: ordenados.filter((c) => !c.leido),
      anteriores: ordenados.filter((c) => c.leido),
    };
  }, [datos]);

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen">
        {/* Top App Bar */}
        <header className="flex justify-between items-center w-full px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-fuchsia-500 font-headline font-extrabold text-xl tracking-tight">
              Comunicados
            </h1>
            {/* Decía "Colegio San Martín — Familia de Julieta Rossi, 4° B" a
                mano. El colegio sale de la base; el nombre, de la sesión. */}
            <p className="text-[11px] text-slate-400 font-medium">
              {[subtituloInstitucional(institucion), usuario.nombre].filter(Boolean).join(" — ")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                aria-label="Notificaciones" onClick={() => navegar("/notificaciones")}
                className="material-symbols-outlined text-slate-400 opacity-80 hover:opacity-100 cursor-pointer"
              >
                notifications
              </button>
              {nuevos.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-fuchsia-500 rounded-full" />
              )}
            </div>
            <button
              aria-label="Configuración" onClick={() => navegar("/configuracion")}
              className="material-symbols-outlined text-slate-400 opacity-80 hover:opacity-100 cursor-pointer"
            >
              settings
            </button>
          </div>
        </header>

        {/* Content Area */}
        <section className="p-8 max-w-5xl mx-auto space-y-6">
          {objetivoNoDisponible && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              <span>Ese comunicado ya no está disponible.</span>
              <button
                onClick={() => setObjetivoNoDisponible(false)}
                className="text-amber-200/80 hover:text-amber-100"
                aria-label="Cerrar aviso"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {cargando && <Cargando que="tus comunicados" />}
          {error && <Fallo error={error} onReintentar={recargar} />}

          {/* Comunicados nuevos (no leídos) */}
          {!cargando && !error && nuevos.map((c) => (
            <div
              key={c.id}
              id={`comunicado-${c.id}`}
              className={`rounded-2xl transition-all ${resaltadoId === c.id ? "ring-2 ring-[#C548F5] ring-offset-2 ring-offset-[#1C1030]" : ""}`}
            >
              <TarjetaComunicado
                comunicado={c}
                onMarcarLeido={marcarLeido}
                onResponder={responder}
                onDescargarAdjunto={descargarAdjunto}
              />
            </div>
          ))}

          {!cargando && !error && nuevos.length === 0 && (
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
            <div
              key={c.id}
              id={`comunicado-${c.id}`}
              className={`rounded-2xl transition-all ${resaltadoId === c.id ? "ring-2 ring-[#C548F5] ring-offset-2 ring-offset-[#1C1030]" : ""}`}
            >
              <TarjetaComunicado
                comunicado={c}
                onMarcarLeido={marcarLeido}
                onResponder={responder}
                onDescargarAdjunto={descargarAdjunto}
              />
            </div>
          ))}
        </section>

        {/* Acá había una tarjeta flotante con un "Próximo Evento: Entrega de
            Boletines, Viernes 23 de Mayo" escrito a mano, que se mostraba
            siempre igual. El próximo evento real de la familia vive en su
            calendario (que ya lee de la base); repetirlo acá inventado solo
            podía contradecirlo, así que se saca. */}
      </main>
    </div>
  );
}
