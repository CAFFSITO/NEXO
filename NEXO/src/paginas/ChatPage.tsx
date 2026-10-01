import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ConversationList from "./components/chat/ConversationList";
import ChatWindow from "./components/chat/ChatWindow";
import { useConversaciones, useMensajes, enviarMensaje, marcarConversacionLeida, useContactosChat, iniciarConversacion, type Mensaje } from "../servicios/chat";
import { normalizar } from "../servicios/biblioteca";
import { useTiempoReal } from "../servicios/tiempoReal";
import { avisarCambioNotificaciones } from "../servicios/notificaciones";
import { verEnfoque, limpiarEnfoque } from "../servicios/enfoque";
import { aInstante as comoFecha, textoRelativo } from "../servicios/fechas";
import { ROL_LABELS } from "./components/shared/roles";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

export default function ChatPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { conversaciones, cargando, error, recargar: recargarConversaciones } = useConversaciones();
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(() => verEnfoque("conversacion"));
  const [busqueda, setBusqueda] = useState("");
  const [nuevoChat, setNuevoChat] = useState(false);
  const [mensajesVivos, setMensajesVivos] = useState<Record<string, Mensaje[]>>({});
  const activaId = conversacionActiva ?? conversaciones?.[0]?.id ?? null;
  const { mensajes, cargando: cargandoMensajes, error: errorMensajes, recargar: recargarMensajes } = useMensajes(activaId);
  const convActual = conversaciones?.find((c) => c.id === activaId);

  useEffect(() => { limpiarEnfoque(); }, []);
  useEffect(() => {
    if (!activaId) return;
    marcarConversacionLeida(activaId).then(() => {
      recargarConversaciones();
      avisarCambioNotificaciones();
    }).catch(() => { /* El error del hilo se informa en la ventana. */ });
  }, [activaId, recargarConversaciones]);

  const agregarMensaje = useCallback((id: string, nuevo: Mensaje) => {
    setMensajesVivos((anteriores) => {
      const lista = anteriores[id] ?? [];
      return lista.some((m) => m.id === nuevo.id) ? anteriores : { ...anteriores, [id]: [...lista, nuevo] };
    });
  }, []);

  useTiempoReal(useCallback((evento) => {
    if (evento.tipo !== "mensaje") return;
    recargarConversaciones();
    if (evento.conversacionId === activaId && evento.mensaje) {
      agregarMensaje(activaId, evento.mensaje as Mensaje);
      void marcarConversacionLeida(activaId).then(avisarCambioNotificaciones).catch(() => {});
    }
  }, [activaId, agregarMensaje, recargarConversaciones]));

  const conversacionesFiltradas = useMemo(() => (conversaciones ?? []).filter((c) => normalizar(c.nombre).includes(normalizar(busqueda.trim()))), [conversaciones, busqueda]);
  const mensajesMostrados = useMemo(() => {
    const base = mensajes ?? [];
    const ids = new Set(base.map((m) => m.id));
    return [...base, ...(mensajesVivos[activaId ?? ""] ?? []).filter((m) => !ids.has(m.id))]
      .sort((a, b) => (comoFecha(a.enviadoEn)?.getTime() ?? 0) - (comoFecha(b.enviadoEn)?.getTime() ?? 0) || Number(a.id) - Number(b.id));
  }, [mensajes, mensajesVivos, activaId]);

  const enviar = async (texto: string, archivo?: File | null) => {
    if (!activaId) return;
    const enviado = await enviarMensaje(activaId, texto, archivo);
    agregarMensaje(activaId, enviado);
    recargarConversaciones();
    recargarMensajes();
  };

  return (
    <div className="flex bg-[#1C1030] h-dvh overflow-hidden">
      <Sidebar usuario={usuario ?? { nombre: "", rol: "estudiante" }} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex h-full min-h-0 min-w-0">
        <div className={`${conversacionActiva ? "hidden md:block" : "block"} w-full md:w-auto min-h-0`}>
          <ConversationList conversaciones={conversacionesFiltradas.map((c) => ({ ...c, timestamp: c.ultimoEn ? textoRelativo(c.ultimoEn) : "" }))} conversacionActiva={activaId ?? undefined} onSelectConversacion={setConversacionActiva} busqueda={busqueda} onBuscar={setBusqueda} cargando={cargando && !conversaciones} error={error} onReintentar={recargarConversaciones} onNueva={() => setNuevoChat(true)} />
        </div>
        <div className={`${conversacionActiva ? "flex" : "hidden md:flex"} flex-1 min-w-0 min-h-0`}>
          {convActual ? <ChatWindow key={convActual.id} nombreContacto={convActual.nombre} avatarUrl={convActual.avatarUrl}
            subtitulo={convActual.tipo === "directa" ? "Conversación privada" : `${convActual.participantes.length + 1} participantes · ${convActual.tipo === "clase" ? "Aula virtual" : "Comunidad del curso"}`}
            messages={mensajesMostrados.map((m) => ({ id: m.id, sender: m.mio ? "user" : "other", contenido: m.contenido, archivo: m.archivo, archivoId: m.archivoId, autor: convActual.tipo !== "directa" ? m.autor : undefined, timestamp: comoFecha(m.enviadoEn)?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) ?? "" }))}
            onSendMessage={enviar} cargando={cargandoMensajes && !mensajes} error={errorMensajes} onReintentar={recargarMensajes} onVolver={() => setConversacionActiva(null)} />
            : <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#190d2d]">{cargando ? <Cargando que="tus conversaciones" /> : <><Vacio icono="forum" mensaje={conversacionActiva ? "Esta conversación ya no está disponible." : "Un espacio para seguir conversando."} /><button className="mt-5 px-5 py-3 rounded-xl bg-primary text-white font-bold" onClick={() => { setConversacionActiva(null); setNuevoChat(true); }}>Nueva conversación</button>{conversacionActiva && <button onClick={() => setConversacionActiva(null)} className="mt-3 text-slate-400 text-sm">Volver a mis mensajes</button>}</>}</div>}
        </div>
      </main>
      {nuevoChat && <NuevoChat onCerrar={() => setNuevoChat(false)} onAbrir={(id) => { recargarConversaciones(); setConversacionActiva(id); setNuevoChat(false); }} />}
    </div>
  );
}

function NuevoChat({ onCerrar, onAbrir }: { onCerrar: () => void; onAbrir: (id: string) => void }) {
  const { contactos, cargando, error, recargar } = useContactosChat();
  const [busqueda, setBusqueda] = useState("");
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const filtrados = contactos.filter((c) => normalizar(c.nombre).includes(normalizar(busqueda)));
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => { if (e.key === "Escape" && !abriendo) onCerrar(); };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [onCerrar, abriendo]);
  const abrir = async (id: string) => {
    if (abriendo) return;
    setAbriendo(id); setAviso(null);
    try { onAbrir((await iniciarConversacion(id)).id); }
    catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo iniciar la conversación."); setAbriendo(null); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => { if (!abriendo) onCerrar(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="nuevo-chat-titulo" className="w-full max-w-lg max-h-[85dvh] bg-[#24143b] rounded-3xl border border-white/10 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
      <header className="p-6 flex items-center justify-between"><div><h2 id="nuevo-chat-titulo" className="text-xl font-bold text-white">Nueva conversación</h2><p className="text-sm text-slate-400 mt-1">Personas de tu comunidad educativa</p></div><button onClick={onCerrar} disabled={!!abriendo} aria-label="Cerrar" className="p-2 text-slate-400"><span className="material-symbols-outlined">close</span></button></header>
      <div className="px-6 pb-4"><input autoFocus aria-label="Buscar contacto" placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1C1030] px-4 py-3 text-white" /></div>
      {aviso && <p role="alert" className="px-6 pb-3 text-sm text-red-300">{aviso}</p>}
      <div className="p-3 pt-0 overflow-y-auto min-h-0">{cargando ? <Cargando que="tus contactos" /> : error ? <Fallo error={error} onReintentar={recargar} /> : filtrados.length === 0 ? <Vacio icono="person_search" mensaje={busqueda ? "No encontramos personas con ese nombre." : "Todavía no hay contactos disponibles."} /> : filtrados.map((c) => <button key={c.id} disabled={!!abriendo} onClick={() => void abrir(c.id)} className="w-full text-left flex items-center gap-3 rounded-2xl p-3 hover:bg-white/5 disabled:opacity-50"><span className="w-11 h-11 rounded-2xl bg-primary/15 text-primary font-bold grid place-items-center">{c.nombre.charAt(0)}</span><span className="flex-1"><span className="block text-white font-bold text-sm">{c.nombre}</span><span className="text-xs text-slate-400">{ROL_LABELS[c.rol]}</span></span><span className={`material-symbols-outlined text-primary ${abriendo === c.id ? "animate-spin" : ""}`}>{abriendo === c.id ? "progress_activity" : "chat_bubble"}</span></button>)}</div>
    </section>
  </div>;
}
