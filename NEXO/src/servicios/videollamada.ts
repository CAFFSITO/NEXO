// src/servicios/videollamada.ts
// La videollamada PROPIA del aula en vivo (reemplazo de Jitsi, Etapa 9).
//
// Sin ningún servicio externo: el video y el audio los negocian los navegadores
// entre sí con WebRTC nativo (RTCPeerConnection). La topología es MALLA (mesh):
// cada participante abre una conexión directa con cada otro, así que el media
// nunca pasa por nuestro servidor ni por nadie más. Alcanza para un aula chica
// (~8–10 cámaras); más que eso pediría un servidor de mezcla (SFU), que hoy no
// tenemos y que no hace falta para una clase.
//
// La señalización —el "apretón de manos" para armar cada conexión (ofertas y
// respuestas SDP, candidatos ICE)— viaja por el MISMO WebSocket del chat y las
// notificaciones (servicios/tiempoReal.ts). No se abre un segundo tubo. El
// servidor sólo REENVÍA esas señales entre miembros de la misma clase; el
// permiso se valida allá (esMiembroDeClase), como en cualquier /api.
//
// Quién ofrece a quién: el que ENTRA le hace la oferta a cada uno de los que ya
// estaban. Así cada par negocia en un solo sentido y no hay choque de ofertas.

import type { EventoVivo } from "./tiempoReal";

// ── Servidores ICE ───────────────────────────────────────────────────────────
// VACÍO por defecto y a propósito. En la red local de una escuela los candidatos
// "host" (la IP local de cada máquina) alcanzan para que los navegadores se
// encuentren, sin depender de nadie.
//
// Si algún día hay que cruzar NAT (entrar al aula desde fuera de la escuela), se
// apunta a un STUN/TURN PROPIO de la institución —NUNCA uno ajeno— sin tocar este
// código: se define la variable de entorno de build `VITE_ICE_SERVERS` con un
// JSON de RTCIceServer[], por ejemplo:
//   VITE_ICE_SERVERS='[{"urls":"turn:turn.miescuela.edu:3478","username":"x","credential":"y"}]'
// Mientras esté sin definir, la lista queda vacía y todo sigue siendo local.
export const SERVIDORES_ICE: RTCIceServer[] = leerServidoresIce();

function leerServidoresIce(): RTCIceServer[] {
  const crudo = import.meta.env?.VITE_ICE_SERVERS;
  if (!crudo) return [];
  try {
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? (lista as RTCIceServer[]) : [];
  } catch {
    // Config mal escrita: mejor red local (vacío) que romper la videollamada.
    console.warn("VITE_ICE_SERVERS no es un JSON válido; se usan candidatos locales.");
    return [];
  }
}

/** Cómo va el permiso a la cámara/micrófono de ESTA persona. */
export type EstadoMedia =
  | "pidiendo"      // esperando que el navegador pregunte por la cámara
  | "ok"            // cámara y/o micrófono concedidos
  | "denegada"      // la persona (o el navegador) negó el permiso
  | "sin-dispositivo" // no hay cámara/micrófono en esta máquina
  | "inseguro"      // el navegador bloquea la cámara fuera de https/localhost
  | "rechazado"     // el servidor no me deja entrar a esta sala (no soy miembro)
  | "lleno";        // la sala llegó al máximo de cámaras (malla saturada)

export type EstadoConexion = "conectando" | "conectado" | "caido";

export interface ParticipanteRemoto {
  peerId: string;
  nombre: string;
  stream: MediaStream | null;
  estado: EstadoConexion;
}

export interface EstadoVideollamada {
  media: EstadoMedia;
  streamLocal: MediaStream | null;
  micActivo: boolean;
  camActiva: boolean;
  compartiendoPantalla: boolean;
  participantes: ParticipanteRemoto[];
}

/** Una señal que sale hacia el servidor por el tubo compartido. */
export interface SenalSaliente {
  tipo: "unirse-video" | "oferta" | "respuesta" | "candidato-ice" | "salir-video";
  claseId: string;
  para?: string;
  sdp?: RTCSessionDescriptionInit | null;
  candidato?: RTCIceCandidateInit;
}

interface Par {
  peerId: string;
  nombre: string;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  estado: EstadoConexion;
  // Candidatos ICE que llegaron antes de tener la descripción remota lista.
  candidatosPendientes: RTCIceCandidateInit[];
  // ¿Soy YO el que le ofrece a este par? (los "roles" no cambian en toda la
  // conexión). Sólo el que ofrece reintenta la negociación si la conexión falla,
  // así el reintento nunca choca con otro (no hay glare).
  iniciador: boolean;
  // El emisor de video de ESTA conexión, guardado aparte para poder cambiar la
  // pista (cámara ↔ pantalla) aunque no haya cámara: con `getSenders()` no se lo
  // puede encontrar cuando su pista es null.
  videoSender: RTCRtpSender | null;
  // Evita apilar reintentos de ICE mientras uno está en curso.
  reintentando: boolean;
}

/**
 * Maneja toda la malla de una clase: el media propio, una RTCPeerConnection por
 * cada otro participante y la negociación por el WebSocket. La capa de React
 * (SalaVideo) le pasa cómo enviar señales y le reenvía las que llegan; a cambio
 * recibe un `EstadoVideollamada` cada vez que algo cambia, para redibujar.
 */
export class Videollamada {
  private pares = new Map<string, Par>();
  private streamLocal: MediaStream | null = null;
  private media: EstadoMedia = "pidiendo";
  private micActivo = true;
  private camActiva = true;
  private compartiendoPantalla = false;
  private camTrack: MediaStreamTrack | null = null; // cámara guardada mientras comparto pantalla
  private iniciado = false;
  private cerrado = false;

  private readonly claseId: string;
  private readonly enviarSenal: (s: SenalSaliente) => boolean;
  private readonly alCambiar: (estado: EstadoVideollamada) => void;

  constructor(
    claseId: string,
    enviarSenal: (s: SenalSaliente) => boolean,
    alCambiar: (estado: EstadoVideollamada) => void
  ) {
    this.claseId = claseId;
    this.enviarSenal = enviarSenal;
    this.alCambiar = alCambiar;
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  async iniciar(): Promise<void> {
    // getUserMedia sólo existe en contexto seguro (https o localhost). Fuera de
    // eso el navegador ni lo ofrece: lo decimos con honestidad y seguimos, para
    // al menos poder VER a los demás.
    if (!navigator.mediaDevices?.getUserMedia) {
      this.media = "inseguro";
    } else {
      try {
        this.streamLocal = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.media = "ok";
      } catch (e) {
        const nombre = (e as DOMException)?.name;
        if (nombre === "NotFoundError" || nombre === "OverconstrainedError") this.media = "sin-dispositivo";
        else if (nombre === "NotAllowedError" || nombre === "SecurityError") this.media = "denegada";
        else this.media = "denegada";
        this.streamLocal = null;
      }
    }
    if (this.cerrado) {
      // Se desmontó mientras pedíamos la cámara: soltar lo que se haya concedido.
      this.streamLocal?.getTracks().forEach((t) => t.stop());
      return;
    }
    this.iniciado = true;
    this.unirse();
    this.emitir();
  }

  private unirse() {
    // Si el tubo todavía no estaba abierto, `enviarSenal` devuelve false; no pasa
    // nada: al abrirse llega el evento "conectado" y ahí reintentamos (reUnir).
    this.enviarSenal({ tipo: "unirse-video", claseId: this.claseId });
  }

  /** Rehace la membresía desde cero (tras reconectar el tubo: el servidor ya nos
   *  dio de baja y los demás cerraron su conexión con nosotros). */
  private reUnir() {
    for (const par of this.pares.values()) par.pc.close();
    this.pares.clear();
    this.unirse();
    this.emitir();
  }

  // ── Señales que llegan (las reenvía SalaVideo desde useTiempoReal) ───────────
  recibirSenal(evento: EventoVivo): void {
    // "conectado" no trae claseId: es el saludo del tubo. El resto sí, y filtramos.
    if (evento.tipo === "conectado") {
      if (this.iniciado) this.reUnir();
      return;
    }
    if (evento.claseId !== this.claseId) return;

    switch (evento.tipo) {
      case "video-rechazado":
        this.media = "rechazado";
        this.emitir();
        break;

      case "video-lleno":
        this.media = "lleno";
        this.emitir();
        break;

      case "video-participantes":
        // Soy el que entró: le hago la oferta a cada uno de los que ya estaban.
        for (const p of evento.participantes ?? []) {
          this.crearPar(p.peerId, p.nombre, true);
        }
        this.emitir();
        break;

      case "video-entra":
        // Entró alguien después que yo: NO le ofrezco (él me ofrece a mí). Preparo
        // el par para mostrar "conectando…" y recibir su oferta.
        if (evento.peerId) this.crearPar(evento.peerId, evento.nombre ?? "", false);
        this.emitir();
        break;

      case "video-sale":
        if (evento.peerId) this.cerrarPar(evento.peerId);
        break;

      case "oferta":
        if (evento.de && evento.sdp) this.alRecibirOferta(evento.de, evento.nombre ?? "", evento.sdp);
        break;

      case "respuesta":
        if (evento.de && evento.sdp) this.alRecibirRespuesta(evento.de, evento.sdp);
        break;

      case "candidato-ice":
        if (evento.de && evento.candidato) this.alRecibirCandidato(evento.de, evento.candidato);
        break;
    }
  }

  // ── Construcción de una conexión con un par ──────────────────────────────────
  private crearPar(peerId: string, nombre: string, iniciador: boolean): Par {
    const existente = this.pares.get(peerId);
    if (existente) {
      if (nombre && !existente.nombre) existente.nombre = nombre;
      return existente;
    }
    const pc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE });
    const par: Par = {
      peerId,
      nombre,
      pc,
      stream: null,
      estado: "conectando",
      candidatosPendientes: [],
      iniciador,
      videoSender: null,
      reintentando: false,
    };
    this.pares.set(peerId, par);
    par.videoSender = this.agregarMedia(pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.enviarSenal({
          tipo: "candidato-ice",
          claseId: this.claseId,
          para: peerId,
          candidato: e.candidate.toJSON(),
        });
      }
    };
    pc.ontrack = (e) => {
      par.stream = e.streams[0] ?? new MediaStream([e.track]);
      if (par.estado !== "conectado") par.estado = "conectado";
      this.emitir();
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        par.estado = "conectado";
        par.reintentando = false;
      } else if (s === "failed") {
        par.estado = "caido";
        // La conexión se cortó de verdad. Sólo el que ofrece reintenta (ICE
        // restart), así el reintento nunca choca con el del otro lado.
        if (par.iniciador && !par.reintentando) {
          par.reintentando = true;
          void this.negociar(par, /* iceRestart */ true);
        }
      } else if (s === "disconnected" || s === "closed") {
        // "disconnected" suele ser un bache pasajero que se recupera solo: lo
        // mostramos caído pero no forzamos nada todavía.
        par.estado = "caido";
      }
      this.emitir();
    };

    if (iniciador) void this.negociar(par);
    return par;
  }

  /** Agrega el media propio a una conexión y devuelve el emisor de video (para
   *  poder cambiar su pista después). Sin cámara propia, deja transceivers
   *  sendrecv: así igual recibo a los demás Y puedo compartir pantalla más tarde. */
  private agregarMedia(pc: RTCPeerConnection): RTCRtpSender {
    if (this.streamLocal) {
      let videoSender: RTCRtpSender | null = null;
      for (const t of this.streamLocal.getTracks()) {
        const sender = pc.addTrack(t, this.streamLocal);
        if (t.kind === "video") videoSender = sender;
      }
      // Si tengo micrófono pero no cámara, igual dejo lugar para compartir pantalla.
      return videoSender ?? pc.addTransceiver("video", { direction: "sendrecv" }).sender;
    }
    pc.addTransceiver("audio", { direction: "sendrecv" });
    return pc.addTransceiver("video", { direction: "sendrecv" }).sender;
  }

  private async negociar(par: Par, iceRestart = false) {
    try {
      const oferta = await par.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await par.pc.setLocalDescription(oferta);
      this.enviarSenal({ tipo: "oferta", claseId: this.claseId, para: par.peerId, sdp: par.pc.localDescription });
    } catch {
      par.estado = "caido";
      par.reintentando = false;
      this.emitir();
    }
  }

  private async alRecibirOferta(de: string, nombre: string, sdp: RTCSessionDescriptionInit) {
    const par = this.crearPar(de, nombre, false);
    try {
      await par.pc.setRemoteDescription(sdp);
      await this.drenarCandidatos(par);
      const respuesta = await par.pc.createAnswer();
      await par.pc.setLocalDescription(respuesta);
      this.enviarSenal({ tipo: "respuesta", claseId: this.claseId, para: de, sdp: par.pc.localDescription });
    } catch {
      par.estado = "caido";
      this.emitir();
    }
  }

  private async alRecibirRespuesta(de: string, sdp: RTCSessionDescriptionInit) {
    const par = this.pares.get(de);
    if (!par) return;
    try {
      await par.pc.setRemoteDescription(sdp);
      await this.drenarCandidatos(par);
    } catch {
      par.estado = "caido";
      this.emitir();
    }
  }

  private async alRecibirCandidato(de: string, candidato: RTCIceCandidateInit) {
    const par = this.pares.get(de);
    if (!par) return;
    // Un candidato puede llegar antes que la descripción remota: lo guardamos y lo
    // aplicamos cuando ésta esté lista (si no, addIceCandidate falla).
    if (!par.pc.remoteDescription) {
      par.candidatosPendientes.push(candidato);
      return;
    }
    try {
      await par.pc.addIceCandidate(candidato);
    } catch {
      /* candidato tardío o inválido: no rompe la conexión */
    }
  }

  private async drenarCandidatos(par: Par) {
    const pendientes = par.candidatosPendientes;
    par.candidatosPendientes = [];
    for (const c of pendientes) {
      try {
        await par.pc.addIceCandidate(c);
      } catch {
        /* ignorar */
      }
    }
  }

  private cerrarPar(peerId: string) {
    const par = this.pares.get(peerId);
    if (!par) return;
    par.pc.close();
    this.pares.delete(peerId);
    this.emitir();
  }

  // ── Controles ────────────────────────────────────────────────────────────────
  alternarMic() {
    const pistas = this.streamLocal?.getAudioTracks() ?? [];
    if (pistas.length === 0) return;
    this.micActivo = !this.micActivo;
    for (const t of pistas) t.enabled = this.micActivo;
    this.emitir();
  }

  alternarCam() {
    const pistas = this.streamLocal?.getVideoTracks() ?? [];
    if (pistas.length === 0) return;
    this.camActiva = !this.camActiva;
    for (const t of pistas) t.enabled = this.camActiva;
    this.emitir();
  }

  async compartirPantalla(): Promise<void> {
    if (this.compartiendoPantalla) {
      this.detenerPantalla();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    let pantalla: MediaStream;
    try {
      pantalla = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return; // la persona canceló el diálogo: sin drama
    }
    const trackPantalla = pantalla.getVideoTracks()[0];
    if (!trackPantalla) return;
    this.camTrack = this.streamLocal?.getVideoTracks()[0] ?? null; // guardar la cámara
    this.reemplazarVideo(trackPantalla);
    this.compartiendoPantalla = true;
    // Cuando la persona corta el compartir desde la barra del navegador.
    trackPantalla.onended = () => this.detenerPantalla();
    this.emitir();
  }

  private detenerPantalla() {
    if (!this.compartiendoPantalla) return;
    this.compartiendoPantalla = false;
    const actual = this.streamLocal?.getVideoTracks()[0] ?? null; // la pista de pantalla
    if (this.camTrack) this.reemplazarVideo(this.camTrack);
    if (actual && actual !== this.camTrack) actual.stop(); // apagar la captura de pantalla
    this.camTrack = null;
    this.emitir();
  }

  /** Cambia la pista de video que se envía (cámara ↔ pantalla) en todas las
   *  conexiones y en la vista previa local, sin renegociar (replaceTrack). Usa el
   *  emisor guardado por par, así funciona incluso si esta persona no tenía cámara. */
  private reemplazarVideo(nuevo: MediaStreamTrack) {
    const anterior = this.streamLocal?.getVideoTracks()[0] ?? null;
    for (const par of this.pares.values()) {
      par.videoSender?.replaceTrack(nuevo).catch(() => {});
    }
    if (this.streamLocal) {
      if (anterior) this.streamLocal.removeTrack(anterior);
      this.streamLocal.addTrack(nuevo);
    } else {
      this.streamLocal = new MediaStream([nuevo]);
    }
  }

  // ── Salida ────────────────────────────────────────────────────────────────────
  salir() {
    if (this.cerrado) return;
    this.cerrado = true;
    if (this.iniciado) this.enviarSenal({ tipo: "salir-video", claseId: this.claseId });
    for (const par of this.pares.values()) par.pc.close();
    this.pares.clear();
    this.streamLocal?.getTracks().forEach((t) => t.stop());
    this.streamLocal = null;
  }

  // ── Snapshot para React ─────────────────────────────────────────────────────
  private emitir() {
    if (this.cerrado) return;
    this.alCambiar({
      media: this.media,
      streamLocal: this.streamLocal,
      micActivo: this.micActivo,
      camActiva: this.camActiva,
      compartiendoPantalla: this.compartiendoPantalla,
      participantes: [...this.pares.values()].map((p) => ({
        peerId: p.peerId,
        nombre: p.nombre,
        stream: p.stream,
        estado: p.estado,
      })),
    });
  }
}
