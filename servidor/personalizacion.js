// Contratos declarativos: no ejecutan código, consultan datos ni borran registros.
export class ErrorPersonalizacion extends Error {}
const ID = /^[a-z][a-z0-9._-]{0,79}$/;
const TIPOS = ['algoritmo', 'metodo', 'app', 'capacidad'];
const ESTADOS = ['sin-evaluar', 'favorable', 'mixta', 'insuficiente', 'desfavorable'];
const PELIGROSAS = new Set(['__proto__', 'prototype', 'constructor']);
const BASE = Object.freeze({ densidad: 'comoda', movimiento: 'sistema', tamanoTexto: 100 });
const CAMPOS = Object.freeze({
  densidad: { tipo: 'opcion', opciones: ['comoda', 'compacta'] },
  movimiento: { tipo: 'opcion', opciones: ['sistema', 'reducido', 'completo'] },
  tamanoTexto: { tipo: 'numero', min: 100, max: 150 },
});
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
function fallo(mensaje, estricto) { if (estricto) throw new ErrorPersonalizacion(mensaje); }

/** Configuración JSON preservable, acotada y sin claves que alteren prototipos. */
function jsonSeguro(valor, estricto, profundidad = 0, presupuesto = { n: 0 }) {
  if (++presupuesto.n > 5000 || profundidad > 12) {
    fallo('La extensión excede el tamaño o profundidad admitidos.', estricto);
    return null;
  }
  if (valor === null || typeof valor === 'boolean') return valor;
  if (typeof valor === 'string') {
    if (valor.length > 10000) fallo('El texto de la extensión excede 10000 caracteres.', estricto);
    return valor.slice(0, 10000);
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (Array.isArray(valor)) {
    if (valor.length > 1000) fallo('Una lista de la extensión excede 1000 elementos.', estricto);
    return valor.slice(0, 1000).map((v) => jsonSeguro(v, estricto, profundidad + 1, presupuesto));
  }
  if (objeto(valor)) {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) {
      if (PELIGROSAS.has(k) || k.length > 100) { fallo('Clave de extensión inválida.', estricto); continue; }
      salida[k] = jsonSeguro(v, estricto, profundidad + 1, presupuesto);
    }
    return salida;
  }
  fallo('La extensión debe contener únicamente datos JSON.', estricto);
  return null;
}

/** Devuelve solo overrides presentes: los valores ausentes siguen heredándose. */
export function normalizarPreferencias(crudo, { estricto = true } = {}) {
  if (crudo === undefined || crudo === null) return {};
  if (!objeto(crudo)) { fallo('Las preferencias deben ser un objeto.', estricto); return {}; }
  const salida = {};
  for (const [k, v] of Object.entries(crudo)) {
    const campo = CAMPOS[k];
    if (!Object.hasOwn(CAMPOS, k)) { fallo(`Preferencia desconocida: ${k}.`, estricto); continue; }
    const valido = campo.tipo === 'opcion' ? campo.opciones.includes(v)
      : campo.tipo === 'booleano' ? typeof v === 'boolean'
      : typeof v === 'number' && Number.isFinite(v) && v >= campo.min && v <= campo.max;
    if (!valido) { fallo(`Valor inválido para ${k}.`, estricto); continue; }
    salida[k] = v;
  }
  return salida;
}

function reglaRetencion(crudo, estricto) {
  if (crudo === undefined || crudo === null) return { modo: 'conservar', dias: null };
  if (!objeto(crudo) || !['conservar', 'eliminar'].includes(crudo.modo)) {
    fallo('Elegí conservar o un plazo explícito de retención.', estricto);
    return { modo: 'conservar', dias: null };
  }
  if (crudo.modo === 'conservar') return { modo: 'conservar', dias: null };
  if (!Number.isInteger(crudo.dias) || crudo.dias < 1 || crudo.dias > 36500) {
    fallo('El plazo de retención requiere entre 1 y 36500 días.', estricto);
    return { modo: 'conservar', dias: null };
  }
  return { modo: 'eliminar', dias: crudo.dias };
}

export function normalizarRetencion(crudo, { estricto = true } = {}) {
  if (crudo != null && !objeto(crudo)) fallo('Retención inválida.', estricto);
  const c = objeto(crudo) ? crudo : {};
  for (const k of Object.keys(c)) if (!['historialIa', 'notificacionesLeidas'].includes(k)) fallo(`Categoría de retención desconocida: ${k}.`, estricto);
  return { historialIa: reglaRetencion(c.historialIa, estricto), notificacionesLeidas: reglaRetencion(c.notificacionesLeidas, estricto) };
}

function normalizarPolitica(crudo, estricto) {
  const c = objeto(crudo) ? crudo : {};
  if (crudo != null && !objeto(crudo)) fallo('Política inválida.', estricto);
  const min = c.anioMin ?? 1;
  const max = c.anioMax ?? 7;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 100 || min > max) {
    fallo('El rango de años requiere enteros ordenados entre 1 y 100.', estricto);
    return { anioMin: 1, anioMax: 7 };
  }
  return { anioMin: min, anioMax: max };
}

export function normalizarPersonalizacion(crudo, { estricto = true, perfiles } = {}) {
  const c = objeto(crudo) ? crudo : {};
  if (crudo != null && !objeto(crudo)) fallo('Personalización inválida.', estricto);
  if (c.version !== undefined && c.version !== 1) fallo('Versión de personalización no compatible.', estricto);
  const claves = perfiles ? new Set(perfiles.map((p) => typeof p === 'string' ? p : p.clave)) : null;
  const porPerfil = {};
  if (c.perfiles != null && !objeto(c.perfiles)) fallo('La personalización de perfiles debe ser un objeto.', estricto);
  for (const [clave, v] of Object.entries(objeto(c.perfiles) ? c.perfiles : {})) {
    if (!ID.test(clave) || PELIGROSAS.has(clave) || (claves && !claves.has(clave))) {
      fallo(`Perfil de personalización desconocido: ${clave}.`, estricto); continue;
    }
    porPerfil[clave] = normalizarPreferencias(v, { estricto });
  }
  const extensiones = {};
  if (c.extensiones != null && !objeto(c.extensiones)) fallo('Extensiones inválidas.', estricto);
  for (const [id, extension] of Object.entries(objeto(c.extensiones) ? c.extensiones : {})) {
    if (!ID.test(id) || PELIGROSAS.has(id) || !objeto(extension) || !TIPOS.includes(extension.tipo)
      || !Number.isInteger(extension.version) || extension.version < 1 || !objeto(extension.config)) {
      fallo(`Extensión inválida: ${id}.`, estricto); continue;
    }
    extensiones[id] = { version: extension.version, tipo: extension.tipo, config: jsonSeguro(extension.config, estricto) };
  }
  const evidencias = {};
  if (c.evidencias != null && !objeto(c.evidencias)) fallo('Evidencias inválidas.', estricto);
  for (const [id, ficha] of Object.entries(objeto(c.evidencias) ? c.evidencias : {})) {
    if (PELIGROSAS.has(id) || !ID.test(id) || ficha?.id !== id) { fallo('Identidad de ficha inválida.', estricto); continue; }
    try { evidencias[id] = normalizarFichaEvidencia(ficha, { estricto }); }
    catch (err) { if (estricto) throw err; }
  }
  return {
    version: 1,
    institucion: normalizarPreferencias(c.institucion, { estricto }),
    perfiles: porPerfil,
    academico: normalizarPolitica(c.academico, estricto),
    retencion: normalizarRetencion(c.retencion, { estricto }),
    evidencias,
    extensiones,
  };
}

export function resolverPersonalizacion(config, perfilClave, usuario = {}) {
  const c = normalizarPersonalizacion(config, { estricto: false });
  return { ...BASE, ...c.institucion, ...(Object.hasOwn(c.perfiles, perfilClave) ? c.perfiles[perfilClave] : {}), ...normalizarPreferencias(usuario, { estricto: false }) };
}

/** Una ficha describe evidencia; no aprueba ni habilita ejecución de un diseño. */
export function normalizarFichaEvidencia(crudo, { estricto = true } = {}) {
  const c = objeto(crudo) ? crudo : {};
  if (!ID.test(c.id ?? '') || !TIPOS.includes(c.tipo)) throw new ErrorPersonalizacion('La ficha requiere id y tipo válidos.');
  if (c.version !== undefined && c.version !== 1) fallo('Versión de ficha no compatible.', estricto);
  let estado = ESTADOS.includes(c.estado) ? c.estado : 'sin-evaluar';
  if (c.estado !== undefined && !ESTADOS.includes(c.estado)) fallo('Estado de evidencia desconocido.', estricto);
  const fuentes = [];
  for (const f of Array.isArray(c.fuentes) ? c.fuentes.slice(0, 30) : []) {
    let url;
    try { url = new URL(f?.url); } catch { /* Se rechaza abajo. */ }
    if (!url || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || !texto(f?.titulo, 200)) {
      fallo('Cada fuente necesita título y enlace HTTP válido.', estricto); continue;
    }
    fuentes.push({ titulo: texto(f.titulo, 200), url: url.href });
  }
  if (['favorable', 'mixta', 'desfavorable'].includes(estado) && !fuentes.length) {
    fallo('Una conclusión de evidencia requiere al menos una fuente.', estricto);
    estado = 'sin-evaluar';
  }
  const fecha = typeof c.revisadoEn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.revisadoEn) && Number.isFinite(Date.parse(c.revisadoEn))
    && new Date(c.revisadoEn).toISOString().slice(0, 10) === c.revisadoEn ? c.revisadoEn : null;
  if (c.revisadoEn != null && !fecha) fallo('Fecha de revisión inválida.', estricto);
  return { version: 1, tipo: c.tipo, id: c.id, estado, resumen: texto(c.resumen, 3000), limites: texto(c.limites, 3000), fuentes, revisadoEn: fecha };
}

export function catalogoPersonalizacion() {
  return structuredClone({
    version: 1, preferencias: CAMPOS, valoresPorDefecto: BASE, tiposExtension: TIPOS, estadosEvidencia: ESTADOS,
    categoriasRetencion: ['historialIa', 'notificacionesLeidas'],
    academico: { anioMin: { tipo: 'numero', min: 1, max: 100, defecto: 1 }, anioMax: { tipo: 'numero', min: 1, max: 100, defecto: 7 } },
    capacidades: [
      { id: 'apps.publicas', version: 1, tipo: 'app', estado: 'prevista' },
      { id: 'estudio.metodos', version: 1, tipo: 'metodo', estado: 'prevista' },
      { id: 'estudio.repeticion', version: 1, tipo: 'algoritmo', estado: 'prevista' },
      { id: 'audio.transcripcion-local', version: 1, tipo: 'capacidad', estado: 'prevista' },
      { id: 'oratoria.analisis-local', version: 1, tipo: 'capacidad', estado: 'prevista' },
    ],
  });
}
