// Escribir una respuesta: texto con @menciones, emojis y —si el perfil tiene la
// capacidad— fotos, videos o archivos.

import { useRef, useState } from "react";
import { subirArchivo, type ArchivoSubido } from "../../../servicios/archivos";
import { useCapacidad } from "../../../servicios/instancia";
import AreaTexto from "./AreaTexto";
import SelectorEmoji from "./SelectorEmoji";
import { insertarEnCursor } from "./comunidadUtil";

interface Props {
  placeholder: string;
  onEnviar: (texto: string, adjuntos: number[]) => Promise<void>;
  onCancelar?: () => void;
  autoFocus?: boolean;
  textoBoton?: string;
}

export default function CajaRespuesta({ placeholder, onEnviar, onCancelar, autoFocus, textoBoton = "Responder" }: Props) {
  const multimedia = useCapacidad("comunidad.multimedia");
  const [texto, setTexto] = useState("");
  const [adjuntos, setAdjuntos] = useState<ArchivoSubido[]>([]);
  const [emoji, setEmoji] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const enviar = async () => {
    if ((!texto.trim() && !adjuntos.length) || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      await onEnviar(texto.trim(), adjuntos.map((a) => Number(a.id)));
      setTexto("");
      setAdjuntos([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo responder.");
    } finally {
      setOcupado(false);
    }
  };

  const subir = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setOcupado(true);
    try {
      const nuevos: ArchivoSubido[] = [];
      for (const f of Array.from(lista).slice(0, 6 - adjuntos.length)) nuevos.push(await subirArchivo(f));
      setAdjuntos([...adjuntos, ...nuevos]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setOcupado(false);
      if (archivo.current) archivo.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2" onClick={(e) => e.stopPropagation()}>
      <AreaTexto valor={texto} onCambiar={setTexto} placeholder={placeholder} etiqueta={placeholder} autoFocus={autoFocus} onEnviar={() => void enviar()} refArea={area} minAlto={40} />
      {adjuntos.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {adjuntos.map((a) => (
            <span key={a.id} className="c-reaccion !text-[11.5px]">
              <span className="material-symbols-outlined !text-[14px]" aria-hidden="true">{a.tipoMime.startsWith("image/") ? "image" : a.tipoMime.startsWith("video/") ? "movie" : "attach_file"}</span>
              <span className="max-w-[140px] truncate">{a.nombre}</span>
              <button type="button" onClick={() => setAdjuntos(adjuntos.filter((x) => x.id !== a.id))} aria-label={`Quitar ${a.nombre}`}><span className="material-symbols-outlined !text-[14px]">close</span></button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-[12px] text-rose-200" role="alert">{error}</p>}
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center">
          <span className="relative">
            <button type="button" className="c-herramienta !h-8 !w-8" onClick={() => setEmoji(!emoji)} aria-label="Emojis" aria-expanded={emoji}><span className="material-symbols-outlined" aria-hidden="true">mood</span></button>
            {emoji && <SelectorEmoji lado="arriba" onCerrar={() => setEmoji(false)} onElegir={(e) => {
              const r = insertarEnCursor(area.current, texto, e);
              setTexto(r.valor);
              window.requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(r.cursor, r.cursor); });
            }} />}
          </span>
          {multimedia && (
            <>
              <input ref={archivo} type="file" multiple hidden onChange={(e) => void subir(e.target.files)} />
              <button type="button" className="c-herramienta !h-8 !w-8" onClick={() => archivo.current?.click()} aria-label="Adjuntar" title="Fotos, videos y archivos" disabled={ocupado}><span className="material-symbols-outlined" aria-hidden="true">perm_media</span></button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {onCancelar && <button type="button" className="c-boton-fantasma c-chico" onClick={onCancelar}>Cancelar</button>}
          <button type="button" className="c-boton c-chico" disabled={(!texto.trim() && !adjuntos.length) || ocupado || texto.length > 1000} onClick={() => void enviar()}>{ocupado ? "Enviando…" : textoBoton}</button>
        </div>
      </div>
    </div>
  );
}
