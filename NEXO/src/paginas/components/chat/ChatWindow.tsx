import { useState, useRef, useEffect, type ReactNode } from "react";
import { descargarArchivo } from "../../../servicios/reportes";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { urlPreview, urlDescarga } from "../../../servicios/archivos";
import GrabadorAudio from "./GrabadorAudio";
import Selector from "../shared/Selector";
import OpcionesRespuesta from "./OpcionesRespuesta";

interface Message {
  reacciones?: { emoji: string; usuarioId: number; nombre: string }[];
  prioridad?: "estandar" | "urgente";
  archivoTipo?: string | null;
  respuestaA?: { id: string; autor: string; contenido: string } | null;
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
  onSendMessage?: (mensaje: string, archivo?: File | null, opciones?: { prioridad: "estandar" | "urgente"; respuestaA?: string }) => void | Promise<void>;
  soloLectura?: boolean;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onVolver?: () => void;
  subtitulo?: string;
  herramientas?: ReactNode;
  hayAnteriores?: boolean;
  cargandoAnteriores?: boolean;
  errorAnteriores?: string | null;
  onAnteriores?: () => Promise<void>;
}

export default function ChatWindow({ nombreContacto, avatarUrl, messages, onSendMessage, soloLectura = false, cargando = false, error, onReintentar, onVolver, subtitulo, herramientas, hayAnteriores, cargandoAnteriores, errorAnteriores, onAnteriores }: ChatWindowProps) {
  const [mensaje, setMensaje] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [prioridad, setPrioridad] = useState<"estandar" | "urgente">("estandar");
  const [respuesta, setRespuesta] = useState<Message | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const ultimoId = messages.at(-1)?.id;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "instant" });
  }, [ultimoId]);
  const cargarMas = async () => {
    const area = scrollRef.current;
    const altura = area?.scrollHeight ?? 0;
    const posicion = area?.scrollTop ?? 0;
    await onAnteriores?.();
    requestAnimationFrame(() => { if (area) area.scrollTop = posicion + area.scrollHeight - altura; });
  };

  const copiar = async (texto: string, id: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); }
    catch { setAviso("No se pudo copiar automáticamente. Podés seleccionar el texto o descargarlo."); }
  };
  const descargarTexto = (msg: Message) => {
    const url = URL.createObjectURL(new Blob([msg.contenido], { type: "text/plain;charset=utf-8" }));
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = `mensaje-${msg.id}.txt`;
    enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSend = async () => {
    if (enviando || grabando || !onSendMessage || (!mensaje.trim() && !archivo)) return;
    setEnviando(true);
    setAviso(null);
    try {
      await onSendMessage(mensaje.trim(), archivo, { prioridad, respuestaA: respuesta?.id });
      setMensaje("");
      setArchivo(null);
      setRespuesta(null);
      setPrioridad("estandar");
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo enviar. Tu mensaje sigue acá para reintentar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-background">
      <header className="bg-fondo/90 border-b border-white/10 p-4 flex items-center gap-3 shrink-0">
        {onVolver && <button onClick={onVolver} className="md:hidden p-2 rounded-xl hover:bg-white/5 text-slate-300" aria-label="Volver a conversaciones"><span className="material-symbols-outlined">arrow_back</span></button>}
        <div className="w-11 h-11 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" /> : <span className="font-bold">{nombreContacto.charAt(0)}</span>}
        </div>
        <div className="min-w-0"><h2 className="font-bold text-white truncate">{nombreContacto}</h2><p className="text-xs text-slate-400 mt-0.5">{subtitulo ?? (soloLectura ? "Conversación supervisada" : "Mensajería de tu comunidad educativa")}</p></div>
      </header>
      {herramientas}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Mensajes" aria-live="polite">
        {hayAnteriores && <button type="button" onClick={() => void cargarMas()} disabled={cargandoAnteriores} className="block mx-auto text-primary px-4 py-2 rounded-xl bg-primary/10">{cargandoAnteriores ? "Cargando historial…" : "Cargar mensajes anteriores"}</button>}
        {errorAnteriores && <p role="alert" className="text-red-300 text-sm">{errorAnteriores}</p>}
        {cargando ? <Cargando que="los mensajes" /> : error ? <Fallo error={error} onReintentar={onReintentar} /> : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3"><span className="material-symbols-outlined text-4xl text-primary/70">waving_hand</span><p className="text-sm">Todavía no hay mensajes.<br />{soloLectura ? "Los mensajes de esta conversación aparecerán acá." : "Escribí el primero para empezar la conversación."}</p></div>
        ) : messages.map((msg) => (
          <div key={msg.id} id={`mensaje-${msg.id}`} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] lg:max-w-lg px-4 py-3 rounded-2xl ${msg.sender === "user" ? "bg-[#8032a3] text-white rounded-br-md" : "bg-lienzo text-slate-200 rounded-bl-md border border-white/5"}`}>
              {msg.sender === "other" && msg.autor && <p className="text-xs text-teal-300 font-bold mb-1">{msg.autor}</p>}
              {msg.prioridad === "urgente" && <p className="text-xs font-bold text-rose-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-base">notification_important</span>Urgente</p>}
              {msg.respuestaA && <button type="button" onClick={() => document.getElementById(`mensaje-${msg.respuestaA!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="block w-full text-left border-l-2 border-teal-300 bg-black/15 rounded-r-lg p-2 mb-2 text-xs"><strong>{msg.respuestaA.autor}</strong><span className="block line-clamp-2 whitespace-pre-wrap">{msg.respuestaA.contenido}</span></button>}
              {msg.contenido && <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{msg.contenido}</p>}
              {msg.archivoId && msg.archivoTipo?.startsWith("audio/") && <audio className="mt-2 w-full max-w-full" controls preload="none" src={urlPreview(msg.archivoId)} aria-label={`Audio: ${msg.archivo}`} />}
              {msg.archivo && (msg.archivoId ? <button className="mt-2 w-full flex items-center gap-2 rounded-xl p-3 bg-black/15 text-left hover:bg-black/25" onClick={() => descargarArchivo(msg.archivoId!, msg.archivo!).catch((e: unknown) => setAviso(e instanceof Error ? e.message : "No se pudo descargar el adjunto."))}><span className="material-symbols-outlined text-lg">download</span><span className="text-sm break-all">{msg.archivo}</span></button> : <p className="text-xs mt-2 break-all">Adjunto: {msg.archivo}</p>)}
              <time className="text-[11px] opacity-60 mt-1.5 block text-right">{msg.timestamp}</time>
              {!!msg.reacciones?.length && <div className="flex flex-wrap gap-1 mt-2" aria-label="Reacciones al mensaje">{msg.reacciones.map((r) => <span key={r.usuarioId} title={r.nombre} aria-label={`${r.nombre}: ${r.emoji}`} className="rounded-full bg-black/20 px-2 py-1">{r.emoji}</span>)}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-white/80">
                {!soloLectura && onSendMessage && <button type="button" disabled={enviando || grabando} onClick={() => { setRespuesta(msg); textoRef.current?.focus(); }}>Responder</button>}
                {msg.contenido && <><button type="button" onClick={() => void copiar(msg.contenido, msg.id)}>{copiado === msg.id ? "Copiado" : "Copiar texto"}</button><button type="button" onClick={() => descargarTexto(msg)}>Descargar texto</button></>}
                {msg.archivoId && <button type="button" onClick={() => void copiar(new URL(urlDescarga(msg.archivoId!), window.location.origin).href, `archivo-${msg.id}`)}>{copiado === `archivo-${msg.id}` ? "Enlace copiado" : "Copiar enlace"}</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {aviso && <div role="alert" className="mx-4 mb-3 text-sm text-red-300 border border-red-400/20 bg-red-500/10 rounded-xl px-4 py-3">{aviso}</div>}
      {soloLectura || !onSendMessage ? <div className="border-t border-white/10 p-4 text-center text-xs text-slate-400">Estás viendo esta conversación en modo de lectura.</div> : (
        <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }} className="bg-fondo border-t border-white/10 p-3 sm:p-4 shrink-0">
          {respuesta && <div className="mb-2 text-slate-200"><OpcionesRespuesta disabled={enviando || grabando} onElegir={(t) => { setMensaje(t); textoRef.current?.focus(); }} /></div>}
          {respuesta && <div className="flex items-center gap-2 border-l-2 border-primary bg-lienzo rounded-lg px-3 py-2 mb-2 text-sm text-slate-300"><div className="min-w-0 flex-1"><strong>Respondiendo a {respuesta.sender === "user" ? "tu mensaje" : respuesta.autor ?? nombreContacto}</strong><p className="truncate">{respuesta.contenido || respuesta.archivo}</p></div><button type="button" disabled={enviando} aria-label="Cancelar respuesta" onClick={() => setRespuesta(null)}>✕</button></div>}
          {archivo && <div className="flex items-center gap-2 mb-3 text-sm text-slate-300 bg-lienzo rounded-xl px-3 py-2"><span className="material-symbols-outlined text-base">attach_file</span><span className="truncate flex-1">{archivo.name}</span><button type="button" disabled={enviando} onClick={() => setArchivo(null)} aria-label="Quitar adjunto"><span className="material-symbols-outlined text-base">close</span></button></div>}
          {archivo?.type.startsWith("audio/") && <AudioLocal archivo={archivo} />}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
            <GrabadorAudio onArchivo={setArchivo} onOcupado={setGrabando} onError={setAviso} disabled={enviando || !!archivo} />
            <label className="flex items-center gap-2 text-slate-300">Notificación
              <Selector aria-label="Prioridad del mensaje" value={prioridad} disabled={enviando} onChange={(e) => setPrioridad(e.target.value as "estandar" | "urgente")} className="bg-lienzo rounded-lg px-2 py-2 border border-white/10">
                <option value="estandar">Estándar</option><option value="urgente">Urgente · alarma</option>
              </Selector>
            </label>
          </div>
          <p className={`hidden sm:block text-xs mb-2 ${prioridad === "urgente" ? "text-rose-300" : "text-slate-400"}`}>{prioridad === "urgente" ? "Alarma repetida hasta confirmar la lectura. Usala para mensajes que requieren atención inmediata." : "Aviso visible durante 30 segundos y sonido durante 8 segundos; queda en Notificaciones."}</p>
          <div className="flex items-center gap-2">
            <input ref={inputArchivo} type="file" className="hidden" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <button type="button" disabled={enviando || grabando} onClick={() => inputArchivo.current?.click()} className="p-2 rounded-xl text-slate-400 hover:bg-white/5" aria-label="Adjuntar archivo"><span className="material-symbols-outlined">attach_file</span></button>
            <textarea ref={textoRef} rows={1} aria-label="Mensaje" maxLength={10000} placeholder="Escribí un mensaje…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={enviando} className="min-w-0 flex-1 resize-none bg-lienzo text-white rounded-xl px-4 py-3 border border-white/10 placeholder-slate-500 focus:ring-2 focus:ring-primary/50" />
            <button type="submit" disabled={enviando || grabando || (!mensaje.trim() && !archivo)} className="p-3 bg-primary hover:brightness-110 text-white rounded-xl disabled:opacity-40" aria-label={enviando ? "Enviando mensaje" : "Enviar mensaje"}><span className={`material-symbols-outlined ${enviando ? "animate-spin" : ""}`}>{enviando ? "progress_activity" : "send"}</span></button>
          </div>
        </form>
      )}
    </section>
  );
}

function AudioLocal({ archivo }: { archivo: File }) {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(archivo);
    const elemento = audio.current;
    if (elemento) elemento.src = url;
    return () => { elemento?.pause(); URL.revokeObjectURL(url); };
  }, [archivo]);
  return <audio ref={audio} controls className="w-full h-9 mb-2" aria-label="Escuchar audio antes de enviar" />;
}
