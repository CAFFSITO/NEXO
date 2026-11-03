import { useEffect, useState } from 'react';
import { useNavegacion } from '../../../navegacion';
import { enviar, pedir, useDatos } from '../../../servicios/api';

type Config = {origen:string;modelo:string;activa:number;version:number};
type Trabajo = {estado:string;modelo?:string;detalle?:string;total?:number;completado?:number};
export default function GestionModelosPrivados(){
  const {usuario}=useNavegacion();
  return usuario && ['admin-academico','administrador'].includes(usuario.rol) ? <Panel/> : null;
}
function Panel(){
  const {datos,error,recargar}=useDatos<Config>('/api/ia-privada/configuracion');
  return <section aria-label="Modelos privados de la institución" className="rounded-2xl border border-acento/20 bg-fondo p-6 space-y-3"><h2 className="text-lg font-bold text-white">IA privada de la institución</h2><p className="text-sm text-white/60">Elegí el servidor privado y el modelo que usarán las consultas institucionales. Cada persona puede elegir también el motor de su propio dispositivo.</p>{error&&<p role="alert">{error}</p>}{datos&&<Formulario key={datos.version} config={datos} recargar={recargar}/>}</section>;
}
function Formulario({config,recargar}:{config:Config;recargar:()=>void}){
  const [origen,setOrigen]=useState(config.origen),[modelo,setModelo]=useState(config.modelo),[activa,setActiva]=useState(!!config.activa);
  const [descargar,setDescargar]=useState(config.modelo),[trabajo,setTrabajo]=useState<Trabajo|null>(null),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
  useEffect(()=>{void pedir<Trabajo>('/api/ia-privada/descarga').then(setTrabajo).catch(()=>{});},[]);
  useEffect(()=>{if(trabajo?.estado!=='descargando')return;const t=window.setInterval(()=>void pedir<Trabajo>('/api/ia-privada/descarga').then(setTrabajo).catch(()=>setMensaje('No se pudo consultar el progreso.')),1500);return()=>window.clearInterval(t);},[trabajo?.estado]);
  const operar=async(accion:()=>Promise<void>)=>{setOcupado(true);setMensaje('');try{await accion();}catch(e){setMensaje((e as Error).message);}finally{setOcupado(false);}};
  return <div className="space-y-3 text-sm"><form className="space-y-2" onSubmit={e=>{e.preventDefault();void operar(async()=>{await enviar('/api/ia-privada/configuracion','PUT',{origen,modelo,activa,version:config.version});recargar();});}}>
    <label className="block">Origen del servidor privado<input aria-label="Origen IA privado" value={origen} onChange={e=>setOrigen(e.target.value)} maxLength={250} className="block w-full rounded bg-white/5 p-2" required/></label>
    <label className="block">Modelo institucional<input aria-label="Modelo IA institucional" value={modelo} onChange={e=>setModelo(e.target.value)} maxLength={120} className="block w-full rounded bg-white/5 p-2" required/></label>
    <label className="flex gap-2"><input type="checkbox" checked={activa} onChange={e=>setActiva(e.target.checked)}/>Habilitar consultas al servidor institucional</label><button type="submit" disabled={ocupado} className="text-primary">Guardar configuración privada</button>
  </form><hr className="border-white/10"/><p>Instalar un modelo descarga sus archivos al servidor elegido y consume almacenamiento y conexión. Se envía únicamente el nombre del modelo; las conversaciones y fuentes educativas no participan de esa descarga.</p>
    <label className="block">Modelo para instalar<input aria-label="Modelo para instalar" value={descargar} onChange={e=>setDescargar(e.target.value)} maxLength={120} className="block w-full rounded bg-white/5 p-2"/></label>
    <button type="button" disabled={ocupado||trabajo?.estado==='descargando'} onClick={()=>void operar(async()=>{const r=await enviar<Trabajo>('/api/ia-privada/descarga','POST',{modelo:descargar});setTrabajo(r);})} className="text-primary">Instalar modelo local en servidor</button>
    {trabajo&&trabajo.estado!=='sin-descarga'&&<div role="status"><p>{trabajo.modelo} · {trabajo.estado} · {trabajo.detalle}</p>{!!trabajo.total&&<><progress max={trabajo.total} value={trabajo.completado??0}/><span> {Math.round((trabajo.completado??0)*100/trabajo.total)}%</span></>}{trabajo.estado==='descargando'&&<button type="button" onClick={()=>void operar(async()=>{await enviar('/api/ia-privada/descarga/cancelar','POST',{});setTrabajo(await pedir('/api/ia-privada/descarga'));})}>Cancelar descarga</button>}</div>}
    {mensaje&&<p role="status">{mensaje}</p>}
  </div>;
}
