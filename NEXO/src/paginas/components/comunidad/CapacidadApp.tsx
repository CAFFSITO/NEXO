import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { enviar, useDatos } from '../../../servicios/api';
import { crearCanal, enviarMensaje, guardarCanal, marcarConversacionLeida, unirseCanal, type Canal } from '../../../servicios/chat';
import { useTiempoReal } from '../../../servicios/tiempoReal';
import { useHistorialChat } from '../../../servicios/useHistorialChat';
import type { BloqueApp } from '../../../servicios/appsPublicas';
import Selector from '../shared/Selector';
import ChatWindow from '../chat/ChatWindow';
const Documento=lazy(()=>import('../../DocumentosPage').then(m=>({default:m.DocumentoIntegrado})));
const Curso=lazy(()=>import('../cursos/LeccionesMateria'));

type Entrada={id:number;autorId:number;autor:string;titulo:string;contenido:string;estado:string;oculta:boolean;ocultaPor:number|null;devolucion:string;votos:number;votada:boolean};
type Datos={tipo:string;canal:Canal|null;pedidos?:Canal[];documentoId?:string;catedraId?:string;usuarioId?:number;administrable?:boolean;entradas?:Entrada[]};
export default function CapacidadApp({instanciaId,bloque}:{instanciaId:number;bloque:BloqueApp}){
  const ruta=`/api/apps-publicas/comunidad/${instanciaId}/bloques/${bloque.id}`;
  const [abierta,setAbierta]=useState(false),[fallo,setFallo]=useState(''),[abriendo,setAbriendo]=useState(false);
  const [pedidoId,setPedidoId]=useState('');
  const {datos,error,recargar}=useDatos<Datos>(abierta?ruta:null);
  const abrir=async(nuevo=false)=>{setAbriendo(true);try{const r=await enviar<{canal:Canal}>(`${ruta}/abrir`,'POST',{nuevo});setPedidoId(r.canal.id);recargar();setFallo('');}catch(e){setFallo((e as Error).message);}finally{setAbriendo(false);}};
  const canal=bloque.tipo==='ayuda'?(datos?.pedidos?.find(c=>c.id===pedidoId)??datos?.canal??datos?.pedidos?.[0]):datos?.canal;
  return <div className="mt-3 space-y-3"><button type="button" className="text-primary underline" aria-expanded={abierta} onClick={()=>setAbierta(v=>!v)}>{abierta?'Ocultar herramienta':'Abrir herramienta integrada'}</button>{abierta&&<>
    {error&&<p role="alert">{error}</p>}{!datos&&!error&&<p role="status">Cargando herramienta…</p>}
    {datos&&bloque.tipo==='ayuda'&&<div className="flex flex-wrap gap-2">{datos.pedidos?.map(c=><button type="button" key={c.id} aria-pressed={canal?.id===c.id} className="rounded border border-white/15 p-2" onClick={()=>setPedidoId(c.id)}>Pedido #{c.id} · {c.estado}</button>)}{!!datos.pedidos?.length&&<button type="button" disabled={abriendo} className="text-primary" onClick={()=>void abrir(true)}>Crear otro pedido privado</button>}</div>}
    {datos&&(['chat','foro','sugerencias','ayuda'].includes(bloque.tipo)?canal?.miembro?<CanalIntegrado key={canal.id} canal={canal} recargar={recargar}/>:<button type="button" disabled={abriendo} className="rounded bg-primary px-3 py-2" onClick={()=>void abrir()}>{bloque.tipo==='ayuda'?'Crear mi pedido privado':'Unirme al espacio'}</button>:bloque.tipo==='documento'||bloque.tipo==='formulario'?datos.documentoId?<Suspense fallback={<p>Abriendo documento…</p>}><Documento id={datos.documentoId}/></Suspense>:<p>Dirección debe preparar la instalación.</p>:bloque.tipo==='curso'?datos.catedraId?<Suspense fallback={<p>Abriendo curso…</p>}><Curso catedraId={datos.catedraId}/></Suspense>:<p>Dirección debe elegir una cátedra de esta institución.</p>:<Tablon ruta={ruta} datos={datos} bloque={bloque} recargar={recargar}/>)}
    {fallo&&<p role="alert">{fallo}</p>}
  </>}</div>;
}
function CanalIntegrado({canal,recargar}:{canal:Canal;recargar:()=>void}){
  const [activo,setActivo]=useState(canal.clase==='foro'?'':canal.id),[titulo,setTitulo]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
  const {datos:temas,error:errorTemas,recargar:recargarTemas}=useDatos<{canales:Canal[]}>(canal.clase==='foro'?`/api/chat/canales?padreId=${canal.id}`:null);
  useTiempoReal(useCallback(e=>{if(e.tipo==='conversaciones-actualizadas'){recargarTemas();recargar();}},[recargarTemas,recargar]));
  const seleccionar=async(c:Canal)=>{setOcupado(true);try{if(!c.miembro)await unirseCanal(c.id);setActivo(c.id);setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const nuevoTema=async()=>{setOcupado(true);try{const {canal:hilo}=await crearCanal({nombre:titulo,descripcion:'',clase:'hilo',visibilidad:canal.visibilidad,soloLectura:false,miembros:[],padreId:canal.id});setTitulo('');setActivo(hilo.id);recargarTemas();recargar();setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const configurar=async(cambio:Partial<Pick<Canal,'estado'|'soloLectura'>>)=>{setOcupado(true);try{await guardarCanal(canal.id,{version:canal.version,nombre:canal.nombre,descripcion:canal.descripcion,soloLectura:canal.soloLectura,estado:canal.estado,...cambio});recargar();setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  return <div className="space-y-3 rounded-xl bg-white/5 p-3"><p className="text-xs text-white/60">{canal.nombre} · {canal.estado} · historial nativo compartido con Chat</p>
    {canal.administrable&&<details className="space-y-2 text-sm"><summary>Configurar este espacio</summary><label className="flex gap-2"><input type="checkbox" disabled={ocupado} checked={canal.soloLectura} onChange={e=>void configurar({soloLectura:e.target.checked})}/>Sólo administradores publican</label><label className="block">Estado <Selector aria-label={`Estado del espacio ${canal.nombre}`} disabled={ocupado} value={canal.estado} onChange={e=>void configurar({estado:e.target.value as Canal['estado']})}><option value="abierto">Abierto</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></Selector></label></details>}
    {canal.clase==='foro'&&<><div className="flex flex-wrap gap-2">{temas?.canales.map(c=><button type="button" aria-pressed={activo===c.id} disabled={ocupado} key={c.id} className="rounded bg-white/10 p-2" onClick={()=>void seleccionar(c)}>{c.nombre}</button>)}</div>{canal.estado==='abierto'&&(!canal.soloLectura||canal.administrable)&&<><label className="block">Nuevo tema<input aria-label="Título del tema" maxLength={100} className="w-full rounded bg-fondo p-2" value={titulo} onChange={e=>setTitulo(e.target.value)}/></label><button type="button" disabled={ocupado||!titulo.trim()} onClick={()=>void nuevoTema()} className="text-primary">Crear tema</button></>}{errorTemas&&<p role="alert">{errorTemas}</p>}</>}
    {activo&&<MensajesIntegrados key={activo} id={activo}/>}{error&&<p role="alert">{error}</p>}
  </div>;
}
function MensajesIntegrados({id}:{id:string}){
  const {datos,recargar:recargarCanal,error:errorCanal}=useDatos<{canal:Canal}>(`/api/chat/canales/${id}`);
  const [consulta,setConsulta]=useState(''),[busqueda,setBusqueda]=useState('');
  const h=useHistorialChat(id,busqueda);
  useTiempoReal(useCallback(e=>{if(e.tipo==='conectado'||e.tipo==='conversaciones-actualizadas'){h.recargar();recargarCanal();}else if((e.tipo==='mensaje'||e.tipo==='mensaje-reaccion')&&String(e.conversacionId)===id)h.recargar();},[h.recargar,recargarCanal,id]));
  useEffect(()=>{if(h.mensajes&&!h.cargando&&!busqueda&&!document.hidden)void marcarConversacionLeida(id).catch(()=>{});},[h.mensajes,h.cargando,busqueda,id]);
  return <div className="h-[36rem] min-w-0 overflow-hidden rounded-xl border border-white/10">
    <ChatWindow nombreContacto={datos?.canal.nombre??'Espacio de la app'} subtitulo={datos?.canal.estado??'Cargando'} soloLectura={!datos?.canal.puedeEscribir}
      messages={(h.mensajes??[]).map(m=>({...m,sender:m.mio?'user' as const:'other' as const,timestamp:new Date(m.enviadoEn.endsWith('Z')?m.enviadoEn:m.enviadoEn.replace(' ','T')+'Z').toLocaleString()}))}
      onSendMessage={async(texto,archivo,opciones)=>{await enviarMensaje(id,texto,archivo,opciones);h.recargar();}}
      cargando={h.cargando&&!h.mensajes} error={errorCanal??h.error} onReintentar={()=>{h.recargar();recargarCanal();}}
      hayAnteriores={h.hayAnteriores} cargandoAnteriores={h.cargandoAnteriores} errorAnteriores={h.errorAnteriores} onAnteriores={h.cargarAnteriores}
      herramientas={<form className="flex gap-2 p-2" onSubmit={e=>{e.preventDefault();setBusqueda(consulta.trim());}}><input aria-label="Buscar en el espacio" value={consulta} onChange={e=>setConsulta(e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded bg-fondo p-2"/><button type="submit">Buscar</button>{busqueda&&<button type="button" onClick={()=>{setConsulta('');setBusqueda('');}}>Ver todos</button>}</form>}/>
  </div>;
}
function Tablon({ruta,datos,bloque,recargar}:{ruta:string;datos:Datos;bloque:BloqueApp;recargar:()=>void}){
  const [titulo,setTitulo]=useState(''),[contenido,setContenido]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false),[editando,setEditando]=useState<number|null>(null),[devoluciones,setDevoluciones]=useState<Record<number,string>>({});
  const actuar=async(fn:()=>Promise<unknown>)=>{setOcupado(true);try{await fn();recargar();setError('');}catch(e){setError((e as Error).message);}finally{setOcupado(false);}};
  const enviarEntrada=()=>actuar(async()=>{await enviar(editando?`${ruta}/entradas/${editando}`:`${ruta}/entradas`,editando?'PUT':'POST',{titulo,contenido});setTitulo('');setContenido('');setEditando(null);});
  const estados=bloque.tipo==='propuestas'?['propuesta','aceptada','rechazada']:bloque.tipo==='desafio'?['presentado','devuelto','resuelto']:['publicado'];
  return <div className="space-y-3"><p className="text-xs text-white/60">{bloque.tipo==='directorio'?'Publicación voluntaria de tu ficha.':bloque.tipo==='desafio'?'Presentá tu producción y consultá la devolución.':bloque.tipo==='propuestas'?'Propuestas, votos individuales y decisión de Dirección.':'Publicaciones de esta instalación.'}</p>
    <form onSubmit={e=>{e.preventDefault();void enviarEntrada();}} className="space-y-2"><label className="block">{bloque.tipo==='directorio'?'Nombre de tu ficha':'Título'}<input aria-label="Título de publicación" maxLength={160} className="w-full rounded bg-fondo p-2" value={titulo} onChange={e=>setTitulo(e.target.value)}/></label><textarea aria-label="Contenido de publicación" className="w-full rounded bg-fondo p-2" value={contenido} onChange={e=>setContenido(e.target.value)} maxLength={5000}/><button type="submit" disabled={ocupado||!titulo.trim()||!contenido.trim()} className="text-primary">{editando?'Guardar edición':bloque.tipo==='desafio'?'Presentar producción':bloque.tipo==='directorio'?'Publicar o actualizar mi ficha':'Publicar'}</button>{editando&&<button type="button" onClick={()=>{setEditando(null);setTitulo('');setContenido('');}}>Cancelar edición</button>}</form>
    {datos.entradas?.map(e=><article key={e.id} className="space-y-2 rounded border border-white/10 p-3"><h4 className="font-bold">{e.titulo}</h4><p className="text-xs text-white/50">{e.autor} · {e.estado}{e.oculta?' · oculta':''}</p><p className="whitespace-pre-wrap">{e.contenido}</p>
      {bloque.tipo==='propuestas'&&!e.oculta&&<button type="button" disabled={ocupado} className="text-primary" onClick={()=>void actuar(()=>enviar(`${ruta}/entradas/${e.id}`,'PUT',{voto:!e.votada}))}>{e.votada?'Retirar voto':'Votar'} · {e.votos}</button>}
      {e.devolucion&&<p className="rounded bg-emerald-500/10 p-2">Devolución: {e.devolucion}</p>}
      {datos.usuarioId===e.autorId&&<button type="button" disabled={ocupado} className="text-primary" onClick={()=>{setEditando(e.id);setTitulo(e.titulo);setContenido(e.contenido);}}>Editar mi publicación</button>}
      {(datos.administrable||datos.usuarioId===e.autorId)&&<button type="button" disabled={ocupado||!!(e.oculta&&e.ocultaPor&&e.ocultaPor!==datos.usuarioId&&!datos.administrable)} className="text-amber-200" onClick={()=>void actuar(()=>enviar(`${ruta}/entradas/${e.id}`,'PUT',{oculta:!e.oculta}))}>{e.oculta?'Volver a mostrar publicación':'Ocultar publicación'}</button>}
      {datos.administrable&&<div className="space-y-2"><label className="block">Devolución a {e.autor}<input aria-label={`Devolución a ${e.autor}`} className="w-full rounded bg-fondo p-2" value={devoluciones[e.id]??e.devolucion} onChange={x=>setDevoluciones(d=>({...d,[e.id]:x.target.value}))}/></label><label className="block">Estado de {e.titulo}<Selector aria-label={`Estado de ${e.titulo}`} disabled={ocupado} value={e.estado} onChange={x=>void actuar(()=>enviar(`${ruta}/entradas/${e.id}`,'PUT',{estado:x.target.value,devolucion:devoluciones[e.id]??e.devolucion}))}>{estados.map(x=><option key={x} value={x}>{x}</option>)}</Selector></label><button type="button" disabled={ocupado} onClick={()=>void actuar(()=>enviar(`${ruta}/entradas/${e.id}`,'PUT',{estado:e.estado,devolucion:devoluciones[e.id]??e.devolucion}))} className="text-primary">Guardar devolución</button></div>}
    </article>)}{error&&<p role="alert">{error}</p>}
  </div>;
}
