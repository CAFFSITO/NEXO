import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPersonalizacion, normalizarPreferencias, resolverPersonalizacion, normalizarFichaEvidencia, catalogoPersonalizacion } from '../personalizacion.js';

test('Los valores ausentes heredan y no habilitan eliminación', () => {
  const c = normalizarPersonalizacion();
  assert.deepEqual(c.institucion, {});
  assert.deepEqual(c.academico, { anioMin: 1, anioMax: 7 });
  assert.deepEqual(c.retencion.historialIa, { modo: 'conservar', dias: null });
  assert.deepEqual(c.retencion.notificacionesLeidas, { modo: 'conservar', dias: null });
  assert.deepEqual(resolverPersonalizacion(c, 'profesor'), { densidad: 'comoda', movimiento: 'sistema', tamanoTexto: 100 });
});

test('La precedencia es institución, perfil y preferencias propias sin mutar entradas', () => {
  const c = { institucion: { densidad: 'compacta', tamanoTexto: 110 }, perfiles: { profesor: { tamanoTexto: 120, movimiento: 'reducido' } } };
  const antes = structuredClone(c);
  assert.deepEqual(resolverPersonalizacion(c, 'profesor', { tamanoTexto: 135 }), { densidad: 'compacta', tamanoTexto: 135, movimiento: 'reducido' });
  assert.equal(resolverPersonalizacion(c, 'otro').tamanoTexto, 110);
  assert.deepEqual(c, antes);
});

test('Validación rechaza preferencias y perfiles inventados; la lectura repara', () => {
  assert.throws(() => normalizarPreferencias({ tamanoTexto: '120' }));
  assert.throws(() => normalizarPreferencias({ foco: true }));
  assert.throws(() => normalizarPersonalizacion({ perfiles: { ausente: {} } }, { perfiles: [{ clave: 'profesor' }] }));
  assert.deepEqual(normalizarPersonalizacion({ perfiles: { ausente: {} } }, { perfiles: [{ clave: 'profesor' }], estricto: false }).perfiles, {});
});

test('Retención requiere una decisión explícita y nunca inventa un plazo', () => {
  assert.throws(() => normalizarPersonalizacion({ retencion: { historialIa: { modo: 'eliminar' } } }));
  const c = normalizarPersonalizacion({ retencion: { historialIa: { modo: 'eliminar', dias: 30 } } });
  assert.deepEqual(c.retencion.historialIa, { modo: 'eliminar', dias: 30 });
  assert.equal(c.retencion.notificacionesLeidas.modo, 'conservar');
  assert.equal(normalizarPersonalizacion({ retencion: { historialIa: { modo: 'eliminar', dias: 0 } } }, { estricto: false }).retencion.historialIa.modo, 'conservar');
});

test('Rango académico admite nuevos niveles y rechaza un rango invertido', () => {
  assert.deepEqual(normalizarPersonalizacion({ academico: { anioMin: 8, anioMax: 20 } }).academico, { anioMin: 8, anioMax: 20 });
  for (const academico of [{ anioMin: 8, anioMax: 7 }, { anioMin: 0, anioMax: 7 }, { anioMin: 1, anioMax: 101 }]) assert.throws(() => normalizarPersonalizacion({ academico }));
});

test('Extensiones futuras conservan datos versionados sin ejecutar contenido', () => {
  const c = { extensiones: { 'futuro.app': { version: 12, tipo: 'app', config: { bloques: [{ codigo: 'throw new Error()' }], visible: true } } } };
  assert.deepEqual(normalizarPersonalizacion(normalizarPersonalizacion(c)).extensiones, c.extensiones);
  assert.throws(() => normalizarPersonalizacion({ extensiones: { a: { version: 1, tipo: 'app', config: JSON.parse('{"__proto__":{"polluted":true}}') } } }));
  assert.equal({}.polluted, undefined);
});

test('Ficha sin fuentes no se convierte en una aprobación científica', () => {
  const ficha = { tipo: 'algoritmo', id: 'objetivos.racha', estado: 'favorable' };
  assert.throws(() => normalizarFichaEvidencia(ficha));
  assert.equal(normalizarFichaEvidencia(ficha, { estricto: false }).estado, 'sin-evaluar');
  assert.throws(() => normalizarFichaEvidencia({ ...ficha, fuentes: [{ titulo: 'Fuente', url: 'javascript:alert(1)' }] }));
  const valida = { ...ficha, fuentes: [{ titulo: 'Fuente', url: 'https://example.org/estudio' }], revisadoEn: '2026-10-25' };
  const c = normalizarPersonalizacion({ evidencias: { 'objetivos.racha': valida } });
  assert.equal(c.evidencias['objetivos.racha'].fuentes.length, 1);
  assert.throws(() => normalizarFichaEvidencia({ ...valida, revisadoEn: '2026-02-31' }));
});

test('Una extensión demasiado grande se rechaza sin guardar una versión recortada', () => {
  for (const valor of ['a'.repeat(10001), Array(1001).fill('paso')]) {
    assert.throws(() => normalizarPersonalizacion({ extensiones: { prueba: { version: 1, tipo: 'app', config: { valor } } } }));
  }
});

test('Registro devuelve copias y distingue capacidades previstas', () => {
  const c = catalogoPersonalizacion();
  c.preferencias.densidad.opciones.push('inventada');
  assert.equal(catalogoPersonalizacion().preferencias.densidad.opciones.length, 2);
  assert.ok(c.capacidades.every((cap) => cap.estado === 'prevista' && cap.version === 1));
});
