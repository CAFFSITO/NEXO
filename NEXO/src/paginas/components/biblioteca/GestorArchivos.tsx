import { useState } from "react";
import { enviar, useDatos } from "../../../servicios/api";
import { subirArchivo, urlDescarga } from "../../../servicios/archivos";
import Selector from "../shared/Selector";
import EstudioMultimedia from "../multimedia/EstudioMultimedia";

type Archivo = { id:string; nombre:string; tamanoBytes:number };
type Carpeta = { id:string; nombre:string; total:number };

/** Carpetas privadas de referencias: un archivo conserva su ID y sus usos en otros módulos. */
export default function GestorArchivos({direccion=false}:{direccion?:boolean}) {
  const [abierto,setAbierto]=useState(false);
  const [query,setQuery]=useState("");
  const [nombre,setNombre]=useState("");
  const [carpetaId,setCarpetaId]=useState("");
  const [error,setError]=useState("");
  const [subiendo,setSubiendo]=useState(false);
  const [cuotaMb,setCuotaMb]=useState("");
  const {datos: archivos,recargar:recargarArchivos}=useDatos<{archivos:Archivo[]}>(abierto?`/api/archivos/mis-archivos?q=${encodeURIComponent(query)}`:null);
  const {datos: carpetas,recargar:recargarCarpetas}=useDatos<{carpetas:Carpeta[]}>(abierto?'/api/archivos/carpetas':null);
  const {datos: carpeta,recargar:recargarCarpeta}=useDatos<{nombre:string;archivos:Archivo[]}>(abierto&&carpetaId?`/api/archivos/carpetas/${carpetaId}`:null);
  const {datos:cuota,recargar:recargarCuota}=useDatos<{limiteBytes:number|null;usadoBytes:number;reservadoBytes:number}>(abierto?'/api/archivos/cuota':null);
  const ejecutar=async(f:()=>Promise<unknown>)=>{try{setError("");await f();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}};
  return <section className="mt-10 rounded-xl border border-white/10 bg-surface-container p-4">
    <button type="button" className="font-bold" onClick={()=>setAbierto(!abierto)} aria-expanded={abierto}>Mis archivos y carpetas {abierto?'▴':'▾'}</button>
    {abierto&&<div className="mt-4 space-y-3 text-sm">
      <p className="text-on-surface-variant">Organizá los archivos que ya subiste desde tareas, recursos y otros espacios. Guardar en una carpeta no altera el archivo original.</p>
      {cuota&&<div className="rounded bg-background p-3 space-y-2"><p>Almacenamiento institucional: {(cuota.usadoBytes/1048576).toFixed(1)} MB usados{cuota.reservadoBytes?` · ${(cuota.reservadoBytes/1048576).toFixed(1)} MB en cargas pendientes`:''}{cuota.limiteBytes===null?' · sin cuota definida':` de ${(cuota.limiteBytes/1048576).toFixed(1)} MB`}</p>
        {direccion&&<div className="flex flex-wrap items-end gap-2"><label>Cuota en MB<input aria-label="Cuota institucional en MB" type="number" min="1" step="1" value={cuotaMb} onChange={e=>setCuotaMb(e.target.value)} className="ml-2 w-28 rounded bg-fondo p-2"/></label><button type="button" disabled={!Number.isSafeInteger(Number(cuotaMb))||Number(cuotaMb)<1} onClick={()=>void ejecutar(async()=>{await enviar('/api/archivos/cuota','PUT',{limiteBytes:Number(cuotaMb)*1048576});recargarCuota();})}>Guardar cuota</button><button type="button" onClick={()=>void ejecutar(async()=>{await enviar('/api/archivos/cuota','PUT',{limiteBytes:null});setCuotaMb('');recargarCuota();})}>Sin límite</button></div>}
      </div>}
      <details><summary className="cursor-pointer font-semibold">Crear audio o video privado</summary><EstudioMultimedia onArchivo={archivo=>void ejecutar(async()=>{setSubiendo(true);try{await subirArchivo(archivo);recargarArchivos();}finally{setSubiendo(false);}})} />{subiendo&&<p>Guardando grabación…</p>}</details>
      <div className="flex flex-wrap gap-2"><input aria-label="Buscar mis archivos" placeholder="Buscar archivos" value={query} onChange={e=>setQuery(e.target.value)} className="rounded bg-background p-2"/><Selector value={carpetaId} onChange={e=>setCarpetaId(e.target.value)}><option value="">Elegí una carpeta</option>{(carpetas?.carpetas??[]).map(c=><option key={c.id} value={c.id}>{c.nombre} ({c.total})</option>)}</Selector><input aria-label="Nombre de nueva carpeta" placeholder="Nueva carpeta" value={nombre} onChange={e=>setNombre(e.target.value)} className="rounded bg-background p-2"/><button type="button" disabled={!nombre.trim()} onClick={()=>void ejecutar(async()=>{const c=await enviar<{id:string}>('/api/archivos/carpetas','POST',{nombre});setNombre('');setCarpetaId(c.id);recargarCarpetas();})}>Crear carpeta</button></div>
      {error&&<p role="alert">{error}</p>}
      <div className="grid gap-2 md:grid-cols-2">{(archivos?.archivos??[]).map(a=><div key={a.id} className="flex items-center justify-between gap-2 rounded bg-background p-2"><a href={urlDescarga(a.id)}>{a.nombre}</a><button type="button" disabled={!carpetaId} onClick={()=>void ejecutar(async()=>{await enviar(`/api/archivos/carpetas/${carpetaId}/archivos/${a.id}`,'PUT');recargarCarpeta();recargarCarpetas();})}>Guardar en carpeta</button></div>)}</div>
      {carpetaId&&<div><h3 className="font-bold">{carpeta?.nombre}</h3>{(carpeta?.archivos??[]).map(a=><div key={a.id} className="flex justify-between gap-2"><a href={urlDescarga(a.id)}>{a.nombre}</a><button type="button" onClick={()=>void ejecutar(async()=>{await enviar(`/api/archivos/carpetas/${carpetaId}/archivos/${a.id}`,'DELETE');recargarCarpeta();recargarCarpetas();})}>Quitar referencia</button></div>)}</div>}
    </div>}
  </section>;
}
