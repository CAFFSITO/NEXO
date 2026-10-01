import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = join(root, 'NEXO/node_modules/vite/bin/vite.js');
if (!existsSync(vite) || !existsSync(join(root, 'servidor/node_modules/express'))) {
  console.error('Faltan dependencias. Ejecutá yarn --cwd NEXO install y yarn --cwd servidor install.');
  process.exit(1);
}
if (!process.env.NEXO_DB_PATH && !existsSync(join(root, 'base-de-datos/nexo.db'))) {
  const creado = spawnSync(process.execPath, [join(root, 'base-de-datos/crear-base.mjs')], { stdio: 'inherit', windowsHide: true });
  if (creado.status !== 0) process.exit(1);
}

const hijos = new Set();
let cerrando = false;
function cerrar(codigo = 0) {
  if (cerrando) return;
  cerrando = true;
  process.exitCode = codigo;
  for (const hijo of hijos) hijo.kill();
}
function iniciar(archivo, args, cwd, stdio) {
  const hijo = spawn(process.execPath, [archivo, ...args], { cwd, stdio, windowsHide: true, env: process.env });
  hijos.add(hijo);
  hijo.once('error', error => { console.error(error.message); cerrar(1); });
  hijo.once('exit', codigo => { hijos.delete(hijo); if (!cerrando) cerrar(codigo ?? 1); });
  return hijo;
}
process.on('SIGINT', () => cerrar());
process.on('SIGTERM', () => cerrar());
const backend = iniciar('servidor.js', [], join(root, 'servidor'), ['inherit', 'pipe', 'inherit']);
let anunciado = '';
let frontendIniciado = false;
backend.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  anunciado += chunk;
  if (!frontendIniciado && anunciado.includes('encendida en')) {
    frontendIniciado = true;
    iniciar(vite, ['--host', '127.0.0.1', '--port', '5173', '--strictPort', ...process.argv.slice(2)], join(root, 'NEXO'), 'inherit');
  }
});
