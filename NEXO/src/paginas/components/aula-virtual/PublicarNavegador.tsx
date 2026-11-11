import {useEffect,useRef,useState} from 'react';
import Selector from '../shared/Selector';

function esperarIce(pc:RTCPeerConnection):Promise<void>{
  if(pc.iceGatheringState==='complete')return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const terminar=()=>{window.clearTimeout(t);pc.removeEventListener('icegatheringstatechange',cambio);};
    const cambio=()=>{if(pc.iceGatheringState==='complete'){terminar();resolve();}};
    const t=window.setTimeout(()=>{terminar();reject(new Error('No se pudieron reunir las rutas de red. Revisá la conectividad institucional.'));},15000);
    pc.addEventListener('icegatheringstatechange',cambio);
  });
}

/** Publicación WHIP con ICE completo y sin proveedores STUN/TURN externos. */
export default function PublicarNavegador({url}:{url:string}){
  const [modo,setModo]=useState('camara'),[microfono,setMicrofono]=useState(true),[estado,setEstado]=useState('listo'),[error,setError]=useState('');
  const preview=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),conexion=useRef<RTCPeerConnection|null>(null);
  const pistas=useRef<MediaStreamTrack[]>([]),audio=useRef<AudioContext|null>(null),sesion=useRef<string|null>(null),cancelar=useRef<AbortController|null>(null),generacion=useRef(0);
  const limpiar=()=>{
    cancelar.current?.abort();cancelar.current=null;
    conexion.current?.close();conexion.current=null;
    pistas.current.forEach(p=>p.stop());pistas.current=[];stream.current=null;
    if(preview.current)preview.current.srcObject=null;
    if(audio.current){void audio.current.close();audio.current=null;}
    if(sesion.current){const s=sesion.current;sesion.current=null;void fetch(s,{method:'DELETE',credentials:'same-origin',keepalive:true}).catch(()=>{});}
  };
  useEffect(()=>()=>{generacion.current++;limpiar();},[url]);
  const detener=()=>{generacion.current++;limpiar();setEstado('listo');};
  const iniciar=async()=>{
    const actual=++generacion.current;setError('');setEstado('capturando');
    try{
      if(!navigator.mediaDevices||!window.RTCPeerConnection)throw new Error('Este navegador no permite transmitir. Usá OBS en un equipo compatible.');
      const principal=modo==='pantalla'?await navigator.mediaDevices.getDisplayMedia({video:true,audio:true}):await navigator.mediaDevices.getUserMedia({video:modo==='camara',audio:modo==='audio'||microfono});
      if(actual!==generacion.current){principal.getTracks().forEach(p=>p.stop());return;}
      pistas.current=principal.getTracks();
      let salida=principal;
      if(modo==='pantalla'&&microfono){
        const mic=await navigator.mediaDevices.getUserMedia({audio:true});
        if(actual!==generacion.current){mic.getTracks().forEach(p=>p.stop());return;}
        pistas.current.push(...mic.getTracks());
        const ctx=new AudioContext();audio.current=ctx;const destino=ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(mic).connect(destino);
        if(principal.getAudioTracks().length)ctx.createMediaStreamSource(new MediaStream(principal.getAudioTracks())).connect(destino);
        pistas.current.push(...destino.stream.getTracks());salida=new MediaStream([...principal.getVideoTracks(),...destino.stream.getAudioTracks()]);
      }
      stream.current=salida;if(preview.current){preview.current.srcObject=salida;void preview.current.play().catch(()=>{});}
      const pc=new RTCPeerConnection({bundlePolicy:'max-bundle',iceServers:[]});conexion.current=pc;
      for(const track of salida.getTracks())pc.addTransceiver(track,{direction:'sendonly',streams:[salida]});
      pc.onconnectionstatechange=()=>{
        if(actual!==generacion.current)return;
        if(pc.connectionState==='connected')setEstado('en-vivo');
        if(['failed','disconnected'].includes(pc.connectionState)){setEstado('interrumpida');setError('La conexión se interrumpió. Detené la publicación y volvé a iniciarla para negociar una ruta nueva.');}
      };
      principal.getVideoTracks()[0]?.addEventListener('ended',()=>{if(actual===generacion.current)detener();},{once:true});
      setEstado('conectando');await pc.setLocalDescription(await pc.createOffer());await esperarIce(pc);
      if(actual!==generacion.current)return;
      const controller=new AbortController();cancelar.current=controller;
      const timeout=window.setTimeout(()=>controller.abort(),20000);
      let respuesta:Response;
      try{respuesta=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/sdp'},body:pc.localDescription?.sdp,signal:controller.signal});}finally{window.clearTimeout(timeout);}
      if(!respuesta.ok){const d=await respuesta.json().catch(()=>({}));throw new Error(d.error||'El servidor de medios no aceptó la publicación.');}
      const location=respuesta.headers.get('location');if(!location)throw new Error('No se recibió la identificación de la emisión.');
      const recurso=new URL(location,window.location.origin);
      if(recurso.origin!==window.location.origin||!recurso.pathname.startsWith(url+'/'))throw new Error('El servidor devolvió una dirección de emisión inesperada.');
      if(actual!==generacion.current){void fetch(recurso.pathname,{method:'DELETE',credentials:'same-origin',keepalive:true});return;}
      sesion.current=recurso.pathname;await pc.setRemoteDescription({type:'answer',sdp:await respuesta.text()});
    }catch(e){if(actual===generacion.current){limpiar();setEstado('listo');setError(e instanceof Error?e.message:'No se pudo transmitir.');}}
  };
  return <details className="rounded-xl border border-white/15 p-3 text-sm text-slate-200"><summary>Transmitir desde este navegador</summary>
    <div className="mt-2 space-y-3"><label className="block">Compartir <Selector disabled={estado!=='listo'} value={modo} onChange={e=>setModo(e.target.value)}><option value="camara">Cámara</option><option value="pantalla">Pantalla</option><option value="audio">Sólo audio</option></Selector></label>
      {modo!=='audio'&&<label className="flex gap-2"><input disabled={estado!=='listo'} type="checkbox" checked={microfono} onChange={e=>setMicrofono(e.target.checked)}/>Incluir micrófono</label>}
      <video ref={preview} muted playsInline className="max-h-48 w-full rounded bg-black" hidden={estado==='listo'}/>
      <p role="status">{estado==='en-vivo'?'Transmitiendo al servidor institucional':estado==='listo'?'Preparado para transmitir':estado==='capturando'?'Seleccioná cámara o pantalla':estado==='conectando'?'Negociando conexión privada':'Conexión interrumpida'}</p>
      {estado==='listo'?<button type="button" onClick={()=>void iniciar()} className="text-primary">Iniciar transmisión del navegador</button>:<button type="button" onClick={detener} className="text-rose-300">Detener publicación</button>}
      {error&&<p role="alert" className="text-amber-200">{error}</p>}
      <p className="text-xs text-slate-400">Requiere que el servidor institucional admita WebRTC y sea accesible desde este equipo. La publicación ocupa la misma señal que OBS; elegí un solo origen. El chat y las actividades siguen en el aula.</p>
    </div></details>;
}
