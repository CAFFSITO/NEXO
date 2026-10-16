// ============================================================================
// NEXO — Notificaciones push (Web Push propio, sin librerías)
// ----------------------------------------------------------------------------
// Para que un aviso suene en el celular o en la computadora AUNQUE NEXO esté
// cerrado, el navegador de cada persona se suscribe una vez (servicio de push
// del navegador: Google en Chrome/Android, Mozilla en Firefox, Microsoft en
// Edge) y nos da una dirección propia más dos claves. Cuando hay que avisar,
// esta cocina:
//   1. CIFRA el aviso con las claves de ese navegador (RFC 8291, aes128gcm): el
//      servicio de push lo transporta pero no lo puede leer;
//   2. lo FIRMA con la clave VAPID de esta instalación (RFC 8292), para que el
//      servicio sepa que viene de NEXO y de nadie más;
//   3. lo manda a la dirección del navegador. Si el servicio contesta 404/410,
//      esa suscripción ya no existe (desinstaló, borró datos) y se olvida.
//
// Las claves VAPID se generan solas la primera vez y quedan en
// plataforma_config (clave 'push-vapid'): no hay que configurar nada. Todo el
// cifrado es node:crypto puro (ECDH P-256, HKDF-SHA256, AES-128-GCM, ES256).
//
// Ventanillas (cualquiera con sesión: el aviso que se le manda depende de cada
// módulo; hoy, los anuncios):
//   GET    /api/push/clave        → la clave pública VAPID para suscribirse
//   POST   /api/push/suscripcion  → guardar la suscripción de este navegador
//   DELETE /api/push/suscripcion  → olvidarla (al cerrar sesión o desactivar)
// ============================================================================

import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from "node:crypto";
import { exigirSesion, ventanilla } from "./comun.js";

const b64u = (datos) => Buffer.from(datos).toString("base64url");
const deB64u = (texto) => Buffer.from(String(texto), "base64url");

// Servicios de push conocidos. La cocina le hace un pedido a la dirección que
// manda el navegador: si no se la limitara, cualquiera podría usarla para que el
// servidor golpee direcciones internas de la red de la escuela.
const SERVICIOS_PUSH = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

// Solo para las pruebas automáticas: orígenes extra aceptados (por ejemplo un
// servicio de push falso en 127.0.0.1). Nunca hace falta en una escuela.
const ORIGENES_EXTRA = String(process.env.NEXO_PUSH_PERMITIR ?? "")
  .split(",").map((o) => o.trim()).filter(Boolean);

const CONTACTO = process.env.NEXO_PUSH_CONTACTO || "mailto:avisos@nexo.edu";

/** ¿Es una dirección de un servicio de push en el que confiamos? */
export function endpointPermitido(endpoint) {
  let url;
  try {
    url = new URL(String(endpoint));
  } catch {
    return false;
  }
  if (ORIGENES_EXTRA.includes(url.origin)) return true;
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return SERVICIOS_PUSH.some((s) => host === s || host.endsWith("." + s));
}

// ── Cifrado del mensaje (RFC 8291 sobre RFC 8188, "aes128gcm") ──────────────

function hkdf(sal, ikm, info, largo) {
  const prk = createHmac("sha256", sal).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, largo);
}

/**
 * Cifra `texto` para un navegador (sus claves `p256dh` y `auth`, en base64url).
 * `sal` y `clavePrivadaServidor` solo se pasan en las pruebas (vector del RFC);
 * en uso normal son aleatorias en cada mensaje.
 */
export function cifrarParaNavegador(texto, { p256dh, auth }, { sal = randomBytes(16), clavePrivadaServidor = null } = {}) {
  const publicaNavegador = deB64u(p256dh);
  const secretoAuth = deB64u(auth);
  const efimera = createECDH("prime256v1");
  if (clavePrivadaServidor) efimera.setPrivateKey(deB64u(clavePrivadaServidor));
  else efimera.generateKeys();
  const publicaServidor = efimera.getPublicKey();
  const compartido = efimera.computeSecret(publicaNavegador);

  const infoClave = Buffer.concat([Buffer.from("WebPush: info\0"), publicaNavegador, publicaServidor]);
  const ikm = hkdf(secretoAuth, compartido, infoClave, 32);
  const cek = hkdf(sal, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(sal, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

  const cifrador = createCipheriv("aes-128-gcm", cek, nonce);
  // Un solo registro: el texto + el delimitador 0x02 ("último registro").
  const cifrado = Buffer.concat([
    cifrador.update(Buffer.concat([Buffer.from(texto, "utf8"), Buffer.from([2])])),
    cifrador.final(),
    cifrador.getAuthTag(),
  ]);
  const tamRegistro = Buffer.alloc(4);
  tamRegistro.writeUInt32BE(4096);
  return Buffer.concat([sal, tamRegistro, Buffer.from([publicaServidor.length]), publicaServidor, cifrado]);
}

// ── Identidad del servidor (VAPID, RFC 8292) ────────────────────────────────

/** Genera un par de claves VAPID nuevo (P-256), en base64url. */
export function generarClavesVapid() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publica: b64u(ecdh.getPublicKey()), privada: b64u(ecdh.getPrivateKey()) };
}

/** La cabecera Authorization firmada para una dirección de push. */
export function cabeceraVapid(endpoint, claves, contacto = CONTACTO, ahora = Date.now()) {
  const publica = deB64u(claves.publica);
  const llave = createPrivateKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", d: claves.privada, x: b64u(publica.subarray(1, 33)), y: b64u(publica.subarray(33, 65)) },
  });
  const encabezado = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const carga = b64u(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(ahora / 1000) + 12 * 3600,
    sub: contacto,
  }));
  const firmado = `${encabezado}.${carga}`;
  const firma = sign("sha256", Buffer.from(firmado), { key: llave, dsaEncoding: "ieee-p1363" });
  return `vapid t=${firmado}.${b64u(firma)}, k=${claves.publica}`;
}

// ── El servicio ─────────────────────────────────────────────────────────────

/**
 * Crea el servicio de push. `enviarAUsuario(usuarioId, datos)` cifra `datos`
 * (un objeto que el service worker del navegador convierte en notificación) y
 * lo manda a TODOS los navegadores suscriptos de esa persona. Nunca lanza: un
 * servicio de push caído no puede romper el envío de un anuncio.
 */
export function crearPush(db) {
  const leerClaves = db.prepare("SELECT valor FROM plataforma_config WHERE clave = 'push-vapid'");
  const guardarClaves = db.prepare(
    "INSERT OR IGNORE INTO plataforma_config (clave, valor) VALUES ('push-vapid', ?)"
  );
  const suscripcionesDe = db.prepare(
    "SELECT id, endpoint, p256dh, auth FROM push_suscripciones WHERE usuario_id = ?"
  );
  const cuantas = db.prepare("SELECT COUNT(*) AS n FROM push_suscripciones WHERE usuario_id = ?");
  const borrar = db.prepare("DELETE FROM push_suscripciones WHERE id = ?");
  const marcarUso = db.prepare("UPDATE push_suscripciones SET usado_en = datetime('now') WHERE id = ?");

  let claves = null;
  function clavesVapid() {
    if (claves) return claves;
    let fila = leerClaves.get();
    if (!fila) {
      guardarClaves.run(JSON.stringify(generarClavesVapid()));
      fila = leerClaves.get();
    }
    claves = JSON.parse(fila.valor);
    return claves;
  }

  async function entregar(sub, json, { ttl, urgencia, tema }) {
    try {
      const respuesta = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          Authorization: cabeceraVapid(sub.endpoint, clavesVapid()),
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: String(ttl),
          Urgency: urgencia,
          // Mismo tema = el servicio reemplaza el aviso viejo que todavía no
          // entregó (un celular apagado no recibe diez insistencias juntas).
          ...(tema ? { Topic: tema } : {}),
        },
        body: cifrarParaNavegador(json, sub),
        signal: AbortSignal.timeout(10_000),
      });
      if (respuesta.status === 404 || respuesta.status === 410) {
        borrar.run(sub.id);
        return false;
      }
      if (!respuesta.ok) {
        console.warn(`Push rechazado (${respuesta.status}) por ${new URL(sub.endpoint).host}`);
        return false;
      }
      marcarUso.run(sub.id);
      return true;
    } catch (error) {
      console.warn(`No se pudo entregar un push a ${new URL(sub.endpoint).host}: ${error.message}`);
      return false;
    }
  }

  async function enviarAUsuario(usuarioId, datos, { ttl = 86_400, urgencia = "high", tema = "anuncios" } = {}) {
    const subs = suscripcionesDe.all(usuarioId);
    if (!subs.length) return 0;
    const json = JSON.stringify(datos);
    const resultados = await Promise.all(subs.map((s) => entregar(s, json, { ttl, urgencia, tema })));
    return resultados.filter(Boolean).length;
  }

  const tieneSuscripcion = (usuarioId) => cuantas.get(usuarioId).n > 0;

  return { clavePublica: () => clavesVapid().publica, enviarAUsuario, tieneSuscripcion };
}

const MAX_NAVEGADORES = 10;

export function registrarPush(app, db, push) {
  const buscar = db.prepare("SELECT id FROM push_suscripciones WHERE endpoint = ?");
  const insertar = db.prepare(
    "INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth, agente) VALUES (?, ?, ?, ?, ?)"
  );
  // El mismo navegador con otra persona adentro: la suscripción pasa a ser suya.
  const reasignar = db.prepare(
    "UPDATE push_suscripciones SET usuario_id = ?, p256dh = ?, auth = ?, agente = ?, creado_en = datetime('now') WHERE id = ?"
  );
  const sobrantes = db.prepare(
    `DELETE FROM push_suscripciones WHERE usuario_id = ? AND id NOT IN (
       SELECT id FROM push_suscripciones WHERE usuario_id = ? ORDER BY creado_en DESC, id DESC LIMIT ?)`
  );
  const borrarMia = db.prepare("DELETE FROM push_suscripciones WHERE endpoint = ? AND usuario_id = ?");

  app.get(
    "/api/push/clave",
    ventanilla((req, res) => {
      if (!exigirSesion(db, req, res)) return;
      res.json({ clave: push.clavePublica() });
    })
  );

  app.post(
    "/api/push/suscripcion",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      const endpoint = String(req.body?.endpoint ?? "");
      const p256dh = String(req.body?.keys?.p256dh ?? "");
      const auth = String(req.body?.keys?.auth ?? "");
      if (endpoint.length > 1000 || !endpointPermitido(endpoint)) {
        return res.status(400).json({ error: "Ese navegador usa un servicio de notificaciones que NEXO no reconoce." });
      }
      const publica = deB64u(p256dh);
      if (publica.length !== 65 || publica[0] !== 4 || deB64u(auth).length !== 16) {
        return res.status(400).json({ error: "La suscripción del navegador no es válida." });
      }
      const agente = String(req.get("user-agent") ?? "").slice(0, 200);
      const previa = buscar.get(endpoint);
      if (previa) reasignar.run(usuario.id, p256dh, auth, agente, previa.id);
      else insertar.run(usuario.id, endpoint, p256dh, auth, agente);
      sobrantes.run(usuario.id, usuario.id, MAX_NAVEGADORES);
      res.json({ ok: true });
    })
  );

  // "Probar alerta": un push a mis propios navegadores, para comprobar en cada
  // celular o computadora que la notificación llega y suena.
  const ultimaPrueba = new Map();
  // Asíncrona sin ventanilla(): Express 5 manda sus errores al manejador general.
  app.post("/api/push/prueba", async (req, res) => {
    const usuario = exigirSesion(db, req, res);
    if (!usuario) return;
    if (Date.now() - (ultimaPrueba.get(usuario.id) ?? 0) < 10_000) {
      return res.status(429).json({ error: "Esperá unos segundos antes de probar de nuevo." });
    }
    ultimaPrueba.set(usuario.id, Date.now());
    const entregados = await push.enviarAUsuario(usuario.id, {
      tipo: "prueba",
      titulo: "🔔 NEXO · Prueba de alerta",
      cuerpo: "Así te van a llegar los avisos obligatorios, aunque NEXO esté cerrado.",
      url: "/anuncios",
      tag: "nexo-prueba",
    }, { ttl: 300, tema: "prueba" });
    res.json({ entregados });
  });

  app.delete(
    "/api/push/suscripcion",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      borrarMia.run(String(req.body?.endpoint ?? ""), usuario.id);
      res.json({ ok: true });
    })
  );
}
