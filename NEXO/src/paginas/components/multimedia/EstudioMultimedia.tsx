import { useEffect, useMemo, useRef, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { guardarBorradorMultimedia, leerBorradorMultimedia, iniciarCapturaLocal, guardarFragmentoLocal, recuperarCapturaLocal, finalizarCapturaLocal, guardarIntentoLocal, listarIntentosLocales, quitarIntentoLocal, type IntentoMultimedia, type BorradorMultimedia } from "../../../servicios/borradorMultimedia";
import Selector from "../shared/Selector";

type Modo = "audio" | "camara" | "pantalla" | "pantalla-camara";
export type Subtitulo = { inicio: number; fin: number; texto: string };
type MetricaAudio = { pausas: number; segundosEnPausa: number; volumenMedioDbfs: number | null; picoDbfs: number | null; umbralPausaDbfs: number; pausaMinimaSegundos: number; intervalos?: {inicio:number;fin:number}[] };

export default function EstudioMultimedia({ onArchivo }: { onArchivo?: (archivo: File, capitulos: {segundo:number;titulo:string}[], subtitulos: Subtitulo[]) => void }) {
  const { usuario } = useNavegacion();
  const [modo, setModo] = useState<Modo>("audio");
  const [estado, setEstado] = useState<"listo" | "grabando" | "pausa">("listo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [metricasAudio, setMetricasAudio] = useState<MetricaAudio | null>(null);
  const [metricasVideo, setMetricasVideo] = useState<{ cuadros: number; luzMedia: number; cambioMedio: number } | null>(null);
  const [inicioRecorte, setInicioRecorte] = useState(0);
  const [finRecorte, setFinRecorte] = useState(0);
  const [capitulos, setCapitulos] = useState<{ segundo: number; titulo: string }[]>([]);
  const [subtitulos, setSubtitulos] = useState<Subtitulo[]>([]);
  const [tituloCapitulo, setTituloCapitulo] = useState("");
  const [microfono, setMicrofono] = useState(true);
  const [sonidoPantalla, setSonidoPantalla] = useState(true);
  const [resolucion, setResolucion] = useState(1280);
  const [fps, setFps] = useState(24);
  const [tamanoCamara, setTamanoCamara] = useState(25);
  const [esquina, setEsquina] = useState('abajo-derecha');
  const [intentos, setIntentos] = useState<IntentoMultimedia[]>([]);
  const [tituloIntento, setTituloIntento] = useState('');
  const [compararId, setCompararId] = useState('');
  const [idioma, setIdioma] = useState('auto');
  const [umbralPausa, setUmbralPausa] = useState(-35);
  const [minimaPausa, setMinimaPausa] = useState(0.5);
  const [paginaSubtitulos, setPaginaSubtitulos] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const contextoAudio = useRef<AudioContext | null>(null);
  const pistas = useRef<MediaStreamTrack[]>([]);
  const videoVivo = useRef<HTMLVideoElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvasAnalisis = useRef<HTMLCanvasElement | null>(null);
  const muestrasImagen = useRef<{ cuadros: number; luz: number; cambio: number; anterior: Uint8ClampedArray | null; ultimoSegundo: number }>({ cuadros: 0, luz: 0, cambio: 0, anterior: null, ultimoSegundo: -1 });
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const cuadro = useRef<number | null>(null);
  const sesion = useRef(0);
  const preview = useMemo(() => archivo ? URL.createObjectURL(archivo) : "", [archivo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const detenerPistas = () => { pistas.current.forEach(p => p.stop()); pistas.current = []; if (videoVivo.current) videoVivo.current.srcObject = null; if (cuadro.current) cancelAnimationFrame(cuadro.current); cuadro.current = null; if (contextoAudio.current) { void contextoAudio.current.close(); contextoAudio.current = null; } };
  useEffect(() => () => { sesion.current++; if (grabador.current?.state !== "inactive") grabador.current?.stop(); detenerPistas(); }, []);
  useEffect(() => { if (archivo && usuario?.id) void guardarBorradorMultimedia(usuario.id, archivo, capitulos, { texto, duracion, subtitulos, metricasAudio, metricasVideo }).catch(() => setError("No pudo guardarse el borrador local. Descargá una copia para conservarla.")); }, [archivo, capitulos, texto, duracion, subtitulos, metricasAudio, metricasVideo, usuario?.id]);
  useEffect(() => { if (usuario?.id) void listarIntentosLocales(usuario.id).then(setIntentos).catch(() => setError('No se pudo abrir la biblioteca local.')); }, [usuario?.id]);
  const restaurar = (b: BorradorMultimedia) => {
    setArchivo(b.archivo); setCapitulos(b.capitulos); setTexto(b.texto ?? ''); setSubtitulos(b.subtitulos ?? []);
    setDuracion(b.duracion ?? 0); setMetricasAudio(b.metricasAudio ?? null); setMetricasVideo(b.metricasVideo ?? null);
    muestrasImagen.current = { cuadros: 0, luz: 0, cambio: 0, anterior: null, ultimoSegundo: -1 };
  };
  const iniciar = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) { setError("Este navegador no permite grabar. Podés subir un archivo local."); return; }
    const token = ++sesion.current; setError(""); setArchivo(null); setTexto(""); setSubtitulos([]); setMetricasAudio(null); setMetricasVideo(null); muestrasImagen.current = { cuadros: 0, luz: 0, cambio: 0, anterior: null, ultimoSegundo: -1 }; setCapitulos([]);
    let pantalla: MediaStream | null = null;
    let micro: MediaStream | null = null;
    try {
      pantalla = modo.startsWith("pantalla") ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: sonidoPantalla }) : null;
      const conCamara = modo === 'camara' || modo === 'pantalla-camara';
      if (microfono || conCamara || modo === 'audio') micro = await navigator.mediaDevices.getUserMedia({ audio: microfono || modo === 'audio', video: conCamara ? { width: { ideal: resolucion }, frameRate: { ideal: fps } } : false });
      if (token !== sesion.current) { pantalla?.getTracks().forEach(p => p.stop()); micro?.getTracks().forEach(p => p.stop()); return; }
      pistas.current = [...(pantalla?.getTracks() ?? []), ...(micro?.getTracks() ?? [])];
      let videoTrack = pantalla?.getVideoTracks()[0] ?? micro?.getVideoTracks()[0];
      if (modo === "pantalla-camara" && pantalla && micro?.getVideoTracks()[0]) {
        const canvas = document.createElement("canvas"); canvas.width = resolucion; canvas.height = Math.round(resolucion * 9 / 16); lienzo.current = canvas;
        const base = document.createElement("video"); base.srcObject = new MediaStream([pantalla.getVideoTracks()[0]]); base.muted = true; await base.play();
        const cam = document.createElement("video"); cam.srcObject = new MediaStream([micro.getVideoTracks()[0]]); cam.muted = true; await cam.play();
        const contexto = canvas.getContext("2d")!;
        const dibujar = () => { contexto.drawImage(base, 0, 0, canvas.width, canvas.height); const ancho = canvas.width * tamanoCamara / 100; const alto = ancho * (cam.videoHeight / (cam.videoWidth || 1)); contexto.drawImage(cam, esquina.endsWith('derecha') ? canvas.width - ancho - 10 : 10, esquina.startsWith('abajo') ? canvas.height - alto - 10 : 10, ancho, alto); cuadro.current = requestAnimationFrame(dibujar); }; dibujar();
        videoTrack = canvas.captureStream(fps).getVideoTracks()[0]; pistas.current.push(videoTrack);
      }
      const audioContext = new AudioContext(); contextoAudio.current = audioContext; const destino = audioContext.createMediaStreamDestination();
      destino.stream.getAudioTracks().forEach(p => pistas.current.push(p));
      if (micro?.getAudioTracks().length) audioContext.createMediaStreamSource(new MediaStream(micro.getAudioTracks())).connect(destino);
      if (pantalla?.getAudioTracks().length) audioContext.createMediaStreamSource(new MediaStream(pantalla.getAudioTracks())).connect(destino);
      const stream = new MediaStream([...destino.stream.getAudioTracks(), ...(videoTrack ? [videoTrack] : [])]);
      const tipos = videoTrack ? ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const tipo = tipos.find(t => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined); grabador.current = rec;
      const partes: Blob[] = [];
      const capturaId = crypto.randomUUID(), usuarioId = usuario?.id;
      let escritura = usuarioId ? iniciarCapturaLocal(usuarioId, capturaId, rec.mimeType) : Promise.resolve();
      let numero = 0;
      rec.ondataavailable = e => { if (e.data.size) { partes.push(e.data); const indice = numero++; if (usuarioId) escritura = escritura.then(() => guardarFragmentoLocal(usuarioId, capturaId, indice, e.data)); void escritura.catch(() => { if (token === sesion.current) setError('No se pudieron guardar fragmentos locales. Conservá una copia al terminar.'); }); } };
      rec.onstop = async () => {
        const salida = new File(partes, `nexo-${Date.now()}.${rec.mimeType.includes("mp4") ? "mp4" : "webm"}`, { type: rec.mimeType });
        try { await escritura; if (usuarioId) { await guardarBorradorMultimedia(usuarioId, salida); await finalizarCapturaLocal(usuarioId, capturaId); } }
        catch { if (token === sesion.current) setError('No se pudo guardar toda la captura. Descargá una copia.'); }
        if (token === sesion.current) { setArchivo(salida); setEstado('listo'); detenerPistas(); }
      };
      pantalla?.getVideoTracks()[0]?.addEventListener("ended", () => { if (rec.state !== "inactive") rec.stop(); }, { once: true });
      rec.start(1000); setEstado("grabando"); if (videoVivo.current) { videoVivo.current.srcObject = stream; void videoVivo.current.play(); }
    } catch (e) { pantalla?.getTracks().forEach(p => p.stop()); micro?.getTracks().forEach(p => p.stop()); detenerPistas(); setEstado("listo"); setError(e instanceof Error ? e.message : "No se pudo iniciar la captura."); }
  };
  const alternar = () => { const rec = grabador.current; if (rec?.state === "recording") { rec.pause(); setEstado("pausa"); } else if (rec?.state === "paused") { rec.resume(); setEstado("grabando"); } };
  const terminar = () => { if (grabador.current?.state !== "inactive") grabador.current?.stop(); };
  const transcribir = async () => {
    if (!archivo) return; setProcesando(true); setError("");
    try { const respuesta = await fetch(`/api/multimedia/transcribir?idioma=${encodeURIComponent(idioma)}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": archivo.type || "audio/webm" }, body: archivo }); const datos = await respuesta.json(); if (!respuesta.ok) throw new Error(datos.error); setTexto(datos.texto); setSubtitulos(datos.subtitulos ?? []); setPaginaSubtitulos(0); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo transcribir."); }
    finally { setProcesando(false); }
  };
  const analizarAudio = async () => {
    if (!archivo) return; setProcesando(true); setError("");
    try { const respuesta = await fetch(`/api/multimedia/analizar-audio?umbral=${umbralPausa}&minima=${minimaPausa}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": archivo.type || "audio/webm" }, body: archivo }); const datos = await respuesta.json(); if (!respuesta.ok) throw new Error(datos.error); setMetricasAudio(datos as MetricaAudio); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo analizar el audio."); }
    finally { setProcesando(false); }
  };
  const recortar = async () => {
    if (!archivo || !(finRecorte > inicioRecorte) || finRecorte > duracion) { setError("Elegí un inicio y un fin dentro de la duración."); return; }
    setProcesando(true); setError("");
    try {
      const respuesta = await fetch(`/api/multimedia/recortar?inicio=${inicioRecorte}&fin=${finRecorte}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": archivo.type || "video/webm" }, body: archivo });
      if (!respuesta.ok) { const datos = await respuesta.json(); throw new Error(datos.error); }
      const salida = new File([await respuesta.blob()], `nexo-recorte-${Date.now()}.webm`, { type: "video/webm" });
      setArchivo(salida); setTexto(""); setSubtitulos([]); setMetricasAudio(null); setMetricasVideo(null); muestrasImagen.current = { cuadros: 0, luz: 0, cambio: 0, anterior: null, ultimoSegundo: -1 }; setCapitulos(capitulos.filter(c => c.segundo >= inicioRecorte && c.segundo <= finRecorte).map(c => ({ ...c, segundo: c.segundo - inicioRecorte })));
      setDuracion(finRecorte - inicioRecorte); setInicioRecorte(0); setFinRecorte(0);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo recortar."); }
    finally { setProcesando(false); }
  };
  const descargarCapitulos = () => {
    const enlace = document.createElement("a");
    const url = URL.createObjectURL(new Blob([JSON.stringify({ archivo: archivo?.name, capitulos }, null, 2)], { type: "application/json" }));
    enlace.href = url; enlace.download = `${archivo?.name ?? "grabacion"}.capitulos.json`; enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const analizarCuadro = () => {
    const elemento = video.current;
    if (!elemento || !elemento.videoWidth || Math.floor(elemento.currentTime) === muestrasImagen.current.ultimoSegundo) return;
    const canvas = canvasAnalisis.current ?? document.createElement("canvas"); canvasAnalisis.current = canvas; canvas.width = 64; canvas.height = 36;
    const contexto = canvas.getContext("2d", { willReadFrequently: true }); if (!contexto) return;
    contexto.drawImage(elemento, 0, 0, 64, 36);
    const pixeles = contexto.getImageData(0, 0, 64, 36).data;
    let luz = 0, cambio = 0; const anterior = muestrasImagen.current.anterior;
    for (let i = 0; i < pixeles.length; i += 4) { luz += (pixeles[i] + pixeles[i+1] + pixeles[i+2]) / 3; if (anterior) cambio += (Math.abs(pixeles[i]-anterior[i]) + Math.abs(pixeles[i+1]-anterior[i+1]) + Math.abs(pixeles[i+2]-anterior[i+2])) / 3; }
    const muestras = muestrasImagen.current; muestras.cuadros++; muestras.luz += luz / (64*36*255); if (anterior) muestras.cambio += cambio / (64*36*255); muestras.anterior = new Uint8ClampedArray(pixeles); muestras.ultimoSegundo = Math.floor(elemento.currentTime);
    setMetricasVideo({ cuadros: muestras.cuadros, luzMedia: Math.round(muestras.luz / muestras.cuadros * 100), cambioMedio: Math.round(muestras.cambio / Math.max(1, muestras.cuadros-1) * 100) });
  };
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const patronMuletillas = /\b(?:eh+|emm+|este|digamos|o sea)\b/gi;
  const muletillas = (texto.match(patronMuletillas) ?? []).length;
  const marcasMuletillas = subtitulos.flatMap(s => [...s.texto.matchAll(/\b(?:eh+|emm+|este|digamos|o sea)\b/gi)].map(m => ({segundo:s.inicio,texto:m[0]})));
  const estructura = texto.trim() ? {
    apertura: /(?:^|[.!?]\s+)(?:hoy|vamos a|el objetivo|la pregunta|quiero explicar|en esta)/i.test(texto),
    conexiones: (texto.match(/\b(?:primero|segundo|además|por otra parte|sin embargo|entonces|por eso)\b/gi)??[]).length,
    ejemplos: (texto.match(/\b(?:por ejemplo|un caso|como ejemplo|en la práctica)\b/gi)??[]).length,
    cierre: /\b(?:en conclusión|para terminar|en resumen|finalmente|como resultado)\b/i.test(texto),
  } : null;
  const anterior = intentos.find(i => i.id === compararId);
  const ritmoAnterior = anterior?.duracion ? Math.round((anterior.texto ?? '').trim().split(/\s+/).filter(Boolean).length * 60 / anterior.duracion) : null;
  return <section className="rounded-xl border border-white/15 p-4 space-y-3"><h3 className="font-bold">Estudio multimedia local</h3>
    <label className="block text-sm">Captura <Selector value={modo} disabled={estado !== "listo"} onChange={e => setModo(e.target.value as Modo)} className="ml-2 bg-fondo rounded-lg p-2"><option value="audio">Solo audio</option><option value="camara">Cámara y voz</option><option value="pantalla">Pantalla y voz</option><option value="pantalla-camara">Pantalla, cámara y voz</option></Selector></label>
    <fieldset disabled={estado !== 'listo'} className="flex flex-wrap gap-3 text-sm"><legend>Configurar captura</legend>
      {modo !== 'audio' && <label><input type="checkbox" checked={microfono} onChange={e => setMicrofono(e.target.checked)} /> Micrófono</label>}
      {modo.startsWith('pantalla') && <label><input type="checkbox" checked={sonidoPantalla} onChange={e => setSonidoPantalla(e.target.checked)} /> Audio de pantalla si el navegador lo permite</label>}
      <label>Resolución <Selector value={String(resolucion)} onChange={e => setResolucion(Number(e.target.value))}><option value="640">640 × 360</option><option value="1280">1280 × 720</option><option value="1920">1920 × 1080</option></Selector></label>
      <label>Cuadros por segundo <Selector value={String(fps)} onChange={e => setFps(Number(e.target.value))}><option value="15">15</option><option value="24">24</option><option value="30">30</option></Selector></label>
      {modo === 'pantalla-camara' && <><label>Tamaño de cámara (%) <input type="number" min="10" max="50" value={tamanoCamara} onChange={e => setTamanoCamara(Math.min(50, Math.max(10, Number(e.target.value))))} className="w-16 bg-fondo" /></label><label>Posición <Selector value={esquina} onChange={e => setEsquina(e.target.value)}><option value="abajo-derecha">Abajo derecha</option><option value="abajo-izquierda">Abajo izquierda</option><option value="arriba-derecha">Arriba derecha</option><option value="arriba-izquierda">Arriba izquierda</option></Selector></label></>}
    </fieldset>
    <div className="flex gap-2 flex-wrap">{estado === "listo" ? <button type="button" onClick={() => void iniciar()}>Grabar</button> : <><button type="button" onClick={alternar}>{estado === "pausa" ? "Continuar" : "Pausar"}</button><button type="button" onClick={terminar}>Terminar</button></>}</div>
    <video ref={videoVivo} muted playsInline hidden={estado === "listo"} className="w-full max-w-lg" />
    <label className="block text-sm">O elegir archivo<input type="file" accept="audio/*,video/*" onChange={e => { setArchivo(e.target.files?.[0] ?? null); setTexto(""); setSubtitulos([]); setMetricasAudio(null); setMetricasVideo(null); muestrasImagen.current = { cuadros: 0, luz: 0, cambio: 0, anterior: null, ultimoSegundo: -1 }; setCapitulos([]); }} /></label>
    {usuario?.id && <div className="flex gap-3 flex-wrap"><button type="button" disabled={estado !== 'listo'} onClick={() => void leerBorradorMultimedia(usuario.id).then(b => { if (b) restaurar(b); else setError('No hay borrador local para esta cuenta.'); }).catch(() => setError('No se pudo recuperar el borrador local.'))}>Recuperar última grabación</button><button type="button" disabled={estado !== 'listo'} onClick={() => void recuperarCapturaLocal(usuario.id).then(f => { if (f) restaurar({ archivo:f, capitulos:[] }); else setError('No hay captura interrumpida para recuperar.'); }).catch(() => setError('No se pudo recuperar la captura.'))}>Recuperar captura interrumpida</button></div>}
    {usuario?.id && <details className="text-sm space-y-2"><summary>Mi biblioteca local de grabaciones ({intentos.length})</summary><p>Archivos, transcripciones, subtítulos y análisis quedan en este dispositivo y cuenta. Descargá una copia antes de borrar los datos del navegador.</p>
      {archivo && <div className="flex flex-wrap gap-2"><input aria-label="Título del intento" value={tituloIntento} onChange={e => setTituloIntento(e.target.value)} placeholder="Nombre de la grabación" className="bg-fondo p-2" /><button type="button" onClick={() => void guardarIntentoLocal(usuario.id,tituloIntento,{ archivo, capitulos, texto, duracion, subtitulos, metricasAudio, metricasVideo }).then(() => listarIntentosLocales(usuario.id)).then(setIntentos).catch(() => setError('No se pudo guardar el intento local.'))}>Guardar intento en biblioteca</button></div>}
      {intentos.map(i => <article key={i.id} className="rounded border border-white/15 p-2 flex flex-wrap gap-3"><span>{i.titulo} · {new Date(i.creadoEn).toLocaleString()} · {Math.round(i.archivo.size/1024)} KB</span><button type="button" disabled={estado !== 'listo'} onClick={() => restaurar(i)}>Abrir intento</button><button type="button" onClick={() => setCompararId(i.id)}>Comparar con el actual</button><button type="button" onClick={() => void quitarIntentoLocal(usuario.id,i.id).then(() => listarIntentosLocales(usuario.id)).then(setIntentos).catch(() => setError('No se pudo quitar el intento.'))}>Quitar intento local</button></article>)}
      {anterior && archivo && <div role="status" className="overflow-x-auto"><p>Comparación con {anterior.titulo}. Las diferencias describen archivos; cada persona interpreta si corresponden a su objetivo.</p><table className="text-left w-full"><thead><tr><th>Medición</th><th>Anterior</th><th>Actual</th></tr></thead><tbody><tr><td>Palabras/minuto</td><td>{ritmoAnterior ?? '—'}</td><td>{duracion ? Math.round(palabras.length * 60/duracion) : '—'}</td></tr><tr><td>Pausas acústicas</td><td>{anterior.metricasAudio?.pausas ?? '—'}</td><td>{metricasAudio?.pausas ?? '—'}</td></tr><tr><td>Volumen medio dBFS</td><td>{anterior.metricasAudio?.volumenMedioDbfs ?? '—'}</td><td>{metricasAudio?.volumenMedioDbfs ?? '—'}</td></tr><tr><td>Luz media %</td><td>{anterior.metricasVideo?.luzMedia ?? '—'}</td><td>{metricasVideo?.luzMedia ?? '—'}</td></tr></tbody></table><button type="button" onClick={() => setCompararId('')}>Cerrar comparación</button></div>}
    </details>}
    {archivo && <><video ref={video} src={preview} controls onTimeUpdate={analizarCuadro} onLoadedMetadata={e => { const d = e.currentTarget.duration; if (Number.isFinite(d)) { setDuracion(d); setFinRecorte(d); } }} className="w-full max-w-lg" /><div className="flex gap-3 flex-wrap"><button type="button" onClick={() => { if(subtitulos.some((s,i)=>s.inicio<0||s.fin<=s.inicio||!s.texto.trim()||(i>0&&s.inicio<subtitulos[i-1].fin))){setError("Revisá los tiempos y el texto de los subtítulos.");return} onArchivo?.(archivo,capitulos,subtitulos); }}>Usar grabación</button><button type="button" disabled={procesando} onClick={() => void transcribir()}>Transcribir en servidor privado</button><button type="button" disabled={procesando} onClick={() => void analizarAudio()}>Analizar pausas y volumen</button><a href={preview} download={archivo.name}>Descargar copia</a></div>
      {duracion > 0 && <div className="space-y-2 text-sm"><p>Recorte local en el servidor institucional (segundos)</p><div className="flex gap-2"><label>Inicio <input type="number" min="0" max={duracion} step="0.1" value={inicioRecorte} onChange={e => setInicioRecorte(Number(e.target.value))} className="w-20 bg-fondo" /></label><label>Fin <input type="number" min="0" max={duracion} step="0.1" value={finRecorte} onChange={e => setFinRecorte(Number(e.target.value))} className="w-20 bg-fondo" /></label><button type="button" disabled={procesando} onClick={() => void recortar()}>Recortar</button></div>
        <div className="flex gap-2"><input value={tituloCapitulo} onChange={e => setTituloCapitulo(e.target.value)} placeholder="Título del capítulo" className="bg-fondo p-2" /><button type="button" onClick={() => { if (tituloCapitulo.trim()) { setCapitulos([...capitulos, { segundo: Math.floor(video.current?.currentTime ?? 0), titulo: tituloCapitulo.trim() }].sort((a,b) => a.segundo-b.segundo)); setTituloCapitulo(""); } }}>Marcar momento actual</button></div>
        {capitulos.map((c,i) => <div key={`${c.segundo}-${i}`} className="flex gap-2"><button type="button" onClick={() => { if (video.current) { video.current.currentTime = c.segundo; void video.current.play(); } }}>{Math.floor(c.segundo/60)}:{String(c.segundo%60).padStart(2,"0")} · {c.titulo}</button><button type="button" aria-label={`Quitar ${c.titulo}`} onClick={() => setCapitulos(capitulos.filter((_,j)=>j!==i))}>×</button></div>)}
        {capitulos.length > 0 && <button type="button" onClick={descargarCapitulos}>Descargar marcas de capítulos</button>}
      </div>}
    </>}
    <label className="block text-sm">Transcripción editable<textarea value={texto} onChange={e => setTexto(e.target.value)} className="block w-full bg-fondo p-2" rows={4} /></label>
    <div className="flex flex-wrap gap-3 text-sm"><label>Idioma de transcripción (auto, es, en…) <input aria-label="Idioma de transcripción" maxLength={4} value={idioma} onChange={e => setIdioma(e.target.value.toLowerCase())} className="w-16 bg-fondo" /></label><label>Umbral de pausa dBFS <input aria-label="Umbral de pausa" type="number" min="-90" max="-5" value={umbralPausa} onChange={e => setUmbralPausa(Number(e.target.value))} className="w-16 bg-fondo" /></label><label>Pausa mínima en segundos <input type="number" min="0.1" max="10" step="0.1" value={minimaPausa} onChange={e => setMinimaPausa(Number(e.target.value))} className="w-16 bg-fondo" /></label></div>
    {subtitulos.length > 50 && <nav aria-label="Páginas de subtítulos" className="flex gap-3 text-sm"><button type="button" disabled={paginaSubtitulos === 0} onClick={() => setPaginaSubtitulos(p => p-1)}>Subtítulos anteriores</button><span>{paginaSubtitulos+1} / {Math.ceil(subtitulos.length/50)}</span><button type="button" disabled={(paginaSubtitulos+1)*50 >= subtitulos.length} onClick={() => setPaginaSubtitulos(p => p+1)}>Subtítulos siguientes</button></nav>}
    {subtitulos.length>0&&<div className="space-y-2 text-sm"><h4 className="font-semibold">Subtítulos sincronizados</h4><p className="text-slate-400">Corregí texto y tiempos antes de publicar. La transcripción completa de arriba se edita por separado.</p>{subtitulos.map((s,i)=>({s,i})).slice(paginaSubtitulos*50,paginaSubtitulos*50+50).map(({s,i})=><div key={i} className="flex flex-wrap items-center gap-2"><label>Inicio <input aria-label={`Inicio subtítulo ${i+1}`} type="number" min="0" step="0.01" value={s.inicio} onChange={e=>setSubtitulos(subtitulos.map((x,j)=>j===i?{...x,inicio:Number(e.target.value)}:x))} className="w-20 bg-fondo p-1" /></label><label>Fin <input aria-label={`Fin subtítulo ${i+1}`} type="number" min="0" step="0.01" value={s.fin} onChange={e=>setSubtitulos(subtitulos.map((x,j)=>j===i?{...x,fin:Number(e.target.value)}:x))} className="w-20 bg-fondo p-1" /></label><input aria-label={`Texto subtítulo ${i+1}`} maxLength={500} value={s.texto} onChange={e=>setSubtitulos(subtitulos.map((x,j)=>j===i?{...x,texto:e.target.value}:x))} className="min-w-64 flex-1 bg-fondo p-1" /><button type="button" aria-label={`Quitar subtítulo ${i+1}`} onClick={()=>setSubtitulos(subtitulos.filter((_,j)=>j!==i))}>×</button></div>)}<button type="button" onClick={()=>{const inicio=Math.max(0,subtitulos.at(-1)?.fin??video.current?.currentTime??0);setSubtitulos([...subtitulos,{inicio,fin:inicio+2,texto:""}])}}>Agregar subtítulo</button></div>}
    {texto && <p className="text-sm">Palabras: {palabras.length}. Ritmo estimado: {duracion > 0 ? Math.round(palabras.length * 60 / duracion) : "—"} palabras/minuto. Muletillas observables: {muletillas}. Revisá la transcripción antes de usar estas métricas.</p>}
    {(marcasMuletillas.length > 0 || metricasAudio?.intervalos?.length) ? <details className="text-sm"><summary>Momentos para revisar en la grabación</summary><p>Las expresiones marcadas son posibles muletillas según su contexto. El salto apunta al inicio del segmento transcrito, no al instante exacto de la palabra.</p><label>Expresión <Selector value="" onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }}><option value="">Elegí un momento</option>{marcasMuletillas.map((m,i) => <option key={i} value={m.segundo}>{m.segundo.toFixed(1)} s · {m.texto}</option>)}</Selector></label>{metricasAudio?.intervalos?.length ? <label>Pausa acústica <Selector value="" onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }}><option value="">Elegí una pausa</option>{metricasAudio.intervalos.map((p,i) => <option key={i} value={p.inicio}>{p.inicio.toFixed(1)}–{p.fin.toFixed(1)} s</option>)}</Selector></label> : null}</details> : null}
    {estructura&&<div className="text-sm space-y-1"><h4 className="font-semibold">Señales de estructura del discurso</h4><p>Apertura explícita: {estructura.apertura?"detectada":"no detectada"}. Conectores: {estructura.conexiones}. Expresiones de ejemplo: {estructura.ejemplos}. Cierre explícito: {estructura.cierre?"detectado":"no detectado"}.</p><p className="text-slate-400">Se buscan expresiones en la transcripción editable. No se evalúan claridad, calidad ni contenido; revisá el resultado y modificá el texto si corresponde.</p></div>}
    {metricasAudio && <p className="text-sm">Pausas acústicas: {metricasAudio.pausas} ({metricasAudio.segundosEnPausa} s). Volumen medio: {metricasAudio.volumenMedioDbfs ?? "—"} dBFS; pico: {metricasAudio.picoDbfs ?? "—"} dBFS. Umbral: {metricasAudio.umbralPausaDbfs} dBFS durante al menos {metricasAudio.pausaMinimaSegundos} s. Estas mediciones describen el archivo y no califican a la persona.</p>}
    {metricasVideo && <p className="text-sm">Imagen observada durante la reproducción: {metricasVideo.cuadros} muestras, luz media {metricasVideo.luzMedia}%, cambio entre cuadros {metricasVideo.cambioMedio}%. Son características técnicas de los cuadros reproducidos; no miden calidad de oratoria, atención ni emociones.</p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
  </section>;
}
