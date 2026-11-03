import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EstadoAlertas from "./components/anuncios/EstadoAlertas";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import ConversationList from "./components/chat/ConversationList";
import ChatWindow from "./components/chat/ChatWindow";
import { useConversaciones, enviarMensaje, marcarConversacionLeida, useContactosChat, iniciarConversacion, type Mensaje, type Canal } from "../servicios/chat";
import { useHistorialChat } from "../servicios/useHistorialChat";
import CanalesDialogo from "./components/chat/CanalesDialogo";
import { normalizar } from "../servicios/biblioteca";
import { useTiempoReal } from "../servicios/tiempoReal";
import { avisarCambioNotificaciones } from "../servicios/notificaciones";
import { verEnfoque, limpiarEnfoque } from "../servicios/enfoque";
import { aInstante as comoFecha, textoRelativo } from "../servicios/fechas";
import { ROL_LABELS } from "./components/shared/roles";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { useInmersivo } from "../servicios/inmersivo";
import { activarPush, estadoPush, type EstadoPush } from "../servicios/push";

export default function ChatPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { conversaciones, cargando, error, recargar: recargarConversaciones } = useConversaciones();
  const [parametros, setParametros] = useSearchParams();
  const [enfoqueInicial] = useState(() => verEnfoque("conversacion"));
  const conversacionActiva = parametros.get("conversacion") ?? enfoqueInicial;
  const setConversacionActiva = (id: string | null) => setParametros(id ? { conversacion: id } : { conversacion: "" });
  const [configurarAlertas, setConfigurarAlertas] = useState(false);
  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoChat, setNuevoChat] = useState(false);
  const [espacios, setEspacios] = useState<Canal | true | null>(() => parametros.has("espacios") ? true : null);
  const [consulta, setConsulta] = useState({ id: "", texto: "", aplicada: "" });
  const [mensajesVivos, setMensajesVivos] = useState<Record<string, Mensaje[]>>({});
  const activaId = conversacionActiva || conversaciones?.[0]?.id || null;
  const textoBusqueda = consulta.id === activaId ? consulta.texto : "";
  const filtroMensajes = consulta.id === activaId ? consulta.aplicada : "";
  const { mensajes, cargando: cargandoMensajes, error: errorMensajes, recargar: recargarMensajes, cargarAnteriores, hayAnteriores, cargandoAnteriores, errorAnteriores } = useHistorialChat(activaId, filtroMensajes);
  const convActual = conversaciones?.find((c) => c.id === activaId);

  useEffect(() => { limpiarEnfoque(); }, []);
  useEffect(() => {
    if (!activaId || !mensajes || cargandoMensajes || filtroMensajes) return;
    const leer = () => {
      if (document.hidden || (!conversacionActiva && !window.matchMedia("(min-width: 768px)").matches)) return;
      void marcarConversacionLeida(activaId).then(() => {
      recargarConversaciones();
      avisarCambioNotificaciones();
      }).catch(() => {});
    };
    leer(); document.addEventListener("visibilitychange", leer);
    return () => document.removeEventListener("visibilitychange", leer);
  }, [activaId, recargarConversaciones, mensajes, cargandoMensajes, conversacionActiva, filtroMensajes]);

  const agregarMensaje = useCallback((id: string, nuevo: Mensaje) => {
    setMensajesVivos((anteriores) => {
      const lista = anteriores[id] ?? [];
      return lista.some((m) => m.id === nuevo.id) ? anteriores : { ...anteriores, [id]: [...lista, nuevo] };
    });
  }, []);

  useTiempoReal(useCallback((evento) => {
    if (evento.tipo === "conectado") { recargarConversaciones(); recargarMensajes(); return; }
    if (evento.tipo === "conversaciones-actualizadas") { recargarConversaciones(); recargarMensajes(); return; }
    if (evento.tipo === "mensaje-reaccion" && evento.conversacionId === activaId) { recargarMensajes(); return; }
    if (evento.tipo !== "mensaje") return;
    recargarConversaciones();
    if (evento.conversacionId === activaId && evento.mensaje) {
      agregarMensaje(activaId, evento.mensaje as Mensaje);
      if (!filtroMensajes && !document.hidden && (conversacionActiva || window.matchMedia("(min-width: 768px)").matches)) void marcarConversacionLeida(activaId).then(avisarCambioNotificaciones).catch(() => {});
    }
  }, [activaId, agregarMensaje, recargarConversaciones, recargarMensajes, conversacionActiva, filtroMensajes]));

  const conversacionesFiltradas = useMemo(() => (conversaciones ?? []).filter((c) => normalizar(c.nombre).includes(normalizar(busqueda.trim()))), [conversaciones, busqueda]);
  const mensajesMostrados = useMemo(() => {
    const base = mensajes ?? [];
    const ids = new Set(base.map((m) => m.id));
    return [...base, ...(filtroMensajes ? [] : mensajesVivos[activaId ?? ""] ?? []).filter((m) => !ids.has(m.id))]
      .sort((a, b) => (comoFecha(a.enviadoEn)?.getTime() ?? 0) - (comoFecha(b.enviadoEn)?.getTime() ?? 0) || Number(a.id) - Number(b.id));
  }, [mensajes, mensajesVivos, activaId, filtroMensajes]);

  const enviar = async (texto: string, archivo?: File | null, opciones?: { prioridad: "estandar" | "urgente"; respuestaA?: string }) => {
    if (!activaId) return;
    const enviado = await enviarMensaje(activaId, texto, archivo, opciones);
    agregarMensaje(activaId, enviado);
    recargarConversaciones();
    recargarMensajes();
  };

  // En el celular, una conversación abierta ocupa toda la pantalla (como WhatsApp).
  useInmersivo(Boolean(conversacionActiva));
  const subtitulo = convActual ? (convActual.canal ? `${convActual.canal.visibilidad === "privada" ? "Privado" : "Institución"} · ${convActual.canal.estado}` : convActual.tipo === "directa" ? "Conversación privada" : `${convActual.participantes.length + 1} participantes · ${convActual.tipo === "clase" ? "Aula virtual" : "Comunidad del curso"}`) : "";
  const buscando = buscarAbierto || Boolean(filtroMensajes);

  return (
    <div className="flex bg-fondo h-dvh overflow-hidden">
      <Sidebar usuario={usuario ?? { nombre: "", rol: "estudiante" }} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col h-full min-h-0 min-w-0">
        <TopBar title="Mensajes" />
        <div className={`wa ${conversacionActiva ? "con-chat" : ""}`}>
          <ConversationList conversaciones={conversacionesFiltradas.map((c) => ({ ...c, icono: c.canal ? (c.canal.clase === "foro" ? "forum" : c.canal.clase === "ayuda" ? "support_agent" : "tag") : c.tipo === "directa" ? undefined : "groups", timestamp: c.ultimoEn ? textoRelativo(c.ultimoEn) : "" }))}
            conversacionActiva={activaId ?? undefined} onSelectConversacion={setConversacionActiva} busqueda={busqueda} onBuscar={setBusqueda}
            cargando={cargando && !conversaciones} error={error} onReintentar={recargarConversaciones} onNueva={() => setNuevoChat(true)} onExplorar={() => setEspacios(true)}
            aviso={<BannerAlertas onConfigurar={() => setConfigurarAlertas(true)} />} />
          {convActual ? <ChatWindow key={convActual.id} nombreContacto={convActual.nombre} avatarUrl={convActual.avatarUrl} subtitulo={subtitulo}
            soloLectura={!!convActual.canal && !convActual.canal.puedeEscribir}
            hayAnteriores={hayAnteriores} cargandoAnteriores={cargandoAnteriores} errorAnteriores={errorAnteriores} onAnteriores={cargarAnteriores}
            acciones={<div className="flex items-center gap-1">
              {convActual.canal?.contexto && <Link to={convActual.canal.contexto.href} className="av-boton suave chico max-w-[260px]" aria-label={`Abrir ${convActual.canal.contexto.tipo}: ${convActual.canal.contexto.titulo}`} title={convActual.canal.contexto.titulo}><span className="material-symbols-outlined" aria-hidden="true">open_in_new</span><span className="truncate">Abrir {convActual.canal.contexto.tipo}<span className="hidden md:inline">: {convActual.canal.contexto.titulo}</span></span></Link>}
              {convActual.canal && (convActual.canal.administrable || convActual.canal.clase === "foro") && <button type="button" className="av-icono-boton" onClick={() => setEspacios(convActual.canal!)} aria-label={convActual.canal.clase === "foro" ? "Ver temas del foro" : "Configurar espacio"} title={convActual.canal.clase === "foro" ? "Ver temas del foro" : "Configurar espacio"}><span className="material-symbols-outlined" aria-hidden="true">{convActual.canal.clase === "foro" ? "topic" : "settings"}</span></button>}
              <button type="button" className="av-icono-boton" aria-pressed={buscando} onClick={() => { setBuscarAbierto((v) => !v); if (buscando) setConsulta({ id: activaId ?? "", texto: "", aplicada: "" }); }} aria-label="Buscar en la conversación" title="Buscar en la conversación"><span className="material-symbols-outlined" aria-hidden="true">search</span></button>
            </div>}
            herramientas={buscando ? <div className="border-b border-linea bg-surface-container-low px-3 py-2">
              <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); setConsulta({ id: activaId ?? "", texto: textoBusqueda, aplicada: textoBusqueda.trim() }); }}>
                <label className="av-buscar-caja min-w-0 flex-1"><span className="material-symbols-outlined" aria-hidden="true">search</span><input autoFocus className="av-buscar" aria-label="Buscar en el historial" placeholder="Buscar en todo el historial…" maxLength={200} value={textoBusqueda} onChange={e => setConsulta({ id: activaId ?? "", texto: e.target.value, aplicada: filtroMensajes })} /></label>
                <button type="submit" className="av-boton chico">Buscar</button>
                {filtroMensajes && <button type="button" className="av-boton suave chico" onClick={() => setConsulta({ id: activaId ?? "", texto: "", aplicada: "" })}>Ver todos</button>}
              </form>
              {filtroMensajes && <p className="mt-1.5 text-xs text-on-surface-variant">Resultados para «{filtroMensajes}». Los nuevos mensajes aparecen al volver a ver todos.</p>}
            </div> : null}
            messages={mensajesMostrados.map((m) => ({ ...m, sender: m.mio ? "user" : "other", timestamp: comoFecha(m.enviadoEn)?.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) ?? "" }))}
            onSendMessage={enviar} cargando={cargandoMensajes && !mensajes} error={errorMensajes} onReintentar={recargarMensajes} onVolver={() => setConversacionActiva(null)} />
            : <div className="wa-vacia">{cargando ? <Cargando que="tus conversaciones" /> : <>
                <span className="icono"><span className="material-symbols-outlined" aria-hidden="true">forum</span></span>
                <h2>{conversacionActiva ? "Esta conversación ya no está disponible" : "Mensajes"}</h2>
                <p>Escribile a docentes, compañeros, familias o a la escuela. Los canales, foros y la ayuda de tu institución están en el ícono de globos, arriba de la lista.</p>
                <button type="button" className="av-boton mt-2" onClick={() => { setConversacionActiva(null); setNuevoChat(true); }}><span className="material-symbols-outlined" aria-hidden="true">edit_square</span>Nueva conversación</button>
                {conversacionActiva && <button type="button" onClick={() => setConversacionActiva(null)} className="mt-2 text-sm text-on-surface-variant">Volver a mis mensajes</button>}
              </>}</div>}
          {configurarAlertas && (
            <aside className="wa-panel" aria-label="Alertas de este dispositivo">
              <header className="wa-panel-cab"><button type="button" className="av-icono-boton" onClick={() => setConfigurarAlertas(false)} aria-label="Cerrar panel"><span className="material-symbols-outlined" aria-hidden="true">close</span></button><h2>Alertas de este dispositivo</h2></header>
              <div className="wa-panel-cuerpo p-3"><EstadoAlertas /></div>
            </aside>
          )}
        </div>
      </main>
      {nuevoChat && <NuevoChat onCerrar={() => setNuevoChat(false)} onAbrir={(id) => { recargarConversaciones(); setConversacionActiva(id); setNuevoChat(false); }} />}
      {espacios && <CanalesDialogo inicial={espacios === true ? undefined : espacios} onCerrar={() => setEspacios(null)} onCambio={recargarConversaciones} onAbrir={id => { recargarConversaciones(); setConversacionActiva(id); setEspacios(null); }} />}
    </div>
  );
}

/** El cartel de "activá las alertas" arriba de la lista, como el de WhatsApp Web. */
function BannerAlertas({ onConfigurar }: { onConfigurar: () => void }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  useEffect(() => {
    let vigente = true;
    void estadoPush().then((e) => { if (vigente) setEstado(e); });
    return () => { vigente = false; };
  }, []);
  if (estado !== "inactivo" && estado !== "bloqueado") return null;
  return (
    <button type="button" className="wa-banner" onClick={async () => {
      if (estado === "bloqueado") { onConfigurar(); return; }
      try { setEstado(await activarPush()); } catch { setEstado(await estadoPush()); }
    }}>
      <span className="material-symbols-outlined" aria-hidden="true">{estado === "bloqueado" ? "notifications_off" : "notifications"}</span>
      <span className="min-w-0"><strong>{estado === "bloqueado" ? "Las alertas están bloqueadas" : "Activá las alertas"}</strong><p>{estado === "bloqueado" ? "Tocá para ver cómo habilitarlas." : "Recibí los mensajes en este dispositivo aunque NEXO esté cerrado."}</p></span>
    </button>
  );
}

function NuevoChat({ onCerrar, onAbrir }: { onCerrar: () => void; onAbrir: (id: string) => void }) {
  const { contactos, cargando, error, recargar } = useContactosChat();
  const [busqueda, setBusqueda] = useState("");
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const filtrados = contactos.filter((c) => normalizar(`${c.nombre} ${ROL_LABELS[c.rol]} ${c.rol === "admin-academico" ? "Dirección" : ""}`).includes(normalizar(busqueda)));
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
    <section role="dialog" aria-modal="true" aria-labelledby="nuevo-chat-titulo" className="w-full max-w-lg max-h-[85dvh] bg-surface-container-low rounded-3xl border border-white/10 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
      <header className="p-6 flex items-center justify-between"><div><h2 id="nuevo-chat-titulo" className="text-xl font-bold text-white">Nueva conversación</h2><p className="text-sm text-slate-400 mt-1">Personas de tu comunidad educativa</p></div><button onClick={onCerrar} disabled={!!abriendo} aria-label="Cerrar" className="p-2 text-slate-400"><span className="material-symbols-outlined">close</span></button></header>
      <div className="px-6 pb-4"><input autoFocus aria-label="Buscar contacto" placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full rounded-xl border border-white/10 bg-fondo px-4 py-3 text-white" /></div>
      {aviso && <p role="alert" className="px-6 pb-3 text-sm text-red-300">{aviso}</p>}
      <div className="p-3 pt-0 overflow-y-auto min-h-0">{cargando ? <Cargando que="tus contactos" /> : error ? <Fallo error={error} onReintentar={recargar} /> : filtrados.length === 0 ? <Vacio icono="person_search" mensaje={busqueda ? "No encontramos personas con ese nombre." : "Todavía no hay contactos disponibles."} /> : filtrados.map((c) => <button key={c.id} disabled={!!abriendo} onClick={() => void abrir(c.id)} className="w-full text-left flex items-center gap-3 rounded-2xl p-3 hover:bg-white/5 disabled:opacity-50"><span className="w-11 h-11 rounded-2xl bg-primary/15 text-primary font-bold grid place-items-center">{c.nombre.charAt(0)}</span><span className="flex-1"><span className="block text-white font-bold text-sm">{c.nombre}</span><span className="text-xs text-slate-400">{ROL_LABELS[c.rol]}</span></span><span className={`material-symbols-outlined text-primary ${abriendo === c.id ? "animate-spin" : ""}`}>{abriendo === c.id ? "progress_activity" : "chat_bubble"}</span></button>)}</div>
    </section>
  </div>;
}
