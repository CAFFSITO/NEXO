// Pruebas del primer ingreso: la contraseña inicial sencilla (nombre + números)
// y la bienvenida, donde cambiarla es opcional y no pide la actual.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno, asegurarCurso } from './entorno.js';
import { generarContrasenaInicial } from '../contrasenas.js';

let entorno, request, ok, entrar;

before(async () => {
  entorno = await crearEntorno('nexo-primer-ingreso-');
  ({ request, ok, entrar } = entorno);
  await entrar('maestro', 'sistema@nexo.edu');
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('julieta', 'julieta@sanmartin.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

test('La contraseña inicial es el primer nombre sin tildes y unos números', () => {
  assert.match(generarContrasenaInicial('Rosa Martínez'), /^rosa\d{4}$/);
  assert.match(generarContrasenaInicial('Dra. Vera Rubin'), /^vera\d{4}$/);
  assert.match(generarContrasenaInicial('J. Pérez'), /^perez\d{4}$/);
  assert.match(generarContrasenaInicial('Ñandú'), /^nandu\d{4}$/);
  assert.match(generarContrasenaInicial('Estudiante · cuenta semilla'), /^estudiante\d{4}$/);
  assert.match(generarContrasenaInicial(''), /^nexo\d{4}$/);
  // Un nombre corto suma números hasta llegar al largo mínimo (8).
  assert.match(generarContrasenaInicial('Ana'), /^ana\d{5}$/);
});

test('Una cuenta nueva entra con su contraseña sencilla y marcada como primer ingreso', async () => {
  const creada = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Rosa Martínez', email: 'rosa@sanmartin.nexo.edu', rol: 'profesor' }, 201);
  assert.match(creada.contrasenaInicial, /^rosa\d{4}$/);

  // Sin curso asignado, una profesora no puede entrar (y se le dice por qué).
  const sinCurso = await request('/api/sesion', null, 'POST', { email: 'rosa@sanmartin.nexo.edu', contrasena: creada.contrasenaInicial });
  assert.equal(sinCurso.status, 403);
  assert.equal(sinCurso.data.motivo, 'sin-curso');
  assert.equal(sinCurso.response.headers.get('set-cookie'), null);
  // Con una cátedra, sí.
  asegurarCurso(entorno.db, 'rosa@sanmartin.nexo.edu');
  const ingreso = await request('/api/sesion', null, 'POST', { email: 'rosa@sanmartin.nexo.edu', contrasena: creada.contrasenaInicial });
  assert.equal(ingreso.status, 200);
  assert.equal(ingreso.data.usuario.primerIngreso, true);
  await entrar('rosa', 'rosa@sanmartin.nexo.edu', creada.contrasenaInicial);
  assert.equal((await ok('/api/sesion', 'rosa')).usuario.primerIngreso, true);

  // Las cuentas que ya existían no pasan por la bienvenida.
  assert.equal((await ok('/api/sesion', 'julieta')).usuario.primerIngreso, undefined);
});

test('En la bienvenida se elige contraseña sin repetir la actual, una sola vez', async () => {
  await ok('/api/cuenta/contrasena', 'rosa', 'PUT', { nueva: '30111222' });
  assert.equal((await ok('/api/sesion', 'rosa')).usuario.primerIngreso, undefined);
  await entrar('rosa2', 'rosa@sanmartin.nexo.edu', '30111222');

  // Pasada la bienvenida, vuelve la regla de siempre: hay que saber la actual.
  const otraVez = await request('/api/cuenta/contrasena', 'rosa2', 'PUT', { nueva: '40999888' });
  assert.equal(otraVez.status, 400);
  // Y una cuenta vieja nunca pudo saltársela.
  const vieja = await request('/api/cuenta/contrasena', 'julieta', 'PUT', { nueva: '40999888' });
  assert.equal(vieja.status, 400);
});

test('"Seguir con la que me dieron" deja la contraseña y termina la bienvenida', async () => {
  const creada = await ok('/api/plataforma/instituciones', 'maestro', 'POST', {
    nombre: 'Escuela del Sol', cicloLectivo: 2026, direccionNombre: 'Lic. Marta Gómez', direccionEmail: 'marta@sol.nexo.edu',
  }, 201);
  assert.match(creada.contrasenaInicial, /^marta\d{4}$/);
  await entrar('marta', 'marta@sol.nexo.edu', creada.contrasenaInicial);
  assert.equal((await ok('/api/sesion', 'marta')).usuario.primerIngreso, true);

  await ok('/api/cuenta/primer-ingreso', 'marta', 'POST', {});
  assert.equal((await ok('/api/sesion', 'marta')).usuario.primerIngreso, undefined);
  await entrar('marta2', 'marta@sol.nexo.edu', creada.contrasenaInicial);
  assert.equal((await request('/api/cuenta/contrasena', 'marta2', 'PUT', { nueva: '30111222' })).status, 400);
});

test('Cada uno cambia su propio nombre, y solo el nombre (no el correo)', async () => {
  const cambio = await ok('/api/cuenta/nombre', 'julieta', 'PUT', { nombre: '  Juli   Rossi ', email: 'otro@correo.com' });
  assert.equal(cambio.nombre, 'Juli Rossi');
  const cuenta = (await ok('/api/cuenta', 'julieta')).cuenta;
  assert.equal(cuenta.nombre, 'Juli Rossi');
  assert.equal(cuenta.email, 'julieta@sanmartin.nexo.edu', 'el correo no se toca');
  assert.equal((await ok('/api/sesion', 'julieta')).usuario.nombre, 'Juli Rossi');
  assert.equal((await request('/api/cuenta/nombre', 'julieta', 'PUT', { nombre: '   ' })).status, 400);
  assert.equal((await request('/api/cuenta/nombre', 'julieta', 'PUT', { nombre: 'x'.repeat(81) })).status, 400);
  assert.equal((await request('/api/cuenta/nombre', null, 'PUT', { nombre: 'Nadie' })).status, 401);
});
