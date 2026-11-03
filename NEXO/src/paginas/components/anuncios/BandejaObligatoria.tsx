// La capa obligatoria de los anuncios.
//
// Si quien entró tiene avisos sin leer, esta capa tapa TODO NEXO (el resto de la
// aplicación queda inerte) y muestra la pila de tarjetas: la más nueva arriba y
// las demás asomando por detrás. Cada tarjeta se lee hasta el final, se marca
// como leída (y, si se quiere, se reacciona) y recién ahí se pasa a la
// siguiente: deslizando en el celular o con la flecha en la computadora. Al
// terminar la última, NEXO vuelve a quedar libre.
//
// Mientras haya avisos sin leer: suena un timbre hasta que la persona toque la
// pantalla (y vuelve a sonar cada dos minutos si nadie la toca), el título de
// la pestaña parpadea, y con NEXO cerrado suena el push (public/sw.js).
//
// Se monta una sola vez en App, para los perfiles que tienen el módulo Anuncios
// a la vista. El permiso real lo decide el servidor: si no participa, la
// pregunta de pendientes vuelve 403 y no se muestra nada.

import {
  Component, useCallback, useEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent as EventoTecla, type PointerEvent as EventoPuntero, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useNavegacion } from "../../../navegacion";
import { useInstancia } from "../../../servicios/instancia";
import { inicioPara } from "../shared/navegacionItems";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";
import { estiloAviso, marcarAvisoLeido, pedirPendientes, reaccionarAviso, type Aviso } from "../../../servicios/anuncios";
import { activarPush, ayudaDesbloqueo, cerrarNotificacionesDeAvisos, estadoPush, type EstadoPush } from "../../../servicios/push";
import { callarAlarma, parpadearTitulo, prepararAlarma, sonarAlarma } from "../../../servicios/alarma";
import TarjetaAviso from "./TarjetaAviso";
import "./anuncios.css";

type Lado = "izquierda" | "derecha";
interface EstadoTarjeta { leido: boolean; reaccion: string | null }

const CLAVE_BANNER = "nexo:alertas-ahora-no";

/** Si algo de los avisos falla, que no se caiga NEXO entero. */
class Protector extends Component<{ children: ReactNode }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() { return { roto: true }; }
  componentDidCatch(error: unknown) { console.error("Falló la capa de avisos", error); }
  render() { return this.state.roto ? null : this.props.children; }
}

export default function AvisosObligatorios() {
  const { usuario } = useNavegacion();
  const { instancia } = useInstancia();
  const participa = Boolean(instancia?.modulos.some((m) => m.id === "anuncios" && m.visible));
  // La bienvenida del primer ingreso va sola: los avisos (y la invitación a
  // activar las alertas) llegan apenas la persona entra a su inicio.
  if (!usuario || !participa || usuario.primerIngreso) return null;
  return <Protector key={usuario.id}><Bandeja /></Protector>;
}

/**
 * Mezcla lo que dice el servidor con lo que se está mostrando: la tarjeta de
 * arriba no se mueve (aunque ya esté leída y el servidor no la mande más) y lo
 * nuevo entra justo detrás, para no arrancarle la tarjeta a quien está leyendo.
 */
function fusionar(actual: Aviso[], servidor: Aviso[], estados: Record<string, EstadoTarjeta>): Aviso[] {
  if (!actual.length) return servidor;
  const [arriba] = actual;
  const sigue = estados[arriba.id]?.leido || servidor.some((a) => a.id === arriba.id);
  return sigue ? [arriba, ...servidor.filter((a) => a.id !== arriba.id)] : servidor;
}

function Bandeja() {
  const { pathname } = useLocation();
  const { usuario } = useNavegacion();
  const { instancia } = useInstancia();
  const [cola, setCola] = useState<Aviso[]>([]);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [estados, setEstados] = useState<Record<string, EstadoTarjeta>>({});
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState("");
  const [volando, setVolando] = useState<Lado | null>(null);
  const [arrastre, setArrastre] = useState(0);
  const [sacudiendo, setSacudiendo] = useState(false);
  const [alDia, setAlDia] = useState(0);
  const [push, setPush] = useState<EstadoPush | null>(null);
  const [ocultarBanner, setOcultarBanner] = useState(() => {
    // "Ahora no" vale por 7 días en este dispositivo (antes volvía en cada sesión).
    try { return Date.now() - Number(window.localStorage.getItem(CLAVE_BANNER) ?? 0) < 7 * 86_400_000; } catch { return false; }
  });

  const estadosRef = useRef(estados);
  useEffect(() => { estadosRef.current = estados; }, [estados]);
  const vistos = useRef(new Set<string>());
  // Los que se están marcando en ESTE navegador: su aviso "leído" vuelve por el
  // tubo y no hay que confundirlo con una lectura hecha en otro dispositivo.
  const marcadosAca = useRef(new Set<string>());
  const reconocido = useRef(false);
  const capa = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; t: number; eje: "x" | "y" | null; id: number } | null>(null);

  // ── Traer y escuchar ──────────────────────────────────────────────────────
  const aplicar = useCallback((r: { anuncios: Aviso[]; emojis: string[] }) => {
    setEmojis(r.emojis);
    const llegaron = r.anuncios.some((a) => !vistos.current.has(a.id));
    for (const a of r.anuncios) vistos.current.add(a.id);
    setCola((actual) => fusionar(actual, r.anuncios, estadosRef.current));
    if (llegaron) {
      reconocido.current = false;
      sonarAlarma();
    }
  }, []);
  // Sin conexión o sin permiso: queda lo que había.
  const traer = useCallback(() => pedirPendientes().then(aplicar, () => {}), [aplicar]);

  // Leído en otro dispositivo (el celular, otra pestaña): acá ya no hace falta.
  const leidoAfuera = useCallback((id: string) => {
    if (marcadosAca.current.has(id)) return;
    setCola((c) => c.filter((a) => a.id !== id));
  }, []);

  // Quien lo mandó lo borró para todos: se va aunque se esté leyendo.
  const borradoAfuera = useCallback((id: string) => {
    marcadosAca.current.delete(id);
    setCola((c) => c.filter((a) => a.id !== id));
    setEstados((s) => {
      if (!(id in s)) return s;
      const resto = { ...s };
      delete resto[id];
      return resto;
    });
  }, []);

  useTiempoReal(useCallback((e: EventoVivo) => {
    if (e.tipo === "anuncio" || e.tipo === "conectado") void traer();
    if (e.tipo === "anuncio-leido" && e.anuncioId) leidoAfuera(e.anuncioId);
    if (e.tipo === "anuncio-borrado" && e.anuncioId) borradoAfuera(e.anuncioId);
  }, [traer, leidoAfuera, borradoAfuera]));

  useEffect(() => {
    void traer();
    const alVolver = () => { if (!document.hidden) void traer(); };
    document.addEventListener("visibilitychange", alVolver);
    const reloj = window.setInterval(() => void traer(), 120_000);
    const soltarAudio = prepararAlarma();
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.clearInterval(reloj);
      soltarAudio();
      callarAlarma();
    };
  }, [traer]);

  // Las alertas push de este navegador: si ya dio permiso, la suscripción se
  // vuelve a guardar a nombre de quien entró (sin preguntar nada).
  useEffect(() => {
    let vigente = true;
    void (async () => {
      let estado = await estadoPush();
      if (estado === "activo" || (estado === "inactivo" && "Notification" in window && Notification.permission === "granted")) {
        estado = await activarPush({ pedirPermiso: false }).catch(() => estado);
      }
      if (vigente) setPush(estado);
    })();
    return () => { vigente = false; };
  }, []);

  const activarAlertas = async () => {
    try {
      setPush(await activarPush());
    } catch {
      setPush(await estadoPush());
    }
  };

  // ── Mientras haya avisos: bloquear, parpadear, insistir ──────────────────
  const hayAvisos = cola.length > 0;
  const sinLeer = cola.filter((a) => !estados[a.id]?.leido).length;

  useEffect(() => {
    if (!hayAvisos) return;
    const raiz = document.getElementById("root");
    raiz?.setAttribute("inert", "");
    raiz?.setAttribute("aria-hidden", "true");
    const desborde = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    capa.current?.focus({ preventScroll: true });
    const insistir = window.setInterval(() => { if (!reconocido.current) sonarAlarma(15_000); }, 120_000);
    return () => {
      raiz?.removeAttribute("inert");
      raiz?.removeAttribute("aria-hidden");
      document.body.style.overflow = desborde;
      window.clearInterval(insistir);
      callarAlarma();
      void cerrarNotificacionesDeAvisos();
    };
  }, [hayAvisos]);

  useEffect(() => {
    if (!sinLeer) return;
    return parpadearTitulo(sinLeer === 1 ? "🔔 Aviso nuevo · NEXO" : `🔔 (${sinLeer}) Avisos nuevos · NEXO`);
  }, [sinLeer]);

  const reconocer = () => {
    if (reconocido.current) return;
    reconocido.current = true;
    callarAlarma();
  };

  // Sacudir la tarjeta (se quiso pasar sin marcarla leída). Se apaga y se vuelve
  // a prender la animación sin remontar la tarjeta, que perdería lo leído.
  const sacudir = () => {
    setSacudiendo(false);
    window.requestAnimationFrame(() => setSacudiendo(true));
  };

  // ── Acciones sobre la tarjeta de arriba ──────────────────────────────────
  const arriba = cola[0] ?? null;
  const estadoArriba = arriba ? estados[arriba.id] : undefined;

  const leer = async () => {
    if (!arriba || marcando) return;
    setMarcando(true);
    setError("");
    marcadosAca.current.add(arriba.id);
    try {
      await marcarAvisoLeido(arriba.id);
      setEstados((s) => ({ ...s, [arriba.id]: { leido: true, reaccion: s[arriba.id]?.reaccion ?? null } }));
    } catch (e) {
      marcadosAca.current.delete(arriba.id);
      setError(e instanceof Error ? e.message : "No se pudo marcar como leído. Reintentá.");
    } finally {
      setMarcando(false);
    }
  };

  const reaccionar = async (emoji: string | null) => {
    if (!arriba || marcando) return;
    setMarcando(true);
    const yaLeido = estados[arriba.id]?.leido ?? false;
    if (emoji !== null) marcadosAca.current.add(arriba.id);
    const previa = estados[arriba.id] ? estados[arriba.id].reaccion : arriba.reaccion ?? null;
    setEstados((s) => ({ ...s, [arriba.id]: { leido: s[arriba.id]?.leido ?? false, reaccion: emoji } }));
    setError("");
    try {
      await reaccionarAviso(arriba.id, emoji);
      setEstados((s) => ({ ...s, [arriba.id]: { leido: emoji !== null || yaLeido, reaccion: emoji } }));
    } catch (e) {
      if (!yaLeido) marcadosAca.current.delete(arriba.id);
      setEstados((s) => ({ ...s, [arriba.id]: { leido: s[arriba.id]?.leido ?? false, reaccion: previa } }));
      setError(e instanceof Error ? e.message : "No se pudo guardar la reacción.");
    } finally { setMarcando(false); }
  };

  const siguiente = (lado: Lado = "derecha") => {
    if (capa.current?.querySelector('[data-respuesta-activa="true"]')) return;
    if (!arriba || volando) return;
    if (!estadoArriba?.leido) {
      setArrastre(0);
      sacudir();
      return;
    }
    const ultima = cola.length === 1;
    setVolando(lado);
    window.setTimeout(() => {
      setVolando(null);
      setArrastre(0);
      setError("");
      setCola((c) => c.filter((a) => a.id !== arriba.id));
      setEstados((s) => {
        const resto = { ...s };
        delete resto[arriba.id];
        return resto;
      });
      if (ultima) setAlDia((n) => n + 1);
    }, 300);
  };

  // ── Deslizar con el dedo (además del botón "Terminar" de la tarjeta) ─────
  const empezar = (e: EventoPuntero<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-respuesta-activa="true"], button, input, textarea, audio')) return;
    if (e.pointerType === "mouse" || volando) return;
    gesto.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, eje: null, id: e.pointerId };
  };
  const mover = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.eje) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      g.eje = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (g.eje === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (g.eje !== "x") return;
    // Sin leer, la tarjeta se resiste: apenas se mueve.
    setArrastre(estadoArriba?.leido ? dx : dx * 0.22);
  };
  const soltar = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.eje !== "x") return;
    const dx = e.clientX - g.x;
    const velocidad = Math.abs(dx) / Math.max(1, e.timeStamp - g.t);
    if (estadoArriba?.leido && (Math.abs(dx) > 100 || (Math.abs(dx) > 40 && velocidad > 0.6))) {
      siguiente(dx < 0 ? "izquierda" : "derecha");
    } else {
      if (!estadoArriba?.leido && Math.abs(dx) > 30) sacudir();
      setArrastre(0);
    }
  };
  const cancelar = () => {
    gesto.current = null;
    setArrastre(0);
  };

  const teclas = (e: EventoTecla) => {
    reconocer();
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if ((e.target as HTMLElement).closest('.av-emojis, input, textarea, audio, [data-respuesta-activa="true"]')) return;
      e.preventDefault();
      siguiente(e.key === "ArrowLeft" ? "izquierda" : "derecha");
    }
  };

  // ── Dibujo ────────────────────────────────────────────────────────────────
  const visibles = cola.slice(0, 3);
  const avance = Math.min(1, Math.abs(arrastre) / 220);

  const estiloLugar = (prof: number): CSSProperties | undefined => {
    if (prof === 0 && volando) {
      const signo = volando === "izquierda" ? -1 : 1;
      return { transform: `translateX(${signo * 125}vw) rotate(${signo * 22}deg)` };
    }
    if (prof === 0 && arrastre) return { transform: `translateX(${arrastre}px) rotate(${arrastre / 24}deg)` };
    // La de atrás se acerca mientras se desliza la de arriba.
    if (prof === 1 && arrastre && estadoArriba?.leido) {
      return { transform: `translateY(${20 * (1 - avance)}px) scale(${0.94 + 0.06 * avance})`, filter: `brightness(${0.7 + 0.3 * avance})` };
    }
    return undefined;
  };

  const capaAvisos = hayAvisos && arriba && (
    <div
      ref={capa}
      className="av-capa"
      style={estiloAviso(arriba.color)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="av-titulo"
      tabIndex={-1}
      onPointerDownCapture={reconocer}
      onKeyDown={teclas}
    >
      <div className="av-resplandor" aria-hidden="true" />
      <header className="av-cabecera">
        <div className="min-w-0">
          <h2 id="av-titulo">{sinLeer === 0 ? "¡Listo!" : sinLeer === 1 ? "Tenés un aviso" : `Tenés ${sinLeer} avisos`}</h2>
          <p>
            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
            Leelos para seguir usando NEXO
          </p>
        </div>
        <div className="flex items-center gap-2">
          {push === "inactivo" && (
            <button type="button" className="av-chip-alertas" onClick={activarAlertas}>
              <span className="material-symbols-outlined" aria-hidden="true">notifications_active</span>
              <span className="hidden sm:inline">Activar alertas</span>
            </button>
          )}
          <span className="av-contador" aria-live="polite">
            {sinLeer > 0 && <i aria-hidden="true" />}
            {sinLeer > 0 ? `${sinLeer} sin leer` : "Al día"}
          </span>
        </div>
      </header>

      <div className="av-escena">
        <div className="av-pila">
          {visibles.map((aviso, prof) => {
            const clases = ["av-lugar"];
            if (prof === 0 && arrastre && !volando) clases.push("is-arrastrando");
            if (prof === 1 && arrastre && estadoArriba?.leido) clases.push("is-arrastrando");
            if (prof === 0 && volando) clases.push("is-volando");
            return (
              <div
                key={aviso.id}
                className={`${clases.join(" ")} ${prof === 0 && sacudiendo ? "av-sacudir" : ""}`}
                onAnimationEnd={prof === 0 ? (e) => { if (e.target === e.currentTarget) setSacudiendo(false); } : undefined}
                data-prof={prof}
                style={estiloLugar(prof)}
                aria-hidden={prof > 0}
                {...(prof === 0 ? { onPointerDown: empezar, onPointerMove: mover, onPointerUp: soltar, onPointerCancel: cancelar } : {})}
              >
                {prof === 0 ? (
                  <TarjetaAviso
                    aviso={aviso}
                    leido={Boolean(estados[aviso.id]?.leido)}
                    reaccion={estados[aviso.id] ? estados[aviso.id].reaccion : aviso.reaccion ?? null}
                    emojis={emojis}
                    ultimo={cola.length === 1}
                    marcando={marcando}
                    error={error}
                    onLeer={leer}
                    onSiguiente={() => siguiente("derecha")}
                    onReaccionar={reaccionar}
                  />
                ) : (
                  <div className="av-tarjeta es-cascara" style={estiloAviso(aviso.color)} />
                )}
              </div>
            );
          }).reverse()}
        </div>
      </div>
    </div>
  );

  // La invitación a activar las alertas aparece solo en la pantalla de inicio de
  // cada persona: en las demás tapaba contenido (Anuncios y Mensajes tienen la suya).
  const enInicio = usuario !== null && pathname === inicioPara(usuario.rol, instancia);
  const banner = enInicio && !hayAvisos && !ocultarBanner && (push === "inactivo" || push === "bloqueado") && (
    <aside className="av-banner" role="status">
      <span className="material-symbols-outlined" aria-hidden="true">notifications_active</span>
      <div className="min-w-0 flex-1">
        <strong>{push === "bloqueado" ? "Las alertas están bloqueadas" : "Activá las alertas de avisos"}</strong>
        <p>
          {push === "bloqueado"
            ? ayudaDesbloqueo()
            : "Así los avisos de la dirección y la preceptoría te suenan en este dispositivo aunque NEXO esté cerrado."}
        </p>
        <div className="mt-3 flex gap-2">
          {push === "inactivo" && (
            <button type="button" className="av-boton chico" onClick={activarAlertas}>
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
              Activar
            </button>
          )}
          <button
            type="button"
            className="av-boton suave chico"
            onClick={() => {
              setOcultarBanner(true);
              try { window.localStorage.setItem(CLAVE_BANNER, String(Date.now())); } catch { /* sin almacenamiento */ }
            }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </aside>
  );

  return createPortal(
    <>
      {capaAvisos}
      {banner}
      {!hayAvisos && alDia > 0 && (
        <div key={alDia} className="av-toast" role="status" onAnimationEnd={() => setAlDia(0)}>
          <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
          Estás al día con los avisos
        </div>
      )}
    </>,
    document.body,
  );
}
