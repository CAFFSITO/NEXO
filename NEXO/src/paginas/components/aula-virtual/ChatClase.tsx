// ChatClase.tsx
// El chat de la clase en vivo (Error 3.B.7, sección 14.3 paso 8).
//
// NO es un chat nuevo: es EXACTAMENTE el chat de la Etapa 6 (14.2) apuntando a la
// conversación de tipo "clase" que el servidor arma al iniciarla. Por eso reusa
// el mismo servicio (`useMensajes`, `enviarMensaje`) y el mismo tubo en vivo:
// enviar, recibir y "marcar leído" ya funcionan sin escribir una línea nueva
// (principio de reutilización, sección 1.4).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enviarMensaje,
  marcarConversacionLeida,
  useMensajes,
} from "../../../servicios/chat";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";

interface ChatClaseProps {
  conversacionId: string;
}

export default function ChatClase({ conversacionId }: ChatClaseProps) {
  const { mensajes, recargar, error: errorCarga, cargando } = useMensajes(conversacionId);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  // Al abrir el chat, marcar leído (Error 2.F.5) para no arrastrar globitos.
  useEffect(() => {
    marcarConversacionLeida(conversacionId).catch(() => {});
  }, [conversacionId]);

  // Un mensaje nuevo de la clase llega por el mismo tubo del chat: recargar.
  const alRecibir = useCallback(
    (evento: EventoVivo) => {
      if (evento.tipo === "mensaje" && evento.conversacionId === conversacionId) {
        recargar();
        marcarConversacionLeida(conversacionId).catch(() => {});
      }
    },
    [conversacionId, recargar]
  );
  useTiempoReal(alRecibir);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true); setError("");
    try {
      await enviarMensaje(conversacionId, limpio);
      setTexto("");
      recargar();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje."); }
    finally { setEnviando(false); }
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-low/60 rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 text-xs font-bold text-slate-300 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">forum</span>
        Chat de la clase
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[120px]">
        {cargando && !mensajes && <p role="status" className="text-xs text-slate-400">Cargando mensajes…</p>}
        {(error || errorCarga) && <p role="alert" className="text-xs text-error">{error || errorCarga} <button onClick={recargar} className="underline">Reintentar</button></p>}
        {(mensajes ?? []).map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mio ? "items-end" : "items-start"}`}>
            {!m.mio && <span className="text-[10px] text-slate-400 px-1">{m.autor}</span>}
            <span
              className={`text-sm px-3 py-1.5 rounded-2xl max-w-[85%] break-words ${
                m.mio ? "bg-primary text-white" : "bg-white/10 text-slate-100"
              }`}
            >
              {m.contenido}
            </span>
          </div>
        ))}
        {mensajes && mensajes.length === 0 && (
          <p className="text-xs text-slate-500 text-center my-auto">
            Todavía nadie escribió en la clase.
          </p>
        )}
        <div ref={finRef} />
      </div>
      <form onSubmit={enviar} className="p-2 border-t border-white/5 flex gap-2">
        <input
          value={texto}
          disabled={enviando}
          aria-label="Mensaje a la clase"
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí a la clase…"
          className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 active:scale-95"
          aria-label="Enviar"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </form>
    </div>
  );
}
