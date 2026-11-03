// El cupo de un curso (mínimo y máximo de estudiantes) y su aula: se guardan al
// crear y editar, se validan y vuelven en la lista de cursos de la dirección.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Cupo y aula de un curso: validación, alta, edición parcial y lista', async () => {
  const e = await crearEntorno('nexo-cupo-');
  try {
    await e.entrar('direccion', 'direccion@sanmartin.nexo.edu');
    const { turnos } = await e.ok('/api/gestion-academica/opciones', 'direccion');
    const base = { anio: 2, division: 'Z', preceptorId: null, turnoId: turnos[0].id };
    assert.equal((await e.request('/api/cursos', 'direccion', 'POST', { ...base, cupoMinimo: 30, cupoMaximo: 20 })).status, 400);
    assert.equal((await e.request('/api/cursos', 'direccion', 'POST', { ...base, cupoMaximo: 900 })).status, 400);
    const { id } = await e.ok('/api/cursos', 'direccion', 'POST', { ...base, cupoMinimo: 15, cupoMaximo: 30, aula: ' Aula 12 ' }, 201);
    let curso = (await e.ok('/api/cursos', 'direccion')).cursos.find((c) => c.id === id);
    assert.deepEqual([curso.cupoMinimo, curso.cupoMaximo, curso.aula], [15, 30, 'Aula 12']);
    // Editar solo el preceptor no borra el cupo.
    await e.ok(`/api/cursos/${id}`, 'direccion', 'PUT', { anio: 2, division: 'Z', preceptorId: null });
    curso = (await e.ok('/api/cursos', 'direccion')).cursos.find((c) => c.id === id);
    assert.deepEqual([curso.cupoMinimo, curso.cupoMaximo], [15, 30]);
    // Vaciar el cupo: sin límite.
    await e.ok(`/api/cursos/${id}`, 'direccion', 'PUT', { anio: 2, division: 'Z', preceptorId: null, cupoMinimo: null, cupoMaximo: '' });
    curso = (await e.ok('/api/cursos', 'direccion')).cursos.find((c) => c.id === id);
    assert.deepEqual([curso.cupoMinimo, curso.cupoMaximo, curso.aula], [null, null, 'Aula 12']);
  } finally { await e.cerrar(); }
});
