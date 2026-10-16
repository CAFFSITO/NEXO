// Piezas de la Comunidad que se repiten en todos lados: avatar, votos con
// flechas verde y roja (no hay "me gusta"), reacciones con emoji, el texto con
// @menciones, #temas y enlaces, los adjuntos y la encuesta.

import { Fragment, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Adjunto, Encuesta, Reaccion, Voto } from "../../../servicios/comunidad";
import { tamanoLegible, urlDescarga, urlPreview } from "../../../servicios/archivos";
import SelectorEmoji from "./SelectorEmoji";
import { iniciales, numeroCorto } from "./comunidadUtil";

export function Avatar({ nombre, url, chico, onClick }: { nombre: string; url?: string | null; chico?: boolean; onClick?: () => void }) {
  const contenido = url ? <img src={url} alt="" className={`c-avatar ${chico ? "chico" : ""}`} /> : <span className={`c-avatar ${chico ? "chico" : ""}`} aria-hidden="true">{iniciales(nombre) || "?"}</span>;
  return onClick ? <button type="button" onClick={onClick} className="shrink-0 rounded-full" aria-label={`Ver el perfil de ${nombre}`}>{contenido}</button> : contenido;
}

export function Votos({ aFavor, enContra, miVoto, onVotar, vertical, deshabilitado }: {
  aFavor: number; enContra: number; miVoto: Voto | null; onVotar: (valor: 1 | -1) => void; vertical?: boolean; deshabilitado?: boolean;
}) {
  const puntaje = aFavor - enContra;
  return (
    <div className={`c-votos ${vertical ? "vertical" : ""}`} role="group" aria-label={`Votos: ${aFavor} a favor y ${enContra} en contra`}>
      <button type="button" className="c-voto arriba" aria-pressed={miVoto === "a-favor"} aria-label="Votar a favor" title="A favor" disabled={deshabilitado} onClick={(e) => { e.stopPropagation(); onVotar(1); }}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
      </button>
      <span className={`c-puntaje ${puntaje > 0 ? "positivo" : puntaje < 0 ? "negativo" : ""}`} title={`${aFavor} a favor · ${enContra} en contra`}>{numeroCorto(Math.abs(puntaje)) === "0" ? "0" : `${puntaje < 0 ? "−" : ""}${numeroCorto(Math.abs(puntaje))}`}</span>
      <button type="button" className="c-voto abajo" aria-pressed={miVoto === "en-contra"} aria-label="Votar en contra" title="En contra" disabled={deshabilitado} onClick={(e) => { e.stopPropagation(); onVotar(-1); }}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
      </button>
    </div>
  );
}

export function Reacciones({ reacciones, onReaccionar, deshabilitado, soloBoton }: {
  reacciones: Reaccion[]; onReaccionar: (emoji: string) => void; deshabilitado?: boolean; soloBoton?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={soloBoton ? "relative inline-flex" : "c-reacciones relative"}>
      {!soloBoton && reacciones.map((r) => (
        <button key={r.emoji} type="button" className="c-reaccion" aria-pressed={r.mia} disabled={deshabilitado} onClick={(e) => { e.stopPropagation(); onReaccionar(r.emoji); }} aria-label={`${r.emoji} ${r.cantidad}${r.mia ? ", tuya" : ""}`}>
          <span>{r.emoji}</span><b>{r.cantidad}</b>
        </button>
      ))}
      {!deshabilitado && (
        <span className="relative">
          <button type="button" className={soloBoton ? "c-accion" : "c-reaccion !px-2"} aria-label="Reaccionar con un emoji" title="Reaccionar" aria-expanded={abierto} onClick={(e) => { e.stopPropagation(); setAbierto(!abierto); }}>
            <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">add_reaction</span>
          </button>
          {abierto && <SelectorEmoji rapidas lado="arriba" onCerrar={() => setAbierto(false)} onElegir={(e) => { onReaccionar(e); setAbierto(false); }} />}
        </span>
      )}
    </div>
  );
}

const TOKENS = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])|(^|[^\p{L}\p{N}_@.])@([a-z0-9][a-z0-9._-]{1,39})|(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]{2,40})/giu;

/** El texto de una publicación con sus enlaces, @menciones y #temas tocables. */
export function TextoComunidad({ texto, menciones = [], onPersona, onTag, className = "" }: {
  texto: string; menciones?: { id: string; handle: string }[]; onPersona?: (id: string) => void; onTag?: (tag: string) => void; className?: string;
}) {
  const porHandle = new Map(menciones.map((m) => [m.handle, m.id]));
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TOKENS)) {
    const inicio = m.index ?? 0;
    if (m[1]) {
      partes.push(texto.slice(ultimo, inicio));
      partes.push(<a key={inicio} href={m[1]} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>{m[1].replace(/^https?:\/\//, "").slice(0, 48)}{m[1].length > 56 ? "…" : ""}</a>);
      ultimo = inicio + m[0].length;
    } else if (m[3]) {
      const handle = m[3].replace(/[._-]+$/, "").toLowerCase();
      const id = porHandle.get(handle);
      const desde = inicio + m[2].length;
      partes.push(texto.slice(ultimo, desde));
      partes.push(id && onPersona
        ? <button key={desde} type="button" className="c-enlace" onClick={(e) => { e.stopPropagation(); onPersona(id); }}>@{handle}</button>
        : <span key={desde} className="font-semibold text-primary/80">@{handle}</span>);
      ultimo = desde + 1 + handle.length;
    } else if (m[5]) {
      const desde = inicio + m[4].length;
      partes.push(texto.slice(ultimo, desde));
      partes.push(onTag
        ? <button key={desde} type="button" className="c-enlace" onClick={(e) => { e.stopPropagation(); onTag(m[5]); }}>#{m[5]}</button>
        : <span key={desde} className="font-semibold text-primary/80">#{m[5]}</span>);
      ultimo = desde + 1 + m[5].length;
    }
  }
  partes.push(texto.slice(ultimo));
  return <p className={`c-texto ${className}`}>{partes.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</p>;
}

/** Fotos en grilla (con visor), videos, audios y archivos para bajar. */
export function Adjuntos({ adjuntos }: { adjuntos: Adjunto[] }) {
  const [visor, setVisor] = useState<number | null>(null);
  if (!adjuntos.length) return null;
  const imagenes = adjuntos.filter((a) => a.clase === "imagen");
  const otros = adjuntos.filter((a) => a.clase !== "imagen");
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {imagenes.length > 0 && (
        <div className={`c-galeria n${Math.min(imagenes.length, 4)}`}>
          {imagenes.slice(0, 4).map((a, i) => (
            <button key={a.id} type="button" className="relative block" onClick={() => setVisor(i)} aria-label={`Ver la imagen ${a.nombre}`}>
              <img src={urlPreview(a.id)} alt={a.nombre} loading="lazy" />
              {i === 3 && imagenes.length > 4 && <span className="absolute inset-0 grid place-items-center bg-black/60 font-headline text-2xl font-bold text-white">+{imagenes.length - 4}</span>}
            </button>
          ))}
        </div>
      )}
      {otros.map((a) => a.clase === "video" ? (
        <video key={a.id} className="c-video" src={urlPreview(a.id)} controls preload="metadata" aria-label={a.nombre} />
      ) : a.clase === "audio" ? (
        <audio key={a.id} className="mt-2 w-full" src={urlPreview(a.id)} controls preload="metadata" aria-label={a.nombre} />
      ) : (
        <a key={a.id} className="c-archivo" href={urlDescarga(a.id)} download>
          <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">{a.tipo.includes("pdf") ? "picture_as_pdf" : a.tipo.includes("zip") || a.tipo.includes("rar") || a.tipo.includes("7z") ? "folder_zip" : "description"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{a.nombre}</span>
            <span className="block text-[11px] text-on-surface-variant/60">{tamanoLegible(a.tamano)}</span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant/60" aria-hidden="true">download</span>
        </a>
      ))}
      {visor !== null && createPortal(
        <div className="c-velo !place-items-center" onClick={() => setVisor(null)} role="dialog" aria-label="Imagen ampliada">
          <img src={urlPreview(imagenes[visor].id)} alt={imagenes[visor].nombre} className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
          {imagenes.length > 1 && (
            <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 gap-2" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="c-boton-fantasma" onClick={() => setVisor((visor + imagenes.length - 1) % imagenes.length)} aria-label="Anterior"><span className="material-symbols-outlined">chevron_left</span></button>
              <button type="button" className="c-boton-fantasma" onClick={() => setVisor((visor + 1) % imagenes.length)} aria-label="Siguiente"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Una encuesta de publicación: votar una vez y ver las barras. */
export function EncuestaVista({ encuesta, onVotar, deshabilitado }: { encuesta: Encuesta; onVotar: (opcionId: string) => void; deshabilitado?: boolean }) {
  const ver = encuesta.miOpcion !== null || encuesta.cerrada || encuesta.opciones.some((o) => o.votos !== null);
  return (
    <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {encuesta.opciones.map((o) => {
        const pct = ver && encuesta.total ? Math.round(((o.votos ?? 0) / encuesta.total) * 100) : 0;
        return (
          <button key={o.id} type="button" className={`c-opcion ${encuesta.miOpcion === o.id ? "mia" : ""}`} disabled={ver || deshabilitado} onClick={() => onVotar(o.id)} aria-pressed={encuesta.miOpcion === o.id}>
            {ver && <span className="c-opcion-barra" style={{ width: `${pct}%` }} aria-hidden="true" />}
            <span className="flex items-center gap-2 font-semibold">{o.texto}{encuesta.miOpcion === o.id && <span className="material-symbols-outlined !text-[16px]" aria-label="Tu voto">check_circle</span>}</span>
            {ver && <span className="font-bold tabular-nums">{pct} %</span>}
          </button>
        );
      })}
      <p className="text-[11.5px] text-on-surface-variant/60">
        {encuesta.total} {encuesta.total === 1 ? "voto" : "votos"} · {encuesta.cerrada ? "Encuesta cerrada" : `Cierra el ${new Date(encuesta.cierraEn).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
      </p>
    </div>
  );
}
