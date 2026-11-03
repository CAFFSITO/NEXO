import { useEffect, useRef, useState } from 'react';
import { pedir } from '../../../servicios/api';

type Estado = {habilitada:boolean;motivo?:string;hlsUrl?:string;obsServidor?:string;expiraEnMinutos?:number};

/** Visualización HLS separada de la sala WebRTC para quienes solo miran. */
export default function TransmisionClase({claseId,esDocente}:{claseId:string;esDocente:boolean}){
  const video=useRef<HTMLVideoElement>(null);
  const [estado,setEstado]=useState<Estado|null>(null);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{let vigente=true;pedir<Estado>(`/api/aula/clases/${claseId}/transmision`).then(d=>{if(vigente){setEstado(d);setError('');}}).catch(e=>{if(vigente)setError(e instanceof Error?e.message:'No se pudo consultar la transmisión.');});return()=>{vigente=false;};},[claseId,revision]);
  useEffect(()=>{
    const medio=video.current,url=estado?.hlsUrl;
    if(!medio||!estado?.habilitada||!url)return;
    if(medio.canPlayType('application/vnd.apple.mpegurl')){medio.src=url;return()=>{medio.removeAttribute('src');medio.load();};}
    let vigente=true;
    let instancia: import('hls.js').default|null=null;
    void import('hls.js').then(({default:Hls})=>{
      if(!vigente)return;
      if(!Hls.isSupported()){setError('Este navegador no admite reproducción HLS.');return;}
      instancia=new Hls({enableWorker:true,lowLatencyMode:true});
      instancia.loadSource(url);instancia.attachMedia(medio);
      instancia.on(Hls.Events.ERROR,(_,datos)=>{if(datos.fatal)setError('La transmisión todavía no está disponible o se interrumpió.');});
    }).catch(()=>{if(vigente)setError('No se pudo cargar el reproductor HLS.');});
    return()=>{vigente=false;instancia?.destroy();};
  },[estado]);
  return <div className="flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-black p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-white">Transmisión institucional</h3><button type="button" className="text-xs text-primary" onClick={()=>setRevision(x=>x+1)}>Reconectar</button></div>
    {!estado&&!error&&<p className="text-slate-400">Preparando reproductor…</p>}
    {estado&&!estado.habilitada&&<p className="text-amber-200">{estado.motivo}</p>}
    {estado?.habilitada&&<video ref={video} controls playsInline className="min-h-0 w-full flex-1 rounded bg-black" />}
    {error&&<p role="alert" className="text-amber-200 text-sm">{error}</p>}
    {esDocente&&estado?.obsServidor&&<details className="text-xs text-slate-300"><summary>Configurar OBS para esta clase</summary><p className="mt-1">En OBS: Servicio personalizado. Pegá la dirección completa como servidor; dejá la clave de transmisión vacía. Caduca en {estado.expiraEnMinutos} minutos y deja de servir cuando finaliza la clase.</p><code className="mt-1 block break-all rounded bg-white/10 p-2 select-all">{estado.obsServidor}</code><p>La dirección contiene una credencial temporal: compartila solamente con quien transmite.</p></details>}
  </div>;
}
