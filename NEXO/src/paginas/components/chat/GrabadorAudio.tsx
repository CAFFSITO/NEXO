import { useEffect, useRef, useState } from "react";

export default function GrabadorAudio({ onArchivo, onOcupado, onError, disabled }: {
  onArchivo: (archivo: File) => void; onOcupado: (ocupado: boolean) => void;
  onError: (mensaje: string) => void; disabled: boolean;
}) {
  const [estado, setEstado] = useState<"listo" | "permiso" | "grabando">("listo");
  const [segundos, setSegundos] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const sesion = useRef(0);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ onArchivo, onOcupado, onError });
  useEffect(() => { callbacks.current = { onArchivo, onOcupado, onError }; }, [onArchivo, onOcupado, onError]);
  useEffect(() => () => {
    sesion.current++;
    if (reloj.current) clearInterval(reloj.current);
    const r = grabador.current;
    if (r?.state === "recording") r.stop();
    r?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const terminar = (cancelar = false) => {
    if (cancelar) sesion.current++;
    if (reloj.current) clearInterval(reloj.current);
    const r = grabador.current;
    if (r?.state === "recording") r.stop();
    r?.stream.getTracks().forEach((t) => t.stop());
    // Guardar espera a onstop: no se puede enviar un audio todavía incompleto.
    if (cancelar || !r) { setEstado("listo"); onOcupado(false); }
  };
  const iniciar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Para grabar, abrí NEXO con HTTPS y un navegador compatible. También podés adjuntar un audio guardado."); return;
    }
    const actual = ++sesion.current;
    setEstado("permiso"); onOcupado(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (sesion.current !== actual) { stream.getTracks().forEach((t) => t.stop()); return; }
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      grabador.current = r;
      const partes: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      r.onerror = () => {
        if (sesion.current !== actual) return;
        sesion.current++; stream?.getTracks().forEach((t) => t.stop());
        if (reloj.current) clearInterval(reloj.current);
        setEstado("listo"); onOcupado(false); onError("No se pudo completar la grabación. Intentá de nuevo.");
      };
      r.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        if (sesion.current !== actual) return;
        if (reloj.current) clearInterval(reloj.current);
        setEstado("listo"); callbacks.current.onOcupado(false);
        const mime = r.mimeType || partes[0]?.type || "audio/webm";
        const blob = new Blob(partes, { type: mime });
        if (!blob.size) { callbacks.current.onError("La grabación quedó vacía."); return; }
        const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        callbacks.current.onArchivo(new File([blob], `audio-${Date.now()}.${extension}`, { type: mime }));
      };
      r.start(1000); setEstado("grabando"); setSegundos(0);
      const inicio = Date.now();
      reloj.current = setInterval(() => {
        const transcurrido = Math.floor((Date.now() - inicio) / 1000);
        setSegundos(transcurrido);
        if (transcurrido >= 300) { if (r.state === "recording") r.stop(); }
      }, 1000);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      if (sesion.current !== actual) return;
      setEstado("listo"); onOcupado(false);
      onError("No se pudo acceder al micrófono. Revisá el permiso del navegador o adjuntá un audio guardado.");
    }
  };
  if (estado !== "listo") return <div className="flex flex-wrap items-center gap-2 text-sm text-rose-300" role="status">
    <span>{estado === "permiso" ? "Esperando micrófono…" : `Grabando ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")} · máximo 5 min`}</span>
    {estado === "grabando" && <button type="button" className="px-3 py-2 rounded-lg bg-white/10" onClick={() => terminar()}>Terminar audio</button>}
    <button type="button" className="px-3 py-2" onClick={() => terminar(true)}>Cancelar</button>
  </div>;
  return <button type="button" disabled={disabled} onClick={() => void iniciar()} className="flex items-center gap-1 px-2 py-2 rounded-lg text-slate-300 hover:bg-white/10 disabled:opacity-40"><span className="material-symbols-outlined">mic</span>Grabar audio</button>;
}
