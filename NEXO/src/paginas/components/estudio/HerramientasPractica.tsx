import { useEffect, useState } from 'react';
import { enviar, useDatos } from '../../../servicios/api';
import Selector from '../shared/Selector';

type Vinculo={de:number;a:number;relacion:string};
type Memoria={concepto:number;intentos:number;calidad:number;siguienteEl:string};
type Evaluacion={concepto:number;logrado:number;criterio:string;devolucion:string};
export type DetalleAmpliado={
  practica:{metodo:string;banco:{concepto:string;definicion:string}[];puedeEvaluar:boolean};
  actividad:{numero:number;motivo:string;apoyo:null|{definicion:string;ejemplo:string}};
  memoria:Memoria[];mapa:{version:number;vinculos:Vinculo[]};agenda:{eventoId:number}|null;evaluaciones:Evaluacion[];
};
const campo='w-full rounded-lg bg-fondo border border-white/15 p-2 text-white';
const boton='rounded-lg bg-primary/20 px-3 py-2 disabled:opacity-40';
export default function HerramientasPractica({id,detalle,recargar,usuarioId}:{id:string;detalle:DetalleAmpliado;recargar:()=>void;usuarioId:number}){
  return <div className="space-y-4">
    {detalle.memoria.length>0&&<details><summary>Memoria por concepto y devoluciones</summary><p className="text-xs text-slate-400">La facilidad es autoevaluada; las valoraciones docentes se muestran aparte.</p><ul className="space-y-2">{detalle.memoria.map(m=><li key={m.concepto} className="rounded bg-white/5 p-2 text-sm"><strong>{detalle.practica.banco[m.concepto]?.concepto}</strong> · {m.intentos} intentos · facilidad declarada {m.calidad}/3 · repaso {m.siguienteEl}{detalle.evaluaciones.filter(e=>e.concepto===m.concepto).map(e=><p key={e.concepto} className="text-primary">Docente: {e.logrado?'criterio logrado':'para mejorar'} · {e.criterio}. {e.devolucion}</p>)}</li>)}</ul></details>}
    {detalle.practica.metodo==='conexiones'&&<EditorMapa id={id} banco={detalle.practica.banco} inicial={detalle.mapa} recargar={recargar}/>}
    {detalle.practica.metodo==='cooperativa'&&<Cooperativa id={id} usuarioId={usuarioId}/>}
    {detalle.practica.puedeEvaluar&&<PanelDocente id={id} banco={detalle.practica.banco}/>}
  </div>;
}

function EditorMapa({id,banco,inicial,recargar}:{id:string;banco:{concepto:string}[];inicial:{version:number;vinculos:Vinculo[]};recargar:()=>void}){
  const [vinculos,setVinculos]=useState(inicial.vinculos);
  const [de,setDe]=useState('0'),[a,setA]=useState(banco.length>1?'1':'0'),[relacion,setRelacion]=useState('');
  const [aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false);
  const punto=(i:number)=>({x:300+220*Math.cos(i*2*Math.PI/banco.length),y:180+125*Math.sin(i*2*Math.PI/banco.length)});
  const guardar=async()=>{setOcupado(true);try{await enviar(`/api/estudio/practicas/${id}/mapa`,'PUT',{version:inicial.version,vinculos});recargar();}catch(e){setAviso((e as Error).message);}finally{setOcupado(false);}};
  return <section className="rounded-xl border border-white/15 p-3 space-y-3" aria-label="Mapa conceptual"><h3 className="font-bold">Construí y justificá tus conexiones</h3>
    <svg viewBox="0 0 600 360" role="img" aria-label="Red de conceptos conectados" className="w-full max-h-96"><defs><marker id={`flecha-${id}`} markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="currentColor"/></marker></defs>{vinculos.map((v,i)=>{const p=punto(v.de),q=punto(v.a);return <g key={i}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="currentColor" markerEnd={`url(#flecha-${id})`} opacity=".6"/><title>{banco[v.de]?.concepto} {v.relacion} {banco[v.a]?.concepto}</title><text x={(p.x+q.x)/2} y={(p.y+q.y)/2-8} textAnchor="middle" fill="currentColor" fontSize="10">{v.relacion.slice(0,35)}</text></g>;})}{banco.map((b,i)=>{const p=punto(i);return <g key={i}><circle cx={p.x} cy={p.y} r="23" fill="#463254"/><text x={p.x} y={p.y+4} textAnchor="middle" fill="white" fontSize="10">{b.concepto.slice(0,22)}</text></g>;})}</svg>
    <div className="grid gap-2 sm:grid-cols-2"><label>Desde<Selector className={campo} value={de} onChange={e=>setDe(e.target.value)}>{banco.map((b,i)=><option key={i} value={i}>{b.concepto}</option>)}</Selector></label><label>Hacia<Selector className={campo} value={a} onChange={e=>setA(e.target.value)}>{banco.map((b,i)=><option key={i} value={i}>{b.concepto}</option>)}</Selector></label></div>
    <input className={campo} aria-label="Justificación de la conexión" maxLength={300} value={relacion} onChange={e=>setRelacion(e.target.value)} placeholder="Cómo y por qué se relacionan"/>
    <button type="button" className={boton} disabled={de===a||!relacion.trim()||vinculos.length>=500} onClick={()=>{setVinculos(v=>[...v,{de:Number(de),a:Number(a),relacion:relacion.trim()}]);setRelacion('');}}>Agregar conexión</button>
    <ul className="text-sm space-y-1">{vinculos.map((v,i)=><li key={i}>{banco[v.de]?.concepto} → {banco[v.a]?.concepto}: {v.relacion} <button type="button" onClick={()=>setVinculos(x=>x.filter((_,n)=>n!==i))} className="text-rose-300">Quitar</button></li>)}</ul>
    <button type="button" className={boton} disabled={ocupado} onClick={()=>void guardar()}>Guardar mapa</button>{aviso&&<p role="alert">{aviso}</p>}
  </section>;
}

type Sesion={id:string;creadorId:number;cerrada:boolean;version:number;turno:{ronda:number;fase:string;usuarioId:number};participantes:{id:number;nombre:string}[];aportes:{id:number;nombre:string;fase:string;contenido:string}[]};
function Cooperativa({id,usuarioId}:{id:string;usuarioId:number}){
  const personas=useDatos<{personas:{id:number;nombre:string}[]}>('/api/estudio/participantes');
  const sesiones=useDatos<{sesiones:{id:number;cerrada:number}[]}>(`/api/estudio/practicas/${id}/sesiones`);
  const [elegidos,setElegidos]=useState<number[]>([]),[sesionId,setSesionId]=useState<string|null>(null),[contenido,setContenido]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
  const sesion=useDatos<Sesion>(sesionId?`/api/estudio/practicas/${id}/sesiones/${sesionId}`:null);
  const refrescar=sesion.recargar;
  useEffect(()=>{if(!sesionId)return;const reloj=window.setInterval(refrescar,5000);return()=>window.clearInterval(reloj);},[sesionId,refrescar]);
  const crear=async()=>{setOcupado(true);try{const r=await enviar<{id:string}>(`/api/estudio/practicas/${id}/sesiones`,'POST',{participantes:elegidos});setSesionId(r.id);sesiones.recargar();setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const aportar=async()=>{if(!sesionId||!sesion.datos)return;setOcupado(true);try{await enviar(`/api/estudio/practicas/${id}/sesiones/${sesionId}/aportes`,'POST',{contenido,version:sesion.datos.version});setContenido('');sesion.recargar();setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const cerrar=async()=>{if(!sesionId)return;setOcupado(true);try{await enviar(`/api/estudio/practicas/${id}/sesiones/${sesionId}/cerrar`,'PUT',{});sesion.recargar();sesiones.recargar();}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  return <section className="rounded-xl border border-white/15 p-3 space-y-3" aria-label="Trabajo cooperativo"><h3 className="font-bold">Explicar, preguntar y revisar en equipo</h3><p className="text-sm text-slate-300">Una persona explica; la siguiente pregunta o devuelve; quien explicó revisa su respuesta. En la siguiente ronda cambian los roles. La práctica debe estar compartida.</p>
    <details><summary>Crear sesión con participantes</summary><div className="max-h-48 overflow-y-auto">{personas.datos?.personas.filter(p=>p.id!==usuarioId).map(p=><label key={p.id} className="flex gap-2"><input type="checkbox" checked={elegidos.includes(p.id)} onChange={e=>setElegidos(v=>e.target.checked?[...v,p.id]:v.filter(x=>x!==p.id))}/>{p.nombre}</label>)}</div><button type="button" className={boton} disabled={ocupado||!elegidos.length} onClick={()=>void crear()}>Crear sesión</button></details>
    <div className="flex flex-wrap gap-2">{sesiones.datos?.sesiones.map(s=><button type="button" key={s.id} className={boton} onClick={()=>setSesionId(String(s.id))}>Sesión {s.id}{s.cerrada?' · cerrada':''}</button>)}<button type="button" className={boton} onClick={()=>{sesiones.recargar();sesion.recargar();}}>Actualizar sesiones y aportes</button></div>
    {sesion.datos&&<><p>Ronda {sesion.datos.turno.ronda} · {sesion.datos.turno.fase} · turno de {sesion.datos.participantes.find(p=>p.id===sesion.datos?.turno.usuarioId)?.nombre}</p><ol className="space-y-2">{sesion.datos.aportes.map(ap=><li key={ap.id} className="rounded bg-white/5 p-2"><strong>{ap.nombre} · {ap.fase}</strong><p className="whitespace-pre-wrap">{ap.contenido}</p></li>)}</ol>{!sesion.datos.cerrada&&<><textarea className={campo} aria-label="Mi aporte cooperativo" maxLength={5000} value={contenido} onChange={e=>setContenido(e.target.value)} disabled={sesion.datos.turno.usuarioId!==usuarioId||ocupado}/><button type="button" className={boton} disabled={ocupado||sesion.datos.turno.usuarioId!==usuarioId||!contenido.trim()} onClick={()=>void aportar()}>Enviar aporte de mi turno</button></>}</>}
    {sesion.datos?.creadorId===usuarioId&&!sesion.datos.cerrada&&<button type="button" className={boton} disabled={ocupado} onClick={()=>void cerrar()}>Cerrar sesión cooperativa</button>}
    {(error||sesion.error)&&<p role="alert" className="text-rose-300">{error||sesion.error}</p>}
  </section>;
}

type Alumno={id:number;nombre:string;memoria:Memoria[];intentos:{numero:number;respuesta:string;calidad:number;conceptos:number[]}[];evaluaciones:Evaluacion[]};
function PanelDocente({id,banco}:{id:string;banco:{concepto:string}[]}){
  const panel=useDatos<{alumnos:Alumno[];aviso:string}>(`/api/estudio/practicas/${id}/panel`);
  const [alumno,setAlumno]=useState(''),[concepto,setConcepto]=useState('0'),[criterio,setCriterio]=useState(''),[devolucion,setDevolucion]=useState(''),[logrado,setLogrado]=useState(false),[mensaje,setMensaje]=useState('');
  const guardar=async()=>{try{await enviar(`/api/estudio/practicas/${id}/evaluaciones`,'PUT',{usuarioId:Number(alumno),concepto:Number(concepto),criterio,devolucion,logrado});panel.recargar();setMensaje('Valoración y devolución guardadas.');}catch(e){setMensaje((e as Error).message);}};
  return <details className="rounded-xl border border-white/15 p-3"><summary>Seguimiento docente de esta práctica</summary><p className="text-sm text-amber-200">{panel.datos?.aviso}</p><button type="button" className={boton} onClick={panel.recargar}>Actualizar tablero</button>
    {panel.datos?.alumnos.map(a=><article key={a.id} className="my-3 rounded bg-white/5 p-3"><h4 className="font-bold">{a.nombre}</h4><ul className="text-xs">{a.memoria.map(m=><li key={m.concepto}>{banco[m.concepto]?.concepto}: {m.intentos} intentos · autoevaluación {m.calidad}/3 · repaso {m.siguienteEl}</li>)}</ul><details><summary>Leer evidencias escritas</summary>{a.intentos.map(i=><p key={i.numero} className="my-2 text-sm whitespace-pre-wrap">Intento {i.numero+1} · {i.conceptos.map(c=>banco[c]?.concepto).join(', ')}: {i.respuesta}</p>)}</details>{a.evaluaciones.map(e=><p key={e.concepto} className="text-sm text-primary">Valoración docente de {banco[e.concepto]?.concepto}: {e.logrado?'logrado':'para mejorar'} · {e.criterio} · {e.devolucion}</p>)}</article>)}
    <div className="space-y-2"><label>Participante<Selector className={campo} value={alumno} onChange={e=>setAlumno(e.target.value)}><option value="">Elegí una persona</option>{panel.datos?.alumnos.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</Selector></label><label>Concepto<Selector className={campo} value={concepto} onChange={e=>setConcepto(e.target.value)}>{banco.map((b,i)=><option key={i} value={i}>{b.concepto}</option>)}</Selector></label><input className={campo} aria-label="Criterio docente" maxLength={1000} value={criterio} onChange={e=>setCriterio(e.target.value)} placeholder="Qué evidencia requiere este criterio"/><textarea className={campo} aria-label="Devolución docente de estudio" maxLength={3000} value={devolucion} onChange={e=>setDevolucion(e.target.value)} placeholder="Qué funcionó y qué mejorar en el próximo intento"/><label className="flex gap-2"><input type="checkbox" checked={logrado} onChange={e=>setLogrado(e.target.checked)}/>El criterio está logrado según la evidencia revisada</label><button type="button" className={boton} disabled={!alumno||!criterio.trim()||!devolucion.trim()} onClick={()=>void guardar()}>Guardar valoración docente</button></div>{(mensaje||panel.error)&&<p role="status">{mensaje||panel.error}</p>}
  </details>;
}
