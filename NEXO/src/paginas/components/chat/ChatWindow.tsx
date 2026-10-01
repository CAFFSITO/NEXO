import { useState, useRef, useEffect } from "react";
import { descargarArchivo } from "../../../servicios/reportes";
import { Cargando, Fallo } from "../shared/EstadoCarga";

interface Message {
  id: string;
  sender: "user" | "other";
  contenido: string;
  timestamp: string;
  autor?: string;
  archivo?: string | null;
  archivoId?: string | null;
}
interface ChatWindowProps {
  nombreContacto: string;
  avatarUrl?: string;
  messages: Message[];
  onSendMessage?: (mensaje: string, archivo?: File | null) => void | Promise<void>;
  soloLectura?: boolean;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onVolver?: () => void;
  subtitulo?: string;
}

export default function ChatWindow({ nombreContacto, avatarUrl, messages, onSendMessage, soloLectura = false, cargando = false, error, onReintentar, onVolver, subtitulo }: ChatWindowProps) {
  const [mensaje, setMensaje] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (enviando || !onSendMessage || (!mensaje.trim() && !archivo)) return;
    setEnviando(true);
    setAviso(null);
    try {
      await onSendMessage(mensaje.trim(), archivo);
      setMensaje("");
      setArchivo(null);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo enviar. Tu mensaje sigue acá para reintentar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#190d2d]">
      <header className="bg-[#1C1030]/90 border-b border-white/10 p-4 flex items-center gap-3 shrink-0">
        {onVolver && <button onClick={onVolver} className="md:hidden p-2 rounded-xl hover:bg-white/5 text-slate-300" aria-label="Volver a conversaciones"><span className="material-symbols-outlined">arrow_back</span></button>}
        <div className="w-11 h-11 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" /> : <span className="font-bold">{nombreContacto.charAt(0)}</span>}
        </div>
        <div className="min-w-0"><h2 className="font-bold text-white truncate">{nombreContacto}</h2><p className="text-xs text-slate-400 mt-0.5">{subtitulo ?? (soloLectura ? "Conversación supervisada" : "Mensajería de tu comunidad educativa")}</p></div>
      </header>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Mensajes" aria-live="polite">
        {cargando ? <Cargando que="los mensajes" /> : error ? <Fallo error={error} onReintentar={onReintentar} /> : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3"><span className="material-symbols-outlined text-4xl text-primary/70">waving_hand</span><p className="text-sm">Todavía no hay mensajes.<br />{soloLectura ? "Los mensajes de esta conversación aparecerán acá." : "Escribí el primero para empezar la conversación."}</p></div>
        ) : messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] lg:max-w-lg px-4 py-3 rounded-2xl ${msg.sender === "user" ? "bg-[#8032a3] text-white rounded-br-md" : "bg-[#2D1B4E] text-slate-200 rounded-bl-md border border-white/5"}`}>
              {msg.sender === "other" && msg.autor && <p className="text-xs text-teal-300 font-bold mb-1">{msg.autor}</p>}
              {msg.contenido && <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{msg.contenido}</p>}
              {msg.archivo && (msg.archivoId ? <button className="mt-2 w-full flex items-center gap-2 rounded-xl p-3 bg-black/15 text-left hover:bg-black/25" onClick={() => descargarArchivo(msg.archivoId!, msg.archivo!).catch((e: unknown) => setAviso(e instanceof Error ? e.message : "No se pudo descargar el adjunto."))}><span className="material-symbols-outlined text-lg">download</span><span className="text-sm break-all">{msg.archivo}</span></button> : <p className="text-xs mt-2 break-all">Adjunto: {msg.archivo}</p>)}
              <time className="text-[11px] opacity-60 mt-1.5 block text-right">{msg.timestamp}</time>
            </div>
          </div>
        ))}
      </div>
      {aviso && <div role="alert" className="mx-4 mb-3 text-sm text-red-300 border border-red-400/20 bg-red-500/10 rounded-xl px-4 py-3">{aviso}</div>}
      {soloLectura || !onSendMessage ? <div className="border-t border-white/10 p-4 text-center text-xs text-slate-400">Estás viendo esta conversación en modo de lectura.</div> : (
        <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }} className="bg-[#1C1030] border-t border-white/10 p-3 sm:p-4 shrink-0">
          {archivo && <div className="flex items-center gap-2 mb-3 text-sm text-slate-300 bg-[#2D1B4E] rounded-xl px-3 py-2"><span className="material-symbols-outlined text-base">attach_file</span><span className="truncate flex-1">{archivo.name}</span><button type="button" disabled={enviando} onClick={() => setArchivo(null)} aria-label="Quitar adjunto"><span className="material-symbols-outlined text-base">close</span></button></div>}
          <div className="flex items-center gap-2">
            <input ref={inputArchivo} type="file" className="hidden" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <button type="button" disabled={enviando} onClick={() => inputArchivo.current?.click()} className="p-2 rounded-xl text-slate-400 hover:bg-white/5" aria-label="Adjuntar archivo"><span className="material-symbols-outlined">attach_file</span></button>
            <input aria-label="Mensaje" maxLength={10000} placeholder="Escribí un mensaje…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={enviando} className="min-w-0 flex-1 bg-[#2D1B4E] text-white rounded-xl px-4 py-3 border border-white/10 placeholder-slate-500 focus:ring-2 focus:ring-primary/50" />
            <button type="submit" disabled={enviando || (!mensaje.trim() && !archivo)} className="p-3 bg-primary hover:brightness-110 text-white rounded-xl disabled:opacity-40" aria-label={enviando ? "Enviando mensaje" : "Enviar mensaje"}><span className={`material-symbols-outlined ${enviando ? "animate-spin" : ""}`}>{enviando ? "progress_activity" : "send"}</span></button>
          </div>
        </form>
      )}
    </section>
  );
}
