// ============================================================================
// NEXO — Script de creación de la base de datos
// ----------------------------------------------------------------------------
// Crea el archivo nexo.db (SQLite). No necesita instalar nada: usa el módulo
// SQLite integrado de Node.js 22.5+.
//
// Dos maneras:
//
//   · De DEMOSTRACIÓN (para probar o desarrollar): esquema + datos-iniciales.sql,
//     con una escuela de mentira y cuentas de prueba (contraseña nexo1234).
//       node crear-base.mjs
//
//   · VACÍA (para una escuela de verdad): solo las tablas, los feriados
//     nacionales fijos, la configuración base del tutor de IA y la cuenta del
//     Maestro con la contraseña que se elija. La escuela se crea después desde
//     el Estudio del Maestro (Forja).
//       node crear-base.mjs --vacia --email=maestro@miescuela.edu.ar
//     La contraseña se pide en pantalla (no se ve al escribirla). Para hacerlo
//     sin preguntar, se puede pasar en la variable NEXO_MAESTRO_CONTRASENA.
//
// Opciones:
//   --forzar        borra la base existente antes de crearla (¡se pierde todo!)
//   --ruta=ARCHIVO  dónde crearla (si no, NEXO_DB_PATH o base-de-datos/nexo.db)
//   --nombre=TEXTO  nombre visible del Maestro (modo vacío; por defecto "Maestro NEXO")
// ============================================================================

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const carpeta = dirname(fileURLToPath(import.meta.url));
const opcion = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3);
const rutaBase = resolve(opcion("ruta") ?? process.env.NEXO_DB_PATH ?? join(carpeta, "nexo.db"));
const forzar = process.argv.includes("--forzar");
const vacia = process.argv.includes("--vacia");
// Un solo lector de consola para todas las preguntas (si se abre uno por
// pregunta, lo que se escribe rápido o se pega de una vez se pierde).
let lector = null;
let lineas = null;
let mudo = false;

// ── 0. En modo vacío, primero los datos del Maestro (antes de tocar nada) ───
let maestro = null;
if (vacia && existsSync(rutaBase) && !forzar) {
  salir("La base ya existe en " + rutaBase + "\nPara recrearla desde cero agregá  --forzar  (¡se borra todo lo cargado!).");
}
if (vacia) {
  const { hashearContrasena, validarContrasena } = await import("../servidor/contrasenas.js");
  const email = String(opcion("email") ?? (await preguntar("Correo del Maestro (con este se entra a NEXO): "))).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) salir("Ese correo no es válido.");
  let contrasena = process.env.NEXO_MAESTRO_CONTRASENA;
  if (!contrasena) {
    contrasena = await preguntar("Contraseña del Maestro (mínimo 12 caracteres): ", true);
    const repetida = await preguntar("Repetila: ", true);
    if (contrasena !== repetida) salir("Las dos contraseñas no coinciden. No se creó nada.");
  }
  const problema = validarContrasena(contrasena);
  if (problema) salir(problema);
  // El Maestro controla todas las escuelas: para él se pide más que el mínimo general.
  if (contrasena.length < 12) salir("Para la cuenta del Maestro usá al menos 12 caracteres.");
  cerrarPreguntas();
  maestro = { email, nombre: String(opcion("nombre") ?? "Maestro NEXO").trim() || "Maestro NEXO", hash: await hashearContrasena(contrasena) };
}

// ── 1. Si la base ya existe, no la pisamos salvo pedido explícito ──────────
if (existsSync(rutaBase)) {
  if (!forzar) {
    salir(
      "La base ya existe en " + rutaBase + "\n" +
      "Para recrearla desde cero agregá  --forzar\n" +
      "(Atención: eso borra todos los datos cargados.)"
    );
  }
  for (const extra of ["", "-wal", "-shm", "-journal"]) rmSync(rutaBase + extra, { force: true });
  console.log("Base anterior eliminada (--forzar).");
}
mkdirSync(dirname(rutaBase), { recursive: true });

// ── 2. Crear la base y aplicar esquema + datos ──────────────────────────────
const db = new DatabaseSync(rutaBase);

try {
  console.log("Creando tablas (esquema.sql)...");
  db.exec(readFileSync(join(carpeta, "esquema.sql"), "utf8"));
  const demostracion = readFileSync(join(carpeta, "datos-iniciales.sql"), "utf8");

  if (!vacia) {
    console.log("Cargando datos de demostración (datos-iniciales.sql)...");
    db.exec(demostracion);
  } else {
    console.log("Cargando lo mínimo para una escuela real...");
    // La configuración general del tutor de IA (no es de ninguna escuela).
    const configIa = demostracion.match(/INSERT INTO config_ia[\s\S]*?\);\s*\n/);
    if (configIa) db.exec(configIa[0]);
    // Feriados nacionales inamovibles (Ley 27.399) de este año y el próximo. Los
    // trasladables cambian cada año por decreto y no se cargan.
    const feriado = db.prepare("INSERT OR IGNORE INTO feriados (fecha, nombre) VALUES (?, ?)");
    const anio = new Date().getFullYear();
    for (const a of [anio, anio + 1]) for (const [fecha, nombre] of feriadosFijos(a)) feriado.run(fecha, nombre);
    db.prepare(
      "INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol, primer_ingreso) VALUES (NULL, ?, ?, ?, 'administrador', 0)"
    ).run(maestro.email, maestro.hash, maestro.nombre);
  }
} catch (error) {
  db.close();
  rmSync(rutaBase, { force: true }); // no dejar una base a medio crear
  salir("Error creando la base: " + error.message);
}

// ── 3. Resumen de verificación ──────────────────────────────────────────────
console.log("\nBase creada correctamente: " + rutaBase);
if (vacia) {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM feriados").get();
  console.log(`Sin escuelas ni datos de ejemplo. ${total} feriados nacionales fijos.`);
  console.log(`Cuenta del Maestro: ${maestro.email}`);
  console.log("\nSiguiente paso: encender el servidor, entrar con esa cuenta y crear la escuela desde la Forja.");
} else {
  const tablas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log("Tablas (" + tablas.length + ") y filas cargadas:\n");
  for (const { name } of tablas) {
    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM "${name}"`).get();
    console.log("  " + String(name).padEnd(24) + " " + total);
  }
  const vistas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name").all();
  console.log("\nVistas: " + vistas.map((v) => v.name).join(", "));
  console.log("\nListo. Abrí el archivo nexo.db con DB Browser for SQLite para explorarlo.");
}
db.close();

// ── Ayudas ──────────────────────────────────────────────────────────────────
function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

/** Pregunta en la consola; con `oculto`, lo que se escribe se ve como asteriscos. */
async function preguntar(texto, oculto = false) {
  if (!lector) {
    lector = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
    lector._writeToOutput = (s) => {
      if (!mudo) return lector.output.write(s);
      const prompt = lector.getPrompt();
      const conPrompt = s.startsWith(prompt);
      lector.output.write((conPrompt ? prompt : "") + (conPrompt ? s.slice(prompt.length) : s).replace(/[^\r\n]/g, "*"));
    };
    lineas = lector[Symbol.asyncIterator]();
  }
  lector.setPrompt(texto);
  process.stdout.write(texto);
  mudo = oculto;
  const { value, done } = await lineas.next();
  mudo = false;
  if (done) salir("\nNo se recibió respuesta. No se creó nada.");
  return value;
}
function cerrarPreguntas() {
  lector?.close();
}

/** Los feriados nacionales inamovibles de un año (incluye Carnaval y Viernes Santo, que dependen de la Pascua). */
function feriadosFijos(a) {
  const iso = (d) => d.toISOString().slice(0, 10);
  const dia = (m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // Domingo de Pascua (algoritmo anónimo gregoriano).
  const x = a % 19, b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * x + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((x + 11 * h + 22 * l) / 451);
  const pascua = new Date(Date.UTC(a, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
  const desdePascua = (n) => iso(new Date(pascua.getTime() + n * 86_400_000));
  return [
    [dia(1, 1), "Año Nuevo"],
    [desdePascua(-48), "Carnaval"],
    [desdePascua(-47), "Carnaval"],
    [dia(3, 24), "Día Nacional de la Memoria por la Verdad y la Justicia"],
    [dia(4, 2), "Día del Veterano y de los Caídos en la Guerra de Malvinas"],
    [desdePascua(-2), "Viernes Santo"],
    [dia(5, 1), "Día del Trabajador"],
    [dia(5, 25), "Día de la Revolución de Mayo"],
    [dia(6, 20), "Paso a la Inmortalidad del Gral. Manuel Belgrano"],
    [dia(7, 9), "Día de la Independencia"],
    [dia(12, 8), "Inmaculada Concepción de María"],
    [dia(12, 25), "Navidad"],
  ];
}
