// ============================================================================
// NEXO — Arranque:   node server.js
// ----------------------------------------------------------------------------
// Un solo comando para encender NEXO en el servidor de la escuela. Solo hace
// falta Node.js 22.5 o superior (recomendado: 24 LTS); las piezas del servidor
// ya vienen incluidas y la aplicación ya viene compilada (NEXO/dist).
//
// Qué hace:
//   1. Lee la configuración de servidor/nexo.env, si existe (ver
//      servidor/nexo.env.ejemplo). Lo que ya esté definido en el sistema gana.
//   2. La primera vez, crea la base VACÍA (sin datos de prueba) con la cuenta
//      del Maestro:
//        · si se ejecuta en una consola, pregunta el correo y la contraseña;
//        · si no (un panel, un servicio), usa NEXO_MAESTRO_EMAIL y
//          NEXO_MAESTRO_CONTRASENA, o genera una contraseña al azar y la
//          muestra UNA vez en la salida.
//   3. Enciende NEXO. Por defecto en el puerto 3073 (si está ocupado, el
//      siguiente libre) y en todas las interfaces: se entra con
//      http://<ip-del-servidor>:3073. Otro puerto: PORT=8080 node server.js
//
// Más detalles (HTTPS con Apache, arranque automático, respaldos):
// INSTALAR_EN_XAMPP.md
// ============================================================================
"use strict";

const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { createServer } = require("node:net");
const { networkInterfaces } = require("node:os");

const raiz = __dirname;
const salir = (mensaje) => { console.error("\n" + mensaje + "\n"); process.exit(1); };

// ── Node.js ─────────────────────────────────────────────────────────────────
const [mayor, menor] = process.versions.node.split(".").map(Number);
if (mayor < 22 || (mayor === 22 && menor < 5)) {
  salir(`NEXO necesita Node.js 22.5 o superior (recomendado: 24 LTS). Esta máquina tiene ${process.version}.\nDescargalo de https://nodejs.org`);
}

// ── 1. Configuración ────────────────────────────────────────────────────────
const archivoConfig = join(raiz, "servidor", "nexo.env");
if (existsSync(archivoConfig)) {
  process.loadEnvFile(archivoConfig);
  console.log("Configuración: " + archivoConfig);
}
// El puerto: el de PORT o NEXO_PORT si se definió; si no, el 3073 ("división
// 73"; el 3000 lo usa otro programa en el servidor de la escuela).
if (!process.env.NEXO_PORT && process.env.PORT) process.env.NEXO_PORT = process.env.PORT;
const PUERTO_POR_DEFECTO = 3073;
const puertoElegido = Boolean(process.env.NEXO_PORT);

// ── Piezas ──────────────────────────────────────────────────────────────────
if (!existsSync(join(raiz, "servidor", "node_modules", "express")) || !existsSync(join(raiz, "servidor", "node_modules", "ws"))) {
  salir("Faltan las piezas del servidor. Desde esta carpeta ejecutá:\n  cd servidor\n  npm install\ny volvé a probar con  node server.js");
}
if (!existsSync(join(raiz, "NEXO", "dist", "index.html"))) {
  console.warn(
    "\nAviso: la aplicación no está compilada (falta NEXO/dist). NEXO arranca, pero solo responde la API.\n" +
    "Para compilarla:  cd NEXO  &&  npm install  &&  npm run build\n"
  );
}

// ── 2. La base (solo la primera vez) ────────────────────────────────────────
const rutaBase = resolve(process.env.NEXO_DB_PATH || join(raiz, "base-de-datos", "nexo.db"));
if (!existsSync(rutaBase)) {
  console.log("\nPrimera vez: todavía no hay base de datos. Se crea VACÍA (sin datos de prueba) en " + rutaBase);
  const args = [join(raiz, "base-de-datos", "crear-base.mjs"), "--vacia", `--ruta=${rutaBase}`];
  const entorno = { ...process.env };
  let generada = null;
  if (!process.stdin.isTTY) {
    // Sin consola para preguntar: correo por defecto y una contraseña al azar.
    entorno.NEXO_MAESTRO_EMAIL ||= "maestro@nexo.local";
    if (!entorno.NEXO_MAESTRO_CONTRASENA) {
      generada = randomBytes(12).toString("base64url");
      entorno.NEXO_MAESTRO_CONTRASENA = generada;
    }
  }
  if (entorno.NEXO_MAESTRO_EMAIL) args.push(`--email=${entorno.NEXO_MAESTRO_EMAIL}`);
  const creada = spawnSync(process.execPath, args, { stdio: "inherit", env: entorno });
  if (creada.status !== 0) salir("No se pudo crear la base. NEXO no arranca.");
  if (generada) {
    console.log(
      "\n══════════════════════════════════════════════════════════════════\n" +
      "  Cuenta del Maestro (la que crea y diseña la escuela):\n\n" +
      "    Correo:      " + entorno.NEXO_MAESTRO_EMAIL + "\n" +
      "    Contraseña:  " + generada + "\n\n" +
      "  Se muestra UNA sola vez: anotala y guardala en un lugar seguro.\n" +
      "══════════════════════════════════════════════════════════════════\n"
    );
  }
}

// ── 3. Encender ─────────────────────────────────────────────────────────────
(async () => {
  // Si el puerto está ocupado: con uno elegido a mano se avisa; con el de
  // fábrica se prueban los siguientes (hasta 20) y se dice cuál quedó.
  const host = process.env.NEXO_HOST || undefined;
  let puerto = Number(process.env.NEXO_PORT || PUERTO_POR_DEFECTO);
  if (!(await puertoLibre(puerto, host))) {
    if (puertoElegido) salir(`El puerto ${puerto} está ocupado por otro programa. Elegí otro, por ejemplo:  PORT=${puerto + 1} node server.js`);
    const inicial = puerto;
    do { puerto++; } while (puerto < inicial + 20 && !(await puertoLibre(puerto, host)));
    if (puerto >= inicial + 20) salir(`Los puertos ${inicial} a ${inicial + 19} están ocupados. Elegí uno libre con  PORT=<número> node server.js`);
    console.log(`El puerto ${inicial} está ocupado: NEXO usa el ${puerto}.`);
  }
  process.env.NEXO_PORT = String(puerto);

  await import(pathToFileURL(join(raiz, "servidor", "servidor.js")).href);

  // Las direcciones para entrar desde otras computadoras de la red.
  if (!host || host === "0.0.0.0") {
    const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
    if (ips.length) console.log("Desde otras computadoras:  " + ips.map((ip) => `http://${ip}:${puerto}`).join("   "));
  }
})().catch((error) => {
  console.error("NEXO no pudo arrancar:", error);
  process.exit(1);
});

function puertoLibre(puerto, host) {
  return new Promise((listo) => {
    const prueba = createServer();
    prueba.once("error", () => listo(false));
    prueba.listen(puerto, host, () => prueba.close(() => listo(true)));
  });
}
