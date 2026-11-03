import Sidebar from './components/shared/Sidebar';
import TopBar from './components/shared/TopBar';
import { useNavegacion } from '../navegacion';
import { useState } from 'react';
import { enviar } from '../servicios/api';
import { useProyectos, useProyecto } from '../servicios/proyectos';
import { useDetalleEnRuta } from '../servicios/detalleEnRuta';
import Selector from './components/shared/Selector';
import DetalleProyecto from './components/proyectos/DetalleProyecto';

export default function ProyectosPage(){
  const {usuario,navegar,cerrarSesion}=useNavegacion();
  const [consulta,setConsulta]=useState(''),[buscar,setBuscar]=useState(''),[verArchivados,setVerArchivados]=useState(false);
  const lista=useProyectos(buscar),[seleccion,setSeleccion]=useDetalleEnRuta('proyecto'),detalle=useProyecto(seleccion);
  const [titulo,setTitulo]=useState(''),[problema,setProblema]=useState(''),[objetivo,setObjetivo]=useState(''),[criterio,setCriterio]=useState(''),[visibilidad,setVisibilidad]=useState('privada'),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
  const crear=async()=>{setOcupado(true);setError('');try{const p=await enviar<{id:string}>('/api/proyectos','POST',{titulo,problema,objetivo,criterio,visibilidad});setSeleccion(p.id);lista.recargar();setTitulo('');setProblema('');setObjetivo('');setCriterio('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const recargar=()=>{lista.recargar();detalle.recargar();};
  if(!usuario)return null;
  const campo='w-full rounded-lg border border-white/15 bg-fondo p-3';
  return <div className="flex min-h-screen bg-fondo text-white"><Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion}/><main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen"><TopBar title="Proyectos compartidos"/><div className="mx-auto max-w-6xl p-5 space-y-5"><h1 className="text-2xl font-bold">Proyectos compartidos</h1><p className="text-sm text-white/60">Transformá un problema en una producción con responsables, pasos, evidencia y devolución. Las metas personales siguen en tu espacio de objetivos.</p>
    <details className="rounded-xl border border-white/15 bg-lienzo p-4"><summary className="font-semibold cursor-pointer">Crear proyecto</summary><form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();void crear();}}><label className="block">Título del proyecto<input required maxLength={200} className={campo} value={titulo} onChange={e=>setTitulo(e.target.value)}/></label><label className="block">Problema que responde<textarea required maxLength={4000} className={campo} value={problema} onChange={e=>setProblema(e.target.value)}/></label><label className="block">Objetivo y producción esperada<textarea required maxLength={4000} className={campo} value={objetivo} onChange={e=>setObjetivo(e.target.value)}/></label><label className="block">Criterio de resultado<textarea required maxLength={2000} className={campo} value={criterio} onChange={e=>setCriterio(e.target.value)}/></label><label className="block">Visibilidad del proyecto<Selector aria-label="Visibilidad del proyecto" value={visibilidad} onChange={e=>setVisibilidad(e.target.value)} className={campo}><option value="privada">Privado: sólo personas invitadas</option><option value="institucion">Institución: lectura abierta y participación voluntaria</option></Selector></label><button type="submit" disabled={ocupado} className="rounded bg-primary px-4 py-2 disabled:opacity-40">Guardar proyecto</button>{error&&<p role="alert" className="text-rose-300">{error}</p>}</form></details>
    <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();setBuscar(consulta);}}><input aria-label="Buscar proyectos" className={`${campo} min-w-0 flex-1`} value={consulta} onChange={e=>setConsulta(e.target.value)} maxLength={200}/><button type="submit" className="rounded bg-white/10 px-3">Buscar</button><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verArchivados} onChange={e=>setVerArchivados(e.target.checked)}/>Mostrar archivados</label></form>
    {lista.error&&<p role="alert">{lista.error}</p>}<div className="grid gap-2 sm:grid-cols-2">{lista.datos?.proyectos.filter(p=>verArchivados||!p.archivado).map(p=><button key={p.id} type="button" onClick={()=>setSeleccion(p.id)} className={`rounded-xl border p-3 text-left ${seleccion===p.id?'border-primary':'border-white/15'}`}><strong>{p.titulo}</strong><span className="block text-xs text-white/50">{p.visibilidad==='privada'?'Privado':'Institucional'} · {p.rol||'Lectura abierta'}{p.archivado?' · archivado':''}</span></button>)}</div>{lista.datos?.proyectos.length===0&&<p>No hay proyectos para mostrar.</p>}
    {detalle.error&&<p role="alert" className="text-rose-300">{detalle.error}</p>}{detalle.datos&&<DetalleProyecto key={detalle.datos.proyecto.id} detalle={detalle.datos} usuarioId={String(usuario.id)} recargar={recargar}/>}
  </div></main></div>;
}
