import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import AdjuntosAviso from "./AdjuntosAviso";
import {
  copiarTexto,
  estiloAviso,
  fechaLarga,
  iconoDestino,
  rolEnAvisos,
  responderAviso,
  type Aviso,
} from "../../../servicios/anuncios";
import Avatar from "./Avatar";
import FormularioRespuesta from "../chat/FormularioRespuesta";
import RespuestasAviso from "./RespuestasAviso";

interface Props {
  aviso: Aviso;
  leido: boolean;
  reaccion: string | null;
  emojis: string[];
  /** Es la última pendiente: pasar "a la siguiente" es terminar. */
  ultimo?: boolean;
  marcando?: boolean;
  error?: string;
  onLeer?: () => void;
  /** Pasar al siguiente aviso (o terminar, si es el último). */
  onSiguiente?: () => void;
  onReaccionar?: (emoji: string | null) => void;
}

export default function TarjetaAviso({
  aviso, leido, reaccion, emojis, ultimo = false, marcando = false, error = "", onLeer, onSiguiente, onReaccionar,
}: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  // Una vez que llegó al final, queda habilitado aunque vuelva a subir.
  const [alFinal, setAlFinal] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [respuestaOcupada, setRespuestaOcupada] = useState(false);
  const [respuestasVersion, setRespuestasVersion] = useState(0);

  const medir = useCallback(() => {
    const el = caja.current;
    if (!el) return;
    const recorrido = el.scrollHeight - el.clientHeight;
    if (recorrido <= 4 || el.scrollTop >= recorrido - 6) setAlFinal(true);
  }, []);

  useLayoutEffect(() => {
    medir();
    // El texto puede cambiar de alto al cargar la tipografía o al girar el celular.
    const observador = new ResizeObserver(medir);
    if (caja.current) observador.observe(caja.current);
    if (contenido.current) observador.observe(contenido.current);
    return () => observador.disconnect();
  }, [medir]);

  const copiar = async () => {
    if (await copiarTexto(aviso.cuerpo)) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    }
  };

  const seguirLeyendo = () => {
    const el = caja.current;
    el?.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" });
  };

  const adjuntos = aviso.adjuntos ?? [];

  return (
    <article className="av-tarjeta av-con-respuesta" data-respuesta-activa={respuestaOcupada} style={estiloAviso(aviso.color)} aria-label={`Aviso de ${aviso.autor?.nombre ?? "NEXO"}`}>
      <div className="av-sup">
        <span className="av-pill">
          <span className="material-symbols-outlined" aria-hidden="true">{iconoDestino(aviso.grupo?.tipo)}</span>
          <span>{aviso.grupo?.nombre ?? "Mensaje directo"}</span>
        </span>
        {aviso.cuerpo && (
          <button type="button" className="av-copiar" onClick={copiar} aria-label="Copiar el mensaje" title="Copiar el mensaje">
            {copiado && <em role="status">Copiado</em>}
            <span className="material-symbols-outlined" aria-hidden="true">{copiado ? "check" : "content_copy"}</span>
          </button>
        )}
      </div>

      <div className="av-remitente">
        <Avatar persona={aviso.autor} />
        <div className="min-w-0">
          <strong>{aviso.autor?.nombre ?? "Alguien que ya no está en NEXO"}</strong>
          <small>
            {aviso.autor && <span>{rolEnAvisos(aviso.autor.rol)}</span>}
            {aviso.autor && <span aria-hidden="true">·</span>}
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
              <time dateTime={aviso.creadoEn}>{fechaLarga(aviso.creadoEn)}</time>
            </span>
          </small>
        </div>
      </div>

      <div className="av-cuerpo-caja">
        <div ref={caja} className={`av-cuerpo ${alFinal ? "" : "con-mas"}`} onScroll={medir} tabIndex={0} aria-label="Texto del aviso">
          <div ref={contenido}>
            {aviso.cuerpo && <div>{aviso.cuerpo}</div>}
            <AdjuntosAviso
              adjuntos={adjuntos}
              variante="tarjeta"
            />
            {aviso.autor && <div className="mt-3"><RespuestasAviso anuncioId={aviso.id} soloHistorial actualizacion={respuestasVersion} /></div>}
          </div>
        </div>
        {!alFinal && (
          <button type="button" className="av-seguir" onClick={seguirLeyendo}>
            <span className="material-symbols-outlined" aria-hidden="true">keyboard_double_arrow_down</span>
            Seguí leyendo
          </button>
        )}
      </div>

      <div className="av-pie">
        {aviso.autor && <FormularioRespuesta key={aviso.id} onOcupado={setRespuestaOcupada}
          onEnviar={async (texto, archivoIds) => { await responderAviso(aviso.id, texto, archivoIds); setRespuestasVersion((v) => v + 1); }} />}
        <div className="av-emojis" role="group" aria-label="Reaccionar al aviso">
          {emojis.map((e, i) => <button key={e} type="button" className="av-emoji"
            style={{ "--i": i } as CSSProperties} aria-pressed={reaccion === e}
            aria-label={`Reaccionar con ${e}`} disabled={respuestaOcupada || marcando}
            onClick={() => onReaccionar?.(reaccion === e ? null : e)}>{e}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="av-leer is-listo" disabled={leido || marcando || respuestaOcupada} onClick={onLeer}>
            <span className="material-symbols-outlined" aria-hidden="true">{leido ? "done_all" : "check_circle"}</span>
            {marcando ? "Marcando…" : leido ? "Leído" : "Marcar como leído"}
          </button>
          {leido && <button type="button" className="av-leer is-listo" disabled={respuestaOcupada} onClick={onSiguiente}>
            {ultimo ? "Terminar" : "Siguiente aviso"}
          </button>}
        </div>
        {error && <p className="av-error" role="alert">{error}</p>}
      </div>
    </article>
  );
}
