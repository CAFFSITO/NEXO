import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertirDocs, convertirForms, convertirNotion } from '../conectores-conversion.js';

test('Docs conserva títulos, texto y listas; rechaza objetos no representables', () => {
  const d = convertirDocs({ title: 'Apunte', body: { content: [
    { paragraph: { paragraphStyle: { namedStyleType: 'HEADING_1' }, elements: [{ textRun: { content: 'Tema\n' } }] } },
    { paragraph: { bullet: {}, elements: [{ textRun: { content: 'Punto\n' } }] } },
  ] } });
  assert.deepEqual(d.bloques.map(b => b.tipo), ['titulo', 'lista']);
  assert.equal(d.bloques[1].texto, 'Punto');
  assert.throws(() => convertirDocs({ body: { content: [{ table: {} }] } }), /no representa/);
});

test('Forms convierte preguntas compatibles sin inventar respuestas', () => {
  const f = convertirForms({ info: { title: 'Chequeo' }, items: [
    { title: 'Elegí', questionItem: { question: { required: true, choiceQuestion: { type: 'RADIO', options: [{ value: 'A' }, { value: 'B' }] } } } },
  ] });
  assert.equal(f.tipo, 'formulario');
  assert.deepEqual(f.bloques[0].opciones, ['A', 'B']);
  assert.equal(f.bloques[0].obligatoria, true);
  assert.throws(() => convertirForms({ items: [{ title: 'Archivo', questionItem: { question: { fileUploadQuestion: {} } } }] }), /no puede representar/);
});

test('Notion rechaza bloques anidados para evitar copias incompletas', () => {
  const p = { properties: { title: { type: 'title', title: [{ plain_text: 'Página' }] } } };
  assert.equal(convertirNotion(p, [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Idea' }] } }]).bloques[0].texto, 'Idea');
  assert.throws(() => convertirNotion(p, [{ type: 'paragraph', has_children: true, paragraph: { rich_text: [] } }]), /anidados/);
});
