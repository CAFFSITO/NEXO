// Una publicación del feed, estilo X: quién la reposteó o si está fijada, el
// texto con @menciones y #temas, fotos y videos, encuesta, cita, reacciones y
// las acciones (responder, repostear o citar, votar con flechas, vistas,
// guardar, compartir) más el menú de tres puntos.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  editarPublicacion,
  eliminarContenido,
  fijar,
  guardarPublicacion,
  puedeEliminar,
  reaccionar,
  repostear,
  silenciar,
  votar,
  votarEncuesta,
  type Publicacion,
} from "../../../servicios/comunidad";
import { textoRelativo } from "../../../servicios/fechas";
import type { Rol } from "../shared/roles";
import { Adjuntos, Avatar, EncuestaVista, Reacciones, TextoComunidad, Votos } from "./piezas";
import { numeroCorto } from "./comunidadUtil";

interface Props {
  pub: Publicacion;
  yo: { id: number; rol: Rol };
  puedeFijar: boolean;
  puedePublicar: boolean;
  onActualizar: (id: string, cambio: Partial<Publicacion>) => void;
  onAbrir: (id: string) => void;
  onPerfil: (id: string) => void;
  onTag: (tag: string) => void;
  onCitar: (pub: Publicacion) => void;
  onRecargar: () => void;
  onDenunciar: (id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

/** Un menú que se cierra al tocar afuera o con Escape. */
export function MenuFlotante({ abierto, onCerrar, children, className = "" }: { abierto: boolean; onCerrar: () => void; children: ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    const t = window.setTimeout(() => window.addEventListener("pointerdown", fuera), 0);
    window.addEventListener("keydown", tecla);
    return () => { window.clearTimeout(t); window.removeEventListener("pointerdown", fuera); window.removeEventListener("keydown", tecla); };
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return <div ref={caja} className={`c-menu ${className}`} role="menu" onClick={(e) => e.stopPropagation()}>{children}</div>;
}

export default function TarjetaPublicacion({ pub, yo, puedeFijar, puedePublicar, onActualizar, onAbrir, onPerfil, onTag, onCitar, onRecargar, onDenunciar, onAviso }: Props) {
  const [menu, setMenu] = useState(false);
  const [menuRepost, setMenuRepost] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const esMia = pub.autorId === String(yo.id);

  const intentar = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { onAviso(e instanceof Error ? e.message : "No se pudo.", "error"); }
  };
  const votarPub = (valor: 1 | -1) => intentar(async () => {
    const r = await votar("publicacion", pub.id, valor);
    onActualizar(pub.id, { miVoto: r.miVoto, votosAFavor: r.votosAFavor, votosEnContra: r.votosEnContra });
  });
  const reaccionarPub = (emoji: string) => intentar(async () => {
    const r = await reaccionar("publicacion", pub.id, emoji);
    onActualizar(pub.id, { reacciones: r.reacciones });
  });
  const repostearPub = () => intentar(async () => {
    const r = await repostear(pub.id);
    onActualizar(pub.id, { miRepost: r.activo, reposts: r.total });
    setMenuRepost(false);
    onAviso(r.activo ? "Reposteaste la publicación." : "Deshiciste el repost.");
  });
  const guardar = () => intentar(async () => {
    const r = await guardarPublicacion(pub.id);
    onActualizar(pub.id, { guardado: r.activo });
    onAviso(r.activo ? "Guardada en tus guardados." : "La sacaste de tus guardados.");
  });
  const votarOpcion = (opcionId: string) => intentar(async () => {
    const r = await votarEncuesta(pub.id, opcionId);
    onActualizar(pub.id, { encuesta: { ...pub.encuesta!, ...r } });
  });
  const compartir = () => intentar(async () => {
    const enlace = `${window.location.origin}/comunidad?publicacion=${pub.id}`;
    await navigator.clipboard.writeText(enlace);
    onAviso("Copiamos el enlace de la publicación.");
  });
  const guardarEdicion = () => intentar(async () => {
    if (!editando?.trim()) return;
    await editarPublicacion(pub.id, editando.trim());
    onActualizar(pub.id, { contenido: editando.trim(), editado: true });
    setEditando(null);
  });

  return (
    <article className={`c-tarjeta c-aparecer cursor-pointer ${pub.fijado && !pub.repostadoPor ? "is-fijada" : ""}`} onClick={() => onAbrir(pub.id)} aria-label={`Publicación de ${pub.autor}`}>
      {(pub.repostadoPor || (pub.fijado && !pub.repostadoPor)) && (
        <p className="mb-2 flex items-center gap-1.5 pl-[54px] text-[12px] font-semibold text-on-surface-variant/60">
          <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">{pub.repostadoPor ? "repeat" : "push_pin"}</span>
          {pub.repostadoPor ? `${pub.repostadoPor.id === String(yo.id) ? "Reposteaste" : `${pub.repostadoPor.nombre} reposteó`}` : "Fijada"}
        </p>
      )}
      <div className="grid grid-cols-[42px_minmax(0,1fr)] items-start gap-x-3">
        <Avatar nombre={pub.autor} url={pub.autorAvatar} onClick={() => onPerfil(pub.autorId)} />
        <div className="min-w-0">
          <header className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-[14px] leading-tight">
              <button type="button" className="c-autor" onClick={(e) => { e.stopPropagation(); onPerfil(pub.autorId); }}>{pub.autor}</button>{" "}
              <span className="c-handle">@{pub.handle} · {textoRelativo(pub.creadoEn)}{pub.editado ? " · editada" : ""}</span>
            </p>
            {pub.programada && <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-200">Programada</span>}
            <span className="relative shrink-0">
              <button type="button" className="c-accion !p-1" aria-label="Más opciones" aria-expanded={menu} onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}>
                <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
              </button>
              <MenuFlotante abierto={menu} onCerrar={() => setMenu(false)}>
                {puedeFijar && (
                  <button type="button" onClick={() => intentar(async () => { await fijar("publicacion", pub.id, !pub.fijado); setMenu(false); onRecargar(); onAviso(pub.fijado ? "La desfijaste." : "Fijada arriba de todo."); })}>
                    <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>{pub.fijado ? "Desfijar" : "Fijar arriba de todo"}
                  </button>
                )}
                {pub.editable && <button type="button" onClick={() => { setEditando(pub.contenido); setMenu(false); }}><span className="material-symbols-outlined" aria-hidden="true">edit</span>Editar (primeros 30 min)</button>}
                <button type="button" onClick={() => { setMenu(false); void compartir(); }}><span className="material-symbols-outlined" aria-hidden="true">link</span>Copiar enlace</button>
                {!esMia && (
                  <button type="button" onClick={() => intentar(async () => { await silenciar(pub.autorId); setMenu(false); onRecargar(); onAviso(`Silenciaste a @${pub.handle}.`); })}>
                    <span className="material-symbols-outlined" aria-hidden="true">volume_off</span>Silenciar a @{pub.handle}
                  </button>
                )}
                {!esMia && <button type="button" onClick={() => { setMenu(false); onDenunciar(pub.id); }}><span className="material-symbols-outlined" aria-hidden="true">flag</span>Denunciar</button>}
                {puedeEliminar(yo.rol, "publicacion", esMia) && (
                  <button type="button" className="peligro" onClick={() => intentar(async () => { await eliminarContenido("publicacion", pub.id); setMenu(false); onRecargar(); onAviso("Publicación eliminada."); })}>
                    <span className="material-symbols-outlined" aria-hidden="true">delete</span>Eliminar
                  </button>
                )}
              </MenuFlotante>
            </span>
          </header>

          {editando !== null ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <textarea className="c-input min-h-[90px]" value={editando} maxLength={1000} onChange={(e) => setEditando(e.target.value)} aria-label="Editar publicación" autoFocus />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="c-boton-fantasma c-chico" onClick={() => setEditando(null)}>Cancelar</button>
                <button type="button" className="c-boton c-chico" onClick={() => void guardarEdicion()} disabled={!editando.trim()}>Guardar</button>
              </div>
            </div>
          ) : (
            pub.contenido && <TextoComunidad texto={pub.contenido} menciones={pub.menciones} onPersona={onPerfil} onTag={onTag} className="mt-1 text-[15px]" />
          )}
          {pub.hilo?.total && pub.hilo.total > 1 && (
            <button type="button" className="mt-1 text-[13px] font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onAbrir(pub.id); }}>
              Mostrar este hilo ({pub.hilo.total})
            </button>
          )}
          <Adjuntos adjuntos={pub.adjuntos} />
          {pub.encuesta && <EncuestaVista encuesta={pub.encuesta} onVotar={(o) => void votarOpcion(o)} />}
          {pub.cita && (
            <button type="button" className="c-cita" onClick={(e) => { e.stopPropagation(); if (!pub.cita?.eliminada) onAbrir(pub.cita!.id); }}>
              {pub.cita.eliminada ? <p className="text-sm text-on-surface-variant/60">Esta publicación ya no está disponible.</p> : <>
                <p className="flex items-center gap-2 text-[13px]"><Avatar nombre={pub.cita.autor ?? ""} url={pub.cita.autorAvatar} chico /><b className="text-white">{pub.cita.autor}</b><span className="c-handle">@{pub.cita.handle} · {textoRelativo(pub.cita.creadoEn ?? "")}</span></p>
                <TextoComunidad texto={pub.cita.contenido ?? ""} className="mt-1 line-clamp-4 text-[14px]" />
                {pub.cita.adjuntos?.[0]?.clase === "imagen" && <Adjuntos adjuntos={pub.cita.adjuntos} />}
              </>}
            </button>
          )}
          {pub.reacciones.length > 0 && <Reacciones reacciones={pub.reacciones} onReaccionar={(e) => void reaccionarPub(e)} />}

          <div className="c-acciones" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="c-accion responder" onClick={() => onAbrir(pub.id)} disabled={!pub.puedoResponder && pub.comentarios === 0} title={pub.puedoResponder ? "Responder" : "Quien publicó eligió quién responde"} aria-label={`Responder (${pub.comentarios})`}>
              <span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span>{pub.comentarios > 0 && numeroCorto(pub.comentarios)}
            </button>
            <span className="relative">
              <button type="button" className="c-accion repost" aria-pressed={pub.miRepost} disabled={!puedePublicar} onClick={() => setMenuRepost(!menuRepost)} aria-label={`Repostear o citar (${pub.reposts + pub.citas})`} aria-expanded={menuRepost}>
                <span className="material-symbols-outlined" aria-hidden="true">repeat</span>{pub.reposts + pub.citas > 0 && numeroCorto(pub.reposts + pub.citas)}
              </button>
              <MenuFlotante abierto={menuRepost} onCerrar={() => setMenuRepost(false)} className="!left-0 !right-auto">
                <button type="button" onClick={() => void repostearPub()}><span className="material-symbols-outlined" aria-hidden="true">repeat</span>{pub.miRepost ? "Deshacer el repost" : "Repostear"}</button>
                <button type="button" onClick={() => { setMenuRepost(false); onCitar(pub); }}><span className="material-symbols-outlined" aria-hidden="true">format_quote</span>Citar</button>
              </MenuFlotante>
            </span>
            <Votos aFavor={pub.votosAFavor} enContra={pub.votosEnContra} miVoto={pub.miVoto} onVotar={(v) => void votarPub(v)} />
            <Reacciones reacciones={[]} soloBoton onReaccionar={(e) => void reaccionarPub(e)} />
            <span className="c-accion !cursor-default" title={`${pub.vistas} ${pub.vistas === 1 ? "vista" : "vistas"}`} aria-label={`${pub.vistas} vistas`}>
              <span className="material-symbols-outlined" aria-hidden="true">bar_chart</span>{numeroCorto(pub.vistas)}
            </span>
            <span className="ml-auto flex">
              <button type="button" className="c-accion guardar" aria-pressed={pub.guardado} onClick={() => void guardar()} aria-label={pub.guardado ? "Quitar de guardados" : "Guardar"} title={pub.guardado ? "Guardada" : "Guardar"}>
                <span className="material-symbols-outlined" aria-hidden="true">bookmark</span>
              </button>
              <button type="button" className="c-accion" onClick={() => void compartir()} aria-label="Compartir" title="Copiar enlace">
                <span className="material-symbols-outlined" aria-hidden="true">ios_share</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
