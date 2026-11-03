import { useState } from "react";
import { enviar, useDatos } from "../../../servicios/api";
import { useNavegacion } from "../../../navegacion";
import Selector from "../shared/Selector";
import ModalDetalleTarea from "../shared/tareas/ModalDetalleTarea";
import { EvaluacionesLeccion, GrabacionLeccion, PracticasLeccion, ReproductorLeccion } from "./MediosLeccion";
import type { Subtitulo } from "../multimedia/EstudioMultimedia";

type Tipo = "modulo" | "seccion" | "leccion";
type Capitulo = { segundo:number; titulo:string };
interface Actividad { id:string|null; titulo:string; tareaId:string|null; obligatoria:boolean; completada?:boolean; evidencia?:string; entregaId?:string|null; nota?:number|null; devolucion?:string; tareaDisponible?:boolean }
interface Nodo { id:string; padreId:string|null; tipo:Tipo; titulo:string; descripcion:string; orden:number; documentoId:string|null; archivoId:string|null; archivoTipo:string|null; capitulos:Capitulo[]; subtitulos:Subtitulo[]; accionables:string[]; actividades:Actividad[]; disponibleDesde:string|null; prerrequisitoId:string|null; publicado:boolean; version:number; progreso:{ vistoEn:string|null; realizadoEn:string|null; evaluadoEn:string|null }|null }
interface Datos { nodos:Nodo[]; editable:boolean }

export default function LeccionesMateria({ catedraId }: { catedraId:string }) {
  const url=`/api/catedras/${catedraId}/lecciones`;
  const { datos, cargando, error, recargar }=useDatos<Datos>(catedraId?url:null);
  const { datos: documentos }=useDatos<{documentos:{id:string;titulo:string;publicado:boolean}[]}>(datos?.editable?"/api/documentos":null);
  const { datos: vinculos }=useDatos<{tareas:{id:string;titulo:string}[];catedras:{id:string;titulo:string}[]}>(datos?.editable?`${url}/vinculos`:null);
  const { navegar }=useNavegacion();
  const [editor,setEditor]=useState<{tipo:Tipo;padreId:string|null;nodo:Nodo|null}|null>(null);
  const [titulo,setTitulo]=useState(""); const [descripcion,setDescripcion]=useState("");
  const [padreId,setPadreId]=useState(""); const [documentoId,setDocumentoId]=useState(""); const [archivoId,setArchivoId]=useState("");
  const [capitulos,setCapitulos]=useState<Capitulo[]>([]); const [subtitulos,setSubtitulos]=useState<Subtitulo[]>([]);
  const [actividades,setActividades]=useState<Actividad[]>([]); const [fecha,setFecha]=useState(""); const [prerrequisito,setPrerrequisito]=useState("");
  const [accionesPegadas,setAccionesPegadas]=useState("");
  const [guardando,setGuardando]=useState(false); const [subiendo,setSubiendo]=useState(false); const [fallo,setFallo]=useState(""); const [aviso,setAviso]=useState("");
  const [destinoCopia,setDestinoCopia]=useState(""); const [arrastre,setArrastre]=useState<string|null>(null); const [tareaAbierta,setTareaAbierta]=useState<string|null>(null);
  const nodos=(datos?.nodos??[]).map(n=>({...n,actividades:n.actividades??n.accionables.map(titulo=>({id:null,titulo,tareaId:null,obligatoria:false}))}));
  function esDescendiente(candidato:Nodo,ancestro:string){const vistos=new Set<string>();let cursor:Nodo|undefined=candidato;while(cursor){if(cursor.id===ancestro)return true;if(vistos.has(cursor.id))return true;vistos.add(cursor.id);cursor=nodos.find(x=>x.id===cursor?.padreId);}return false;}
  function abrir(tipo:Tipo,padre:string|null,n:Nodo|null=null){
    setEditor({tipo,padreId:padre,nodo:n});setTitulo(n?.titulo??"");setDescripcion(n?.descripcion??"");setPadreId(padre??"");setDocumentoId(n?.documentoId??"");setArchivoId(n?.archivoId??"");setCapitulos(n?.capitulos??[]);setSubtitulos(n?.subtitulos??[]);setActividades(n?.actividades??[]);
    if(n?.disponibleDesde){const d=new Date(n.disponibleDesde);setFecha(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));}else setFecha("");
    setPrerrequisito(n?.prerrequisitoId??"");setAccionesPegadas("");setFallo("");
  }
  async function operar(accion:()=>Promise<unknown>){setGuardando(true);setFallo("");try{await accion();recargar();}catch(e){setFallo(e instanceof Error?e.message:"No se pudo guardar.");}finally{setGuardando(false);}}
  async function guardar(e:React.FormEvent){e.preventDefault();if(!editor||guardando||subiendo)return;await operar(async()=>{
    await enviar(editor.nodo?`${url}/${editor.nodo.id}`:url,editor.nodo?"PUT":"POST",{tipo:editor.tipo,padreId:padreId||null,titulo,descripcion,documentoId:documentoId||null,archivoId:archivoId||null,capitulos:archivoId?capitulos:[],subtitulos:archivoId?subtitulos:[],accionables:actividades.map(a=>a.titulo),actividades,disponibleDesde:fecha?new Date(fecha).toISOString():null,prerrequisitoId:prerrequisito||null,publicado:editor.nodo?.publicado??false,...(editor.nodo?{version:editor.nodo.version,orden:editor.nodo.orden}:{})});setEditor(null);
  });}
  const publicar=(n:Nodo)=>operar(()=>enviar(`${url}/${n.id}`,"PUT",{...n,publicado:!n.publicado}));
  const mover=(n:Nodo,direccion:number)=>operar(()=>enviar(`${url}/${n.id}/mover`,"POST",{direccion,version:n.version}));
  const trasladar=(n:Nodo,padre:string|null,antesDeId:string|null=null)=>operar(()=>enviar(`${url}/${n.id}/mover`,"POST",{padreId:padre,antesDeId,version:n.version}));
  const copiar=(n:Nodo)=>operar(async()=>{const r=await enviar<{copiados:number;catedraId:string;tareasDesvinculadas:boolean}>(`${url}/${n.id}/duplicar`,"POST",{catedraDestinoId:destinoCopia||catedraId});setAviso(`${r.copiados} nodos copiados como borradores.${r.tareasDesvinculadas?" Las tareas del curso original se desvincularon; elegí tareas del curso de destino.":""}`);});
  const progreso=(n:Nodo,estado:"visto"|"realizado")=>operar(()=>enviar(`${url}/${n.id}/progreso`,"POST",{estado}));
  function soltar(e:React.DragEvent,n:Nodo|null){e.preventDefault();e.stopPropagation();const origen=nodos.find(x=>x.id===(e.dataTransfer.getData("text/nexo-nodo")||arrastre));setArrastre(null);if(!origen||origen.id===n?.id)return;void trasladar(origen,n?.tipo==="leccion"?n.padreId:n?.id??null,n?.tipo==="leccion"?n.id:null);}
  const hijos=(padre:string|null,nivel=0):React.ReactNode=>nodos.filter(n=>n.padreId===padre).map(n=><article key={n.id} className="border-l border-white/15 pl-3 py-3 space-y-2 min-w-0" style={{marginLeft:nivel?8:0}} onDragOver={e=>{if(datos?.editable)e.preventDefault();}} onDrop={e=>{if(datos?.editable)soltar(e,n);}}>
    <div className="flex flex-wrap items-start justify-between gap-2" draggable={datos?.editable&&!guardando} onDragStart={e=>{e.stopPropagation();setArrastre(n.id);e.dataTransfer.setData("text/nexo-nodo",n.id);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setArrastre(null)}>
      <div className="min-w-0"><h3 className="font-semibold text-white break-words">{n.titulo}</h3><p className="text-xs text-slate-400">{n.tipo} · {n.publicado?"Publicado":"Borrador"}{n.disponibleDesde&&<> · Disponible <time dateTime={n.disponibleDesde}>{new Date(n.disponibleDesde).toLocaleString('es-AR')}</time></>}</p></div>
      {datos?.editable&&<div className="flex flex-wrap gap-2 text-xs text-primary"><button disabled={guardando} onClick={()=>abrir(n.tipo,n.padreId,n)}>Editar</button><button disabled={guardando} aria-label={`Subir ${n.titulo}`} onClick={()=>void mover(n,-1)}>↑</button><button disabled={guardando} aria-label={`Bajar ${n.titulo}`} onClick={()=>void mover(n,1)}>↓</button><button disabled={guardando} onClick={()=>void copiar(n)}>Duplicar rama</button><button disabled={guardando} onClick={()=>void publicar(n)}>{n.publicado?"Retirar":"Publicar"}</button></div>}
    </div>
    {n.descripcion&&<p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{n.descripcion}</p>}
    {n.documentoId&&<button className="text-sm text-primary underline" onClick={()=>navegar(`/documentos?documento=${n.documentoId}`)}>Abrir material</button>}
    {n.archivoId&&<ReproductorLeccion id={n.archivoId} tipo={n.archivoTipo} capitulos={n.capitulos} subtitulos={n.subtitulos??[]} />}
    {!!n.actividades.length&&<div className="space-y-2">{n.actividades.map(a=>datos?.editable?<div key={a.id} className="rounded bg-white/5 p-2 text-sm">{a.titulo}{a.obligatoria?" · obligatoria":""}{a.tareaId&&<button className="ml-2 text-primary underline" onClick={()=>navegar(`/portafolio/gestion?correccion=${a.tareaId}`)}>Abrir tarea y entregas</button>}</div>:<AccionLeccion key={a.id} actividad={a} url={`${url}/${n.id}`} recargar={recargar} abrirTarea={setTareaAbierta} />)}</div>}
    {n.tipo==="leccion"&&!datos?.editable&&<div className="flex flex-wrap gap-3"><button disabled={guardando} className="text-xs text-primary" onClick={()=>void progreso(n,"visto")}>{n.progreso?.vistoEn?"Vista ✓":"Marcar vista"}</button><button disabled={guardando} className="text-xs text-primary" onClick={()=>void progreso(n,"realizado")}>{n.progreso?.realizadoEn?"Realizada ✓":"Marcar realizada"}</button>{n.progreso?.evaluadoEn&&<span className="text-xs text-emerald-300">Evaluada ✓</span>}</div>}
    {n.tipo==="leccion"&&datos?.editable&&<EvaluacionesLeccion url={`${url}/${n.id}`} />}
    {n.tipo==="leccion"&&<PracticasLeccion leccionId={n.id} editable={!!datos?.editable} />}
    {datos?.editable&&n.tipo!=="leccion"&&<div className="flex flex-wrap gap-3">{(["modulo","seccion","leccion"] as Tipo[]).map(t=><button key={t} className="text-xs text-primary" onClick={()=>abrir(t,n.id)}>+ {t}</button>)}</div>}
    {hijos(n.id,nivel+1)}
  </article>);
  return <section aria-label="Lecciones y accionables" className="rounded-2xl border border-white/10 bg-lienzo p-4 space-y-4 min-w-0">
    <div><h2 className="text-xl font-bold text-white">Lecciones y accionables</h2><p className="text-sm text-slate-400">Combiná módulos, secciones, materiales y actividades.</p></div>
    {datos?.editable&&<div className="space-y-3"><div className="flex flex-wrap gap-3">{(["modulo","seccion","leccion"] as Tipo[]).map(t=><button key={t} disabled={guardando} className="text-primary text-sm" onClick={()=>abrir(t,null)}>+ {t}</button>)}</div>
      <label className="block text-sm">Destino al duplicar una rama<Selector aria-label="Destino de la copia" value={destinoCopia||catedraId} onChange={e=>setDestinoCopia(e.target.value)}>{vinculos?.catedras.map(c=><option key={c.id} value={c.id}>{c.titulo}</option>)}</Selector></label>
      <p className="text-xs text-slate-400">Arrastrá un título a un contenedor para moverlo dentro; sobre una lección para colocarlo antes. También podés elegir el contenedor al editar.</p>
      {arrastre&&<div className="rounded border border-dashed border-primary p-3" onDragOver={e=>e.preventDefault()} onDrop={e=>soltar(e,null)}>Soltar en el nivel principal</div>}
    </div>}
    {cargando&&!datos&&<p>Cargando lecciones…</p>}{error&&<p role="alert">{error}</p>}{fallo&&<p role="alert">{fallo}</p>}{aviso&&<p role="status">{aviso}</p>}
    {datos&&!nodos.length&&<p className="text-slate-400">Todavía no hay lecciones publicadas.</p>}{hijos(null)}
    {editor&&<form onSubmit={e=>void guardar(e)} className="border-t border-white/10 pt-4 space-y-3">
      <h3 className="font-bold">{editor.nodo?"Editar":"Crear"} {editor.tipo}</h3>
      <input aria-label="Título de la sección o lección" required maxLength={200} value={titulo} onChange={e=>setTitulo(e.target.value)} className="w-full rounded-lg bg-fondo p-2" />
      <label className="block text-sm">Contenedor<Selector aria-label="Contenedor" value={padreId} onChange={e=>setPadreId(e.target.value)}><option value="">Nivel principal</option>{nodos.filter(n=>n.tipo!=="leccion"&&(!editor.nodo||!esDescendiente(n,editor.nodo.id))).map(n=><option key={n.id} value={n.id}>{n.titulo}</option>)}</Selector></label>
      <textarea aria-label="Descripción de la lección" maxLength={3000} value={descripcion} onChange={e=>setDescripcion(e.target.value)} className="w-full rounded-lg bg-fondo p-2" />
      <label className="block text-sm">Material reutilizable<Selector aria-label="Material reutilizable" value={documentoId} onChange={e=>setDocumentoId(e.target.value)}><option value="">Sin documento</option>{documentos?.documentos.map(d=><option key={d.id} value={d.id}>{d.titulo}{!d.publicado?" (borrador)":""}</option>)}</Selector></label>
      <GrabacionLeccion archivoId={archivoId} alGuardar={(id,marcas,subs)=>{setArchivoId(id);setCapitulos(marcas);setSubtitulos(subs);}} alEstado={setSubiendo} />
      <fieldset className="space-y-2"><legend className="font-semibold">Accionables</legend>{actividades.map((a,i)=><div key={a.id??`nueva-${i}`} className="rounded border border-white/15 p-3 space-y-2">
        <textarea aria-label={`Accionable ${i+1}`} maxLength={1000} required value={a.titulo} onChange={e=>setActividades(xs=>xs.map((x,j)=>j===i?{...x,titulo:e.target.value}:x))} className="w-full bg-fondo rounded p-2" />
        <label className="block text-sm">Tarea vinculada<Selector aria-label={`Tarea vinculada ${i+1}`} value={a.tareaId??""} onChange={e=>setActividades(xs=>xs.map((x,j)=>j===i?{...x,tareaId:e.target.value||null}:x))}><option value="">Checkbox y evidencia propia</option>{vinculos?.tareas.map(t=><option key={t.id} value={t.id}>{t.titulo}</option>)}</Selector></label>
        <label className="text-sm flex gap-2"><input type="checkbox" checked={a.obligatoria} onChange={e=>setActividades(xs=>xs.map((x,j)=>j===i?{...x,obligatoria:e.target.checked}:x))} />Obligatoria para completar la lección</label>
        <button type="button" className="text-rose-300 text-sm" onClick={()=>setActividades(xs=>xs.filter((_,j)=>i!==j))}>Quitar accionable</button>
      </div>)}<button type="button" disabled={actividades.length>=100} className="text-primary text-sm" onClick={()=>setActividades(xs=>[...xs,{id:null,titulo:"",tareaId:null,obligatoria:true}])}>+ Accionable</button><details><summary className="cursor-pointer text-sm">Agregar varios accionables</summary><textarea aria-label="Accionables, uno por línea" value={accionesPegadas} onChange={e=>setAccionesPegadas(e.target.value)} className="block w-full rounded bg-fondo p-2 mt-2"/><button type="button" className="text-primary text-sm" onClick={()=>{const textos=accionesPegadas.split('\n').map(x=>x.trim()).filter(Boolean);if(textos.length+actividades.length>100||textos.some(x=>x.length>1000)){setFallo('Usá hasta 100 accionables de 1000 caracteres cada uno.');return;}setActividades(xs=>[...xs,...textos.map(titulo=>({id:null,titulo,tareaId:null,obligatoria:true}))]);setAccionesPegadas('');}}>Agregar lista</button></details></fieldset>
      <label className="block text-sm">Disponible desde<input type="datetime-local" value={fecha} onChange={e=>setFecha(e.target.value)} className="mt-1 w-full rounded bg-fondo p-2" /></label>
      <label className="block text-sm">Lección previa<Selector aria-label="Lección previa" value={prerrequisito} onChange={e=>setPrerrequisito(e.target.value)}><option value="">Sin requisito</option>{nodos.filter(n=>n.tipo==="leccion"&&n.id!==editor.nodo?.id).map(n=><option key={n.id} value={n.id}>{n.titulo}</option>)}</Selector></label>
      <div className="flex gap-3"><button disabled={guardando||subiendo} className="rounded bg-primary px-4 py-2">{guardando?"Guardando…":"Guardar"}</button><button type="button" disabled={subiendo} onClick={()=>setEditor(null)}>Cancelar</button></div>
    </form>}
    {tareaAbierta&&<ModalDetalleTarea tareaId={tareaAbierta} onCerrar={()=>{setTareaAbierta(null);recargar();}} onCambio={recargar} />}
  </section>;
}

function AccionLeccion({actividad:a,url,recargar,abrirTarea}:{actividad:Actividad;url:string;recargar:()=>void;abrirTarea:(id:string)=>void}){
  const [texto,setTexto]=useState(a.evidencia??"");const [guardando,setGuardando]=useState(false);const [error,setError]=useState("");
  async function guardar(cambios:{completada?:boolean;evidencia?:string}){setGuardando(true);setError("");try{await enviar(`${url}/acciones/${a.id}/progreso`,"PUT",cambios);recargar();}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar el accionable.");}finally{setGuardando(false);}}
  return <div className="rounded bg-white/5 p-3 text-sm space-y-2"><label className="flex gap-2"><input type="checkbox" checked={!!a.completada} disabled={!a.id||!!a.tareaId||guardando} onChange={e=>void guardar({completada:e.target.checked})} />{a.titulo}{a.obligatoria?" · obligatoria":""}</label>
    {a.tareaId&&<><button className="text-primary underline" disabled={!a.tareaDisponible} onClick={()=>abrirTarea(a.tareaId!)}>Abrir tarea, entregar o ver devolución</button><p className="text-xs text-slate-400">{!a.tareaDisponible?"La tarea ya no está disponible; consultá al docente.":a.entregaId?"Entrega registrada":"Pendiente de entrega"}{a.nota!=null?` · Nota ${a.nota}`:""}</p>{a.devolucion&&<p className="whitespace-pre-wrap">Devolución: {a.devolucion}</p>}</>}
    <label className="block">Evidencia o reflexión<textarea aria-label={`Evidencia de ${a.titulo}`} maxLength={10000} value={texto} onChange={e=>setTexto(e.target.value)} className="block w-full rounded bg-fondo p-2" /></label>
    <button disabled={!a.id||guardando||texto===(a.evidencia??"")} className="text-primary disabled:opacity-50" onClick={()=>void guardar({evidencia:texto})}>Guardar evidencia</button>{error&&<p role="alert">{error}</p>}
  </div>;
}
