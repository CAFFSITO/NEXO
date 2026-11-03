import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrarBase } from '../migraciones.js';

const esquema = fileURLToPath(new URL('../../base-de-datos/esquema.sql', import.meta.url));
const datosIniciales = fileURLToPath(new URL('../../base-de-datos/datos-iniciales.sql', import.meta.url));

test('las migraciones repetidas conservan cuentas, instituciones y referencias', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(readFileSync(esquema, 'utf8'));
    db.exec(readFileSync(datosIniciales, 'utf8'));
    const antes = {
      usuarios: db.prepare('SELECT id, institucion_id, email, rol FROM usuarios ORDER BY id').all(),
      instituciones: db.prepare('SELECT id, nombre FROM instituciones ORDER BY id').all(),
    };
    migrarBase(db);
    const tablas = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    migrarBase(db);
    assert.deepEqual(db.prepare('SELECT id, institucion_id, email, rol FROM usuarios ORDER BY id').all(), antes.usuarios);
    assert.deepEqual(db.prepare('SELECT id, nombre FROM instituciones ORDER BY id').all(), antes.instituciones);
    assert.deepEqual(db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all(), tablas);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally {
    db.close();
  }
});
