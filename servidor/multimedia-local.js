import express from 'express';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exigirSesion, ventanilla } from './comun.js';

const ejecutar = promisify(execFile);
const segundos = marca => { const m=/^(\d{2}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(marca); return m ? Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000 : null; };
export function leerSrt(texto) {
  const salida=[];
  for(const bloque of String(texto).replace(/\r/g,'').trim().split(/\n\s*\n/)) {
    const lineas=bloque.split('\n');
    const linea=lineas.findIndex(x=>x.includes(' --> '));
    if(linea<0)continue;
    const m=/^(\S+) --> (\S+)$/.exec(lineas[linea]);
    const inicio=m&&segundos(m[1]),fin=m&&segundos(m[2]);
    const contenido=lineas.slice(linea+1).join('\n').trim();
    if(inicio===null||fin===null||!Number.isFinite(inicio)||!Number.isFinite(fin)||fin<=inicio||!contenido)continue;
    salida.push({inicio,fin,texto:contenido.slice(0,500)});
    if(salida.length>10000)throw new Error('El archivo supera los 10000 segmentos de subtítulos. Dividí la grabación antes de transcribir.');
  }
  return salida;
}
/** Solo herramientas locales configuradas por la institución: el audio nunca sale del host. */
export function registrarMultimediaLocal(app, db) {
  app.post('/api/multimedia/analizar-audio', express.raw({ type: ['audio/*', 'video/*'], limit: '100mb' }), ventanilla(async (req, res) => {
    const usuario = exigirSesion(db, req, res); if (!usuario) return;
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Se necesita un audio o video válido.' });
    const umbral = req.query.umbral === undefined ? -35 : Number(req.query.umbral);
    const minima = req.query.minima === undefined ? 0.5 : Number(req.query.minima);
    if (!Number.isFinite(umbral) || umbral < -90 || umbral > -5 || !Number.isFinite(minima) || minima < 0.1 || minima > 10) return res.status(400).json({error:'Elegí un umbral entre -90 y -5 dBFS y una pausa entre 0,1 y 10 segundos.'});
    const carpeta = await mkdtemp(join(tmpdir(), 'nexo-oratoria-'));
    const entrada = join(carpeta, 'entrada');
    try {
      await writeFile(entrada, req.body);
      const ffmpeg = process.env.NEXO_FFMPEG || 'ffmpeg';
      const { stderr } = await ejecutar(ffmpeg, ['-nostdin', '-hide_banner', '-i', entrada, '-af', `silencedetect=noise=${umbral}dB:d=${minima},volumedetect`, '-vn', '-f', 'null', '-'], { timeout: 180000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
      const pausas = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map(m => Number(m[1]));
      const fines = [...stderr.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)].map(m => ({ fin: Number(m[1]), duracion: Number(m[2]) }));
      const media = Number(stderr.match(/mean_volume:\s*([-\d.]+) dB/)?.[1]);
      const pico = Number(stderr.match(/max_volume:\s*([-\d.]+) dB/)?.[1]);
      res.json({ pausas: pausas.length, intervalos: fines.map(p => ({inicio:Math.max(0,p.fin-p.duracion),fin:p.fin})), segundosEnPausa: Math.round(fines.reduce((n, p) => n + p.duracion, 0) * 10) / 10, volumenMedioDbfs: Number.isFinite(media) ? media : null, picoDbfs: Number.isFinite(pico) ? pico : null, umbralPausaDbfs: umbral, pausaMinimaSegundos: minima, ubicacion: 'servidor-institucional' });
    } catch { res.status(422).json({ error: 'No se pudo analizar el audio en el servidor institucional.' }); }
    finally { await rm(carpeta, { recursive: true, force: true }); }
  }));
  app.post('/api/multimedia/recortar', express.raw({ type: ['audio/*', 'video/*'], limit: '100mb' }), ventanilla(async (req, res) => {
    const usuario = exigirSesion(db, req, res); if (!usuario) return;
    const inicio = Number(req.query.inicio), fin = Number(req.query.fin);
    if (!Buffer.isBuffer(req.body) || !req.body.length || !Number.isFinite(inicio) || !Number.isFinite(fin) || inicio < 0 || fin <= inicio || fin - inicio > 7200) return res.status(400).json({ error: 'Intervalo de recorte inválido.' });
    const carpeta = await mkdtemp(join(tmpdir(), 'nexo-recorte-'));
    const entrada = join(carpeta, 'entrada'), salida = join(carpeta, 'salida.webm');
    try {
      await writeFile(entrada, req.body);
      const ffmpeg = process.env.NEXO_FFMPEG || 'ffmpeg';
      await ejecutar(ffmpeg, ['-nostdin', '-loglevel', 'error', '-ss', String(inicio), '-i', entrada, '-t', String(fin-inicio), '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '5', '-c:a', 'libopus', '-f', 'webm', salida], { timeout: 300000, windowsHide: true });
      res.type('video/webm').send(await readFile(salida));
    } catch { res.status(422).json({ error: 'No se pudo recortar este archivo en el servidor institucional.' }); }
    finally { await rm(carpeta, { recursive: true, force: true }); }
  }));
  app.post('/api/multimedia/transcribir', express.raw({ type: ['audio/*', 'video/*'], limit: '100mb' }), ventanilla(async (req, res) => {
    const usuario = exigirSesion(db, req, res); if (!usuario) return;
    const idioma = String(req.query.idioma || 'auto');
    if (!/^(auto|[a-z]{2,3})$/.test(idioma)) return res.status(400).json({error:'Idioma inválido: usá auto o un código de idioma de dos o tres letras.'});
    const whisper = process.env.NEXO_WHISPER_CLI, modelo = process.env.NEXO_WHISPER_MODELO;
    const ffmpeg = process.env.NEXO_FFMPEG || 'ffmpeg';
    if (!whisper || !modelo || !existsSync(whisper) || !existsSync(modelo)) return res.status(503).json({ error: 'Transcripción local no configurada por la institución.' });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Se necesita un audio o video válido.' });
    const carpeta = await mkdtemp(join(tmpdir(), 'nexo-transcripcion-'));
    const entrada = join(carpeta, 'entrada.webm'), wav = join(carpeta, 'audio.wav'), salida = join(carpeta, 'resultado');
    try {
      await writeFile(entrada, req.body);
      await ejecutar(ffmpeg, ['-nostdin', '-loglevel', 'error', '-i', entrada, '-ar', '16000', '-ac', '1', '-f', 'wav', wav], { timeout: 180000, windowsHide: true });
      await ejecutar(whisper, ['-m', modelo, '-f', wav, '-l', idioma, '-otxt', '-osrt', '-of', salida, '-nt'], { timeout: 300000, windowsHide: true });
      const texto = (await readFile(`${salida}.txt`, 'utf8')).trim();
      const subtitulos=leerSrt(await readFile(`${salida}.srt`, 'utf8'));
      res.json({ texto, subtitulos, idioma, motor: 'whisper.cpp', ubicacion: 'servidor-institucional' });
    } catch { res.status(422).json({ error: 'No se pudo transcribir este archivo con el motor local.' }); }
    finally { await rm(carpeta, { recursive: true, force: true }); }
  }));
}
