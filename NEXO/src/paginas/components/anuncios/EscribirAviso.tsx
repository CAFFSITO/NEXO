// El campo para escribir un aviso, como el de un chat: clip para adjuntar,
// el texto, y a la derecha el micrófono (mantener apretado) o el botón de
// enviar cuando ya hay algo escrito. Los archivos se suben recién al enviar.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { subirArchivo, tamanoLegible } from "../../../servicios/archivos";
import { duracionLegible, enviarAviso, iconoArchivo, type AvisoEnviado, type Destinos } from "../../../servicios/anuncios";
import GrabadorVoz, { type NotaGrabada } from "./GrabadorVoz";
import type { ChatAviso } from "./chats";

interface Pendiente { clave: string; archivo: File; voz?: { duracionMs: number } }

const EXTENSION_AUDIO: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

export default function EscribirAviso({ chat, destinos, onEnviado }: {
  chat: ChatAviso;
  destinos: Destinos | null;
  onEnviado: (aviso: AvisoEnviado) => void;
}) {
  const [texto, setTexto] = useState("");
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [grabando, setGrabando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const elegir = useRef<HTMLInputElement>(null);
  const contador = useRef(0);

  const maximo = destinos?.maxCuerpo ?? 5000;
  const maxAdjuntos = destinos?.maxAdjuntos ?? 10;
  const cantidad = "grupoId" in (chat.destino ?? {}) ? chat.personas.length : (chat.destino as { personas: string[] } | null)?.personas.length ?? 0;
  const hayAlgo = texto.trim().length > 0 || pendientes.length > 0;
  const listo = Boolean(chat.destino) && hayAlgo && texto.length <= maximo && !grabando && !enviando;

  // Cada chat tiene su propio campo (el padre lo monta con key = chat): al abrirlo, listo para escribir.
  useEffect(() => { area.current?.focus({ preventScroll: true }); }, []);

  // El campo crece con el texto, hasta un tope.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [texto]);

  const sumar = (lista: FileList | null) => {
    if (!lista?.length) return;
    setError("");
    setPendientes((actuales) => {
      const juntos = [...actuales, ...[...lista].map((archivo) => ({ clave: String(++contador.current), archivo }))];
      if (juntos.length > maxAdjuntos) setError(`Un aviso puede llevar hasta ${maxAdjuntos} archivos.`);
      return juntos.slice(0, maxAdjuntos);
    });
  };

  const sumarAudio = (nota: NotaGrabada) => {
    if (pendientes.length >= maxAdjuntos) { setError(`Un aviso puede llevar hasta ${maxAdjuntos} archivos.`); return; }
    const base = nota.tipo.split(";")[0];
    const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const archivo = new File([nota.blob], `Audio ${hora.replace(":", ".")}.${EXTENSION_AUDIO[base] ?? "webm"}`, { type: nota.tipo });
    setPendientes((actuales) => [...actuales, { clave: String(++contador.current), archivo, voz: { duracionMs: nota.duracionMs } }]);
  };

  const mandar = async () => {
    if (!listo || !chat.destino) return;
    setEnviando(true);
    setError("");
    try {
      const adjuntos: { id: string; voz?: boolean; duracionMs?: number }[] = [];
      for (const [i, p] of pendientes.entries()) {
        setProgreso(pendientes.length > 1 ? `Subiendo ${i + 1} de ${pendientes.length}…` : "Subiendo…");
        try {
          const subido = await subirArchivo(p.archivo);
          adjuntos.push(p.voz ? { id: subido.id, voz: true, duracionMs: p.voz.duracionMs } : { id: subido.id });
        } catch (e) {
          throw new Error(`${p.voz ? "El audio" : `«${p.archivo.name}»`}: ${e instanceof Error ? e.message : "no se pudo subir."}`);
        }
      }
      setProgreso("");
      const { anuncio } = await enviarAviso({ ...chat.destino, cuerpo: texto, adjuntos });
      setTexto("");
      setPendientes([]);
      onEnviado(anuncio);
      area.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el aviso.");
    } finally {
      setEnviando(false);
      setProgreso("");
    }
  };

  return (
    <div className="wa-escribir">
      {pendientes.length > 0 && (
        <ul className="wa-adjuntos-pendientes" aria-label="Archivos que van con el aviso">
          {pendientes.map((p) => (
            <li key={p.clave} className="wa-adjunto-pendiente">
              <span className="material-symbols-outlined" aria-hidden="true">{p.voz ? "mic" : iconoArchivo(p.archivo.type, p.archivo.name)}</span>
              <span>{p.voz ? `Audio · ${duracionLegible(p.voz.duracionMs)}` : `${p.archivo.name} · ${tamanoLegible(p.archivo.size)}`}</span>
              <button type="button" onClick={() => setPendientes((a) => a.filter((x) => x.clave !== p.clave))} disabled={enviando} aria-label={`Sacar ${p.voz ? "el audio" : p.archivo.name}`}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="wa-escribir-fila">
        {!grabando && (
          <div className="wa-campo">
            <button type="button" className="av-icono-boton" onClick={() => elegir.current?.click()} disabled={enviando || pendientes.length >= maxAdjuntos} aria-label="Adjuntar archivos" title="Adjuntar archivos">
              <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
            </button>
            <input ref={elegir} type="file" multiple hidden onChange={(e) => { sumar(e.target.files); e.target.value = ""; }} />
            <textarea
              ref={area}
              rows={1}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void mandar(); } }}
              placeholder="Escribí un aviso"
              disabled={enviando}
              maxLength={maximo + 200}
              aria-label="Texto del aviso"
            />
          </div>
        )}
        {!texto.trim() && !enviando && (
          <GrabadorVoz compacto onGrabado={sumarAudio} onGrabando={setGrabando} disabled={pendientes.length >= maxAdjuntos} />
        )}
        {(texto.trim() || (pendientes.length > 0 && !grabando) || enviando) && (
          <button type="button" className="wa-enviar" onClick={() => void mandar()} disabled={!listo} aria-label={enviando ? progreso || "Enviando aviso" : "Enviar aviso"} title="Enviar (Ctrl + Enter)">
            <span className={`material-symbols-outlined ${enviando ? "animate-spin" : ""}`} aria-hidden="true">{enviando ? "progress_activity" : "send"}</span>
          </button>
        )}
      </div>
      <div className="wa-escribir-ayuda">
        {error
          ? <span className="error" role="alert">{error}</span>
          : <span>{progreso || (cantidad === 1 ? "Le llega como aviso obligatorio a 1 persona." : `Les llega como aviso obligatorio a ${cantidad} personas.`)}</span>}
        {texto.length > maximo * 0.8
          ? <span className={texto.length > maximo ? "error" : ""}>{texto.length.toLocaleString("es-AR")} / {maximo.toLocaleString("es-AR")}</span>
          : <span className="hidden lg:inline">Ctrl + Enter para enviar</span>}
      </div>
    </div>
  );
}
