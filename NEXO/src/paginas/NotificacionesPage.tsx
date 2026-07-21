// src/paginas/NotificacionesPage.tsx
// La sección Notificaciones real (Etapa 6, sección 14.15, Error 9.D.1).
//
// Antes esta dirección llevaba a un cartel de "en construcción": el ítem del
// menú del bibliotecario no abría nada. Ahora es una pantalla de verdad, común a
// todos los perfiles, que lee las notificaciones de quien mira (la campana y su
// lista). Tocar una la marca leída y —si tiene a dónde ir— navega al objeto.

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import {
  usarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  type Notificacion,
} from "../servicios/notificaciones";

// A dónde lleva cada tipo de objeto al tocar la notificación. Es aproximado a
// propósito: llevamos a la sección correcta (el chat, las tareas, el calendario)
// aunque todavía no podamos abrir el elemento exacto. Un tipo desconocido no
// navega: solo se marca leída.
const RUTA_POR_OBJETO: Record<string, string> = {
  conversacion: "/chat",
  tarea: "/portafolio/mis-tareas",
  comunicado: "/comunicados",
  recurso: "/biblioteca/cola-revision",
  evento: "/comunidad/calendario",
};

const ICONO_POR_TIPO: Record<string, string> = {
  mensaje: "chat",
  correccion: "grading",
  comunicado: "announcement",
  recurso: "menu_book",
  evento: "event",
  denuncia: "flag",
};

export default function NotificacionesPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { notificaciones, cargando, error, recargar } = usarNotificaciones();

  if (!usuario) return null;

  const sinLeer = (notificaciones ?? []).filter((n) => !n.leida).length;

  const abrir = async (n: Notificacion) => {
    if (!n.leida) {
      try {
        await marcarNotificacionLeida(n.id);
      } catch {
        // Si no se pudo marcar, igual intentamos navegar: no bloqueamos al usuario.
      }
    }
    const destino = n.objetoTipo ? RUTA_POR_OBJETO[n.objetoTipo] : undefined;
    if (destino) navegar(destino);
    else recargar();
  };

  const marcarTodas = async () => {
    try {
      await marcarTodasLeidas();
    } finally {
      recargar();
    }
  };

  return (
    <div className="flex bg-[#190d2d] min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Notificaciones" />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black font-headline text-white tracking-tight">
                  Notificaciones
                </h1>
                <p className="text-slate-400 font-medium">
                  {sinLeer > 0 ? `${sinLeer} sin leer` : "Estás al día"}
                </p>
              </div>
              {sinLeer > 0 && (
                <button
                  onClick={marcarTodas}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-sm font-medium text-primary hover:bg-primary/30 transition"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {cargando && <p className="text-slate-400">Cargando…</p>}
            {error && <p className="text-red-400">{error}</p>}

            {notificaciones && notificaciones.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <span className="material-symbols-outlined text-5xl">notifications_off</span>
                <p className="mt-4">No tenés notificaciones.</p>
              </div>
            )}

            <div className="space-y-2">
              {(notificaciones ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-lg border transition ${
                    n.leida
                      ? "bg-[#1C1030] border-[#3b2f50] hover:bg-[#2D1B4E]/40"
                      : "bg-primary/10 border-primary/40 hover:bg-primary/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-primary mt-0.5">
                    {ICONO_POR_TIPO[n.tipo] ?? "notifications"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{n.titulo}</p>
                    {n.cuerpo && <p className="text-sm text-slate-400 truncate">{n.cuerpo}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(n.creadoEn).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!n.leida && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
