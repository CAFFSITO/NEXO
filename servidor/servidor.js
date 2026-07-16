// ============================================================================
// NEXO — Servidor (la "cocina")
// ----------------------------------------------------------------------------
// Programa aparte de la aplicación. Es el ÚNICO que abre el archivador
// (base-de-datos/nexo.db) y atiende los pedidos de la vidriera en /api/*.
//
// Ventanillas abiertas hasta ahora:
//   /api/salud   → ¿está viva la cocina? (punto 5 del plan)
//   /api/sesion  → entrar, revalidar y salir (Etapa 1; ver sesiones.js)
//
//   Uso:  node servidor.js
//   Necesita Node.js 22.5+ (trae SQLite integrado; no hay que instalar nada).
// ============================================================================

import express from "express";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { registrarSesiones } from "./sesiones.js";

const carpeta = dirname(fileURLToPath(import.meta.url));
const rutaBase = join(carpeta, "..", "base-de-datos", "nexo.db");
const PUERTO = 3000;

// ── 1. Abrir el archivador ──────────────────────────────────────────────────
// Si la base todavía no existe, avisamos claro en vez de fallar con un error
// críptico (se crea con: node ../base-de-datos/crear-base.mjs).
if (!existsSync(rutaBase)) {
  console.error(
    "No encuentro la base en " + rutaBase + "\n" +
    "Creala primero:  cd ../base-de-datos  &&  node crear-base.mjs"
  );
  process.exit(1);
}

const db = new DatabaseSync(rutaBase);

// Reglas de integridad activadas: que la base rechace datos incoherentes
// (por ejemplo, un comentario apuntando a un usuario que no existe).
db.exec("PRAGMA foreign_keys = ON;");

// ── 2. Armar la cocina ──────────────────────────────────────────────────────
const app = express();
app.use(express.json()); // entender pedidos con cuerpo en formato JSON

// ── 3. Primera ventanilla de prueba: ¿está viva la cocina? ──────────────────
app.get("/api/salud", (_req, res) => {
  // Consulta mínima para confirmar que además de estar viva, VE la base.
  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM usuarios")
    .get();

  res.json({
    estado: "viva",
    mensaje: "La cocina de NEXO está funcionando.",
    baseConectada: true,
    usuariosEnLaBase: total,
    hora: new Date().toISOString(),
  });
});

// ── 4. Ventanillas de ingreso y sesión (Etapa 1) ────────────────────────────
registrarSesiones(app, db);

// ── 5. Encender ─────────────────────────────────────────────────────────────
const servidor = app.listen(PUERTO, () => {
  console.log("Cocina de NEXO encendida en http://localhost:" + PUERTO);
  console.log("Ventanilla de prueba:      http://localhost:" + PUERTO + "/api/salud");
});

// Apagado ordenado (Ctrl+C): cerrar la base antes de salir.
process.on("SIGINT", () => {
  console.log("\nApagando la cocina...");
  servidor.close();
  db.close();
  process.exit(0);
});
