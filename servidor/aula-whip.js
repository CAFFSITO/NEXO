import express from 'express';
import { randomUUID } from 'node:crypto';
import { ventanilla } from './comun.js';

/** Sesiones WHIP privadas: el navegador nunca puede elegir el destino del proxy. */
export function registrarAulaWhip(app,{origen,habilitada,accesoAClase,ruta,token,claseConCatedra}) {
  const sesiones=new Map(),ocupadas=new Set();
  const terminar=async(id)=>{
    const s=sesiones.get(id);if(!s)return;
    try{await fetch(s.destino,{method:'DELETE',redirect:'error',signal:AbortSignal.timeout(5000),headers:{Authorization:`Bearer ${s.token}`}});}
    catch{/* La sesión remota también termina por timeout ICE al cerrar el navegador. */}
    finally{sesiones.delete(id);}
  };
  app.post('/api/aula/clases/:id/transmision/whip',express.text({type:'application/sdp',limit:'256kb'}),ventanilla(async(req,res)=>{
    const a=accesoAClase(req,res,req.params.id);if(!a)return;
    if(!a.esDocente)return res.status(403).json({error:'Sólo el docente de la clase puede publicar.'});
    if(!habilitada||!origen||a.clase.estado!=='en-vivo')return res.status(503).json({error:'La publicación desde navegador no está disponible para esta clase.'});
    if(typeof req.body!=='string'||!req.body.startsWith('v=0')||!req.body.includes('\nm='))return res.status(400).json({error:'Se necesita una oferta SDP válida.'});
    if(ocupadas.has(a.clase.id)||[...sesiones.values()].some(s=>s.claseId===a.clase.id))return res.status(409).json({error:'Ya hay una publicación de navegador en esta clase. Detenela antes de iniciar otra.'});
    ocupadas.add(a.clase.id);
    const credencial=token(a.clase,a.usuario,'publish',120),base=`/${ruta(a.clase)}/whip`;
    let destino=null;
    try{
      const r=await fetch(origen+base,{method:'POST',headers:{'Content-Type':'application/sdp',Authorization:`Bearer ${credencial}`},body:req.body,redirect:'error',signal:AbortSignal.timeout(15000)});
      if(r.status!==201||!r.body||!/^application\/sdp(?:;|$)/i.test(r.headers.get('content-type')||''))throw new Error('Respuesta de negociación no válida.');
      const location=r.headers.get('location');if(!location)throw new Error('El servidor no confirmó la sesión.');
      const ubicacion=new URL(location,origen+base);
      if(ubicacion.origin!==origen||!ubicacion.pathname.startsWith(base+'/')||!/^[a-zA-Z0-9_-]{1,150}$/.test(ubicacion.pathname.slice(base.length+1))||ubicacion.username||ubicacion.password||ubicacion.hash||ubicacion.search)throw new Error('El servidor devolvió una sesión fuera de la ruta permitida.');
      destino=ubicacion.toString();
      const lector=r.body.getReader(),partes=[];let bytes=0;
      while(true){const {done,value}=await lector.read();if(done)break;bytes+=value.length;if(bytes>256*1024){await lector.cancel();throw new Error('La respuesta SDP supera el límite.');}partes.push(Buffer.from(value));}
      const respuesta=Buffer.concat(partes).toString('utf8');if(!respuesta.startsWith('v=0')||!respuesta.includes('\nm='))throw new Error('Respuesta SDP inválida.');
      const sid=randomUUID();sesiones.set(sid,{claseId:a.clase.id,usuarioId:a.usuario.id,destino,token:credencial,vence:Date.now()+120*60000});
      res.set({'Cache-Control':'no-store',Location:`/api/aula/clases/${a.clase.id}/transmision/whip/${sid}`}).status(201).type('application/sdp').send(respuesta);
    }catch{
      if(destino)try{await fetch(destino,{method:'DELETE',redirect:'error',signal:AbortSignal.timeout(3000),headers:{Authorization:`Bearer ${credencial}`}});}catch{/* limpieza best effort */}
      res.status(502).json({error:'No se pudo negociar la publicación con el servidor institucional.'});
    }finally{ocupadas.delete(a.clase.id);}
  }));
  app.delete('/api/aula/clases/:id/transmision/whip/:sesion',ventanilla(async(req,res)=>{
    const a=accesoAClase(req,res,req.params.id);if(!a)return;
    const s=sesiones.get(req.params.sesion);
    if(!a.esDocente||!s||s.claseId!==a.clase.id||s.usuarioId!==a.usuario.id)return res.status(404).json({error:'Sesión de publicación no disponible.'});
    await terminar(req.params.sesion);res.sendStatus(204);
  }));
  const reloj=setInterval(()=>{
    for(const [sid,s]of sesiones){const c=claseConCatedra.get(s.claseId);if(!c||c.estado!=='en-vivo'||Date.now()>s.vence)void terminar(sid);}
  },15000);reloj.unref();
  return {cerrarClase:claseId=>Promise.all([...sesiones.entries()].filter(([,s])=>s.claseId===claseId).map(([sid])=>terminar(sid)))};
}
