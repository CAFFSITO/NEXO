import { enviar } from './api';
import type { FuenteIa } from './asistenciaIa';

const ORIGEN = 'http://127.0.0.1:11434';
type Mensaje = { role:'user'|'assistant'; content:string };
type Contexto = { instruccion:string; fuentes:{numero:number;tipo:string;id:number;titulo:string;texto:string}[] };

function modeloAdmitido(nombre:string){
  return nombre.length<=120 && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(nombre) && !/(?:^|[:/-])cloud(?:$|[:/-])/i.test(nombre);
}

export async function modelosEnDispositivo(signal?:AbortSignal):Promise<string[]>{
  const r=await fetch(`${ORIGEN}/api/tags`,{signal,redirect:'error',credentials:'omit',cache:'no-store'});
  if(!r.ok)throw new Error('Ollama del dispositivo no respondió.');
  const datos=await r.json() as {models?:{name?:string}[]};
  return [...new Set((datos.models||[]).map(m=>m.name||'').filter(modeloAdmitido))];
}

export async function responderEnDispositivo(contenido:string,modelo:string,fuentes:FuenteIa[],historial:Mensaje[],signal:AbortSignal):Promise<string>{
  if(!modeloAdmitido(modelo))throw new Error('Elegí un modelo local válido.');
  const contexto=await enviar<Contexto>('/api/asistencia-ia/contexto-dispositivo','POST',{fuentes});
  if(signal.aborted)throw new DOMException('Cancelado','AbortError');
  const datosFuentes=contexto.fuentes.map(f=>`[${f.numero}] ${f.tipo} #${f.id}: ${f.texto}`).join('\n');
  const r=await fetch(`${ORIGEN}/api/chat`,{method:'POST',signal,redirect:'error',credentials:'omit',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({model:modelo,stream:false,
      messages:[{role:'system',content:`${contexto.instruccion}\nFuentes habilitadas:\n${datosFuentes||'Ninguna.'}`},
        ...historial.slice(-20),{role:'user',content:contenido}]})});
  if(!r.ok)throw new Error(`Ollama del dispositivo respondió ${r.status}.`);
  const texto=String((await r.json() as {message?:{content?:string}}).message?.content||'').trim();
  if(!texto)throw new Error('El modelo local devolvió una respuesta vacía.');
  return texto;
}
