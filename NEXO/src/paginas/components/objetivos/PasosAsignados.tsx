import { useState } from 'react';
import { enviar, useDatos } from '../../../servicios/api';
import { subirArchivo, urlDescarga } from '../../../servicios/archivos';

type Paso={id:string;titulo:string;metaTitulo:string;asignadoPor:string;venceEl:string;completada:boolean;evidencia:string;archivoId:string|null;dependeDeId:string|null};

function Tarjeta({paso,recargar}:{paso:Paso;recargar:()=>void}){
  const [texto,setTexto]=useState(paso.evidencia);
  const [ocupado,setOcupado]=useState(false);
  const [error,setError]=useState('');
  async function actualizar(cambios:{completada?:boolean;evidencia?:string;archivoId?:string|null}){
    setOcupado(true);setError('');
    try{await enviar(`/api/objetivos/pasos-asignados/${paso.id}/avance`,'PUT',cambios);recargar();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el paso.');}
    finally{setOcupado(false);}
  }
  async function adjuntar(archivo:File){setOcupado(true);setError('');try{const subido=await subirArchivo(archivo);await enviar(`/api/objetivos/pasos-asignados/${paso.id}/avance`,'PUT',{archivoId:subido.id});recargar();}catch(e){setError(e instanceof Error?e.message:'No se pudo adjuntar el archivo.');}finally{setOcupado(false);}}
  return <article className="rounded-xl border border-white/10 bg-fondo p-4 space-y-2 text-sm">
    <h3 className="font-semibold text-white">{paso.titulo}</h3><p className="text-white/60">{paso.metaTitulo} · asignado por {paso.asignadoPor} · hasta {paso.venceEl}</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={paso.completada} disabled={ocupado} onChange={e=>void actualizar({completada:e.target.checked})}/>Paso completado</label>
    <label className="block">Evidencia o resultado<textarea className="mt-1 block w-full rounded bg-white/5 p-2" maxLength={3000} value={texto} onChange={e=>setTexto(e.target.value)}/></label>
    <button type="button" disabled={ocupado||texto===paso.evidencia} className="text-primary disabled:opacity-40" onClick={()=>void actualizar({evidencia:texto})}>Guardar resultado</button>
    <label className="block">Adjuntar archivo<input type="file" disabled={ocupado} className="block mt-1" onChange={e=>{const archivo=e.target.files?.[0];if(archivo)void adjuntar(archivo);e.target.value='';}}/></label>
    {paso.archivoId&&<div className="flex gap-3"><a className="text-primary underline" href={urlDescarga(paso.archivoId)}>Descargar evidencia</a><button type="button" disabled={ocupado} className="text-rose-300" onClick={()=>void actualizar({archivoId:null})}>Quitar archivo</button></div>}
    {error&&<p role="alert" className="text-rose-300">{error}</p>}
  </article>;
}

export default function PasosAsignados(){
  const {datos,error,recargar}=useDatos<{pasos:Paso[]}>('/api/objetivos/pasos-asignados');
  return <section className="rounded-2xl border border-acento/20 bg-fondo p-6 space-y-3"><h2 className="text-lg font-bold text-white">Pasos que me asignaron</h2>
    <p className="text-sm text-white/60">Podés registrar avance y evidencia. La meta completa sigue en la cuenta de quien la creó.</p>
    {error&&<p role="alert" className="text-rose-300">{error}</p>}
    {datos?.pasos.length===0&&<p className="text-sm text-white/50">No tenés pasos asignados.</p>}
    {datos?.pasos.map(p=><Tarjeta key={p.id} paso={p} recargar={recargar}/>)}
  </section>;
}
