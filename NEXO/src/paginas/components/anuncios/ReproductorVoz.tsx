// Reproductor de una nota de voz: un botón grande para escuchar o pausar, la
// barra de avance (tocándola se salta a ese punto, también con las flechas), el
// tiempo y la velocidad (1x → 1,5x → 2x, como en las apps de mensajes; se
// recuerda en este navegador). Propio, como los desplegables: el reproductor
// del navegador se ve distinto en cada uno y no sigue los colores del aviso.
//
// Con `exigirCompleto` (la tarjeta de un aviso sin leer), el audio cuenta como
// escuchado recién cuando llega al final: hasta ahí la barra deja volver atrás
// pero no saltar más allá de lo ya escuchado. Si el audio no se puede
// reproducir en este dispositivo, no se bloquea a nadie: se avisa y se libera.
//
// La duración viene guardada desde que se grabó: los audios del celular o de la
// compu (webm) no siempre la traen adentro, y sin ella la barra no sabría
// cuánto falta.

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { duracionLegible } from "../../../servicios/anuncios";

interface Props {
  src: string;
  duracionMs: number | null;
  /** Hay que escucharlo entero (no se puede adelantar hasta terminarlo una vez). */
  exigirCompleto?: boolean;
  /** Se llama una vez: al terminarlo, o si no se puede reproducir. */
  onEscuchado?: () => void;
}

const VELOCIDADES = [1, 1.5, 2];
const CLAVE_VELOCIDAD = "nexo.audio.velocidad";
// Cambiar la velocidad en un audio la cambia en todos los que están en pantalla.
const EVENTO_VELOCIDAD = "nexo:velocidad-audio";

function velocidadGuardada(): number {
  try {
    const v = Number(localStorage.getItem(CLAVE_VELOCIDAD));
    return VELOCIDADES.includes(v) ? v : 1;
  } catch {
    return 1;
  }
}

export default function ReproductorVoz({ src, duracionMs, exigirCompleto = false, onEscuchado }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(0);
  const [total, setTotal] = useState((duracionMs ?? 0) / 1000);
  const [fallo, setFallo] = useState(false);
  const [completo, setCompleto] = useState(false);
  const [velocidad, setVelocidad] = useState(velocidadGuardada);
  // Hasta dónde llegó a escuchar: más allá no se puede saltar mientras se exija.
  const escuchadoHasta = useRef(0);
  const avisado = useRef(false);

  const marcarEscuchado = () => {
    setCompleto(true);
    if (!avisado.current) {
      avisado.current = true;
      onEscuchado?.();
    }
  };

  // Al salir de la pantalla, que no siga sonando.
  useEffect(() => {
    const a = audio.current;
    return () => a?.pause();
  }, []);

  useEffect(() => {
    const alCambiar = (e: Event) => setVelocidad((e as CustomEvent<number>).detail);
    window.addEventListener(EVENTO_VELOCIDAD, alCambiar);
    return () => window.removeEventListener(EVENTO_VELOCIDAD, alCambiar);
  }, []);

  // La velocidad elegida vale también para cuando arranca de nuevo.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.defaultPlaybackRate = velocidad;
    a.playbackRate = velocidad;
  }, [velocidad]);

  const alternar = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFallo(true));
    else a.pause();
  };

  const cambiarVelocidad = () => {
    const siguiente = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
    window.dispatchEvent(new CustomEvent(EVENTO_VELOCIDAD, { detail: siguiente }));
    try {
      localStorage.setItem(CLAVE_VELOCIDAD, String(siguiente));
    } catch {
      // Sin almacenamiento (ventana privada): vale solo para este audio.
    }
  };

  const irA = (proporcion: number) => {
    const a = audio.current;
    if (!a || !total) return;
    let destino = Math.max(0, Math.min(1, proporcion)) * total;
    if (exigirCompleto && !completo) destino = Math.min(destino, escuchadoHasta.current);
    a.currentTime = destino;
    setActual(destino);
  };

  const alTocarPista = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    irA((e.clientX - r.left) / r.width);
  };

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!total) return;
    if (e.key === "ArrowRight") { e.preventDefault(); irA((actual + 5) / total); }
    if (e.key === "ArrowLeft") { e.preventDefault(); irA((actual - 5) / total); }
  };

  const avance = total ? Math.min(100, (actual / total) * 100) : 0;
  const etiquetaVelocidad = `${String(velocidad).replace(".", ",")}x`;

  return (
    <div className="av-voz">
      <button type="button" className="av-voz-boton" onClick={alternar} aria-label={sonando ? "Pausar el audio" : "Escuchar el audio"}>
        <span className="material-symbols-outlined" aria-hidden="true">{sonando ? "pause" : "play_arrow"}</span>
      </button>
      <div
        className="av-voz-pista"
        role="slider"
        tabIndex={0}
        aria-label="Avance del audio"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(actual)}
        aria-valuetext={`${duracionLegible(actual * 1000)} de ${duracionLegible(total * 1000)}`}
        onClick={alTocarPista}
        onKeyDown={alTeclear}
      >
        <i style={{ width: `${avance}%` }} />
      </div>
      <span className="av-voz-tiempo">
        {fallo ? "No se pudo reproducir" : duracionLegible((sonando || actual > 0 ? actual : total) * 1000)}
      </span>
      <button
        type="button"
        className="av-voz-velocidad"
        onClick={cambiarVelocidad}
        aria-label={`Velocidad ${etiquetaVelocidad}. Tocá para cambiarla.`}
        title="Cambiar la velocidad"
      >
        {etiquetaVelocidad}
      </button>
      {exigirCompleto && completo && (
        <span className="av-voz-listo" title="Ya lo escuchaste completo">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span className="sr-only">Escuchado</span>
        </span>
      )}
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onEnded={() => { setSonando(false); setActual(0); marcarEscuchado(); }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setActual(t);
          escuchadoHasta.current = Math.max(escuchadoHasta.current, t);
        }}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) setTotal(e.currentTarget.duration);
          e.currentTarget.playbackRate = velocidad;
        }}
        onError={() => {
          // Que un audio que este dispositivo no puede reproducir no deje a
          // nadie trabado frente al aviso: se avisa y se libera.
          setFallo(true);
          marcarEscuchado();
        }}
      />
    </div>
  );
}
