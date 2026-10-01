// SalaVideo.tsx
// El video y el audio de la clase en vivo, PROPIO de NEXO (reemplaza a SalaJitsi).
//
// No hay ningún servicio externo: los navegadores se conectan entre sí con WebRTC
// (ver servicios/videollamada.ts) y la señalización viaja por el mismo WebSocket
// del chat (servicios/tiempoReal.ts). Este componente es sólo la CARA: una grilla
// de videos con el nombre real de cada quien, y los controles de micrófono,
// cámara, compartir pantalla y salir. Toda la mecánica vive en la clase
// Videollamada; acá guardamos una instancia y dibujamos su último estado.
//
// Convive con el menú lateral (Error 3.B.3): se dibuja DENTRO de su caja, no a
// pantalla completa. La pizarra, el pulso, el chat y la alerta de ritmo (Etapa 9)
// son otros componentes y no se tocan.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTiempoReal, enviarPorTubo, type EventoVivo } from "../../../servicios/tiempoReal";
import {
  Videollamada,
  type EstadoVideollamada,
  type ParticipanteRemoto,
} from "../../../servicios/videollamada";

interface SalaVideoProps {
  claseId: string;
  /** Nombre real de esta persona, para su propio recuadro. */
  nombre: string;
  /** Salir del video (y de la clase): la página decide a dónde volver. */
  onSalir: () => void;
}

const ESTADO_INICIAL: EstadoVideollamada = {
  media: "pidiendo",
  streamLocal: null,
  micActivo: true,
  camActiva: true,
  compartiendoPantalla: false,
  participantes: [],
};

export default function SalaVideo({ claseId, nombre, onSalir }: SalaVideoProps) {
  const [estado, setEstado] = useState<EstadoVideollamada>(ESTADO_INICIAL);
  const vcRef = useRef<Videollamada | null>(null);

  // Una videollamada por clase: se arma al entrar y se cierra al salir (lo que
  // avisa al servidor y a los demás, y apaga la cámara).
  useEffect(() => {
    const vc = new Videollamada(claseId, enviarPorTubo, setEstado);
    vcRef.current = vc;
    void vc.iniciar();
    return () => {
      vc.salir();
      vcRef.current = null;
    };
  }, [claseId]);

  // Las señales llegan por el tubo compartido; se las pasamos tal cual a la malla.
  const alRecibir = useCallback((evento: EventoVivo) => {
    vcRef.current?.recibirSenal(evento);
  }, []);
  useTiempoReal(alRecibir);

  const { media, streamLocal, micActivo, camActiva, compartiendoPantalla, participantes } = estado;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-white/10 flex flex-col">
      {/* Aviso honesto si el servidor no me deja entrar (no debería pasar: el
          permiso ya se validó al abrir la clase, pero lo decimos igual). */}
      {media === "rechazado" && (
        <div className="bg-error/20 text-error text-xs px-3 py-2 text-center">
          No podés entrar al video de esta clase.
        </div>
      )}
      {media === "lleno" && (
        <div className="bg-amber-500/20 text-amber-300 text-xs px-3 py-2 text-center">
          La sala de video está llena. Se alcanzó el máximo de cámaras en vivo.
        </div>
      )}

      {/* Grilla de videos */}
      <div className="flex-1 min-h-0 p-2 grid gap-2 auto-rows-fr"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}
      >
        {/* Mi propio recuadro. Se ve mi video cuando tengo cámara encendida, o
            cuando estoy compartiendo pantalla (aunque no tenga cámara). */}
        <Recuadro
          stream={streamLocal}
          nombre={`${nombre} (vos)`}
          muteLocal
          etiquetaEstado={leyendaMediaLocal(media, camActiva, compartiendoPantalla)}
          apagada={!((media === "ok" && camActiva) || compartiendoPantalla)}
        />

        {/* Los demás */}
        {participantes.map((p) => (
          <RecuadroRemoto key={p.peerId} participante={p} />
        ))}

        {/* Nadie más todavía */}
        {participantes.length === 0 && (
          <div className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm text-center p-4">
            Esperando participantes…
          </div>
        )}
      </div>

      {/* Barra de controles */}
      <div className="flex items-center justify-center gap-2 p-2 border-t border-white/10 bg-black/40">
        <BotonControl
          activo={micActivo}
          onClick={() => vcRef.current?.alternarMic()}
          deshabilitado={media !== "ok"}
          iconoOn="mic"
          iconoOff="mic_off"
          titulo={micActivo ? "Silenciar micrófono" : "Activar micrófono"}
        />
        <BotonControl
          activo={camActiva}
          onClick={() => vcRef.current?.alternarCam()}
          deshabilitado={media !== "ok"}
          iconoOn="videocam"
          iconoOff="videocam_off"
          titulo={camActiva ? "Apagar cámara" : "Encender cámara"}
        />
        <BotonControl
          activo={!compartiendoPantalla}
          onClick={() => void vcRef.current?.compartirPantalla()}
          iconoOn="screen_share"
          iconoOff="stop_screen_share"
          titulo={compartiendoPantalla ? "Dejar de compartir" : "Compartir pantalla"}
          resaltar={compartiendoPantalla}
        />
        <button
          onClick={onSalir}
          title="Salir del video"
          className="ml-2 w-10 h-10 rounded-full bg-error/80 text-white flex items-center justify-center hover:bg-error active:scale-95"
        >
          <span className="material-symbols-outlined">call_end</span>
        </button>
      </div>
    </div>
  );
}

// ── Un recuadro remoto: video + estado honesto de la conexión ─────────────────
function RecuadroRemoto({ participante }: { participante: ParticipanteRemoto }) {
  const { nombre, stream, estado } = participante;
  let etiqueta: string | null = null;
  if (estado === "conectando") etiqueta = "Conectando…";
  else if (estado === "caido") etiqueta = `Conexión caída con ${nombre || "este participante"}`;
  return (
    <Recuadro
      stream={stream}
      nombre={nombre || "Participante"}
      etiquetaEstado={etiqueta}
      apagada={!stream || estado !== "conectado"}
      alerta={estado === "caido"}
    />
  );
}

// ── Recuadro genérico de video ────────────────────────────────────────────────
function Recuadro({
  stream,
  nombre,
  muteLocal = false,
  etiquetaEstado = null,
  apagada = false,
  alerta = false,
}: {
  stream: MediaStream | null;
  nombre: string;
  muteLocal?: boolean;
  etiquetaEstado?: string | null;
  apagada?: boolean;
  alerta?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#0f0820] border ${
        alerta ? "border-error/50" : "border-white/10"
      } min-h-[120px]`}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muteLocal}
        className={`w-full h-full object-cover ${apagada ? "opacity-0" : ""}`}
      />
      {apagada && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs text-center p-2">
          <span className="material-symbols-outlined text-3xl text-slate-500">
            {alerta ? "wifi_off" : "person"}
          </span>
          {etiquetaEstado && <span className={alerta ? "text-error" : ""}>{etiquetaEstado}</span>}
        </div>
      )}
      <span className="absolute bottom-1 left-1 right-1 truncate text-[11px] text-white bg-black/50 rounded px-1.5 py-0.5">
        {nombre}
      </span>
    </div>
  );
}

// ── Un botón de control (mic / cámara / pantalla) ─────────────────────────────
function BotonControl({
  activo,
  onClick,
  iconoOn,
  iconoOff,
  titulo,
  deshabilitado = false,
  resaltar = false,
}: {
  activo: boolean;
  onClick: () => void;
  iconoOn: string;
  iconoOff: string;
  titulo: string;
  deshabilitado?: boolean;
  resaltar?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      title={titulo}
      aria-label={titulo}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        resaltar
          ? "bg-primary text-white"
          : activo
          ? "bg-white/10 text-white hover:bg-white/20"
          : "bg-error/30 text-error hover:bg-error/40"
      }`}
    >
      <span className="material-symbols-outlined">{activo ? iconoOn : iconoOff}</span>
    </button>
  );
}

/** Qué decir en MI recuadro según el permiso a la cámara. */
function leyendaMediaLocal(
  media: EstadoVideollamada["media"],
  camActiva: boolean,
  compartiendoPantalla: boolean
): string | null {
  // Si estoy compartiendo pantalla, el recuadro muestra la pantalla: sin leyenda.
  if (compartiendoPantalla) return null;
  switch (media) {
    case "pidiendo":
      return "Pidiendo cámara…";
    case "denegada":
      return "Cámara denegada";
    case "sin-dispositivo":
      return "Sin cámara";
    case "inseguro":
      return "Cámara bloqueada fuera de https/localhost";
    case "lleno":
      return "Sala llena";
    case "rechazado":
      return null;
    case "ok":
      return camActiva ? null : "Cámara apagada";
    default:
      return null;
  }
}
