import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aFecha, aInstante } from '../../NEXO/src/servicios/fechas.ts';

test('Fechas de calendario conservan el día local y rechazan fechas imposibles', () => {
  const fecha = aFecha('2026-10-01');
  assert.equal(fecha.getDate(),1);
  assert.equal(fecha.getMonth(),9);
  assert.equal(fecha.getHours(),0);
  assert.equal(aFecha('2026-02-31'),null);
});

test('Mensajes conservan horas y minutos y convierten correctamente SQLite UTC', () => {
  assert.equal(aInstante('2026-10-01 18:45:12').toISOString(),'2026-10-01T18:45:12.000Z');
  assert.equal(aInstante('2026-10-01T15:45:12-03:00').toISOString(),'2026-10-01T18:45:12.000Z');
  assert.equal(aInstante('fecha inválida'),null);
});
