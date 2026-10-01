// src/servicios/tiempoReal.ts
// El lado navegador del mensajero (Etapa 6, sección 14.2 paso 2).
//
// Abre UN tubo WebSocket con la cocina y reparte los eventos que llegan a quien
// se haya suscripto. Hay un solo tubo para toda la aplicación (no uno por
// pantalla): el chat, el globito del menú y la campana escuchan el mismo canal.
//
// La cookie de sesión viaja sola en el apretón de manos del WebSocket, así que
// no hace falta mandar ninguna llave a mano: la cocina sabe quién se conecta
// igual que en cualquier pedido /api.

import { useEffect } from "react";

/** Un evento empujado por la cocina. `tipo` dice qué pasó. */
export interface EventoVivo {
  tipo:
    | "conectado"
    | "pong"
    | "mensaje"
    | "notificacion"
    // Eventos del aula virtual en vivo (Etapa 9, sección 14.3). El tubo es el
    // mismo del chat y las notificaciones: la sala de clase no abre uno nuevo.
    | "aula-trazo"          // el docente dibujó un trazo en la pizarra (2.C.1)
    | "aula-pizarra-limpia" // el docente borró la pizarra
    | "aula-etapas"         // avanzó la trayectoria de la clase (3.B.1)
    | "aula-pulso"          // cambió el pulso del aula (3.B.4)
    | "aula-conectados"     // entró o salió alguien de la clase (3.B.11)
    | "aula-pregunta"       // llegó una pregunta de un estudiante (3.B.6)
    | "aula-alerta"         // saltó la alerta de ritmo (3.B.5)
    | "aula-estado"         // la clase pasó a en-vivo / finalizada
    // Señalización de la videollamada propia (WebRTC en malla, reemplazo de Jitsi).
    // El servidor sólo REENVÍA estas señales entre los navegadores de la misma
    // clase; el video/audio va directo entre pares. Ver servicios/videollamada.ts.
    | "video-participantes" // al entrar: mi peerId + quiénes ya estaban
    | "video-entra"         // entró un par nuevo a la sala de video
    | "video-sale"          // se fue un par de la sala de video
    | "oferta"              // oferta SDP dirigida de otro par
    | "respuesta"           // respuesta SDP dirigida de otro par
    | "candidato-ice"       // candidato ICE dirigido de otro par
    | "video-rechazado"     // el servidor negó la entrada al video (no sos miembro)
    | "video-lleno";        // la sala llegó al tope de cámaras (malla saturada)
  conversacionId?: string;
  mensaje?: unknown;
  notificacion?: unknown;
  // Campos de los eventos del aula (todos opcionales; cada pantalla lee el suyo).
  claseId?: string;
  trazo?: unknown;
  etapas?: unknown;
  estado?: string;
  pct?: number;
  mensajeAlerta?: string;
  // Campos de la señalización de video (cada uno lo lee videollamada.ts).
  miPeerId?: string;
  participantes?: { peerId: string; nombre: string }[];
  peerId?: string;
  de?: string;
  nombre?: string;
  sdp?: RTCSessionDescriptionInit;
  candidato?: RTCIceCandidateInit;
}

type Oyente = (evento: EventoVivo) => void;

const oyentes = new Set<Oyente>();
let socket: WebSocket | null = null;
let reintento: ReturnType<typeof setTimeout> | null = null;
let latido: ReturnType<typeof setInterval> | null = null;

function urlDelTubo(): string {
  // ws:// en desarrollo (http), wss:// si algún día se publica con https. Se
  // arma desde la dirección actual para no clavar "localhost" a mano.
  const protocolo = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${window.location.host}/ws`;
}

function conectar() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(urlDelTubo());

  socket.onopen = () => {
    // Latido: cada 25 s un "ping" para que el tubo no se cierre por inactividad.
    if (latido) clearInterval(latido);
    latido = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ tipo: "ping" }));
      }
    }, 25000);
  };

  socket.onmessage = (e) => {
    let evento: EventoVivo;
    try {
      evento = JSON.parse(e.data);
    } catch {
      return; // mensaje ilegible: se ignora
    }
    for (const oyente of oyentes) oyente(evento);
  };

  socket.onclose = () => {
    if (latido) clearInterval(latido);
    latido = null;
    socket = null;
    // Reconectar solo si todavía queda alguien escuchando (una pantalla abierta).
    // Sin esto, cerrar sesión dejaría intentos eternos contra un tubo sin dueño.
    if (oyentes.size > 0 && !reintento) {
      reintento = setTimeout(() => {
        reintento = null;
        conectar();
      }, 2000);
    }
  };

  socket.onerror = () => socket?.close();
}

function quizasCerrar() {
  if (oyentes.size > 0) return;
  if (reintento) {
    clearTimeout(reintento);
    reintento = null;
  }
  if (latido) {
    clearInterval(latido);
    latido = null;
  }
  socket?.close();
  socket = null;
}

/**
 * Suscribe una pantalla a los eventos en vivo. Devuelve el evento crudo; cada
 * pantalla filtra el `tipo` que le importa (el chat escucha "mensaje", el menú
 * escucha "mensaje" y "notificacion"). Se conecta al montar y se limpia al
 * desmontar; el tubo se comparte entre todas las suscripciones abiertas.
 */
export function useTiempoReal(alRecibir: Oyente) {
  useEffect(() => {
    oyentes.add(alRecibir);
    conectar();
    return () => {
      oyentes.delete(alRecibir);
      quizasCerrar();
    };
  }, [alRecibir]);
}

/**
 * Manda un mensaje por el MISMO tubo (no abre otro). Lo usa la señalización de
 * video para empujar sus ofertas/respuestas/candidatos. Devuelve true si salió;
 * false si el tubo todavía no estaba abierto (el que llama puede reintentar al
 * recibir el evento "conectado"). No reintenta ni encola por su cuenta: la
 * señalización de video es efímera y se rehace sola en la próxima negociación.
 */
export function enviarPorTubo(mensaje: unknown): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(mensaje));
    return true;
  }
  return false;
}
