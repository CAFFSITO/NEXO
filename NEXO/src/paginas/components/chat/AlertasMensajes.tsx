import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedir, enviar } from "../../../servicios/api";
import { useTiempoReal } from "../../../servicios/tiempoReal";
import { marcarNotificacionLeida } from "../../../servicios/notificaciones";
import { activarPush } from "../../../servicios/push";
import { crearAlarma } from "../../../servicios/alarma";
import FormularioRespuesta from "./FormularioRespuesta";
import { EMOJIS_MENSAJE, reaccionarMensaje } from "../../../servicios/chat";

interface Pendiente {
  reaccion?: string | null;
  id: string; titulo: string; cuerpo: string; prioridad: "estandar" | "urgente"; conversacionId: string; mensajeId: string;
}

// Vive fuera del chat: avisa también mientras se trabaja en otra sección.
export default function AlertasMensajes() {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [ocultos, setOcultos] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [marcando, setMarcando] = useState(false);
  const [respondiendo, setRespondiendo] = useState<Pendiente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [reaccionando, setReaccionando] = useState(false);
  const [reacciones, setReacciones] = useState<Record<string, string | null>>({});
  const [alarma] = useState(crearAlarma);
  const version = useRef(0);
  const descartar = useCallback(() => { version.current++; }, []);
  const recargar = useCallback(() => {
    const actual = ++version.current;
    void pedir<{ pendientes: Pendiente[] }>("/api/notificaciones/mensajes-pendientes").then((r) => {
      if (version.current === actual) setPendientes(r.pendientes);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    recargar();
    void activarPush({ pedirPermiso: false }).catch(() => {});
    const intervalo = setInterval(recargar, 15000);
    window.addEventListener("nexo:refrescar-notificaciones", recargar);
    window.addEventListener("focus", recargar);
    return () => { descartar(); clearInterval(intervalo); window.removeEventListener("nexo:refrescar-notificaciones", recargar); window.removeEventListener("focus", recargar); };
  }, [recargar, descartar]);
  useTiempoReal(useCallback((e) => {
    if (["conectado", "notificacion", "notificaciones-leidas"].includes(e.tipo)) recargar();
  }, [recargar]));
  useEffect(() => {
    const limpiar = alarma.prepararAlarma();
    return () => { limpiar(); alarma.liberarAlarma(); };
  }, [alarma]);
  const visibles = pendientes.filter((p) => p.prioridad === "urgente" || !ocultos.has(p.id));
  const actual = respondiendo ?? visibles[0];
  const id = actual?.id;
  const urgente = actual?.prioridad === "urgente";
  useEffect(() => {
    if (!id) return;
    // Pausar el sonido al responder permite grabar sin captar el timbre.
    if (!respondiendo) alarma.sonarAlarma(urgente ? 0 : 8000);
    const vibracion = urgente && !respondiendo ? setInterval(() => { navigator.vibrate?.([400, 150, 400, 150, 700]); }, 12000) : null;
    const ocultar = !urgente && !respondiendo ? setTimeout(() => setOcultos((v) => new Set([...v, id])), 30000) : null;
    return () => { alarma.callarAlarma(); navigator.vibrate?.(0); if (vibracion) clearInterval(vibracion); if (ocultar) clearTimeout(ocultar); };
  }, [id, urgente, alarma, respondiendo]);
  const confirmar = async () => {
    if (!actual || marcando) return;
    setMarcando(true); setError("");
    try {
      await marcarNotificacionLeida(actual.id);
      setPendientes((p) => p.filter((n) => n.id !== actual.id));
      setRespondiendo(null);
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        for (const n of await reg?.getNotifications({ tag: `nexo-mensaje-${actual.id}` }) ?? []) n.close();
      }
    } catch { setError("No se pudo confirmar la lectura. Revisá la conexión y reintentá."); }
    finally { setMarcando(false); }
  };
  const responder = async (texto: string, archivoIds: string[]) => {
    if (!actual) return;
    setRespondiendo(actual);
    await enviar(`/api/chat/conversaciones/${actual.conversacionId}/mensajes`, "POST", {
      contenido: texto, archivoId: archivoIds[0], respuestaA: actual.mensajeId,
    });
    // La respuesta ya salió: un fallo de confirmación no debe hacer reenviarla.
    if (actual.prioridad !== "urgente") await marcarNotificacionLeida(actual.id).catch(() => setError("Respuesta enviada. Falta confirmar la lectura cuando vuelva la conexión."));
    recargar();
  };
  if (!actual) return null;
  const reaccionar = async (emoji: string) => {
    if (reaccionando) return;
    setRespondiendo(actual); setReaccionando(true); setError("");
    try {
      const nueva = (actual.mensajeId in reacciones ? reacciones[actual.mensajeId] : actual.reaccion) === emoji ? null : emoji;
      await reaccionarMensaje(actual.mensajeId, nueva);
      setReacciones((r) => ({ ...r, [actual.mensajeId]: nueva }));
      if (nueva !== null) {
        setPendientes((p) => p.filter((n) => n.id !== actual.id));
        setRespondiendo(null);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la reacción."); }
    finally { setReaccionando(false); }
  };
  return <aside role={urgente ? "alert" : "status"} aria-label={urgente ? "Mensaje urgente pendiente" : "Mensaje nuevo"} className={`fixed z-[110] top-3 right-3 left-3 sm:left-auto sm:w-96 max-h-[90dvh] overflow-y-auto rounded-2xl border shadow-2xl p-4 text-white ${urgente ? "bg-rose-950 border-rose-400" : "bg-slate-900 border-primary"}`}>
    <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${urgente ? "text-rose-200" : "text-teal-300"}`}>{urgente ? "Urgente · confirmar lectura" : "Mensaje nuevo"}{visibles.length > 1 ? ` · ${visibles.length} pendientes` : ""}</p>
    <strong className="block">{actual.titulo}</strong>
    <p className="text-sm mt-2 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{actual.cuerpo}</p>
    <div className="mt-3"><FormularioRespuesta key={actual.id} onEnviar={responder} maxArchivos={1} onOcupado={setOcupado} onInteractuar={() => setRespondiendo(actual)} /></div>
    <div className="flex justify-between gap-1 mt-3" role="group" aria-label="Reaccionar al mensaje">{EMOJIS_MENSAJE.map((emoji) => <button key={emoji} type="button" disabled={reaccionando || ocupado} aria-label={`Reaccionar con ${emoji}`} aria-pressed={(actual.mensajeId in reacciones ? reacciones[actual.mensajeId] : actual.reaccion) === emoji} className="rounded-lg p-1 text-xl bg-white/10 aria-pressed:bg-primary" onClick={() => void reaccionar(emoji)}>{emoji}</button>)}</div>
    <div className="flex flex-wrap gap-2 mt-3 text-xs">
      <button disabled={ocupado} className="rounded-lg px-3 py-2 bg-white/10" onClick={() => navigate(`/chat?conversacion=${actual.conversacionId}`)}>Abrir conversación</button>
      <button className="rounded-lg px-3 py-2 bg-white text-slate-900 font-bold disabled:opacity-50" disabled={marcando || ocupado} onClick={() => void confirmar()}>{marcando ? "Confirmando…" : "Marcar como leído"}</button>
      {!urgente && <button disabled={ocupado} className="px-2 py-2" onClick={() => { setOcultos((v) => new Set([...v, actual.id])); setRespondiendo(null); }}>Cerrar aviso</button>}
    </div>
    {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
  </aside>;
}
