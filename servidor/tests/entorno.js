// Entorno de prueba compartido: una base temporal con el esquema y los datos de
// ejemplo, un servidor real escuchando en un puerto libre y ayudantes para
// pedir a la API con la sesión de distintas personas. Nunca toca nexo.db.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));

export async function crearEntorno(prefijo, prepararBase = () => {}, extraEnv = {}) {
  const tempRoot = realpathSync(tmpdir());
  const temp = mkdtempSync(join(tempRoot, prefijo));
  const dbPath = join(temp, 'prueba.db');
  const db = new DatabaseSync(dbPath);
  // La prueba lee la base mientras el servidor escribe: que espere el bloqueo.
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(readFileSync(join(root, 'base-de-datos/esquema.sql'), 'utf8'));
  db.exec(readFileSync(join(root, 'base-de-datos/datos-iniciales.sql'), 'utf8'));
  prepararBase(db);

  let logs = '';
  let base;
  const server = spawn(process.execPath, ['servidor.js'], {
    cwd: join(root, 'servidor'), windowsHide: true,
    env: { ...process.env, NEXO_DB_PATH: dbPath, NEXO_STORAGE_DIR: temp, NEXO_HOST: '127.0.0.1', NEXO_PORT: '0', NEXO_TLS_CERT: '', NEXO_TLS_KEY: '', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try { await new Promise((listo, fallo) => {
    const timer = setTimeout(() => fallo(new Error('Servidor no inició: ' + logs)), 30000);
    server.stdout.on('data', (chunk) => { logs += chunk; const m = logs.match(/encendida en http:\/\/localhost:(\d+)/); if (m) { base = `http://127.0.0.1:${m[1]}`; clearTimeout(timer); listo(); } });
    server.stderr.on('data', (chunk) => { logs += chunk; });
    server.once('exit', (code) => { clearTimeout(timer); fallo(new Error(`Servidor salió ${code}: ${logs}`)); });
  }); } catch (error) { await cerrar(); throw error; }

  const cookies = {};
  async function request(path, quien, method = 'GET', body) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(quien ? { Cookie: cookies[quien] } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const content = await response.text();
    let data;
    try { data = JSON.parse(content); } catch { assert.fail(`${method} ${path} no respondió JSON: ${content.slice(0, 100)}`); }
    return { status: response.status, data, response };
  }
  async function ok(path, quien, method = 'GET', body, status = 200) {
    const r = await request(path, quien, method, body);
    assert.equal(r.status, status, `${method} ${path} (${quien}): ${JSON.stringify(r.data)}`);
    return r.data;
  }
  /** Un pedido cuya respuesta no es JSON (por ejemplo, un archivo .ics). */
  async function texto(path, quien) {
    const response = await fetch(base + path, { headers: quien ? { Cookie: cookies[quien] } : {}, signal: AbortSignal.timeout(15000) });
    return { status: response.status, tipo: response.headers.get('content-type') ?? '', cuerpo: await response.text() };
  }
  /** Un pedido con cuerpo y cabeceras a mano (por ejemplo, subir un archivo). */
  async function crudo(path, quien, { method = 'GET', headers = {}, body } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(quien ? { Cookie: cookies[quien] } : {}), ...headers }, body, signal: AbortSignal.timeout(15000) });
    const tipo = response.headers.get('content-type') ?? '';
    const datos = tipo.includes('json') ? await response.json() : await response.text();
    return { status: response.status, tipo, datos, cabeceras: response.headers };
  }
  async function entrar(quien, email, contrasena = 'nexo1234') {
    const r = await request('/api/sesion', null, 'POST', { email, contrasena });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    cookies[quien] = r.response.headers.get('set-cookie').split(';')[0];
  }
  async function cerrar() {
    if (server.exitCode === null) {
      await new Promise((fin) => { server.once('exit', fin); server.kill(); setTimeout(fin, 3000).unref(); });
    }
    db.close();
    const target = resolve(temp);
    assert.ok(target.startsWith(tempRoot + sep) && target.split(sep).at(-1).startsWith(prefijo));
    rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
  return { db, request, ok, texto, crudo, entrar, cerrar, logs: () => logs };
}
