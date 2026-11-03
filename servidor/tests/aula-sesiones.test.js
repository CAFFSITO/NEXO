import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Una clase crea el mismo acceso en agenda; la cola de palabra respeta el aula', async () => {
  const e = await crearEntorno('nexo-aula-sesion-');
  try {
    await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
    await e.entrar('alumna', 'julieta@sanmartin.nexo.edu');
    await e.entrar('otro', 'martin@sanmartin.nexo.edu');
    const profesor = e.db.prepare("SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'").get().id;
    const alumna = e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const cat = e.db.prepare('SELECT c.id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id WHERE c.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(profesor, alumna);
    assert.ok(cat);
    const clase = await e.ok('/api/aula/clases', 'docente', 'POST', { catedraId: cat.id, titulo: 'Aula vinculada', fechaHora: new Date(Date.now() - 60000).toISOString(), objetivos: 'Preguntas', materiales: '', etapas: [{ titulo: 'Conversar' }] }, 201);
    const evento = e.db.prepare('SELECT e.*, d.curso_id FROM aula_eventos ae JOIN eventos e ON e.id=ae.evento_id JOIN evento_destinos d ON d.evento_id=e.id AND d.tipo=\'curso\' WHERE ae.clase_id=?').get(Number(clase.id));
    assert.equal(evento.enlace, `/aula-virtual?clase=${clase.id}`);
    assert.equal(evento.recordatorios, '[10]');
    await e.ok(`/api/aula/clases/${clase.id}/iniciar`, 'docente', 'POST', {});
    await e.ok(`/api/aula/clases/${clase.id}/entrar`, 'alumna', 'POST', {});
    await e.ok(`/api/aula/clases/${clase.id}/mano`, 'alumna', 'PUT', { levantada: true });
    const lista = await e.ok(`/api/aula/clases/${clase.id}/manos`, 'docente');
    assert.equal(lista.manos.length, 1);
    assert.equal(lista.manos[0].id, alumna);
    await e.ok(`/api/aula/clases/${clase.id}/mano`, 'docente', 'PUT', { levantada: true }, 403);
    await e.ok(`/api/aula/clases/${clase.id}/manos/${alumna}`, 'otro', 'DELETE', undefined, 403);
    await e.ok(`/api/aula/clases/${clase.id}/manos/${alumna}`, 'docente', 'DELETE');
    assert.equal((await e.ok(`/api/aula/clases/${clase.id}/manos`, 'alumna')).levantada, false);
    await e.ok(`/api/aula/clases/${clase.id}/mano`, 'alumna', 'PUT', { levantada: true });
    await e.ok(`/api/aula/clases/${clase.id}/finalizar`, 'docente', 'POST', {});
    assert.equal((await e.ok(`/api/aula/clases/${clase.id}/manos`, 'docente')).manos.length, 0);
  } finally { await e.cerrar(); }
});
