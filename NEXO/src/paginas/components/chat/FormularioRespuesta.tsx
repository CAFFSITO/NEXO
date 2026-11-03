import { useEffect, useRef, useState } from "react";
import { subirArchivo, type ArchivoSubido } from "../../../servicios/archivos";
import GrabadorAudio from "./GrabadorAudio";
import OpcionesRespuesta from "./OpcionesRespuesta";
import "./respuestas.css";

export default function FormularioRespuesta({ onEnviar, textoInicial = "", maxArchivos = 5, onOcupado, onInteractuar }: {
  onEnviar: (texto: string, archivoIds: string[]) => Promise<void>;
  textoInicial?: string; maxArchivos?: number; onOcupado?: (ocupado: boolean) => void;
  onInteractuar?: () => void;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [grabando, setGrabando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const subidos = useRef(new Map<File, ArchivoSubido>());
  const input = useRef<HTMLInputElement>(null);
  const envioEnCurso = useRef(false);
  const bloqueado = enviando || grabando;
  useEffect(() => { onOcupado?.(bloqueado); }, [bloqueado, onOcupado]);
  const agregar = (nuevos: File[]) => {
    if (archivos.length + nuevos.length > maxArchivos) { setError(`Podés adjuntar hasta ${maxArchivos} archivos o audios.`); return; }
    setArchivos((a) => [...a, ...nuevos]); setError(""); setEnviado(false);
  };
  const enviar = async () => {
    if (envioEnCurso.current || bloqueado || (!texto.trim() && !archivos.length)) return;
    envioEnCurso.current = true;
    setEnviando(true); setError(""); setEnviado(false);
    try {
      const ids = [];
      for (const archivo of archivos) {
        let subido = subidos.current.get(archivo);
        if (!subido) { subido = await subirArchivo(archivo); subidos.current.set(archivo, subido); }
        ids.push(subido.id);
      }
      await onEnviar(texto.trim(), ids);
      setTexto(""); setArchivos([]); subidos.current.clear(); setEnviado(true);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar. Conservamos tu respuesta para reintentar."); }
    finally { envioEnCurso.current = false; setEnviando(false); }
  };
  // Un div permite usarlo también dentro de otros formularios sin anidarlos.
  return <div className="nexo-respuesta space-y-2 rounded-2xl p-2 text-sm" onFocusCapture={onInteractuar} onPointerDown={(e) => { e.stopPropagation(); onInteractuar?.(); }}>
    <OpcionesRespuesta disabled={bloqueado} onElegir={(t) => { setTexto(t); setEnviado(false); }} />
    <div className="flex items-end gap-2">
      <button type="button" aria-label="Adjuntar archivo de cualquier tipo" title="Adjuntar archivo de cualquier tipo" disabled={bloqueado || archivos.length >= maxArchivos} className="shrink-0 w-11 h-11 rounded-full bg-white/10 disabled:opacity-40" onClick={() => input.current?.click()}><span className="material-symbols-outlined" aria-hidden="true">attach_file</span></button>
      <textarea aria-label="Responder" rows={1} maxLength={10000} value={texto} disabled={enviando}
        onChange={(e) => { setTexto(e.target.value); setEnviado(false); }} placeholder="Responder…"
        className="flex-1 w-0 min-w-0 min-h-11 max-h-28 resize-y rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-white" />
      <button type="button" aria-label={enviando ? "Enviando respuesta" : "Enviar respuesta"} title="Enviar respuesta" disabled={bloqueado || (!texto.trim() && !archivos.length)} className="shrink-0 w-11 h-11 rounded-full bg-primary text-white disabled:opacity-40" onClick={() => void enviar()}><span className="material-symbols-outlined" aria-hidden="true">{enviando ? "hourglass_top" : "send"}</span></button>
    </div>
    <div className="max-h-28 overflow-y-auto space-y-2">
    {archivos.map((a, i) => <div key={`${a.name}-${i}`} className="rounded-xl bg-white/5 p-2">
      <div className="flex gap-2 items-center"><span className="min-w-0 flex-1 truncate">{a.name}</span><button type="button" disabled={bloqueado} aria-label={`Quitar ${a.name}`} onClick={() => setArchivos((v) => v.filter((_, j) => i !== j))}>Quitar</button></div>
      {a.type.startsWith("audio/") && <AudioLocal archivo={a} />}
    </div>)}
    </div>
    <input ref={input} type="file" multiple={maxArchivos > 1} className="hidden" onChange={(e) => { agregar(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-2">
      <GrabadorAudio disabled={enviando || archivos.length >= maxArchivos} onArchivo={(a) => agregar([a])} onOcupado={setGrabando} onError={setError} />
      <span className="text-[11px] text-slate-400">Cualquier archivo · 15 MB · audio/video 100 MB</span>
    </div>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {enviado && <p role="status" className="text-emerald-300">Respuesta enviada.</p>}
  </div>;
}

function AudioLocal({ archivo }: { archivo: File }) {
  const elemento = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(archivo); const audio = elemento.current;
    if (audio) audio.src = url;
    return () => { audio?.pause(); URL.revokeObjectURL(url); };
  }, [archivo]);
  return <audio ref={elemento} controls className="w-full mt-2" aria-label="Escuchar tu respuesta de audio" />;
}
