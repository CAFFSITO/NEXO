
// ============================================================================
// NEXO — Script de creación de la base de datos local
// ----------------------------------------------------------------------------
// Crea el archivo nexo.db (SQLite) aplicando esquema.sql y datos-iniciales.sql.
// No necesita instalar nada: usa el módulo SQLite integrado de Node.js 22.5+.
//
//   Uso:             node crear-base.mjs
//   Recrear de cero: node crear-base.mjs --forzar   (borra la base existente)
// ============================================================================

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const rutaBase = join(carpeta, "nexo.db");
const forzar = process.argv.includes("--forzar");

// ── 1. Si la base ya existe, no la pisamos salvo pedido explícito ──────────
if (existsSync(rutaBase)) {
  if (!forzar) {
    console.error(
      "La base ya existe en " + rutaBase + "\n" +
      "Para recrearla desde cero ejecutá:  node crear-base.mjs --forzar\n" +
      "(Atención: eso borra todos los datos cargados.)"
    );
    process.exit(1);
  }
  rmSync(rutaBase);
  console.log("Base anterior eliminada (--forzar).");
}

// ── 2. Crear la base y aplicar esquema + datos ──────────────────────────────
const db = new DatabaseSync(rutaBase);

try {
  const esquema = readFileSync(join(carpeta, "esquema.sql"), "utf8");
  const datos = readFileSync(join(carpeta, "datos-iniciales.sql"), "utf8");

  console.log("Creando tablas (esquema.sql)...");
  db.exec(esquema);

  console.log("Cargando datos iniciales (datos-iniciales.sql)...");
  db.exec(datos);
} catch (error) {
  db.close();
  rmSync(rutaBase, { force: true }); // no dejar una base a medio crear
  console.error("Error creando la base: " + error.message);
  process.exit(1);
}

// ── 3. Resumen de verificación ──────────────────────────────────────────────
const tablas = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all();

console.log("\nBase creada correctamente: " + rutaBase);
console.log("Tablas (" + tablas.length + ") y filas cargadas:\n");

for (const { name } of tablas) {
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM "${name}"`).get();
  console.log("  " + String(name).padEnd(24) + " " + total);
}

const vistas = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name")
  .all();
console.log("\nVistas: " + vistas.map((v) => v.name).join(", "));

db.close();
console.log("\nListo. Abrí el archivo nexo.db con DB Browser for SQLite para explorarlo.");
