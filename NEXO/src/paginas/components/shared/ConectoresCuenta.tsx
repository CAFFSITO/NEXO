import { useState } from 'react';
import { enviar, pedir, useDatos } from '../../../servicios/api';
import Selector from './Selector';
import type { Catedra } from '../../../servicios/tareas';

type Servicio = {id:string;proveedor:string;capacidad:string;conectado:boolean;lectura:boolean;importacionNativa:boolean;exportacionNativa:boolean};
type Elemento = {externoId:string;resumen:{titulo:string;enlace:string|null};nativoId:number|null;nativoTipo:string|null};
type Exportable = {id:number;titulo:string;fecha?:string;fechaFin?:string;fechaLimite?:string;externoId:string|null};
const NOMBRES:Record<string,string>={drive:'Drive',docs:'Docs',forms:'Forms',gmail:'Gmail',calendar:'Calendar',meet:'Meet',classroom:'Classroom',notion:'Notion',todoist:'Todoist',whatsapp:'WhatsApp Business'};

function CatedraDestino({valor,cambiar}:{valor:string;cambiar:(id:string)=>void}){
  const {datos,error}=useDatos<{catedras:Catedra[]}>('/api/tareas/catedras');
  return <label className="block text-white/70">Cátedra de NEXO para importar trabajos
    <Selector className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={valor} onChange={e=>cambiar(e.target.value)}>
      <option value="">Elegí una cátedra</option>{datos?.catedras.map(c=><option key={c.id} value={c.id}>{c.materia} · {c.curso}</option>)}
    </Selector>{error&&<span role="alert">{error}</span>}
  </label>;
}

export default function ConectoresCuenta(){
  const {datos,recargar,error}=useDatos<{servicios:Servicio[]}>('/api/conectores/catalogo');
  const [seleccion,setSeleccion]=useState('drive');
  const [token,setToken]=useState('');
  const [id,setId]=useState('');
  const [cursoId,setCursoId]=useState('');
  const [catedraId,setCatedraId]=useState('');
  const [fecha,setFecha]=useState('');
  const [cursor,setCursor]=useState<string|null>(null);
  const [elementos,setElementos]=useState<Elemento[]>([]);
  const [exportables,setExportables]=useState<Exportable[]>([]);
  const [zonaHoraria,setZonaHoraria]=useState(Intl.DateTimeFormat().resolvedOptions().timeZone||'');
  const [correo,setCorreo]=useState<{id:string;asunto:string;remitente:string;fecha:string;texto:string}|null>(null);
  const [aviso,setAviso]=useState('');
  const [ocupado,setOcupado]=useState(false);
  const actual=datos?.servicios.find(s=>s.id===seleccion);
  async function operar(accion:()=>Promise<void>){setOcupado(true);setAviso('');try{await accion();}catch(e){setAviso(e instanceof Error?e.message:'No se pudo completar.');}finally{setOcupado(false);}}
  const cargar=async()=>{const r=await pedir<{elementos:Elemento[]}>(`/api/conectores/${seleccion}/elementos`);setElementos(r.elementos);};
  const cargarExportables=()=>operar(async()=>{const r=await pedir<{elementos:Exportable[]}>(`/api/conectores/${seleccion}/exportables`);setExportables(r.elementos);setAviso(`${r.elementos.length} elementos propios disponibles.`);});
  const exportar=(nativoId:number)=>operar(async()=>{const r=await enviar<{externoId:string;estado:string}>(`/api/conectores/${seleccion}/exportar`,'POST',{id:nativoId,...(seleccion==='calendar'?{zonaHoraria}:{})});const lista=await pedir<{elementos:Exportable[]}>(`/api/conectores/${seleccion}/exportables`);setExportables(lista.elementos);setAviso(`Exportación ${r.estado}: ${r.externoId}`);});
  const conectar=()=>operar(async()=>{
    if(actual?.proveedor==='google'){const r=await pedir<{url:string}>(`/api/conectores/google/autorizar?servicio=${seleccion}`);window.location.assign(r.url);return;}
    await enviar('/api/conectores/cuentas','POST',{proveedor:actual?.proveedor,token,nombre:NOMBRES[seleccion]});setToken('');recargar();setAviso('Cuenta conectada.');
  });
  const sincronizar=(cursoOverride?:string)=>operar(async()=>{
    const r=await enviar<{recibidos:number;nuevos:number;cambios:number;cursor:string|null}>(`/api/conectores/${seleccion}/sincronizar`,'POST',{...(cursor&&!cursoOverride?{cursor}:{}),...(id?{id}:{}),...(seleccion==='classroom'&&(cursoOverride||cursoId)?{cursoId:cursoOverride||cursoId}:{})});
    setCursor(r.cursor);await cargar();setAviso(`${r.recibidos} elementos consultados; ${r.nuevos} nuevos y ${r.cambios} actualizados.`);
  });
  const importar=(externoId:string)=>operar(async()=>{const r=await enviar<{id:string;existente:boolean}>(`/api/conectores/${seleccion}/importar`,'POST',{id:externoId,...(seleccion==='meet'?{fecha}:{}),...(seleccion==='classroom'?{catedraId,fechaLimite:fecha}:{})});await cargar();setAviso(r.existente?'Ya estaba importado.':`Importado en NEXO con ID ${r.id}.`);});
  const leerCorreo=(externoId:string)=>operar(async()=>{const r=await pedir<{id:string;asunto:string;remitente:string;fecha:string;texto:string}>(`/api/conectores/gmail/mensajes/${encodeURIComponent(externoId)}`);setCorreo(r);});
  const desconectar=()=>operar(async()=>{await enviar(`/api/conectores/cuentas/${actual?.proveedor}`,'DELETE');setElementos([]);recargar();setAviso('Cuenta desconectada.');});
  return <div className="bg-fondo border border-acento/20 rounded-2xl p-6 space-y-4">
    <div><h2 className="font-headline text-lg font-bold text-white">Conexiones externas</h2><p className="text-sm text-white/50">Tus cuentas opcionales. Los datos que sincronices quedan separados por origen y la IA privada no accede a estos servicios.</p></div>
    {error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}
    <label className="block text-sm text-white/70">Servicio
      <Selector className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={seleccion} onChange={e=>{setSeleccion(e.target.value);setElementos([]);setExportables([]);setCorreo(null);setCursor(null);setId('');setCursoId('');setCatedraId('');setFecha('');setAviso('');}}>
        {datos?.servicios.map(s=><option key={s.id} value={s.id}>{NOMBRES[s.id]} · {s.capacidad}{s.conectado?' · conectado':''}</option>)}
      </Selector>
    </label>
    {actual&&<div className="space-y-3 text-sm">
      {actual.proveedor==='whatsapp'&&<p className="text-amber-300">WhatsApp requiere una cuenta Business Cloud API y webhooks. La lectura de historial no está disponible aquí.</p>}
      {!actual.conectado&&actual.proveedor!=='google'&&actual.proveedor!=='whatsapp'&&<label className="block text-white/70">Token de integración
        <input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={actual.proveedor==='notion'?'Token de integración de Notion':'Token personal de Todoist'}/>
      </label>}
      {!actual.conectado&&actual.proveedor!=='whatsapp'&&<button disabled={ocupado||actual.proveedor!=='google'&&!token} onClick={()=>void conectar()} className="rounded-full bg-acento px-4 py-2 font-bold text-white disabled:opacity-50">Conectar {NOMBRES[seleccion]}</button>}
      {actual.conectado&&<>
        {['docs','forms','meet'].includes(seleccion)&&<label className="block text-white/70">ID del recurso externo
          <input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={id} onChange={e=>setId(e.target.value)} placeholder="ID del documento, formulario o espacio"/>
        </label>}
        {seleccion==='classroom'&&<><label className="block text-white/70">ID del curso de Classroom para listar trabajos
          <input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={cursoId} onChange={e=>{setCursoId(e.target.value);setCursor(null);}} placeholder="Primero podés listar los cursos"/>
        </label><CatedraDestino valor={catedraId} cambiar={setCatedraId}/></>}
        {['meet','classroom'].includes(seleccion)&&<label className="block text-white/70">{seleccion==='meet'?'Fecha del evento en NEXO':'Fecha límite si el trabajo no la trae'}
          <input type="date" className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={fecha} onChange={e=>setFecha(e.target.value)}/>
        </label>}
        {actual.lectura&&<button disabled={ocupado||(['docs','forms','meet'].includes(seleccion)&&!id)} onClick={()=>void sincronizar()} className="rounded-full bg-acento px-4 py-2 font-bold text-white disabled:opacity-50">Sincronizar</button>}
        {actual.exportacionNativa&&<button disabled={ocupado} onClick={()=>void cargarExportables()} className="ml-2 text-primary underline">Ver elementos de NEXO para exportar</button>}
        {seleccion==='calendar'&&<label className="block text-white/70">Zona horaria para eventos con hora
          <input className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3 text-white" value={zonaHoraria} onChange={e=>setZonaHoraria(e.target.value)} placeholder="America/Argentina/Buenos_Aires"/>
        </label>}
        {cursor&&<button disabled={ocupado} onClick={()=>void sincronizar()} className="ml-2 text-primary underline">Página siguiente</button>}
        <button disabled={ocupado} onClick={()=>void desconectar()} className="ml-3 text-red-300 underline">Desconectar cuenta</button>
      </>}
      {aviso&&<p role="status" className="text-emerald-300">{aviso}</p>}
      {exportables.length>0&&<div className="space-y-2 max-h-80 overflow-y-auto"><p className="text-white/60">Elementos propios de NEXO, hasta 100. Exportar crea o actualiza el destino sin pisar cambios externos.</p>{exportables.map(x=><div key={x.id} className="rounded-lg bg-surface-container-lowest p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-white">{x.titulo}</p><p className="text-xs text-white/40">{x.fecha||x.fechaLimite||'Sin fecha'}{x.externoId?' · exportado':''}</p></div><button disabled={ocupado} onClick={()=>void exportar(x.id)} className="text-primary underline shrink-0">{x.externoId?'Reconciliar':'Exportar'}</button></div>)}</div>}
      {elementos.length>0&&<div className="space-y-2 max-h-80 overflow-y-auto">{elementos.map(x=><div key={x.externoId} className="rounded-lg bg-surface-container-lowest p-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-white">{x.resumen.titulo||x.externoId}</p><p className="text-xs text-white/40 truncate">{x.externoId}</p>{x.resumen.enlace&&<a href={x.resumen.enlace} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir origen</a>}</div>
        {seleccion==='gmail'?<button disabled={ocupado} onClick={()=>void leerCorreo(x.externoId)} className="text-primary underline shrink-0">Leer</button>:seleccion==='classroom'&&!x.externoId.includes(':')?<button disabled={ocupado} onClick={()=>{setCursoId(x.externoId);setCursor(null);void sincronizar(x.externoId);}} className="text-primary underline shrink-0">Ver trabajos</button>:actual.importacionNativa&&(x.nativoId?<span className="text-emerald-300 shrink-0">En NEXO</span>:<button disabled={ocupado||(seleccion==='meet'&&!fecha)||(seleccion==='classroom'&&!catedraId)} onClick={()=>void importar(x.externoId)} className="text-primary underline shrink-0">Importar</button>)}
      </div>)}</div>}
      {correo&&seleccion==='gmail'&&<article className="rounded-lg border border-white/20 p-3 space-y-2"><div className="flex justify-between gap-2"><h3 className="font-bold">{correo.asunto}</h3><button type="button" onClick={()=>setCorreo(null)}>Cerrar</button></div><p className="text-white/60">{correo.remitente} · {correo.fecha}</p><p className="whitespace-pre-wrap break-words max-h-80 overflow-y-auto">{correo.texto||'Este mensaje no tiene texto plano disponible.'}</p></article>}
    </div>}
  </div>;
}
