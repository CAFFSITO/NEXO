import { useEffect, useMemo, useRef, useState } from "react";
import { enviar, useDatos } from "../../../servicios/api";
import { useNavegacion } from "../../../navegacion";
import { subirArchivo, urlPreview, urlDescarga } from "../../../servicios/archivos";
import EstudioMultimedia, { type Subtitulo } from "../multimedia/EstudioMultimedia";
type Capitulo = {segundo:number;titulo:string};
const tiempoVtt=(s:number)=>{const total=Math.round(s*1000),h=Math.floor(total/3600000),m=Math.floor(total%3600000/60000),seg=Math.floor(total%60000/1000),ms=total%1000;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(seg).padStart(2,"0")}.${String(ms).padStart(3,"0")}`};
export function ReproductorLeccion({id,tipo,capitulos,subtitulos}:{id:string;tipo:string|null;capitulos:Capitulo[];subtitulos:Subtitulo[]}){
  const audio=!!tipo?.startsWith('audio/');
  const [segmentosVisibles,setSegmentosVisibles]=useState(100);
  const medio=useRef<HTMLMediaElement>(null);
  const vtt=useMemo(()=>subtitulos.length?URL.createObjectURL(new Blob([`WEBVTT\n\n${subtitulos.map(s=>`${tiempoVtt(s.inicio)} --> ${tiempoVtt(s.fin)}\n${s.texto.replace(/-->/g,"→")}\n`).join("\n")}`],{type:"text/vtt"})):"",[subtitulos]);
  useEffect(()=>()=>{if(vtt)URL.revokeObjectURL(vtt)},[vtt]);
  const saltar=(segundo:number)=>{if(medio.current){medio.current.currentTime=segundo;void medio.current.play();}};
  if(tipo==='application/pdf')return <div className="space-y-2"><iframe title="PDF de la lección" src={urlPreview(id)} className="w-full h-[32rem] rounded border border-white/15"/><a href={urlDescarga(id)} className="text-primary underline">Descargar PDF</a></div>;
  if(tipo?.startsWith('image/'))return <div><img src={urlPreview(id)} alt="Material de la lección" className="max-w-full max-h-96 rounded"/><a href={urlDescarga(id)} className="text-primary underline">Descargar imagen</a></div>;
  if(!audio&&!tipo?.startsWith('video/'))return <a href={urlDescarga(id)} className="text-primary underline">Descargar archivo de la lección</a>;
  return <div className="space-y-2">{audio?<audio ref={medio as React.RefObject<HTMLAudioElement>} controls preload="metadata" src={urlPreview(id)} />:<video ref={medio as React.RefObject<HTMLVideoElement>} controls preload="metadata" className="w-full max-w-xl rounded-lg" src={urlPreview(id)}>{vtt&&<track kind="subtitles" label="Español" srcLang="es" src={vtt} default />}</video>}
    {audio&&subtitulos.length>0&&<details className="text-sm"><summary>Transcripción sincronizada</summary><div className="max-h-48 overflow-auto">{subtitulos.slice(0,segmentosVisibles).map((s,i)=><button type="button" key={i} className="block text-left text-primary" onClick={()=>saltar(s.inicio)}>{tiempoVtt(s.inicio)} · {s.texto}</button>)}</div>{segmentosVisibles<subtitulos.length&&<button type="button" className="text-primary" onClick={()=>setSegmentosVisibles(x=>x+100)}>Mostrar 100 segmentos más</button>}</details>}
    {capitulos.length>0&&<nav aria-label="Capítulos de la lección" className="flex flex-wrap gap-2">{capitulos.map((c,i)=><button key={`${c.segundo}-${i}`} type="button" className="rounded bg-white/10 px-2 py-1 text-xs text-primary" onClick={()=>saltar(c.segundo)}>{Math.floor(c.segundo/60)}:{String(c.segundo%60).padStart(2,'0')} · {c.titulo}</button>)}</nav>}
  </div>;
}

export function GrabacionLeccion({archivoId,alGuardar,alEstado}:{archivoId:string;alGuardar:(id:string,capitulos:Capitulo[],subtitulos:Subtitulo[])=>void;alEstado:(estado:boolean)=>void}) {
  const [subiendo,setSubiendo]=useState(false);
  const [error,setError]=useState("");
  const guardar=async(archivo:File,capitulos:Capitulo[],subtitulos:Subtitulo[])=>{setSubiendo(true);alEstado(true);setError("");try{const subido=await subirArchivo(archivo);alGuardar(subido.id,capitulos,subtitulos)}catch(e){setError(e instanceof Error?e.message:"No se pudo subir la grabación.")}finally{setSubiendo(false);alEstado(false)}};
  return <div className="space-y-2"><label className="block text-sm">Subir video, audio, PDF u otro archivo<input aria-label="Archivo de la lección" type="file" disabled={subiendo} className="block w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(f)void guardar(f,[],[]);e.target.value='';}}/></label><EstudioMultimedia onArchivo={(archivo,capitulos,subtitulos)=>void guardar(archivo,capitulos,subtitulos)} />{subiendo&&<p>Subiendo archivo…</p>}{archivoId&&<p>Archivo vinculado ✓ <button type="button" className="text-primary" onClick={()=>alGuardar("",[],[])}>Quitar</button></p>}{error&&<p role="alert">{error}</p>}</div>;
}

export function EvaluacionesLeccion({url}:{url:string}) {
  const [abierto,setAbierto]=useState(false);
  const [error,setError]=useState("");
  const {datos,recargar}=useDatos<{alumnos:{id:string;nombre:string;vistoEn:string|null;realizadoEn:string|null;evaluadoEn:string|null;actividades:{id:string;titulo:string;completada:boolean;evidencia:string;nota:number|null;devolucion:string}[]}[]}>(abierto?`${url}/progresos`:null);
  const evaluar=async(id:string)=>{setError("");try{await enviar(`${url}/progresos/${id}/evaluar`,"POST",{});recargar()}catch(e){setError(e instanceof Error?e.message:"No se pudo evaluar.")}};
  return <div className="text-sm"><button type="button" className="text-primary" onClick={()=>setAbierto(!abierto)}>{abierto?"Ocultar seguimiento":"Ver seguimiento"}</button>{abierto&&<div className="mt-2 space-y-2">{datos?.alumnos.map(a=><div key={a.id} className="rounded bg-white/5 p-2"><div className="flex flex-wrap items-center gap-2"><span>{a.nombre}</span><span className="text-slate-400">{a.evaluadoEn?"Evaluada":a.realizadoEn?"Realizada":a.vistoEn?"Vista":"Pendiente"}</span>{a.realizadoEn&&!a.evaluadoEn&&<button type="button" className="text-primary" onClick={()=>void evaluar(a.id)}>Marcar evaluada</button>}</div>{a.actividades?.map(x=><div key={x.id} className="mt-1 pl-3 text-xs text-slate-300"><p>{x.completada?'✓':'○'} {x.titulo}{x.nota!=null?` · Nota ${x.nota}`:''}</p>{x.evidencia&&<p className="whitespace-pre-wrap">Evidencia: {x.evidencia}</p>}{x.devolucion&&<p>Devolución: {x.devolucion}</p>}</div>)}</div>)}{error&&<p role="alert">{error}</p>}</div>}</div>;
}

export function PracticasLeccion({leccionId,editable}:{leccionId:string;editable:boolean}) {
  const {navegar}=useNavegacion();
  const [abierto,setAbierto]=useState(false);
  const {datos,error}=useDatos<{practicas:{id:string;titulo:string;metodo:string;intentos:number;siguienteEl:string|null}[]}>(abierto?`/api/estudio/lecciones/${leccionId}/practicas`:null);
  return <div className="text-sm"><button type="button" className="text-primary" onClick={()=>setAbierto(!abierto)}>{abierto?"Ocultar prácticas":"Ver prácticas de estudio"}</button>{abierto&&<div className="mt-2 space-y-2">{editable&&<button type="button" className="block text-primary" onClick={()=>navegar(`/estudio/metodos?leccion=${leccionId}`)}>+ Crear práctica vinculada</button>}{datos?.practicas.map(p=><button type="button" key={p.id} className="block rounded-lg bg-white/5 p-2 text-left text-primary" onClick={()=>navegar(`/estudio/metodos?practica=${p.id}`)}>{p.titulo} · {p.metodo}{p.siguienteEl?` · próximo repaso ${p.siguienteEl}`:""}</button>)}{datos&&!datos.practicas.length&&<p className="text-slate-400">Aún no hay prácticas vinculadas.</p>}{error&&<p role="alert">{error}</p>}</div>}</div>;
}
