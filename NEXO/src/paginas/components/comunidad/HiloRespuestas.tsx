// Las respuestas en hilos y sub-hilos, estilo Reddit: cada respuesta cuelga de
// la suya con una línea vertical que se puede tocar para plegar todo el
// sub-hilo; se vota con flechas, se reacciona, se responde en el lugar y, si
// el hilo es muy profundo, se sigue en una vista propia.

import { useState } from "react";
import {
  comentar,
  editarComentario,
  eliminarContenido,
  puedeEliminar,
  reaccionar,
  votar,
  type Comentario,
  type ObjetoTipo,
} from "../../../servicios/comunidad";
import { textoRelativo } from "../../../servicios/fechas";
import type { Rol } from "../shared/roles";
import { Adjuntos, Avatar, Reacciones, TextoComunidad, Votos } from "./piezas";
import { armarArbol, type NodoRespuesta, type OrdenRespuestas } from "./comunidadUtil";
import CajaRespuesta from "./CajaRespuesta";
import { MenuFlotante } from "./TarjetaPublicacion";

const PROFUNDIDAD_MAXIMA = 6;

interface Props {
  comentarios: Comentario[];
  objetoTipo: ObjetoTipo;
  objetoId: string;
  aporteId?: string | null;
  yo: { id: number; rol: Rol };
  soloLectura?: boolean;
  cerrado?: boolean;
  orden: OrdenRespuestas;
  nuevoId?: string | null;
  onRespondido: (c: Comentario) => void;
  onCambio: () => void;
  onPerfil?: (id: string) => void;
  onDenunciar?: (id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

interface Contexto extends Omit<Props, "comentarios" | "orden"> {
  plegados: Set<string>;
  alternar: (id: string) => void;
  respondiendo: string | null;
  setRespondiendo: (id: string | null) => void;
  editando: { id: string; texto: string } | null;
  setEditando: (e: { id: string; texto: string } | null) => void;
  actualizar: (id: string, cambio: Partial<Comentario>) => void;
  seguir: (id: string) => void;
}

function Nodo({ nodo, profundidad, ctx }: { nodo: NodoRespuesta; profundidad: number; ctx: Contexto }) {
  const { c } = nodo;
  const plegado = ctx.plegados.has(c.id);
  const intentar = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { ctx.onAviso(e instanceof Error ? e.message : "No se pudo.", "error"); } };
  const [menu, setMenu] = useState(false);
  const deshabilitado = ctx.soloLectura || c.eliminado;

  return (
    <div className={`c-nodo ${plegado ? "is-plegado" : ""} ${ctx.nuevoId === c.id ? "is-nuevo" : ""}`} id={`respuesta-${c.id}`}>
      <div className="c-rail">
        {c.eliminado || !c.autorId
          ? <span className="c-avatar chico !bg-white/10 !text-on-surface-variant" aria-hidden="true"><span className="material-symbols-outlined !text-[15px]">{c.eliminado ? "delete" : "person"}</span></span>
          : <Avatar nombre={c.autor} url={c.autorAvatar} chico onClick={ctx.onPerfil ? () => ctx.onPerfil!(c.autorId!) : undefined} />}
        {!plegado && nodo.hijos.length > 0 && (
          <button type="button" className="c-linea" onClick={() => ctx.alternar(c.id)} aria-label={`Plegar el hilo de ${c.autor} (${nodo.total} respuestas)`} title="Plegar este hilo" />
        )}
      </div>
      <div className="min-w-0 pb-1">
        <header className="flex min-h-[28px] flex-wrap items-center gap-x-1.5 text-[13px]">
          {plegado && <button type="button" className="c-plegar" onClick={() => ctx.alternar(c.id)} aria-label="Desplegar el hilo">+</button>}
          {c.autorId && ctx.onPerfil ? <button type="button" className="c-autor text-[13px]" onClick={() => ctx.onPerfil!(c.autorId!)}>{c.autor}</button> : <span className={c.eliminado ? "italic text-on-surface-variant/50" : "font-bold text-white"}>{c.autor}</span>}
          {c.handle && <span className="c-handle">@{c.handle}</span>}
          <span className="c-handle">· {textoRelativo(c.creadoEn)}{c.editado ? " · editada" : ""}</span>
          {plegado && <span className="c-handle">· {nodo.total + 1} {nodo.total ? "respuestas" : "respuesta"} plegadas</span>}
        </header>
        {!plegado && (
          <>
            {ctx.editando?.id === c.id ? (
              <div className="mt-1">
                <textarea className="c-input min-h-[70px]" value={ctx.editando.texto} maxLength={1000} onChange={(e) => ctx.setEditando({ id: c.id, texto: e.target.value })} aria-label="Editar respuesta" autoFocus />
                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" className="c-boton-fantasma c-chico" onClick={() => ctx.setEditando(null)}>Cancelar</button>
                  <button type="button" className="c-boton c-chico" onClick={() => intentar(async () => {
                    const texto = ctx.editando!.texto.trim();
                    await editarComentario(c.id, texto);
                    ctx.actualizar(c.id, { contenido: texto, editado: true });
                    ctx.setEditando(null);
                  })}>Guardar</button>
                </div>
              </div>
            ) : c.eliminado ? (
              <p className="mt-0.5 text-[13.5px] italic text-on-surface-variant/45">Esta respuesta fue eliminada.</p>
            ) : (
              <TextoComunidad texto={c.contenido} onPersona={ctx.onPerfil} className="mt-0.5 text-[14px]" />
            )}
            <Adjuntos adjuntos={c.adjuntos} />
            {!c.eliminado && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Votos aFavor={c.votosAFavor} enContra={c.votosEnContra} miVoto={c.miVoto} deshabilitado={deshabilitado} onVotar={(v) => intentar(async () => {
                  const r = await votar("comentario", c.id, v);
                  ctx.actualizar(c.id, { miVoto: r.miVoto, votosAFavor: r.votosAFavor, votosEnContra: r.votosEnContra });
                })} />
                {!ctx.soloLectura && !ctx.cerrado && (
                  <button type="button" className="c-accion responder" onClick={() => ctx.setRespondiendo(ctx.respondiendo === c.id ? null : c.id)}>
                    <span className="material-symbols-outlined" aria-hidden="true">reply</span>Responder
                  </button>
                )}
                {!ctx.soloLectura && <Reacciones reacciones={c.reacciones} onReaccionar={(e) => intentar(async () => {
                  const r = await reaccionar("comentario", c.id, e);
                  ctx.actualizar(c.id, { reacciones: r.reacciones });
                })} />}
                {!ctx.soloLectura && (
                  <span className="relative">
                    <button type="button" className="c-accion !p-1" onClick={() => setMenu(!menu)} aria-label="Más opciones" aria-expanded={menu}><span className="material-symbols-outlined" aria-hidden="true">more_horiz</span></button>
                    <MenuFlotante abierto={menu} onCerrar={() => setMenu(false)} className="!left-0 !right-auto">
                      {c.editable && <button type="button" onClick={() => { ctx.setEditando({ id: c.id, texto: c.contenido }); setMenu(false); }}><span className="material-symbols-outlined" aria-hidden="true">edit</span>Editar</button>}
                      {profundidad >= 2 && <button type="button" onClick={() => { ctx.seguir(c.id); setMenu(false); }}><span className="material-symbols-outlined" aria-hidden="true">open_in_full</span>Ver solo este hilo</button>}
                      {!c.esMio && ctx.onDenunciar && <button type="button" onClick={() => { ctx.onDenunciar!(c.id); setMenu(false); }}><span className="material-symbols-outlined" aria-hidden="true">flag</span>Denunciar</button>}
                      {puedeEliminar(ctx.yo.rol, "comentario", c.esMio) && (
                        <button type="button" className="peligro" onClick={() => intentar(async () => { await eliminarContenido("comentario", c.id); setMenu(false); ctx.onCambio(); })}>
                          <span className="material-symbols-outlined" aria-hidden="true">delete</span>Eliminar
                        </button>
                      )}
                    </MenuFlotante>
                  </span>
                )}
              </div>
            )}
            {ctx.respondiendo === c.id && (
              <div className="mt-2">
                <CajaRespuesta
                  autoFocus
                  placeholder={`Responderle a ${c.autor}…`}
                  onCancelar={() => ctx.setRespondiendo(null)}
                  onEnviar={async (texto, adjuntos) => {
                    const r = await comentar(ctx.objetoTipo, ctx.objetoId, texto, { padreId: c.id, adjuntos });
                    ctx.setRespondiendo(null);
                    ctx.onRespondido(r.comentario);
                  }}
                />
              </div>
            )}
            {nodo.hijos.length > 0 && (
              profundidad >= PROFUNDIDAD_MAXIMA ? (
                <button type="button" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline" onClick={() => ctx.seguir(c.id)}>
                  Ver el hilo ({nodo.total} {nodo.total === 1 ? "respuesta" : "respuestas"}) <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">arrow_forward</span>
                </button>
              ) : (
                <div className="c-hijos">
                  {nodo.hijos.map((h) => <Nodo key={h.c.id} nodo={h} profundidad={profundidad + 1} ctx={ctx} />)}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HiloRespuestas(props: Props) {
  const { comentarios, orden } = props;
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  // Cambios locales (votos, reacciones, ediciones) hasta que llegue la lista nueva.
  const [cambios, setCambios] = useState<{ base: Comentario[]; mapa: Record<string, Partial<Comentario>> }>({ base: comentarios, mapa: {} });
  const mapa = cambios.base === comentarios ? cambios.mapa : {};
  const lista = comentarios.map((c) => (mapa[c.id] ? { ...c, ...mapa[c.id] } : c));
  const arbol = armarArbol(lista, orden);

  // "Seguir el hilo": mostrar solo el sub-árbol de una respuesta.
  const buscar = (nodos: NodoRespuesta[], id: string): NodoRespuesta | null => {
    for (const n of nodos) { if (n.c.id === id) return n; const r = buscar(n.hijos, id); if (r) return r; }
    return null;
  };
  const enfocado = foco ? buscar(arbol, foco) : null;

  const ctx: Contexto = {
    ...props,
    plegados,
    alternar: (id) => setPlegados((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    respondiendo,
    setRespondiendo,
    editando,
    setEditando,
    actualizar: (id, cambio) => setCambios({ base: comentarios, mapa: { ...mapa, [id]: { ...mapa[id], ...cambio } } }),
    seguir: setFoco,
  };

  if (!arbol.length) {
    return <p className="py-6 text-center text-sm text-on-surface-variant/55">{props.soloLectura ? "Sin respuestas." : "Todavía nadie respondió. ¡Arrancá la conversación!"}</p>;
  }
  return (
    <div className="flex flex-col">
      {enfocado ? (
        <>
          <button type="button" className="mb-1 inline-flex items-center gap-1 self-start text-[13px] font-semibold text-primary hover:underline" onClick={() => setFoco(null)}>
            <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">arrow_back</span>Volver a todo el hilo
          </button>
          <Nodo nodo={enfocado} profundidad={0} ctx={ctx} />
        </>
      ) : arbol.map((n) => <Nodo key={n.c.id} nodo={n} profundidad={0} ctx={ctx} />)}
    </div>
  );
}
