// Grabar una nota de voz, como en las apps de mensajes:
//   · se mantiene apretado el micrófono mientras se habla, y al soltarlo la
//     grabación queda lista en el aviso (todavía no se manda: se puede
//     escuchar o sacar antes de tocar "Enviar aviso");
//   · si mientras se graba se desliza el dedo (o el mouse) hacia arriba, la
//     grabación queda BLOQUEADA: sigue sola sin apretar, se puede PAUSAR y
//     seguir (lo pausado no cuenta en la duración), y se termina con "Listo" o
//     se tira con "Descartar";
//   · con el teclado, Enter o Espacio empiezan directamente una grabación
//     bloqueada (mantener apretada una tecla no es cómodo).
//
// El micrófono pide permiso la primera vez. Si el permiso tarda y la persona ya
// soltó el botón, no se graba nada: se le avisa que ya puede grabar.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { duracionLegible } from "../../../servicios/anuncios";

export interface NotaGrabada {
  blob: Blob;
  duracionMs: number;
  tipo: string;
}

interface Props {
  onGrabado: (nota: NotaGrabada) => void;
  /** Avisa si está grabando: mientras tanto no se puede enviar el aviso. */
  onGrabando?: (grabando: boolean) => void;
  disabled?: boolean;
}

type Estado = "listo" | "pidiendo" | "grabando" | "bloqueado";

const UMBRAL_BLOQUEO = 70; // píxeles hacia arriba para dejarla grabando sola
const MINIMO_MS = 800; // un toque no es un audio
const MAXIMO_MS = 10 * 60 * 1000; // el mismo tope que el servidor
const FORMATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export default function GrabadorVoz({ onGrabado, onGrabando, disabled = false }: Props) {
  const [estado, setEstado] = useState<Estado>("listo");
  const [ms, setMs] = useState(0);
  const [arrastre, setArrastre] = useState(0);
  const [aviso, setAviso] = useState("");
  const [pausado, setPausado] = useState(false);
  const apretado = useRef(false);
  const bloqueado = useRef(false);
  const inicioY = useRef(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const trozos = useRef<Blob[]>([]);
  const comienzo = useRef(0);
  // Lo pausado no cuenta: cuándo empezó la pausa actual y cuánto se pausó en total.
  const pausaDesde = useRef(0);
  const pausaTotal = useRef(0);
  /** Lo que de verdad se grabó hasta ahora (sin las pausas). */
  const grabadoMs = () => (pausaDesde.current || Date.now()) - comienzo.current - pausaTotal.current;

  const grabando = estado === "grabando" || estado === "bloqueado";
  useEffect(() => onGrabando?.(grabando), [grabando, onGrabando]);

  const soltarMicrofono = () => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
  };

  const terminar = useCallback((guardar: boolean) => {
    const rec = grabador.current;
    grabador.current = null;
    bloqueado.current = false;
    apretado.current = false;
    setArrastre(0);
    setEstado("listo");
    if (!rec) {
      soltarMicrofono();
      return;
    }
    const duracion = grabadoMs();
    pausaDesde.current = 0;
    pausaTotal.current = 0;
    setPausado(false);
    rec.onstop = () => {
      soltarMicrofono();
      const tipo = rec.mimeType || "audio/webm";
      if (guardar && duracion >= MINIMO_MS) onGrabado({ blob: new Blob(trozos.current, { type: tipo }), duracionMs: duracion, tipo });
      else if (guardar) setAviso("Fue muy cortito. Mantené apretado el botón mientras hablás.");
    };
    rec.stop();
  }, [onGrabado]);

  const empezar = async () => {
    setAviso("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAviso("Este navegador no permite grabar audio. Si NEXO no se abrió con https, pedile a quien lo administra que lo active.");
      return;
    }
    setEstado("pidiendo");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setEstado("listo");
      setAviso("No se pudo usar el micrófono. Revisá que NEXO tenga permiso para usarlo (el candado al lado de la dirección).");
      return;
    }
    // Si mientras se pedía permiso ya soltó el botón, no se graba nada.
    if (!apretado.current && !bloqueado.current) {
      stream.getTracks().forEach((t) => t.stop());
      setEstado("listo");
      setAviso("Listo, ya podés grabar: mantené apretado el botón mientras hablás.");
      return;
    }
    const tipo = FORMATOS.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    trozos.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) trozos.current.push(e.data); };
    flujo.current = stream;
    grabador.current = rec;
    comienzo.current = Date.now();
    pausaDesde.current = 0;
    pausaTotal.current = 0;
    rec.start(250);
    setMs(0);
    setEstado(bloqueado.current ? "bloqueado" : "grabando");
  };

  // El reloj de la grabación, y el corte automático al llegar al tope.
  useEffect(() => {
    if (!grabando) return;
    const t = window.setInterval(() => {
      const transcurrido = grabadoMs();
      setMs(transcurrido);
      if (transcurrido >= MAXIMO_MS) terminar(true);
    }, 200);
    return () => window.clearInterval(t);
  }, [grabando, terminar]);

  // Si la pantalla se cierra grabando, se apaga el micrófono.
  useEffect(() => () => {
    grabador.current?.stop();
    flujo.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const pausar = () => {
    const rec = grabador.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    pausaDesde.current = Date.now();
    setPausado(true);
  };

  const seguir = () => {
    const rec = grabador.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    pausaTotal.current += Date.now() - pausaDesde.current;
    pausaDesde.current = 0;
    setPausado(false);
  };

  const alApretar = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || estado !== "listo" || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    apretado.current = true;
    inicioY.current = e.clientY;
    void empezar();
  };

  const alMover = (e: PointerEvent<HTMLButtonElement>) => {
    if (!apretado.current || bloqueado.current) return;
    const subida = Math.max(0, inicioY.current - e.clientY);
    setArrastre(subida);
    if (subida > UMBRAL_BLOQUEO) {
      bloqueado.current = true;
      setArrastre(0);
      navigator.vibrate?.(30);
      if (grabador.current) setEstado("bloqueado");
    }
  };

  const alSoltar = () => {
    if (!apretado.current) return;
    apretado.current = false;
    setArrastre(0);
    if (bloqueado.current) return; // bloqueada: sigue grabando sola
    if (grabador.current) terminar(true);
  };

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Enter" || e.key === " ") && estado === "listo" && !disabled) {
      e.preventDefault();
      bloqueado.current = true;
      void empezar();
    }
  };

  if (estado === "bloqueado") {
    return (
      <div className={`av-grabador is-grabando is-bloqueado ${pausado ? "is-pausado" : ""}`} role="status">
        <span className="av-grabador-punto" aria-hidden="true" />
        <span className="av-grabador-tiempo">{duracionLegible(ms)}</span>
        <span className="av-grabador-texto">{pausado ? "En pausa" : "Grabando sin apretar…"}</span>
        {pausado ? (
          <button type="button" className="av-boton suave chico" onClick={seguir}>
            <span className="material-symbols-outlined" aria-hidden="true">mic</span>
            Seguir grabando
          </button>
        ) : (
          <button type="button" className="av-boton suave chico" onClick={pausar}>
            <span className="material-symbols-outlined" aria-hidden="true">pause</span>
            Pausar
          </button>
        )}
        <button type="button" className="av-boton suave chico" onClick={() => terminar(false)}>
          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
          Descartar
        </button>
        <button type="button" className="av-boton chico" onClick={() => terminar(true)}>
          <span className="material-symbols-outlined" aria-hidden="true">check</span>
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className={`av-grabador ${grabando ? "is-grabando" : ""}`}>
      {/* El texto va a la izquierda del micrófono: arriba del micrófono queda
          libre para el candado que aparece al deslizar. */}
      <div className="av-grabador-info">
        {grabando ? (
          <>
            <span className="av-grabador-punto" aria-hidden="true" />
            <span className="av-grabador-tiempo">{duracionLegible(ms)}</span>
            <span className="av-grabador-texto">Soltá para terminar · deslizá hacia arriba para seguir sin apretar</span>
          </>
        ) : (
          <span className="av-grabador-texto">
            {estado === "pidiendo" ? "Pidiendo permiso para usar el micrófono…" : "Mantené apretado para grabar un audio"}
          </span>
        )}
        {aviso && <p className="av-grabador-aviso" role="status">{aviso}</p>}
      </div>
      <div className="av-grabador-zona">
        {grabando && (
          <span
            className={`av-grabador-candado ${arrastre > UMBRAL_BLOQUEO * 0.6 ? "is-cerca" : ""}`}
            style={{ transform: `translateY(${-Math.min(arrastre, UMBRAL_BLOQUEO)}px)` }}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">lock</span>
            <span className="material-symbols-outlined">keyboard_arrow_up</span>
          </span>
        )}
        <button
          type="button"
          className={`av-microfono ${grabando ? "is-activo" : ""}`}
          disabled={disabled}
          aria-label="Grabar un audio: mantené apretado mientras hablás, o tocá Enter para grabar sin apretar"
          onPointerDown={alApretar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={alTeclear}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">mic</span>
        </button>
      </div>
    </div>
  );
}
