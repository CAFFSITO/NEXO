import type { ReactNode } from "react";
import { Cargando, Fallo } from "../shared/EstadoCarga";

interface Conversation { id: string; nombre: string; ultimoMensaje: string; timestamp: string; avatarUrl?: string; noLeidos?: number; icono?: string }
interface ConversationListProps {
  conversaciones: Conversation[];
  conversacionActiva?: string;
  onSelectConversacion?: (id: string) => void;
  busqueda: string;
  onBuscar: (texto: string) => void;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onNueva?: () => void;
  /** Canales, foros y ayuda (los espacios de la escuela). */
  onExplorar?: () => void;
  /** Lo que va arriba de la lista (por ejemplo, activar las alertas). */
  aviso?: ReactNode;
}

/** La lista de conversaciones, como la de WhatsApp: foto, nombre, último mensaje, hora y no leídos. */
export default function ConversationList({ conversaciones, conversacionActiva, onSelectConversacion, busqueda, onBuscar, cargando, error, onReintentar, onNueva, onExplorar, aviso }: ConversationListProps) {
  return (
    <section className="wa-lista" aria-label="Conversaciones">
      <div className="wa-lista-cab">
        <h1>Mensajes</h1>
        <div className="wa-acciones">
          {onExplorar && <button type="button" onClick={onExplorar} className="av-icono-boton" aria-label="Explorar canales, foros y ayuda" title="Canales, foros y ayuda"><span className="material-symbols-outlined" aria-hidden="true">forum</span></button>}
          {onNueva && <button type="button" onClick={onNueva} className="av-icono-boton" aria-label="Nueva conversación" title="Nueva conversación"><span className="material-symbols-outlined" aria-hidden="true">edit_square</span></button>}
        </div>
      </div>
      <div className="wa-buscador">
        <label className="av-buscar-caja">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input className="av-buscar" aria-label="Buscar conversación" value={busqueda} onChange={(e) => onBuscar(e.target.value)} placeholder="Buscar una conversación" />
        </label>
      </div>
      {aviso}
      <div className="wa-chats">
        {cargando ? <Cargando que="tus conversaciones" /> : error ? <div className="p-3"><Fallo error={error} onReintentar={onReintentar} /></div> : conversaciones.length === 0 ? (
          <div className="av-vacio">
            <span className="material-symbols-outlined" aria-hidden="true">{busqueda ? "search_off" : "forum"}</span>
            <strong>{busqueda ? "Sin resultados" : "Todavía no hay conversaciones"}</strong>
            <p className="text-sm">{busqueda ? "No encontramos conversaciones con ese nombre." : "Escribile a alguien de tu comunidad para empezar."}</p>
            {!busqueda && onNueva && <button type="button" onClick={onNueva} className="av-boton chico mt-1">Escribir un mensaje</button>}
          </div>
        ) : conversaciones.map((conv) => (
          <button key={conv.id} type="button" onClick={() => onSelectConversacion?.(conv.id)} aria-current={conversacionActiva === conv.id ? "true" : undefined} className="wa-chat">
            <span className="wa-avatar">
              {conv.avatarUrl ? <img src={conv.avatarUrl} alt="" className="h-full w-full object-cover" /> : conv.icono ? <span className="material-symbols-outlined" aria-hidden="true">{conv.icono}</span> : <span className="text-[16px] font-semibold">{conv.nombre.charAt(0).toUpperCase()}</span>}
            </span>
            <span className="wa-chat-cuerpo">
              <span className="wa-chat-fila">
                <span className="wa-chat-nombre">{conv.nombre}</span>
                <span className={`wa-chat-hora ${(conv.noLeidos ?? 0) > 0 ? "!text-primary font-semibold" : ""}`}>{conv.timestamp}</span>
              </span>
              <span className="wa-chat-previa">
                <span>{conv.ultimoMensaje || "Sin mensajes todavía"}</span>
                {(conv.noLeidos ?? 0) > 0 && <span className="ml-auto nexo-nav-badge" aria-label={`${conv.noLeidos} mensajes sin leer`}>{conv.noLeidos}</span>}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
