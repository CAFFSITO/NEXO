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
// ============================================================================

import { WebSocketServer } from "ws";
import { usuarioDeLaSesion } from "./sesiones.js";

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
 * Engancha el mensajero al servidor HTTP que ya existe. Comparten el mismo
 * puerto (3000): el tubo del chat entra por /ws y el resto sigue en /api/*.
 */
export function conectarMensajero(servidorHttp, db, mensajero) {
  const wss = new WebSocketServer({ server: servidorHttp, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Misma validación de sesión que las ventanillas /api: la cookie viaja en el
    // pedido de apertura del tubo. Quien no tiene sesión no abre nada.
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) {
      ws.close(4001, "Sin sesión");
      return;
    }

    mensajero.registrar(usuario.id, ws);

    // Un saludo para que el cliente sepa que el tubo quedó abierto y autenticado.
    ws.send(JSON.stringify({ tipo: "conectado" }));

    // El cliente puede mandar "ping" para mantener vivo el tubo; contestamos
    // "pong". No procesamos ningún otro mensaje entrante: el mensajero reparte,
    // no recibe órdenes (esas van por /api/*, donde se validan permisos).
    ws.on("message", (crudo) => {
      try {
        const dato = JSON.parse(crudo.toString());
        if (dato?.tipo === "ping") ws.send(JSON.stringify({ tipo: "pong" }));
      } catch {
        // Mensaje ilegible: se ignora. No es motivo para cerrar el tubo.
      }
    });

    ws.on("close", () => mensajero.desregistrar(usuario.id, ws));
    ws.on("error", () => mensajero.desregistrar(usuario.id, ws));
  });

  return wss;
}
