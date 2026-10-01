// ============================================================================
// NEXO — El mensajero (conexión en vivo, Etapa 6, punto 2 del plan)
// ----------------------------------------------------------------------------
// Hasta ahora la vidriera solo sabía algo si LO PREGUNTABA (cada pedido /api/*).
// Eso alcanza para leer una pantalla, pero no para un chat: si nadie pregunta,
// nadie se entera de que llegó un mensaje. El mensajero es el "tubo" siempre
// abierto entre cada navegador y la cocina: cuando pasa algo que le importa a
// alguien conectado (un mensaje nuevo, una notificación), la cocina se lo empuja
// sin que el navegador tenga que recargar ni volver a preguntar (sección 14.2,
// paso 2 y sección 14.15).
//
// Cómo se abre el tubo: el navegador se conecta a ws://.../ws. Esa conexión llega
// con las MISMAS cookies que cualquier pedido, así que sabemos quién es sin
// inventar un segundo sistema de login: se valida la sesión igual que en el resto
// del servidor (`usuarioDeLaSesion`). Sin sesión válida, el tubo se cierra.
//
// Qué NO hace: no guarda nada. Guardar es tarea de cada módulo (chat guarda en
// `mensajes`, notificaciones en `notificaciones`). El mensajero solo REPARTE en
// vivo a quien está conectado. Si el destinatario no está conectado, no pasa
// nada malo: el dato ya quedó guardado y lo verá la próxima vez que entre. Por
// eso el chat y las notificaciones funcionan aunque el mensajero se caiga.
//
// Señalización de video (Etapa 9, reemplazo de Jitsi): por este MISMO tubo viaja
// también el "apretón de manos" de las videollamadas de aula (WebRTC en malla).
// El servidor NO toca el video: sólo REENVÍA entre navegadores las ofertas y
// respuestas SDP y los candidatos ICE, y avisa quién entra/sale de la sala. El
// media (cámara y micrófono) va directo navegador‑a‑navegador, sin pasar por acá
// ni por ningún servicio externo. Antes de reenvar cualquier señal se valida, en
// el servidor, que el que la manda sea MIEMBRO de esa clase (esMiembroDeClase de
// aula.js): la misma regla de fila que las ventanillas /api. Ver los mensajes
// unirse-video / oferta / respuesta / candidato-ice / salir-video más abajo.
// ============================================================================

import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import { usuarioDeLaSesion } from "./sesiones.js";
import { esMiembroDeClase } from "./aula.js";

// Tope de cámaras por sala. La malla es O(n²): cada par manda su video a todos
// los demás, así que más allá de una decena la CPU y la red de las máquinas de un
// aula no dan abasto. Es un límite de SEGURIDAD, no una regla pedagógica; el día
// que haga falta más gente en vivo se pasa a un servidor de mezcla (SFU). Se
// puede ajustar con la variable de entorno NEXO_MAX_VIDEO.
const MAX_PARTICIPANTES_VIDEO = Number(process.env.NEXO_MAX_VIDEO) || 12;

/**
 * Crea el repartidor en vivo. Lleva la cuenta de qué navegadores tiene abiertos
 * cada usuario (una persona puede tener dos pestañas, o el teléfono y la compu).
 *
 * `emitirA(usuarioId, evento)` le manda `evento` a TODAS las conexiones de esa
 * persona. Es seguro llamarlo aunque no tenga ninguna abierta: simplemente no
 * hace nada (el dato ya se guardó en la base por otro lado).
 */
export function crearMensajero() {
  // usuario_id -> Set de conexiones (WebSocket) abiertas de esa persona.
  const conexionesPorUsuario = new Map();

  function registrar(usuarioId, ws) {
    let conjunto = conexionesPorUsuario.get(usuarioId);
    if (!conjunto) {
      conjunto = new Set();
      conexionesPorUsuario.set(usuarioId, conjunto);
    }
    conjunto.add(ws);
  }

  function desregistrar(usuarioId, ws) {
    const conjunto = conexionesPorUsuario.get(usuarioId);
    if (!conjunto) return;
    conjunto.delete(ws);
    if (conjunto.size === 0) conexionesPorUsuario.delete(usuarioId);
  }

  function emitirA(usuarioId, evento) {
    const conjunto = conexionesPorUsuario.get(usuarioId);
    if (!conjunto) return;
    const texto = JSON.stringify(evento);
    for (const ws of conjunto) {
      // 1 = OPEN. No mandamos a un tubo a medio cerrar.
      if (ws.readyState === 1) ws.send(texto);
    }
  }

  /** Le manda el mismo evento a varias personas (los miembros de un chat). */
  function emitirAVarios(usuarioIds, evento) {
    for (const id of usuarioIds) emitirA(id, evento);
  }

  return { registrar, desregistrar, emitirA, emitirAVarios };
}

/**
 * Central de señalización de video (WebRTC en malla). NO ve ni toca el media:
 * lleva la cuenta de quién está en la sala de cada clase y REENVÍA entre ellos
 * las ofertas/respuestas SDP y los candidatos ICE. Una sala = una clase; cada
 * conexión (pestaña) que entra al video es un "par" (peer) con un id propio.
 *
 * Toda la validación de permiso ya la hizo el llamador antes de registrar un par
 * (esMiembroDeClase). A partir de ahí, sólo se reenvía ENTRE pares de la MISMA
 * sala: nadie de afuera recibe una señal, y nadie puede mandarle una señal a un
 * par que no comparte su sala.
 */
export function crearSalasVideo() {
  // claseId(number) -> Map(peerId -> { ws, nombre })
  const salas = new Map();

  function sala(claseId) {
    let s = salas.get(claseId);
    if (!s) {
      s = new Map();
      salas.set(claseId, s);
    }
    return s;
  }

  function aPeer(claseId, peerId, evento) {
    const par = salas.get(claseId)?.get(peerId);
    if (par && par.ws.readyState === 1) par.ws.send(JSON.stringify(evento));
  }

  /** ¿Hay lugar en la sala para una cámara más? */
  function hayLugar(claseId) {
    return (salas.get(claseId)?.size ?? 0) < MAX_PARTICIPANTES_VIDEO;
  }

  /** Suma un par a la sala y le devuelve la lista de los que ya estaban (a quienes
   *  deberá ofrecer). Avisa a los presentes que entró alguien. */
  function entrar(claseId, ws, nombre) {
    const s = sala(claseId);
    const peerId = randomUUID();
    // Los que YA estaban: se los devolvemos al que entra para que él inicie las
    // ofertas (así cada par negocia en un sólo sentido y no hay choque de ofertas).
    const presentes = [...s.entries()].map(([id, p]) => ({ peerId: id, nombre: p.nombre }));
    s.set(peerId, { ws, nombre });
    // Avisar a los presentes que hay uno nuevo (para que muestren "conectando…").
    for (const [id] of s) {
      if (id !== peerId) aPeer(claseId, id, { tipo: "video-entra", claseId: String(claseId), peerId, nombre });
    }
    return { peerId, presentes };
  }

  /** Saca un par de la sala y avisa a los que quedan (para que cierren su conexión). */
  function salir(claseId, peerId) {
    const s = salas.get(claseId);
    if (!s || !s.has(peerId)) return;
    s.delete(peerId);
    for (const [id] of s) aPeer(claseId, id, { tipo: "video-sale", claseId: String(claseId), peerId });
    if (s.size === 0) salas.delete(claseId);
  }

  /** Reenvía una señal dirigida (oferta/respuesta/candidato) al par destino, SIEMPRE
   *  que emisor y destino compartan la sala. Devuelve false si no correspondía. */
  function reenviar(claseId, emisorPeerId, destinoPeerId, evento) {
    const s = salas.get(claseId);
    if (!s || !s.has(emisorPeerId) || !s.has(destinoPeerId)) return false;
    aPeer(claseId, destinoPeerId, evento);
    return true;
  }

  function nombreDe(claseId, peerId) {
    return salas.get(claseId)?.get(peerId)?.nombre ?? "";
  }

  return { entrar, salir, reenviar, nombreDe, hayLugar };
}

/**
 * Engancha el mensajero al servidor HTTP que ya existe. Comparten el mismo
 * puerto (3000): el tubo del chat entra por /ws y el resto sigue en /api/*.
 */
export function conectarMensajero(servidorHttp, db, mensajero) {
  const wss = new WebSocketServer({ server: servidorHttp, path: "/ws" });
  const salasVideo = crearSalasVideo();

  wss.on("connection", (ws, req) => {
    // Misma validación de sesión que las ventanillas /api: la cookie viaja en el
    // pedido de apertura del tubo. Quien no tiene sesión no abre nada.
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) {
      ws.close(4001, "Sin sesión");
      return;
    }

    mensajero.registrar(usuario.id, ws);

    // En qué salas de video participa ESTA conexión: claseId(number) -> peerId.
    // Una pestaña normalmente está en una sola sala; usamos un Map por prolijidad
    // y para poder limpiar todo al cerrarse el tubo.
    const misPeers = new Map();

    // Un saludo para que el cliente sepa que el tubo quedó abierto y autenticado.
    ws.send(JSON.stringify({ tipo: "conectado" }));

    ws.on("message", (crudo) => {
      let dato;
      try {
        dato = JSON.parse(crudo.toString());
      } catch {
        // Mensaje ilegible: se ignora. No es motivo para cerrar el tubo.
        return;
      }
      if (!dato || typeof dato.tipo !== "string") return;

      // Mantener vivo el tubo (chat/notificaciones/aula, sección 14.2).
      if (dato.tipo === "ping") {
        ws.send(JSON.stringify({ tipo: "pong" }));
        return;
      }

      // ── Señalización de video (WebRTC en malla) ─────────────────────────────
      // El servidor sólo REENVÍA; el media va directo entre navegadores.
      if (dato.tipo === "unirse-video") {
        const claseId = Number(dato.claseId);
        if (!Number.isInteger(claseId)) return;
        // PERMISO EN EL SERVIDOR: sólo un miembro de la clase entra a su sala.
        if (!esMiembroDeClase(db, usuario, claseId)) {
          ws.send(JSON.stringify({ tipo: "video-rechazado", claseId: String(claseId) }));
          return;
        }
        // Idempotente: si esta conexión ya estaba en la sala, la sacamos primero
        // (así una reentrada no cuenta doble contra el tope).
        if (misPeers.has(claseId)) {
          salasVideo.salir(claseId, misPeers.get(claseId));
          misPeers.delete(claseId);
        }
        // Tope de cámaras: la malla no escala más allá de una decena (ver
        // MAX_PARTICIPANTES_VIDEO). Se lo decimos con honestidad y no lo metemos.
        if (!salasVideo.hayLugar(claseId)) {
          ws.send(JSON.stringify({ tipo: "video-lleno", claseId: String(claseId) }));
          return;
        }
        const { peerId, presentes } = salasVideo.entrar(claseId, ws, usuario.nombre);
        misPeers.set(claseId, peerId);
        // Le decimos su propio id y quiénes ya estaban (a ellos les hará la oferta).
        ws.send(
          JSON.stringify({
            tipo: "video-participantes",
            claseId: String(claseId),
            miPeerId: peerId,
            participantes: presentes,
          })
        );
        return;
      }

      if (dato.tipo === "oferta" || dato.tipo === "respuesta" || dato.tipo === "candidato-ice") {
        const claseId = Number(dato.claseId);
        const emisor = Number.isInteger(claseId) ? misPeers.get(claseId) : undefined;
        const destino = typeof dato.para === "string" ? dato.para : undefined;
        if (!emisor || !destino) return; // sólo reenvío entre pares de la misma sala
        const evento = { tipo: dato.tipo, claseId: String(claseId), de: emisor };
        if (dato.tipo === "oferta") {
          evento.sdp = dato.sdp;
          evento.nombre = salasVideo.nombreDe(claseId, emisor); // nombre real del que ofrece
        } else if (dato.tipo === "respuesta") {
          evento.sdp = dato.sdp;
        } else {
          evento.candidato = dato.candidato;
        }
        salasVideo.reenviar(claseId, emisor, destino, evento);
        return;
      }

      if (dato.tipo === "salir-video") {
        const claseId = Number(dato.claseId);
        if (Number.isInteger(claseId) && misPeers.has(claseId)) {
          salasVideo.salir(claseId, misPeers.get(claseId));
          misPeers.delete(claseId);
        }
        return;
      }
      // Cualquier otro mensaje entrante se ignora: el resto de las órdenes van por
      // /api/*, donde se validan permisos con todo el contexto del pedido.
    });

    const limpiar = () => {
      mensajero.desregistrar(usuario.id, ws);
      // Si el tubo se cae con el video abierto, sacamos sus pares y avisamos a los
      // demás para que cierren la conexión con esta persona (no queda un video
      // congelado del otro lado).
      for (const [claseId, peerId] of misPeers) salasVideo.salir(claseId, peerId);
      misPeers.clear();
    };
    ws.on("close", limpiar);
    ws.on("error", limpiar);
  });

  return wss;
}
