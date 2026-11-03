// Una conversación de Mensajes, como en WhatsApp: cabecera con la foto y el
// nombre, burbujas (las mías a la derecha), un menú por mensaje (responder,
// copiar, descargar) y abajo un solo campo: clip, texto, "urgente", y el
// micrófono o el botón de enviar.

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import { descargarArchivo } from "../../../servicios/reportes";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { urlPreview, urlDescarga } from "../../../servicios/archivos";
import GrabadorAudio from "./GrabadorAudio";
import OpcionesRespuesta from "./OpcionesRespuesta";
import Desplegable from "../shared/Desplegable";
import "../anuncios/anuncios.css";

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
  /** Una barra debajo de la cabecera (búsqueda, enlaces del canal). */
  herramientas?: ReactNode;
  /** Botones a la derecha de la cabecera. */
  acciones?: ReactNode;
  hayAnteriores?: boolean;
  cargandoAnteriores?: boolean;
  errorAnteriores?: string | null;
  onAnteriores?: () => Promise<void>;
}

/** El color del nombre de cada persona en un grupo (siempre el mismo para la misma persona). */
const COLORES_AUTOR = ["#0e7490", "#7c3aed", "#c2410c", "#047857", "#be185d", "#1d4ed8", "#a16207", "#4338ca"];
const colorDe = (nombre: string) => COLORES_AUTOR[[...nombre].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORES_AUTOR.length];

function Burbuja({ msg, primera, nombreContacto, puedeResponder, onResponder, onAviso }: {
  msg: Message; primera: boolean; nombreContacto: string; puedeResponder: boolean;
  onResponder: (m: Message) => void; onAviso: (texto: string) => void;
}) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [copiado, setCopiado] = useState("");
  const mio = msg.sender === "user";
  const copiar = async (texto: string, que: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(que); window.setTimeout(() => setCopiado(""), 1500); }
    catch { onAviso("No se pudo copiar automáticamente. Podés seleccionar el texto o descargarlo."); }
  };
  const descargarTexto = () => {
    const url = URL.createObjectURL(new Blob([msg.contenido], { type: "text/plain;charset=utf-8" }));
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = `mensaje-${msg.id}.txt`;
    enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const hayMenu = puedeResponder || Boolean(msg.contenido) || Boolean(msg.archivoId);
  return (
    <div className={`wa-fila ${mio ? "saliente" : "entrante"} ${primera ? "primera" : ""} ${msg.reacciones?.length ? "con-reaccion" : ""}`}>
      <div id={`mensaje-${msg.id}`} className="wa-burbuja">
        {!mio && msg.autor && primera && <span className="wa-burbuja-autor" style={{ color: colorDe(msg.autor) }}>{msg.autor}</span>}
        {msg.prioridad === "urgente" && <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-rose-600"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">notification_important</span>Urgente</p>}
        {msg.respuestaA && (
          <button type="button" onClick={() => document.getElementById(`mensaje-${msg.respuestaA!.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="mb-1 block w-full rounded-md border-l-4 border-primary bg-black/5 px-2 py-1.5 text-left text-[13px]">
            <strong className="block text-primary">{msg.respuestaA.autor}</strong>
            <span className="line-clamp-2 whitespace-pre-wrap text-on-surface-variant">{msg.respuestaA.contenido}</span>
          </button>
        )}
        {msg.contenido && <p className="wa-burbuja-texto">{msg.contenido}</p>}
        {msg.archivoId && msg.archivoTipo?.startsWith("audio/") && <audio className="mt-1 w-[280px] max-w-full" controls preload="none" src={urlPreview(msg.archivoId)} aria-label={`Audio: ${msg.archivo}`} />}
        {msg.archivo && (msg.archivoId
          ? <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-lg bg-black/5 p-2.5 text-left hover:bg-black/10" onClick={() => descargarArchivo(msg.archivoId!, msg.archivo!).catch((e: unknown) => onAviso(e instanceof Error ? e.message : "No se pudo descargar el adjunto."))}>
              <span className="material-symbols-outlined text-primary" aria-hidden="true">description</span>
              <span className="min-w-0 flex-1 break-all text-sm font-medium">{msg.archivo}</span>
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">download</span>
            </button>
          : <p className="mt-1 break-all text-xs">Adjunto: {msg.archivo}</p>)}
        <span className="wa-burbuja-pie">
          {copiado && <span role="status">{copiado} ·</span>}
          <time>{msg.timestamp}</time>
        </span>
        {hayMenu && (
          <button type="button" className="wa-menu-boton" aria-label="Opciones del mensaje" aria-haspopup="menu" aria-expanded={Boolean(menu)} onClick={(e) => setMenu(menu ? null : e.currentTarget)}>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>expand_more</span>
          </button>
        )}
        {!!msg.reacciones?.length && (
          <span className="wa-reacciones" aria-label="Reacciones al mensaje">
            {msg.reacciones.map((r) => <span key={r.usuarioId} title={r.nombre} aria-label={`${r.nombre}: ${r.emoji}`}>{r.emoji}</span>)}
          </span>
        )}
      </div>
      {menu && (
        <Desplegable ancla={menu} onCerrar={() => setMenu(null)} alineado={mio ? "derecha" : "izquierda"} etiqueta="Opciones del mensaje">
          {puedeResponder && <button type="button" role="menuitem" onClick={() => onResponder(msg)}><span className="material-symbols-outlined" aria-hidden="true">reply</span>Responder</button>}
          {msg.contenido && <button type="button" role="menuitem" onClick={() => void copiar(msg.contenido, "Copiado")}><span className="material-symbols-outlined" aria-hidden="true">content_copy</span>Copiar texto</button>}
          {msg.contenido && <button type="button" role="menuitem" onClick={descargarTexto}><span className="material-symbols-outlined" aria-hidden="true">download</span>Descargar texto</button>}
          {msg.archivoId && <button type="button" role="menuitem" onClick={() => void copiar(new URL(urlDescarga(msg.archivoId!), window.location.origin).href, "Enlace copiado")}><span className="material-symbols-outlined" aria-hidden="true">link</span>Copiar enlace del archivo</button>}
        </Desplegable>
      )}
      <span className="sr-only">{mio ? "Mensaje tuyo" : `Mensaje de ${msg.autor ?? nombreContacto}`}</span>
    </div>
  );
}

export default function ChatWindow({ nombreContacto, avatarUrl, messages, onSendMessage, soloLectura = false, cargando = false, error, onReintentar, onVolver, subtitulo, herramientas, acciones, hayAnteriores, cargandoAnteriores, errorAnteriores, onAnteriores }: ChatWindowProps) {
  const [mensaje, setMensaje] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [prioridad, setPrioridad] = useState<"estandar" | "urgente">("estandar");
  const [respuesta, setRespuesta] = useState<Message | null>(null);
  const [grabando, setGrabando] = useState(false);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const ultimoId = messages.at(-1)?.id;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "instant" });
  }, [ultimoId]);
  // El campo crece con el texto, hasta un tope.
  useLayoutEffect(() => {
    const el = textoRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(150, el.scrollHeight)}px`;
  }, [mensaje]);

  const cargarMas = async () => {
    const area = scrollRef.current;
    const altura = area?.scrollHeight ?? 0;
    const posicion = area?.scrollTop ?? 0;
    await onAnteriores?.();
    requestAnimationFrame(() => { if (area) area.scrollTop = posicion + area.scrollHeight - altura; });
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

  const puedeResponder = !soloLectura && Boolean(onSendMessage);
  const hayAlgo = Boolean(mensaje.trim() || archivo);

  return (
    <section className="wa-conversacion">
      <header className="wa-conversacion-cab">
        {onVolver && <button type="button" onClick={onVolver} className="av-icono-boton wa-volver" aria-label="Volver a conversaciones"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <span className="wa-avatar chico">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-[15px] font-semibold">{nombreContacto.charAt(0).toUpperCase()}</span>}</span>
          <div className="min-w-0">
            <h2 className="truncate text-[15.5px] font-semibold text-on-surface">{nombreContacto}</h2>
            <p className="truncate text-[12.5px] text-on-surface-variant">{subtitulo ?? (soloLectura ? "Conversación supervisada" : "Mensajería de tu comunidad educativa")}</p>
          </div>
        </div>
        {acciones}
      </header>
      {herramientas}
      <div ref={scrollRef} className="wa-mensajes" role="log" aria-label="Mensajes" aria-live="polite">
        {hayAnteriores && <button type="button" onClick={() => void cargarMas()} disabled={cargandoAnteriores} className="wa-dia !font-semibold !text-primary">{cargandoAnteriores ? "Cargando historial…" : "Cargar mensajes anteriores"}</button>}
        {errorAnteriores && <p role="alert" className="wa-dia !text-error">{errorAnteriores}</p>}
        {cargando ? <Cargando que="los mensajes" /> : error ? <Fallo error={error} onReintentar={onReintentar} /> : messages.length === 0 ? (
          <p className="wa-aviso-sistema">
            <span className="material-symbols-outlined" aria-hidden="true">waving_hand</span>
            Todavía no hay mensajes. {soloLectura ? "Los mensajes de esta conversación aparecerán acá." : "Escribí el primero para empezar la conversación."}
          </p>
        ) : messages.map((msg, i) => {
          const previo = messages[i - 1];
          const primera = !previo || previo.sender !== msg.sender || previo.autor !== msg.autor;
          return <Burbuja key={msg.id} msg={msg} primera={primera} nombreContacto={nombreContacto} puedeResponder={puedeResponder}
            onResponder={(m) => { setRespuesta(m); textoRef.current?.focus(); }} onAviso={setAviso} />;
        })}
      </div>
      {aviso && <div role="alert" className="mx-3 mb-2 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{aviso}</div>}
      {!puedeResponder ? <p className="wa-solo-lectura">Estás viendo esta conversación en modo de lectura.</p> : (
        <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }} className="wa-escribir">
          {respuesta && (
            <div className="mb-2 rounded-lg bg-surface-container-low p-2">
              <div className="flex items-start gap-2 border-l-4 border-primary pl-2">
                <div className="min-w-0 flex-1 text-[13px]"><strong className="text-primary">Respondiendo a {respuesta.sender === "user" ? "tu mensaje" : respuesta.autor ?? nombreContacto}</strong><p className="truncate text-on-surface-variant">{respuesta.contenido || respuesta.archivo}</p></div>
                <button type="button" className="av-icono-boton" style={{ width: 28, height: 28 }} disabled={enviando} aria-label="Cancelar respuesta" onClick={() => setRespuesta(null)}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>close</span></button>
              </div>
              <div className="mt-2"><OpcionesRespuesta disabled={enviando || grabando} onElegir={(t) => { setMensaje(t); textoRef.current?.focus(); }} /></div>
            </div>
          )}
          {archivo && (
            <div className="wa-adjuntos-pendientes">
              <span className="wa-adjunto-pendiente"><span className="material-symbols-outlined" aria-hidden="true">{archivo.type.startsWith("audio/") ? "mic" : "attach_file"}</span><span>{archivo.name}</span>
                <button type="button" disabled={enviando} onClick={() => setArchivo(null)} aria-label="Quitar adjunto"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></span>
            </div>
          )}
          {archivo?.type.startsWith("audio/") && <AudioLocal archivo={archivo} />}
          <div className="wa-escribir-fila">
            {!grabando && (
              <div className="wa-campo">
                <input ref={inputArchivo} type="file" className="hidden" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                <button type="button" disabled={enviando} onClick={() => inputArchivo.current?.click()} className="av-icono-boton" aria-label="Adjuntar archivo" title="Adjuntar archivo"><span className="material-symbols-outlined" aria-hidden="true">attach_file</span></button>
                <textarea ref={textoRef} rows={1} aria-label="Mensaje" maxLength={10000} placeholder="Escribí un mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={enviando}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void handleSend(); } }} />
                <button type="button" className={`av-icono-boton ${prioridad === "urgente" ? "!text-rose-600 !bg-rose-500/10" : ""}`} disabled={enviando} aria-pressed={prioridad === "urgente"}
                  aria-label="Marcar como urgente" title={prioridad === "urgente" ? "Urgente: alarma repetida hasta confirmar la lectura" : "Marcar como urgente"}
                  onClick={() => setPrioridad((p) => (p === "urgente" ? "estandar" : "urgente"))}>
                  <span className="material-symbols-outlined" aria-hidden="true">notification_important</span>
                </button>
              </div>
            )}
            {!hayAlgo && !enviando
              ? <GrabadorAudio onArchivo={setArchivo} onOcupado={setGrabando} onError={setAviso} disabled={enviando || !!archivo} />
              : <button type="submit" disabled={enviando || grabando || !hayAlgo} className="wa-enviar" aria-label={enviando ? "Enviando mensaje" : "Enviar mensaje"}>
                  <span className={`material-symbols-outlined ${enviando ? "animate-spin" : ""}`} aria-hidden="true">{enviando ? "progress_activity" : "send"}</span>
                </button>}
          </div>
          {prioridad === "urgente" && <p className="wa-escribir-ayuda"><span className="!text-rose-600">Urgente: suena una alarma repetida hasta que confirmen la lectura. Usalo solo para lo que requiere atención inmediata.</span></p>}
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
  return <audio ref={audio} controls className="mb-2 h-9 w-full" aria-label="Escuchar audio antes de enviar" />;
}
