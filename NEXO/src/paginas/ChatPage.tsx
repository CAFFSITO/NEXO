import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar, { type Rol } from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ConversationList from "./components/chat/ConversationList";
import ChatWindow from "./components/chat/ChatWindow";
import {
  usarConversaciones,
  usarMensajes,
  enviarMensaje,
  marcarConversacionLeida,
  type Mensaje,
} from "../servicios/chat";
import { normalizar } from "../servicios/biblioteca";
import { useTiempoReal } from "../servicios/tiempoReal";
import { avisarCambioNotificaciones } from "../servicios/notificaciones";

// Etapa 6: el chat pasa de ser una vitrina de lectura a mensajería real.
//   • Enviar guarda en `mensajes` y le llega al otro al instante (Error 2.F.4).
//   • Abrir una conversación la marca leída y borra su globito (Error 2.F.5).
//   • El clip adjunta archivos de verdad (Error 2.F.3).
//   • El buscador ya filtraba sin tildes desde la Etapa 2 (Error 2.F.1).
// El botón de llamar se había quitado en la Etapa 2 (Error 2.F.2).

export default function ChatPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol: Rol = usuario?.rol ?? "estudiante";

  const { conversaciones, recargar: recargarConversaciones } = usarConversaciones();
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // La conversación abierta: la elegida, o la primera de la lista al entrar.
  const activaId = conversacionActiva ?? conversaciones?.[0]?.id ?? null;
  const { mensajes, recargar: recargarMensajes } = usarMensajes(activaId);

  // Mensajes que llegaron en vivo mientras la conversación está abierta. Se
  // suman a los que trajo el servidor, sin recargar toda la pantalla.
  const [mensajesVivos, setMensajesVivos] = useState<Mensaje[]>([]);

  // Al cambiar de conversación: limpiar los vivos (son de la anterior) y marcarla
  // leída en el servidor. Marcarla leída borra su globito acá y en el menú.
  useEffect(() => {
    setMensajesVivos([]);
    if (!activaId) return;
    marcarConversacionLeida(activaId)
      .then(() => {
        recargarConversaciones();
        avisarCambioNotificaciones();
      })
      .catch(() => {
        // Si falla (por ejemplo sin permiso), no rompemos la pantalla: el hilo
        // igual se lee; solo no se baja el contador.
      });
  }, [activaId, recargarConversaciones]);

  // El tubo en vivo: cuando llega un mensaje, si es de la conversación abierta se
  // agrega al hilo al instante; en cualquier caso se refresca la lista para que
  // el globito y el último mensaje queden al día.
  useTiempoReal(
    useCallback(
      (evento) => {
        if (evento.tipo !== "mensaje") return;
        recargarConversaciones();
        if (evento.conversacionId === activaId && evento.mensaje) {
          const nuevo = evento.mensaje as Mensaje;
          setMensajesVivos((previos) =>
            previos.some((m) => m.id === nuevo.id) ? previos : [...previos, nuevo]
          );
          // Ya lo estoy viendo: marcar leído para que no quede como no leído.
          if (activaId) void marcarConversacionLeida(activaId).then(avisarCambioNotificaciones);
        }
      },
      [activaId, recargarConversaciones]
    )
  );

  const conversacionesFiltradas = useMemo(() => {
    const lista = conversaciones ?? [];
    const q = normalizar(busqueda.trim());
    if (!q) return lista;
    return lista.filter((c) => normalizar(c.nombre).includes(q));
  }, [conversaciones, busqueda]);

  const convActual = (conversaciones ?? []).find((c) => c.id === activaId) ?? null;

  // El hilo mostrado: lo que trajo el servidor + lo que llegó/mandé en vivo,
  // sin duplicar por id.
  const mensajesMostrados = useMemo(() => {
    const base = mensajes ?? [];
    const ids = new Set(base.map((m) => m.id));
    return [...base, ...mensajesVivos.filter((m) => !ids.has(m.id))];
  }, [mensajes, mensajesVivos]);

  const handleSendMessage = async (texto: string, archivo?: File | null) => {
    if (!activaId) return;
    const enviado = await enviarMensaje(activaId, texto, archivo);
    // Se pinta al instante y se actualiza la lista (último mensaje, orden).
    setMensajesVivos((previos) =>
      previos.some((m) => m.id === enviado.id) ? previos : [...previos, enviado]
    );
    recargarConversaciones();
    void recargarMensajes();
  };

  return (
    <div className="flex bg-[#1C1030] h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="ml-[220px] w-[calc(100%-220px)] flex h-full">
        <ConversationList
          conversaciones={conversacionesFiltradas.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            ultimoMensaje: c.ultimoMensaje,
            timestamp: "",
            avatarUrl: c.avatarUrl,
            noLeidos: c.noLeidos,
          }))}
          conversacionActiva={activaId ?? undefined}
          onSelectConversacion={setConversacionActiva}
          busqueda={busqueda}
          onBuscar={setBusqueda}
        />

        {convActual ? (
          <ChatWindow
            nombreContacto={convActual.nombre}
            avatarUrl={convActual.avatarUrl}
            messages={mensajesMostrados.map((m) => ({
              id: m.id,
              // "mío" o "de otro" lo decide el servidor comparando el autor con
              // quien mira: la pantalla ya no lo adivina de un campo escrito a
              // mano (que era la causa del diálogo cruzado del Error 2.F.6).
              sender: m.mio ? "user" : "other",
              contenido: m.archivo ? `📎 ${m.archivo}` : m.contenido,
              timestamp: new Date(m.enviadoEn).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#190d2d] text-gray-400">
            <p>Elegí una conversación para empezar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
