import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { enviar, pedir, useDatos } from "../servicios/api";
import Selector from "./components/shared/Selector";
import { useTiempoReal } from "../servicios/tiempoReal";
import { CamposBloque, ContenidoBloque, OpcionesEvaluacion, ResultadoRespuesta, ColaboradoresDocumento, type Bloque, type Evaluacion, type Resultado } from "./components/documentos/BloquesDocumento";

type Documento = { id: string; tipo: "documento" | "formulario"; titulo: string; contenido: Bloque[]; version: number; publicado: boolean; plantilla: boolean; autorId: string; editable?: boolean; propietario?: boolean; evaluacion?: Evaluacion };
const campo = "w-full rounded-xl bg-fondo border border-white/15 px-3 py-2 text-white";
export function DocumentoIntegrado({id}:{id:string|number}) {
  const {navegar}=useNavegacion();
  const {datos,error,recargar}=useDatos<{documento:Documento}>(`/api/documentos/${id}`);
  const ramificar=async(d:Documento,plantilla=false)=>{
    const r=await enviar<{documento:Documento}>(`/api/documentos/${d.id}/ramificar`,'POST',{plantilla});
    navegar(`/documentos?documento=${r.documento.id}`);
  };
  if(error)return <p role="alert">{error}</p>;
  if(!datos)return <p role="status">Abriendo documento…</p>;
  return <Editor key={`${datos.documento.id}-${datos.documento.version}`} inicial={datos.documento} onGuardar={()=>recargar()} onRamificar={ramificar}/>;
}
export default function DocumentosPage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const location = useLocation();
  const { datos, recargar, error } = useDatos<{ documentos: Documento[] }>("/api/documentos");
  const [doc, setDoc] = useState<Documento | null>(null);
  const [tipo, setTipo] = useState<Documento["tipo"]>("documento");
  const [titulo, setTitulo] = useState("");
  const [aviso, setAviso] = useState("");
  const abrir = async (id: string) => { try { const r = await pedir<{ documento: Documento }>(`/api/documentos/${id}`); setDoc(r.documento); setAviso(""); } catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo abrir."); } };
  useEffect(()=>{
    const id=new URLSearchParams(location.search).get("documento");
    if(!id||!/^\d+$/.test(id))return;
    let activo=true;
    void pedir<{ documento: Documento }>(`/api/documentos/${id}`).then(r=>{
      if(activo){setDoc(r.documento);setAviso("");}
    }).catch(e=>{
      if(activo)setAviso(e instanceof Error ? e.message : "No se pudo abrir.");
    });
    return ()=>{activo=false;};
  },[location.search]);
  const ramificar = async (d: Documento, plantilla = false) => { try { const r = await enviar<{ documento: Documento }>(`/api/documentos/${d.id}/ramificar`, "POST", { plantilla }); setDoc({ ...r.documento, editable: true }); recargar(); setAviso(""); } catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo copiar."); } };
  const crear = async () => {
    try { const r = await enviar<{ documento: Documento }>("/api/documentos", "POST", { tipo, titulo, contenido: [] }); setDoc({ ...r.documento, editable: true }); setTitulo(""); recargar(); setAviso(""); }
    catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo crear."); }
  };
  if (!usuario) return null;
  return <div className="flex min-h-screen bg-fondo"><Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
    <main id="contenido-principal" className="app-content min-w-0"><TopBar title="Documentos y formularios" />
      <div className="mx-auto max-w-6xl p-5 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4"><h1 className="text-xl font-bold">Crear contenido</h1><Selector value={tipo} onChange={e=>setTipo(e.target.value as Documento["tipo"])}><option value="documento">Documento</option><option value="formulario">Formulario</option></Selector><input className={campo} aria-label="Título nuevo" value={titulo} maxLength={200} onChange={e=>setTitulo(e.target.value)} placeholder="Título" /><button className="rounded-xl bg-primary px-4 py-2" onClick={()=>void crear()}>Crear</button>
          {error && <p role="alert">{error}</p>}{aviso && <p role="alert">{aviso}</p>}
          <h2 className="font-bold">En esta institución</h2>{datos?.documentos.map(d=><div key={d.id} className="rounded-lg bg-lienzo p-3"><button className="block text-left w-full" onClick={()=>void abrir(d.id)}>{d.titulo}<span className="block text-xs text-slate-400">{d.tipo} · v{d.version}{d.plantilla ? " · plantilla" : ""}</span></button><button className="text-xs text-primary" onClick={()=>void ramificar(d)}>Crear copia</button></div>)}
        </aside><section>{doc ? <Editor key={`${doc.id}-${doc.version}`} inicial={doc} onGuardar={d=>{setDoc(d);recargar();}} onRamificar={ramificar} /> : <p className="text-slate-300">Elegí o creá un documento. Las plantillas crean copias independientes; los formularios publicados reciben respuestas.</p>}</section>
      </div></main></div>;
}
function Editor({ inicial, onGuardar, onRamificar }: { inicial: Documento; onGuardar: (d: Documento) => void; onRamificar: (d: Documento, plantilla?: boolean) => Promise<void> }) {
  const [doc, setDoc] = useState(inicial); const [error, setError] = useState(""); const [comentario, setComentario] = useState("");
  const borrador = useRef(false); const [versionRemota, setVersionRemota] = useState<number | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false); const [respuesta, setRespuesta] = useState<Record<string, string | string[] | number>>({}); const [mensaje, setMensaje] = useState("");
  const { datos: comentarios, recargar } = useDatos<{ comentarios: { id: number; texto: string }[] }>(`/api/documentos/${doc.id}/comentarios`);
  const { datos: versiones } = useDatos<{ versiones: { version: number; creadoEn: string }[] }>(doc.editable ? `/api/documentos/${doc.id}/versiones` : null);
  const { datos: respuestas, recargar: recargarRespuestas } = useDatos<{ respuestas: { id: number; respuestas: Record<string, unknown>; resultado?: Resultado }[] }>(doc.editable && doc.tipo === "formulario" ? `/api/documentos/${doc.id}/respuestas` : null);
  const { datos: misIntentos, recargar: recargarIntentos } = useDatos<{respuestas:{id:number;resultado?:Resultado}[]}>(doc.tipo === "formulario" ? `/api/documentos/${doc.id}/mis-respuestas` : null);
  const editando = doc.editable && !vistaPrevia;
  useTiempoReal(useCallback(evento=>{
    if(evento.tipo!=="documento-version"||evento.documentoId!==doc.id||!evento.version||evento.version<=doc.version)return;
    const version=evento.version;
    void pedir<{documento:Documento}>(`/api/documentos/${doc.id}`).then(r=>{
      if(borrador.current){setVersionRemota(v=>Math.max(v??0,version));return;}
      if(r.documento.version>doc.version)onGuardar(r.documento);
    }).catch(()=>setVersionRemota(v=>Math.max(v??0,version)));
  },[doc.id,doc.version,onGuardar]));
  const cambiar = (id: string, b: Partial<Bloque>) => {borrador.current=true;setDoc(d=>({...d,contenido:d.contenido.map(x=>x.id===id?{...x,...b}:x)}));};
  const agregar = (tipo: Bloque["tipo"]) => {borrador.current=true;setDoc(d=>({...d,contenido:[...d.contenido,{id:crypto.randomUUID(),tipo,texto:"",...(tipo==="pregunta"?{respuesta:"texto" as const,opciones:[]}: {})}]}));};
  const guardar = async () => {try { const r=await enviar<{documento:Documento}>(`/api/documentos/${doc.id}`,"PUT",{version:doc.version,titulo:doc.titulo,contenido:doc.contenido,publicado:doc.publicado,evaluacion:doc.evaluacion??{}});borrador.current=false;onGuardar({...r.documento,editable:true});setError(""); }catch(e){setError(e instanceof Error?e.message:"No se guardó.");}};
  const cargarUltima = async () => {try {const r=await pedir<{documento:Documento}>(`/api/documentos/${doc.id}`);borrador.current=false;onGuardar(r.documento);setVersionRemota(null);setError("");}catch(e){setError(e instanceof Error?e.message:"No se pudo cargar la última versión.");}};
  const comentar = async () => {try {await enviar(`/api/documentos/${doc.id}/comentarios`,"POST",{texto:comentario});setComentario("");recargar();}catch(e){setError(e instanceof Error?e.message:"No se comentó.");}};
  const restaurar = async (version: number) => {try {const r=await enviar<{documento:Documento}>(`/api/documentos/${doc.id}/restaurar`,"POST",{version,actual:doc.version});onGuardar({...r.documento,editable:true});setError("");}catch(e){setError(e instanceof Error?e.message:"No se restauró.");}};
  const enviarRespuesta = async () => {try {await enviar(`/api/documentos/${doc.id}/respuestas`,"POST",{respuestas:respuesta});setRespuesta({});setMensaje("Respuesta enviada.");recargarRespuestas();recargarIntentos();}catch(e){setMensaje(e instanceof Error?e.message:"No se envió.");}};
  const preguntasVisibles = new Set<string>();
  for (const b of doc.contenido) if (b.tipo === "pregunta" && (!b.visibleSi || preguntasVisibles.has(b.visibleSi.id) && (b.visibleSi.operador === "igual") === (String(respuesta[b.visibleSi.id] ?? "") === b.visibleSi.valor))) preguntasVisibles.add(b.id);
  const visible = (b: Bloque) => preguntasVisibles.has(b.id);
  return <div className="space-y-5">{versionRemota!==null&&<div role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">Hay una versión nueva (v{versionRemota}). Los cambios en bloques distintos se fusionan al guardar; editar el mismo bloque causa un conflicto. <button className="underline ml-2" onClick={()=>void cargarUltima()}>Descartar mi borrador y cargar la última</button></div>}{doc.editable ? <input className={`${campo} text-xl font-bold`} aria-label="Título del documento" value={doc.titulo} onChange={e=>{borrador.current=true;setDoc({...doc,titulo:e.target.value});}}/> : <h1 className="text-2xl font-bold">{doc.titulo}</h1>}
    {doc.editable && <button className="rounded-lg bg-white/10 px-3 py-2" onClick={()=>setVistaPrevia(v=>!v)}>{vistaPrevia?"Volver al editor":"Vista de lectura / responder"}</button>}
    {editando && <div className="flex flex-wrap gap-2">{(["titulo","texto","lista","tabla","enlace","archivo","accionable",...(doc.tipo==="formulario"?["pregunta"]:[])] as Bloque["tipo"][]).map(t=><button key={t} className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={()=>agregar(t)}>+ {t}</button>)}</div>}
    {doc.contenido.filter(b=>editando||b.tipo!=="pregunta"||visible(b)).map(b=><div key={b.id} className="rounded-xl border border-white/10 p-3 space-y-2">{editando ? <><label className="text-xs text-slate-400">{b.tipo}<textarea className={campo} rows={b.tipo==="texto"?5:2} value={b.texto} onChange={e=>cambiar(b.id,{texto:e.target.value})}/></label><CamposBloque bloque={b} cambiar={x=>cambiar(b.id,x)}/>{b.tipo==="pregunta" && <><Selector value={b.respuesta??"texto"} onChange={e=>cambiar(b.id,{respuesta:e.target.value as Bloque["respuesta"],correcta:undefined})}>{["texto","numero","seleccion","multiple","fecha"].map(t=><option key={t} value={t}>{t}</option>)}</Selector><label><input type="checkbox" checked={!!b.obligatoria} onChange={e=>cambiar(b.id,{obligatoria:e.target.checked})}/> Obligatoria</label>{["seleccion","multiple"].includes(b.respuesta??"") && <input className={campo} value={b.opciones?.join(", ")??""} placeholder="Opciones separadas por coma" onChange={e=>cambiar(b.id,{opciones:e.target.value.split(",").map(s=>s.trim()).filter(Boolean),correcta:undefined})}/>}<label className="block text-xs">Mostrar según pregunta anterior<Selector value={b.visibleSi?.id??""} onChange={e=>cambiar(b.id,{visibleSi:e.target.value?{id:e.target.value,operador:"igual",valor:""}:undefined})}><option value="">Siempre</option>{doc.contenido.slice(0,doc.contenido.indexOf(b)).filter(x=>x.tipo==="pregunta").map(x=><option key={x.id} value={x.id}>{x.texto||"Pregunta anterior"}</option>)}</Selector></label>{b.visibleSi && <div className="flex gap-2"><Selector value={b.visibleSi.operador} onChange={e=>cambiar(b.id,{visibleSi:{...b.visibleSi!,operador:e.target.value as "igual"|"distinto"}})}><option value="igual">Es igual a</option><option value="distinto">Es distinto de</option></Selector><input className={campo} aria-label="Valor de condición" value={b.visibleSi.valor} onChange={e=>cambiar(b.id,{visibleSi:{...b.visibleSi!,valor:e.target.value}})}/></div>}</>}<button className="text-rose-300 text-sm" onClick={()=>{borrador.current=true;setDoc(d=>({...d,contenido:d.contenido.filter(x=>x.id!==b.id)}));}}>Quitar bloque</button></> : <><ContenidoBloque bloque={b} documentoId={doc.id}/>{doc.tipo==="formulario"&&doc.publicado&&b.tipo==="pregunta"&&visible(b)&&<CampoRespuesta bloque={b} valor={respuesta[b.id]} cambiar={v=>setRespuesta(r=>({...r,[b.id]:v}))}/>}</>}</div>)}
    {editando ? <>{doc.tipo==="formulario"&&<OpcionesEvaluacion valor={doc.evaluacion??{}} cambiar={evaluacion=>{borrador.current=true;setDoc({...doc,evaluacion});}}/>}<label className="flex gap-2"><input type="checkbox" checked={doc.publicado} onChange={e=>{borrador.current=true;setDoc({...doc,publicado:e.target.checked});}}/> Publicar en la institución</label><button className="rounded-xl bg-primary px-5 py-2" onClick={()=>void guardar()}>Guardar versión {doc.version+1}</button><button className="text-primary ml-3" onClick={()=>void onRamificar(doc,true)}>Crear plantilla</button><section className="space-y-2"><h3 className="font-bold">Historial</h3>{versiones?.versiones.map(v=><div key={v.version}>Versión {v.version} · {v.creadoEn} <button className="text-primary" onClick={()=>void restaurar(v.version)}>Restaurar</button></div>)}</section><ColaboradoresDocumento documentoId={doc.id} propietario={!!doc.propietario}/>{doc.tipo==="formulario"&&<section><h3 className="font-bold">Respuestas recibidas</h3>{respuestas?.respuestas.map(r=><div key={r.id}><ResultadoRespuesta resultado={r.resultado}/><pre className="overflow-auto text-xs">{JSON.stringify(r.respuestas,null,2)}</pre></div>)}</section>}</> : doc.tipo==="formulario"&&doc.publicado&&<button className="rounded-xl bg-primary px-5 py-2" onClick={()=>void enviarRespuesta()}>Enviar respuestas</button>}{doc.tipo==="formulario"&&<section className="space-y-2"><h3 className="font-bold">Mis intentos</h3>{misIntentos?.respuestas.map(r=><ResultadoRespuesta key={r.id} resultado={r.resultado}/>)}</section>}{mensaje&&<p role="status">{mensaje}</p>}{error&&<p role="alert" className="text-rose-300">{error}</p>}
    <section className="border-t border-white/10 pt-4 space-y-2"><h3 className="font-bold">Comentarios</h3>{comentarios?.comentarios.map(c=><p key={c.id} className="text-sm">{c.texto}</p>)}<input className={campo} aria-label="Comentario" value={comentario} onChange={e=>setComentario(e.target.value)}/><button onClick={()=>void comentar()} className="text-primary">Comentar</button></section>
  </div>;
}
function CampoRespuesta({bloque,valor,cambiar}:{bloque:Bloque;valor:string|string[]|number|undefined;cambiar:(valor:string|string[]|number)=>void}) {
  if(bloque.respuesta==="seleccion") return <Selector value={String(valor??"")} onChange={e=>cambiar(e.target.value)}><option value="">Seleccionar</option>{bloque.opciones?.map(o=><option key={o} value={o}>{o}</option>)}</Selector>;
  if(bloque.respuesta==="multiple") return <div>{bloque.opciones?.map(o=><label key={o} className="flex gap-2"><input type="checkbox" checked={Array.isArray(valor)&&valor.includes(o)} onChange={e=>cambiar(e.target.checked?[...(Array.isArray(valor)?valor:[]),o]:(Array.isArray(valor)?valor:[]).filter(x=>x!==o))}/>{o}</label>)}</div>;
  return <input className={campo} aria-label={bloque.texto||"Respuesta"} type={bloque.respuesta==="numero"?"number":bloque.respuesta==="fecha"?"date":"text"} value={valor??""} onChange={e=>cambiar(bloque.respuesta==="numero"?Number(e.target.value):e.target.value)}/>;
}
