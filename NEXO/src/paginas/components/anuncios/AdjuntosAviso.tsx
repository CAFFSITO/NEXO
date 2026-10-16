// Los archivos de un aviso, para quien lo recibe (y para quien lo mandó, en
// "Enviados"): los audios (notas de voz y archivos de audio) con su
// reproductor, las imágenes a la vista y el resto con su ícono. Todos se
// pueden DESCARGAR; las imágenes y los archivos de texto también COPIAR para
// pegarlos en otro lado (el navegador no deja copiar otros tipos, como un PDF:
// esos se descargan).

import { useState } from "react";
import {
  copiarArchivo,
  esAudio,
  iconoArchivo,
  sePuedeCopiar,
  type AdjuntoAviso,
} from "../../../servicios/anuncios";
import { tamanoLegible, urlPreview } from "../../../servicios/archivos";
import { descargarArchivo } from "../../../servicios/reportes";
import ReproductorVoz from "./ReproductorVoz";

interface Props {
  adjuntos: AdjuntoAviso[];
  /** "tarjeta" = adentro de la tarjeta de color del aviso. */
  variante?: "tarjeta" | "lista";
  /** Los audios se tienen que escuchar enteros (aviso todavía sin leer). */
  exigirEscucha?: boolean;
  /** Avisa qué audio ya se escuchó hasta el final. */
  onEscuchado?: (id: string) => void;
}

function nombreDeVoz(adjunto: AdjuntoAviso): string {
  const ext = adjunto.nombre.split(".").pop();
  return `Mensaje de voz.${ext || "webm"}`;
}

function Acciones({ adjunto }: { adjunto: AdjuntoAviso }) {
  const [estado, setEstado] = useState<"" | "bajando" | "copiado" | "error-copia" | "error-bajada">("");

  const descargar = async () => {
    setEstado("bajando");
    try {
      await descargarArchivo(adjunto.id, adjunto.voz ? nombreDeVoz(adjunto) : adjunto.nombre);
      setEstado("");
    } catch {
      setEstado("error-bajada");
    }
  };

  const copiar = async () => {
    setEstado((await copiarArchivo(adjunto)) ? "copiado" : "error-copia");
    window.setTimeout(() => setEstado(""), 2200);
  };

  return (
    <div className="av-adjunto-acciones">
      <button type="button" className="av-adjunto-boton" onClick={descargar} disabled={estado === "bajando"}>
        <span className="material-symbols-outlined" aria-hidden="true">download</span>
        {estado === "bajando" ? "Bajando…" : "Descargar"}
      </button>
      {!adjunto.voz && sePuedeCopiar(adjunto) && (
        <button type="button" className="av-adjunto-boton" onClick={copiar}>
          <span className="material-symbols-outlined" aria-hidden="true">{estado === "copiado" ? "check" : "content_copy"}</span>
          {estado === "copiado" ? "Copiado" : "Copiar"}
        </button>
      )}
      {estado === "error-copia" && <span className="av-adjunto-error" role="alert">No se pudo copiar: descargalo.</span>}
      {estado === "error-bajada" && <span className="av-adjunto-error" role="alert">No se pudo descargar. Probá de nuevo.</span>}
    </div>
  );
}

export default function AdjuntosAviso({ adjuntos, variante = "lista", exigirEscucha = false, onEscuchado }: Props) {
  if (!adjuntos.length) return null;
  return (
    <ul className={`av-adjuntos ${variante === "tarjeta" ? "en-tarjeta" : ""}`} aria-label="Archivos del aviso">
      {adjuntos.map((a) => (
        <li key={a.id} className="av-adjunto">
          {esAudio(a) ? (
            <>
              <p className="av-adjunto-titulo">
                <span className="material-symbols-outlined" aria-hidden="true">{a.voz ? "mic" : "graphic_eq"}</span>
                <span className="truncate">{a.voz ? "Mensaje de voz" : a.nombre}</span>
              </p>
              <ReproductorVoz
                src={urlPreview(a.id)}
                duracionMs={a.duracionMs}
                exigirCompleto={exigirEscucha}
                onEscuchado={() => onEscuchado?.(a.id)}
              />
            </>
          ) : a.tipo.startsWith("image/") ? (
            <>
              <img className="av-adjunto-imagen" src={urlPreview(a.id)} alt={a.nombre} loading="lazy" />
              <p className="av-adjunto-titulo">
                <span className="truncate">{a.nombre}</span>
                <small>{tamanoLegible(a.tamano)}</small>
              </p>
            </>
          ) : (
            <p className="av-adjunto-titulo">
              <span className="material-symbols-outlined av-adjunto-icono" aria-hidden="true">{iconoArchivo(a.tipo, a.nombre)}</span>
              <span className="truncate">{a.nombre}</span>
              <small>{tamanoLegible(a.tamano)}</small>
            </p>
          )}
          <Acciones adjunto={a} />
        </li>
      ))}
    </ul>
  );
}
