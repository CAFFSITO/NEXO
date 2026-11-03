import { useEffect, useState } from 'react';
import { enviar, pedir } from '../../../servicios/api';
import CapacidadApp from './CapacidadApp';
import { capacidadesApp } from '../../../servicios/appsPublicas';
import type { BloqueApp, DefinicionApp } from '../../../servicios/appsPublicas';

type InstanciaVisible = { id: number; nombre: string; version: number; definicion: DefinicionApp; datos: Record<string, boolean | string> };
type Totales = Record<string,number[]>;

export default function AppsInstaladas() {
  const [apps, setApps] = useState<InstanciaVisible[]>([]);
  const [totales,setTotales]=useState<Record<number,Totales>>({});
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(false);
  useEffect(() => { pedir<InstanciaVisible[]>('/api/apps-publicas/comunidad').then(async lista=>{
    setApps(lista);
    const resultados=await Promise.all(lista.map(async a=>[a.id,(await pedir<{totales:Totales}>(`/api/apps-publicas/comunidad/${a.id}/resumen`)).totales] as const));
    setTotales(Object.fromEntries(resultados));
  }).catch(e => setError(e.message)); }, []);
  const marcar = async (a: InstanciaVisible, id: string, valor: boolean | string) => {
    try {
      const datos = { [id]: valor };
      const respuesta=await enviar<{datos:Record<string,boolean|string>}>(`/api/apps-publicas/comunidad/${a.id}/datos`, 'PUT', { datos });
      setApps(actual => actual.map(x => x.id === a.id ? { ...x, datos:{...x.datos,[id]:respuesta.datos[id]} } : x));
      if(a.definicion.bloques.some(b=>b.id===id&&b.tipo==='encuesta')){
        const resumen=await pedir<{totales:Totales}>(`/api/apps-publicas/comunidad/${a.id}/resumen`);
        setTotales(actual=>({...actual,[a.id]:resumen.totales}));
      }
    } catch (e) { setError((e as Error).message); }
  };
  const reservar=async(a:InstanciaVisible,id:string,opcion:number|null)=>{
    try { const r=await enviar<{datos:Record<string,boolean|string>;totales:Totales}>(`/api/apps-publicas/comunidad/${a.id}/reservas/${id}`,'PUT',{opcion});
      setApps(actual=>actual.map(x=>x.id===a.id?{...x,datos:r.datos}:x));setTotales(actual=>({...actual,[a.id]:r.totales}));setError('');
    }catch(e){setError((e as Error).message);}
  };
  if (!apps.length && !error) return null;
  return <section className="mx-auto w-full max-w-[1180px] px-3 pt-5 sm:px-8" aria-label="Apps de la comunidad">
    <button type="button" className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 font-semibold text-violet-200" aria-expanded={abierta} onClick={() => setAbierta(v => !v)}>Apps de esta comunidad ({apps.length}) {abierta ? '▴' : '▾'}</button>
    {abierta && <div className="mt-3 grid gap-4 md:grid-cols-2">{apps.map(a => <article key={a.id} className="rounded-2xl border border-white/15 bg-surface-container p-4"><h2 className="font-semibold">{a.nombre} <small className="text-white/50">v{a.version}</small></h2><p className="mt-1 text-sm text-on-surface-variant">{a.definicion.descripcion}</p><div className="mt-3 space-y-3">{a.definicion.bloques.filter(b => !b.dependeDe || Boolean(a.datos[b.dependeDe])).map(b => <BloqueInstalado key={b.id} bloque={b} instanciaId={a.id} valor={a.datos[b.id]} total={totales[a.id]?.[b.id]} nombreGrupo={`${a.id}-${b.id}`} onCambiar={valor => marcar(a,b.id,valor)} onReserva={opcion=>reservar(a,b.id,opcion)} />)}</div></article>)}</div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
  </section>;
}

function BloqueInstalado({ bloque: b, instanciaId, valor, total, nombreGrupo, onCambiar, onReserva }: { bloque: BloqueApp; instanciaId:number; valor: boolean | string | undefined; total?:number[]; nombreGrupo:string; onCambiar: (v: boolean | string) => void; onReserva:(opcion:number|null)=>void }) {
  const estado = b.evidencia?.estado ?? 'sin-evaluar';
  const evidencia = estado === 'sin-evaluar' ? 'Sin evaluación científica registrada' : `El creador declara evidencia ${estado}; NEXO no verificó esta valoración`;
  return <div className="rounded-xl border border-white/10 p-3"><h3 className="font-semibold">{b.titulo}</h3><p className="text-sm text-on-surface-variant">{b.contenido}</p>
    {['accionable','bienvenida'].includes(b.tipo) && <label className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={valor === true} onChange={e => onCambiar(e.target.checked)} />{b.tipo === 'bienvenida' ? 'Ya leí la bienvenida' : 'Completado'}</label>}
    {(capacidadesApp as readonly string[]).includes(b.tipo)&&<CapacidadApp instanciaId={instanciaId} bloque={b}/>}
    {b.tipo === 'enlace' && <a className="mt-2 inline-block text-violet-300 underline" href={b.ruta}>Abrir en NEXO</a>}
    {b.tipo === 'embed' && <iframe title={b.titulo} src={b.ruta} sandbox="" referrerPolicy="no-referrer" loading="lazy" className="mt-2 h-72 w-full rounded-lg border border-white/10" />}
    {['encuesta','juego'].includes(b.tipo) && <fieldset className="mt-2 space-y-1"><legend className="sr-only">{b.titulo}</legend>{b.opciones?.map((o, ix) => <label className="flex gap-2 text-sm" key={ix}><input type="radio" name={nombreGrupo} checked={valor === String(ix)} onChange={() => onCambiar(String(ix))} />{o}</label>)}{b.tipo === 'juego' && valor !== undefined && <p role="status" className={Number(valor) === b.correcta ? 'text-emerald-300' : 'text-amber-300'}>{Number(valor) === b.correcta ? 'Respuesta correcta. Explicá por qué funciona.' : 'Revisá el concepto e intentá otra opción.'}</p>}</fieldset>}
    {b.tipo==='encuesta'&&valor!==undefined&&total&&<p className="mt-2 text-xs text-white/70">Respuestas: {total.map((n,i)=>`${b.opciones?.[i]} ${n}`).join(' · ')}</p>}
    {b.tipo==='reserva'&&<div className="mt-2 space-y-2 text-sm"><p>Capacidad por turno: {b.capacidad}</p>{b.opciones?.map((opcion,i)=><button key={i} type="button" disabled={valor!==String(i)&&total!==undefined&&(total[i]??0)>=Number(b.capacidad)} onClick={()=>onReserva(i)} className={`mr-2 rounded px-2 py-1 ${valor===String(i)?'bg-emerald-700':'bg-white/10'} disabled:opacity-40`}>{opcion} · {total?Math.max(0,Number(b.capacidad)-(total[i]??0)):'…'} lugares{valor===String(i)?' · tu reserva':''}</button>)}{valor!==undefined&&<button type="button" className="text-amber-200 underline" onClick={()=>onReserva(null)}>Cancelar mi reserva</button>}</div>}
    <div className="mt-2 space-y-1 text-xs text-amber-300"><p>{evidencia}</p>{b.evidencia?.resumen&&<p>Contexto: {b.evidencia.resumen}</p>}{b.evidencia?.limites&&<p>Límites: {b.evidencia.limites}</p>}{b.evidencia?.revisadoEn&&<p>Revisado: {b.evidencia.revisadoEn}</p>}{b.evidencia?.fuentes?.map(f=><a key={f.url} className="block underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>)}{b.evidencia?.fuente && <a className="ml-2 underline" href={b.evidencia.fuente} target="_blank" rel="noreferrer">Ver fuente</a>}</div>
  </div>;
}
