export type NotaBibliotecaLocal = {clave:string;ubicacion:string;contenido:string;versionOrigen:string;creadaEn:string;servidorId?:string|null;sincronizada?:boolean};
export type InstantaneaBiblioteca = {
  recurso:{id:string;titulo:string;descripcion:string;autor:string;alcance:string;enlaceUrl:string|null};version:string;
  archivo:{id:string;nombre:string;tipoMime:string;tamanoBytes:number}|null;
  anotaciones:{id:string;ubicacion:string;contenido:string}[];
};
export type CopiaBiblioteca = InstantaneaBiblioteca & {usuarioId:number;blob:Blob|null;guardadaEn:string;comprobadaEn:string;revocada?:boolean;versionDisponible?:string};
const DB='nexo-biblioteca-local';
async function operar<T>(almacenes:string[],modo:IDBTransactionMode,accion:(tx:IDBTransaction,resolver:(r:T)=>void)=>void):Promise<T>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const p=indexedDB.open(DB,1);p.onupgradeneeded=()=>{p.result.createObjectStore('copias');p.result.createObjectStore('notas');};p.onsuccess=()=>resolve(p.result);p.onerror=()=>reject(p.error);});
  try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(almacenes,modo);let resultado:T;tx.oncomplete=()=>resolve(resultado);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('No pudo guardarse la copia local.'));accion(tx,r=>{resultado=r;});});}finally{db.close();}
}
const rango=(u:number,r?:string)=>IDBKeyRange.bound(r===undefined?[u]:[u,r],r===undefined?[u,[]]:[u,r,[]]);
export function listarCopiasBiblioteca(u:number):Promise<CopiaBiblioteca[]>{return operar(['copias'],'readonly',(tx,res)=>{const p=tx.objectStore('copias').getAll(rango(u));p.onsuccess=()=>res(p.result.sort((a:CopiaBiblioteca,b:CopiaBiblioteca)=>b.guardadaEn.localeCompare(a.guardadaEn)));});}
export function leerCopiaBiblioteca(u:number,r:string):Promise<CopiaBiblioteca|null>{return operar(['copias'],'readonly',(tx,res)=>{const p=tx.objectStore('copias').get([u,r]);p.onsuccess=()=>res(p.result??null);});}
export function guardarCopiaBiblioteca(c:CopiaBiblioteca):Promise<void>{return operar(['copias'],'readwrite',tx=>{tx.objectStore('copias').put(c,[c.usuarioId,c.recurso.id]);});}
function actualizarVerificacion(c:CopiaBiblioteca,cambios:Partial<CopiaBiblioteca>):Promise<CopiaBiblioteca|null>{return operar(['copias'],'readwrite',(tx,res)=>{const s=tx.objectStore('copias'),p=s.get([c.usuarioId,c.recurso.id]);p.onsuccess=()=>{const actual=p.result as CopiaBiblioteca|undefined;if(!actual){res(null);return;}if(actual.guardadaEn!==c.guardadaEn&&!cambios.revocada){res(actual);return;}const nueva={...actual,...cambios};s.put(nueva,[c.usuarioId,c.recurso.id]);res(nueva);};});}
export function quitarCopiaBiblioteca(u:number,r:string,quitarNotas=false):Promise<void>{return operar(['copias','notas'],'readwrite',tx=>{const s=tx.objectStore('copias');if(quitarNotas){s.delete([u,r]);tx.objectStore('notas').delete(rango(u,r));}else{const p=s.get([u,r]);p.onsuccess=()=>{if(p.result)s.put({...p.result,blob:null},[u,r]);};}});}
export function listarNotasLocales(u:number,r:string):Promise<NotaBibliotecaLocal[]>{return operar(['notas'],'readonly',(tx,res)=>{const p=tx.objectStore('notas').getAll(rango(u,r));p.onsuccess=()=>res(p.result);});}
export function crearNotaLocal(u:number,r:string,ubicacion:string,contenido:string,versionOrigen:string):Promise<void>{
  if(!contenido.trim()||contenido.length>10000||ubicacion.length>200)return Promise.reject(new Error('Escribí una nota de hasta 10000 caracteres y una referencia de hasta 200.'));
  const nota:NotaBibliotecaLocal={clave:crypto.randomUUID(),ubicacion,contenido:contenido.trim(),versionOrigen,creadaEn:new Date().toISOString()};
  return operar(['notas'],'readwrite',tx=>{tx.objectStore('notas').put(nota,[u,r,nota.clave]);});
}
export function quitarNotaLocal(u:number,r:string,clave:string):Promise<void>{return operar(['notas'],'readwrite',tx=>{tx.objectStore('notas').delete([u,r,clave]);});}
export class ErrorBibliotecaLocal extends Error{estado:number;versionActual?:string;constructor(estado:number,mensaje:string,versionActual?:string){super(mensaje);this.estado=estado;this.versionActual=versionActual;}}
async function pedir<T>(ruta:string,opciones:RequestInit={}):Promise<T>{
  const res=await fetch(ruta,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(25000),...opciones});let datos;
  try{datos=await res.json();}catch{throw new Error('El servidor no devolvió una respuesta válida. La copia local sigue disponible.');}
  if(!res.ok)throw new ErrorBibliotecaLocal(res.status,datos.error??'No se pudo consultar el recurso.',datos.versionActual);
  return datos;
}
export const consultarInstantanea=(r:string)=>pedir<InstantaneaBiblioteca>(`/api/biblioteca/recursos/${encodeURIComponent(r)}/copia-local`);
export async function descargarCopiaBiblioteca(u:number,r:string):Promise<CopiaBiblioteca>{
  const instantanea=await consultarInstantanea(r);
  let blob:Blob|null=null;
  if(instantanea.archivo){
    const estimacion=await navigator.storage?.estimate?.();
    if(estimacion?.quota&&estimacion.usage!==undefined&&estimacion.usage+instantanea.archivo.tamanoBytes>estimacion.quota)throw new Error('No hay espacio local suficiente. Exportá o quitá otras copias y volvé a intentar.');
    const res=await fetch(`/api/archivos/${encodeURIComponent(instantanea.archivo.id)}`,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(300000)});
    if(!res.ok)throw new ErrorBibliotecaLocal(res.status,'No se pudo descargar el archivo autorizado. La copia anterior se conserva.');
    blob=await res.blob();
    if(instantanea.archivo.tamanoBytes!==null&&blob.size!==instantanea.archivo.tamanoBytes)throw new Error('La descarga quedó incompleta. La copia anterior se conserva.');
    const comprobacion=await consultarInstantanea(r);
    if(comprobacion.version!==instantanea.version)throw new Error('El recurso cambió durante la descarga. Volvé a guardarlo para obtener una versión consistente.');
  }
  const ahora=new Date().toISOString();const copia:CopiaBiblioteca={...instantanea,usuarioId:u,blob,guardadaEn:ahora,comprobadaEn:ahora};
  await guardarCopiaBiblioteca(copia);return copia;
}
export async function verificarCopiaBiblioteca(u:number,r:string):Promise<CopiaBiblioteca|null>{
  const c=await leerCopiaBiblioteca(u,r);if(!c)return null;
  try{
    const actual=await consultarInstantanea(r);
    const cambios={comprobadaEn:new Date().toISOString(),revocada:false,versionDisponible:actual.version!==c.version?actual.version:undefined,anotaciones:actual.anotaciones};
    // Si el acceso había sido revocado, no se reconstruyen los bytes sin descarga explícita.
    return await actualizarVerificacion(c,cambios);
  }catch(e){if(e instanceof ErrorBibliotecaLocal&&[403,404].includes(e.estado)){return await actualizarVerificacion(c,{recurso:{...c.recurso,descripcion:''},blob:null,anotaciones:[],revocada:true,comprobadaEn:new Date().toISOString()});}throw e;}
}
export async function sincronizarNotasBiblioteca(u:number,r:string,aceptarVersionActual=false):Promise<number>{
  const copia=await leerCopiaBiblioteca(u,r);if(!copia)throw new Error('No hay una copia local de este recurso.');
  const actual=await verificarCopiaBiblioteca(u,r);if(!actual||actual.revocada)throw new Error('El acceso al original fue retirado. Tus notas locales se conservan para exportarlas.');
  if(actual.versionDisponible&&!aceptarVersionActual)throw new ErrorBibliotecaLocal(409,'El original cambió. Revisá la diferencia de versión antes de vincular tus notas a la versión actual.',actual.versionDisponible);
  const pendientes=(await listarNotasLocales(u,r)).filter(n=>!n.sincronizada);let total=0;
  for(let i=0;i<pendientes.length;i+=100){
    const lote=pendientes.slice(i,i+100);
    const respuesta=await pedir<{confirmadas:{clave:string;id:string|null}[]}>(`/api/biblioteca/recursos/${encodeURIComponent(r)}/anotaciones-locales`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:actual.versionDisponible??actual.version,notas:lote})});
    await operar<void>(['notas'],'readwrite',tx=>{for(const n of respuesta.confirmadas){const s=tx.objectStore('notas'),p=s.get([u,r,n.clave]);p.onsuccess=()=>{if(p.result)s.put({...p.result,sincronizada:true,servidorId:n.id},[u,r,n.clave]);};}});total+=respuesta.confirmadas.length;
  }
  return total;
}
function escapar(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export async function respaldoBibliotecaHtml(c:CopiaBiblioteca,notas:NotaBibliotecaLocal[]):Promise<Blob>{
  // HTML autónomo, sin scripts ni dependencias remotas. No importa respaldos como fuente autorizada.
  const data=c.blob?await new Promise<string>((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(String(f.result));f.onerror=()=>reject(f.error);f.readAsDataURL(c.blob!);}):null;
  const tipo=c.archivo?.tipoMime??'';
  const medio=!data?'':tipo==='application/pdf'?`<object data="${escapar(data)}" type="application/pdf" width="100%" height="600"></object>`:/^audio\//.test(tipo)?`<audio controls src="${escapar(data)}"></audio>`:/^video\//.test(tipo)?`<video controls style="max-width:100%" src="${escapar(data)}"></video>`:/^image\/(png|jpeg|gif|webp)$/.test(tipo)?`<img alt="${escapar(c.recurso.titulo)}" style="max-width:100%" src="${escapar(data)}">`:tipo.startsWith('text/')?`<pre>${escapar(await c.blob!.text())}</pre>`:'';
  const archivo=data?`<p><a href="${escapar(data)}" download="${escapar(c.archivo?.nombre??'archivo')}">Descargar archivo incluido</a></p>`:'';
  return new Blob([`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; media-src data:; object-src data:; style-src 'unsafe-inline'"><title>${escapar(c.recurso.titulo)}</title><body style="font-family:system-ui;max-width:1000px;margin:auto;padding:24px"><h1>${escapar(c.recurso.titulo)}</h1><p>${escapar(c.recurso.autor)} · copia guardada ${escapar(c.guardadaEn)}</p><p>Versión ${escapar(c.version)}</p><pre style="white-space:pre-wrap">${escapar(c.recurso.descripcion)}</pre>${medio}${archivo}<h2>Mis notas</h2>${[...c.anotaciones.map(n=>({ubicacion:n.ubicacion,contenido:n.contenido})),...notas.filter(n=>!n.servidorId||!c.anotaciones.some(a=>a.id===n.servidorId))].map(n=>`<article><h3>${escapar(n.ubicacion)}</h3><pre style="white-space:pre-wrap">${escapar(n.contenido)}</pre></article>`).join('')}<p>Respaldo local: su acceso no se revoca desde NEXO. Conservá este archivo de acuerdo con los permisos del material.</p></body></html>`],{type:'text/html;charset=utf-8'});
}
