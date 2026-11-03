import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { Readable, Transform } from 'node:stream';
import { exigirSesion, ventanilla } from './comun.js';

function origenPrivado(valor, protocolos) {
  try {
    const u = new URL(valor);
    const h = u.hostname.replace(/^\[|\]$/g, '');
    const oct = h.split('.').map(Number);
    const privado = h === 'localhost' || h === '::1' || isIP(h) === 4 && (
      oct[0] === 127 || oct[0] === 10 || oct[0] === 192 && oct[1] === 168 || oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31);
    return protocolos.includes(u.protocol) && privado && !u.username && !u.password && !u.search && !u.hash && (u.pathname === '/' || !u.pathname) ? `${u.protocol}//${u.host}` : null;
  } catch { return null; }
}

const firma = (secreto, datos) => createHmac('sha256', secreto).update(datos).digest('base64url');
function comparar(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Puente opcional a MediaMTX institucional. La malla WebRTC existente sigue siendo el modo base. */
export function registrarAulaTransmision(app, db, { accesoAClase, claseConCatedra, estaInscriptoEn }) {
  const hls = origenPrivado(process.env.NEXO_MEDIA_HLS_ORIGIN, ['http:', 'https:']);
  const rtmp = origenPrivado(process.env.NEXO_MEDIA_RTMP_ORIGIN, ['rtmp:', 'rtmps:']);
  const secreto = process.env.NEXO_MEDIA_TOKEN_SECRET || '';
  const claveAuth = process.env.NEXO_MEDIA_AUTH_SECRET || '';
  const habilitada = !!(hls && rtmp && secreto.length >= 32 && claveAuth.length >= 32);
  const ruta = clase => `nexo-inst${clase.institucion_id}-clase${clase.id}`;
  const token = (clase, usuario, accion, minutos) => {
    const cuerpo = Buffer.from(JSON.stringify({ cid: clase.id, uid: usuario.id, accion, exp: Date.now() + minutos * 60_000 })).toString('base64url');
    return `${cuerpo}.${firma(secreto, cuerpo)}`;
  };
  const leerToken = valor => {
    if (typeof valor !== 'string' || valor.length > 600) return null;
    const partes = valor.split('.');
    if (partes.length !== 2 || !comparar(partes[1], firma(secreto, partes[0]))) return null;
    try {
      const p = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
      return Number.isSafeInteger(p.cid) && Number.isSafeInteger(p.uid) && Number.isSafeInteger(p.exp) && p.exp > Date.now() && ['publish', 'read'].includes(p.accion) ? p : null;
    } catch { return null; }
  };

  app.get('/api/aula/clases/:id/transmision', ventanilla((req, res) => {
    const a = accesoAClase(req, res, req.params.id); if (!a) return;
    if (!habilitada) return res.json({ habilitada: false, motivo: 'El servidor de medios institucional no está configurado.' });
    if (a.clase.estado !== 'en-vivo') return res.json({ habilitada: false, motivo: 'La clase todavía no está en vivo.' });
    res.set('Cache-Control', 'no-store');
    res.json({ habilitada: true, hlsUrl: `/api/aula/clases/${a.clase.id}/transmision/hls/index.m3u8`,
      ...(a.esDocente ? { obsServidor: `${rtmp}/${ruta(a.clase)}?token=${token(a.clase, a.usuario, 'publish', 120)}`, expiraEnMinutos: 120 } : {}) });
  }));

  // MediaMTX: authMethod=http; authHTTPAddress=http://NEXO/api/aula/transmision/autorizacion?clave=...
  // La clave adicional distingue al servidor de medios de una llamada pública.
  app.post('/api/aula/transmision/autorizacion', ventanilla((req, res) => {
    if (!habilitada || !comparar(req.query.clave, claveAuth)) return res.sendStatus(403);
    const entrada = req.body || {};
    const raw = entrada.token || new URLSearchParams(String(entrada.query || '')).get('token');
    const p = leerToken(raw);
    const clase = p && claseConCatedra.get(p.cid);
    const usuario = p && db.prepare("SELECT id,rol,institucion_id,estado FROM usuarios WHERE id=?").get(p.uid);
    const pertenece = clase && usuario && usuario.estado === 'activo' && usuario.institucion_id === clase.institucion_id &&
      (clase.profesor_id === usuario.id || usuario.rol === 'estudiante' && estaInscriptoEn.get(clase.curso_id, usuario.id));
    if (!pertenece || clase.estado !== 'en-vivo' || entrada.path !== ruta(clase) || !['publish', 'read'].includes(entrada.action) || entrada.action !== p.accion ||
      (entrada.action === 'publish' && clase.profesor_id !== usuario.id)) return res.sendStatus(403);
    res.json({ expireAt: new Date(p.exp).toISOString() });
  }));

  app.get(/^\/api\/aula\/clases\/(\d+)\/transmision\/hls\/([A-Za-z0-9_.-]+)$/, ventanilla(async (req, res) => {
    const a = accesoAClase(req, res, req.params[0]); if (!a) return;
    if (!habilitada || a.clase.estado !== 'en-vivo') return res.status(503).json({ error: 'Transmisión no disponible.' });
    const nombre = req.params[1];
    if (nombre.startsWith('.') || nombre.includes('..') || !/\.(m3u8|mp4|m4s|ts)$/.test(nombre)) return res.sendStatus(404);
    const destino = new URL(`${hls}/${ruta(a.clase)}/${nombre}`);
    for (const [clave, valor] of Object.entries(req.query)) if (/^_HLS_[A-Za-z0-9_]+$/.test(clave) && typeof valor === 'string' && valor.length < 80) destino.searchParams.set(clave, valor);
    try {
      const respuesta = await fetch(destino, { headers: { Authorization: `Bearer ${token(a.clase, a.usuario, 'read', 5)}` }, redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!respuesta.ok || !respuesta.body) return res.status(respuesta.status === 404 ? 404 : 502).end();
      const playlist=nombre.endsWith('.m3u8');
      const tipo=(respuesta.headers.get('content-type')||'').toLowerCase();
      const tipoValido=playlist ? /mpegurl|text\/plain/.test(tipo) : nombre.endsWith('.ts') ? /video\/mp2t|application\/octet-stream/.test(tipo) : /video\/mp4|application\/octet-stream/.test(tipo);
      const limite=playlist?1024*1024:32*1024*1024;
      if(!tipoValido || Number(respuesta.headers.get('content-length')||0)>limite){await respuesta.body.cancel();return res.status(502).json({error:'Respuesta de medios inesperada.'});}
      res.set('Cache-Control', 'no-store');
      res.type(playlist ? 'application/vnd.apple.mpegurl' : nombre.endsWith('.ts') ? 'video/mp2t' : 'video/mp4');
      let recibidos=0;
      const limiteStream=new Transform({transform(chunk,_encoding,continuar){recibidos+=chunk.length;continuar(recibidos<=limite?null:new Error('Medio demasiado grande.'),chunk);}});
      Readable.fromWeb(respuesta.body).on('error', () => res.destroy()).pipe(limiteStream).on('error', () => res.destroy()).pipe(res);
    } catch { res.status(502).json({ error: 'El servidor de medios institucional no respondió.' }); }
  }));
}
