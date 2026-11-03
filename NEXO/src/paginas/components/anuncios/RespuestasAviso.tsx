import { useCallback, useEffect, useState } from "react";
import { pedirRespuestasAviso, responderAviso, copiarTexto, fechaLarga, type HiloAviso } from "../../../servicios/anuncios";
import { useTiempoReal } from "../../../servicios/tiempoReal";
import FormularioRespuesta from "../chat/FormularioRespuesta";
import AdjuntosAviso from "./AdjuntosAviso";

export default function RespuestasAviso({ anuncioId, destinatarioId, textoInicial, onOcupado, soloHistorial = false, actualizacion = 0 }: {
  anuncioId: string; destinatarioId?: string; textoInicial?: string; onOcupado?: (ocupado: boolean) => void;
  soloHistorial?: boolean; actualizacion?: number;
}) {
  const [hilo, setHilo] = useState<HiloAviso | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [copiado, setCopiado] = useState("");
  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const c = new AbortController();
    void pedirRespuestasAviso(anuncioId, destinatarioId, c.signal).then((h) => { if (!c.signal.aborted) { setHilo(h); setError(""); } })
      .catch((e: unknown) => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : "No se pudieron cargar las respuestas."); });
    return () => c.abort();
  }, [anuncioId, destinatarioId, version, actualizacion]);
  useTiempoReal(useCallback((e) => {
    if (e.tipo === "conectado" || (e.tipo === "anuncio-respuesta" && e.anuncioId === anuncioId)) recargar();
  }, [anuncioId, recargar]));
  const enviar = async (texto: string, archivoIds: string[]) => {
    const { respuesta } = await responderAviso(anuncioId, texto, archivoIds, destinatarioId);
    setHilo((h) => h ? { ...h, respuestas: h.respuestas.some((r) => r.id === respuesta.id) ? h.respuestas : [...h.respuestas, respuesta] } : h);
    recargar();
  };
  if (soloHistorial && !error && !hilo?.respuestas.length) return null;
  return <section aria-label="Respuestas al aviso" className="nexo-hilo-respuestas space-y-3 rounded-2xl p-3 text-sm leading-normal tracking-normal" onPointerDown={(e) => e.stopPropagation()}>
    <h3 className="font-bold">{soloHistorial ? "Respuestas" : "Responder al aviso"}</h3>
    {!soloHistorial && <p className="text-xs text-slate-300">Conversación privada entre quien envió el aviso y {hilo?.destinatario.nombre ?? "su destinatario"}.</p>}
    {error && <div role="alert" className="text-rose-300">{error} <button type="button" className="underline" onClick={recargar}>Reintentar</button></div>}
    {!hilo && !error && <p role="status">Cargando respuestas…</p>}
    {hilo && <>
      {!soloHistorial && <blockquote className="border-l-2 border-primary pl-3 text-xs text-slate-300 line-clamp-3"><strong>{hilo.anuncio.autor}</strong><p>{hilo.anuncio.cuerpo || "Aviso con archivos o audio"}</p></blockquote>}
      <div className="space-y-3 max-h-64 overflow-y-auto" role="log" aria-label="Historial de respuestas">
        {hilo.respuestas.map((r) => <article key={r.id} className={`rounded-xl p-3 ${r.mio ? "bg-primary/20" : "bg-white/5"}`}>
          <strong className="text-xs">{r.autor}</strong><p className="whitespace-pre-wrap break-words">{r.cuerpo}</p>
          <AdjuntosAviso adjuntos={r.adjuntos} />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300"><time>{fechaLarga(r.creadoEn)}</time>
            {r.cuerpo && <button type="button" onClick={() => void copiarTexto(r.cuerpo).then((ok) => setCopiado(ok ? r.id : "error"))}>{copiado === r.id ? "Copiado" : "Copiar texto"}</button>}
          </div>
        </article>)}
      </div>
      {copiado === "error" && <p role="alert">No se pudo copiar. Podés seleccionar el texto de la respuesta.</p>}
      {!soloHistorial && (hilo.puedeResponder ? <FormularioRespuesta onEnviar={enviar} textoInicial={textoInicial} onOcupado={onOcupado} /> : <p>La otra persona ya no tiene una cuenta activa.</p>)}
    </>}
  </section>;
}
