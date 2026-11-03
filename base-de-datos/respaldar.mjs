// ============================================================================
// NEXO — Respaldo de la base y de los archivos subidos
// ----------------------------------------------------------------------------
// Hace una copia CONSISTENTE de la base aunque NEXO esté funcionando (SQLite
// "VACUUM INTO": no hace falta apagar nada) y copia los archivos subidos que
// todavía no estén en el respaldo. Pensado para correr todas las noches con el
// Programador de tareas de Windows.
//
//   node respaldar.mjs                    (usa NEXO_DB_PATH y NEXO_STORAGE_DIR)
//   node --env-file=..\servidor\nexo.env respaldar.mjs
//
// Opciones:
//   --destino=CARPETA   dónde guardar (si no, NEXO_RESPALDOS_DIR o <carpeta de la base>\respaldos)
//   --conservar=N       cuántas copias de la base guardar (por defecto 30; las más viejas se borran)
//
// Para volver a un respaldo: apagar NEXO, reemplazar nexo.db por la copia
// (renombrándola a nexo.db), copiar de vuelta la carpeta "archivos" a
// <NEXO_STORAGE_DIR>\almacen y encender NEXO.
// ============================================================================

import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const opcion = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3);
const rutaBase = resolve(process.env.NEXO_DB_PATH ?? join(carpeta, "nexo.db"));
const almacen = join(resolve(process.env.NEXO_STORAGE_DIR ?? join(carpeta, "..", "servidor")), "almacen");
const destino = resolve(opcion("destino") ?? process.env.NEXO_RESPALDOS_DIR ?? join(dirname(rutaBase), "respaldos"));
const conservar = Math.max(1, Number(opcion("conservar") ?? 30) || 30);
const hora = () => new Date().toLocaleString("es-AR");

if (!existsSync(rutaBase)) {
  console.error(`[${hora()}] No encuentro la base en ${rutaBase}`);
  process.exit(1);
}
mkdirSync(destino, { recursive: true });

// ── 1. La base ──────────────────────────────────────────────────────────────
const sello = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const copia = join(destino, `nexo-${sello}.db`);
try {
  const db = new DatabaseSync(rutaBase, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 15000;");
  rmSync(copia, { force: true });
  db.exec(`VACUUM INTO '${copia.replace(/'/g, "''")}'`);
  db.close();
} catch (error) {
  console.error(`[${hora()}] No se pudo copiar la base: ${error.message}`);
  process.exit(1);
}
// Comprobar que la copia abre y está sana.
const prueba = new DatabaseSync(copia, { readOnly: true });
const sana = prueba.prepare("PRAGMA quick_check").get();
const { total } = prueba.prepare("SELECT COUNT(*) AS total FROM usuarios").get();
prueba.close();
if (Object.values(sana)[0] !== "ok") {
  console.error(`[${hora()}] La copia ${copia} no pasó el control de integridad.`);
  process.exit(1);
}

// Guardar solo las últimas N copias.
const copias = readdirSync(destino).filter((n) => /^nexo-\d{4}-\d{2}-\d{2}_\d{4}\.db$/.test(n)).sort();
for (const vieja of copias.slice(0, Math.max(0, copias.length - conservar))) rmSync(join(destino, vieja), { force: true });

// ── 2. Los archivos subidos (solo los nuevos: nunca se modifican) ───────────
let nuevos = 0;
if (existsSync(almacen)) {
  const carpetaArchivos = join(destino, "archivos");
  mkdirSync(carpetaArchivos, { recursive: true });
  for (const nombre of readdirSync(almacen)) {
    const origen = join(almacen, nombre);
    const final = join(carpetaArchivos, nombre);
    if (!statSync(origen).isFile()) continue;
    if (existsSync(final) && statSync(final).size === statSync(origen).size) continue;
    copyFileSync(origen, final);
    nuevos++;
  }
}

console.log(`[${hora()}] Respaldo listo: ${copia} (${total} cuentas, ${Math.min(copias.length, conservar)} copias guardadas, ${nuevos} archivos nuevos copiados).`);
