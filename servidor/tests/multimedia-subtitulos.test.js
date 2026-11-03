import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerSrt } from '../multimedia-local.js';

test('Subtítulos SRT locales conservan intervalos y texto y descartan entradas inválidas',()=>{
  const subtitulos=leerSrt('1\n00:00:01,250 --> 00:00:02,500\nPrimera idea\n\n2\n00:00:02,500 --> 00:00:04,000\nSegunda línea\ncon ejemplo\n\n3\n00:00:05,000 --> 00:00:04,000\nInválido');
  assert.deepEqual(subtitulos,[{inicio:1.25,fin:2.5,texto:'Primera idea'},{inicio:2.5,fin:4,texto:'Segunda línea\ncon ejemplo'}]);
});
