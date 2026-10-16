// Un debate abierto: de qué se trata, cuántos participan y cuántos cambiaron de
// opinión, cada bloque para participar, la conclusión de quien lo abrió y la
// conversación general en hilos y sub-hilos.

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  cerrarDebate,
  comentar,
  concluirDebate,
  eliminarContenido,
  fijar,
  reaccionar,
  useDetalleDebate,
  votar,
  type DetalleDebate as Detalle,
} from "../../../servicios/comunidad";
import { useDialogo } from "../../../servicios/useDialogo";
import { textoRelativo } from "../../../servicios/fechas";
import type { Rol } from "../shared/roles";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { Adjuntos, Avatar, Reacciones, TextoComunidad, Votos } from "./piezas";
import BloqueDebate from "./BloqueDebate";
import CajaRespuesta from "./CajaRespuesta";
import HiloRespuestas from "./HiloRespuestas";
import { VISIBILIDAD } from "./debateUtil";
import type { OrdenRespuestas } from "./comunidadUtil";

interface Props {
  id: string;
  yo: { id: number; rol: Rol };
  puedeFijar: boolean;
  onCerrar: () => void;
  onCambio: () => void;
  onPerfil: (id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

export default function DetalleDebate({ id, yo, puedeFijar, onCerrar, onCambio, onPerfil, onAviso }: Props) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const { datos, cargando, error, recargar } = useDetalleDebate(id);
  // La respuesta del servidor a cada acción trae el debate entero ya actualizado.
  const [local, setLocal] = useState<{ base: Detalle | null; valor: Detalle } | null>(null);
  const vista = local && local.base === datos ? local.valor : datos;
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenRespuestas>("mejores");
  const [nuevoId, setNuevoId] = useState<string | null>(null);
  const refrescar = () => { recargar(); onCambio(); };
  const actualizar = (d: Detalle) => { setLocal({ base: datos, valor: d }); onCambio(); };
  const intentar = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { onAviso(e instanceof Error ? e.message : "No se pudo.", "error"); } };

  const d = vista?.debate;
  return createPortal(
    <div className="c-velo" onClick={onCerrar}>
      <div ref={dialogo} className="c-dialogo ancho" role="dialog" aria-modal="true" aria-label="Debate" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center gap-3 rounded-t-[26px] border-b border-white/5 bg-[color-mix(in_srgb,var(--nexo-sup-1)_92%,black)] px-5 py-3 backdrop-blur">
          <button type="button" className="c-accion !p-1.5" onClick={onCerrar} aria-label="Volver"><span className="material-symbols-outlined">arrow_back</span></button>
          <h2 className="flex-1 font-headline text-lg font-bold text-white">Debate</h2>
          {d && (
            <div className="flex flex-wrap gap-2">
              {puedeFijar && (
                <button type="button" className="c-boton-fantasma c-chico" onClick={() => intentar(async () => { await fijar("debate", d.id, !d.fijado); refrescar(); onAviso(d.fijado ? "Lo desfijaste." : "Fijado arriba de todo."); })}>
                  <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>{d.fijado ? "Desfijar" : "Fijar"}
                </button>
              )}
              {d.puedoCerrar && (
                <button type="button" className="c-boton-fantasma c-chico" onClick={() => intentar(async () => { actualizar(await cerrarDebate(d.id)); onAviso("Cerraste el debate: los resultados quedan a la vista."); })}>
                  <span className="material-symbols-outlined" aria-hidden="true">lock</span>Cerrar ahora
                </button>
              )}
              {d.puedoEliminar && (
                <button type="button" className="c-boton-fantasma c-chico hover:!text-rose-300" onClick={() => intentar(async () => { await eliminarContenido("debate", d.id); onCambio(); onCerrar(); onAviso("Debate eliminado."); })}>
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              )}
            </div>
          )}
        </header>

        <div className="p-4 sm:p-6">
          {cargando && !vista && <Cargando que="el debate" />}
          {error && !vista && <Fallo error={error} onReintentar={recargar} />}
          {vista && d && (
            <div className="flex flex-col gap-5">
              <section>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={`c-reaccion !cursor-default ${d.abierto ? "!border-emerald-400/40 !text-emerald-200" : "!border-white/20"}`}>
                    <span className="material-symbols-outlined !text-[14px]" aria-hidden="true">{d.abierto ? "radio_button_checked" : "lock"}</span>
                    {d.abierto ? (d.cierraEn ? `Abierto hasta el ${new Date(d.cierraEn + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}` : "Abierto") : "Cerrado"}
                  </span>
                  <span className="c-reaccion !cursor-default"><span className="material-symbols-outlined !text-[14px]" aria-hidden="true">visibility</span>{VISIBILIDAD[d.resultados]}</span>
                  {d.anonimo && <span className="c-reaccion !cursor-default"><span className="material-symbols-outlined !text-[14px]" aria-hidden="true">masks</span>Aportes anónimos</span>}
                  {d.fijado && <span className="c-reaccion !cursor-default"><span className="material-symbols-outlined !text-[14px]" aria-hidden="true">push_pin</span>Fijado</span>}
                </div>
                <h1 className="mt-3 font-headline text-2xl font-bold leading-tight text-white sm:text-3xl">{d.titulo}</h1>
                <p className="mt-2 flex items-center gap-2 text-[13px] text-on-surface-variant/70">
                  <Avatar nombre={d.autor} url={d.autorAvatar} chico onClick={() => onPerfil(d.autorId)} />
                  <button type="button" className="c-autor text-[13px]" onClick={() => onPerfil(d.autorId)}>{d.autor}</button> <span>@{d.handle} · {textoRelativo(d.creadoEn)}</span>
                </p>
                {d.descripcion && <TextoComunidad texto={d.descripcion} onPersona={onPerfil} className="mt-3 text-[15px]" />}
                <Adjuntos adjuntos={d.adjuntos} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Votos aFavor={d.apoyo.aFavor} enContra={d.apoyo.enContra} miVoto={d.apoyo.miVoto} onVotar={(v) => intentar(async () => { await votar("debate", d.id, v); refrescar(); })} />
                  <Reacciones reacciones={d.reacciones} onReaccionar={(e) => intentar(async () => { await reaccionar("debate", d.id, e); refrescar(); })} />
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Estadísticas">
                {([["groups", vista.estadisticas.participantes, "participantes"], ["how_to_vote", vista.estadisticas.respuestas, "respuestas"], ["campaign", vista.estadisticas.aportes, "aportes"], ["change_circle", vista.estadisticas.cambiosDeOpinion, "cambios de opinión (Δ)"], ["forum", vista.estadisticas.comentarios, "comentarios"]] as [string, number, string][]).map(([icono, n, texto]) => (
                  <div key={texto} className="c-panel px-3 py-3 text-center">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">{icono}</span>
                    <p className="font-headline text-2xl font-bold text-white">{n}</p>
                    <p className="text-[11px] text-on-surface-variant/60">{texto}</p>
                  </div>
                ))}
              </section>

              {(d.conclusion || d.puedoConcluir) && (
                <section className="rounded-2xl border border-amber-300/25 bg-amber-400/5 p-4" aria-label="Conclusión">
                  <p className="c-subtitulo !text-amber-200/80">Conclusión</p>
                  {conclusion !== null ? (
                    <>
                      <textarea className="c-input mt-2 min-h-[100px]" value={conclusion} maxLength={4000} onChange={(e) => setConclusion(e.target.value)} placeholder="¿A qué se llegó? ¿Qué se va a hacer?" aria-label="Conclusión" autoFocus />
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" className="c-boton-fantasma c-chico" onClick={() => setConclusion(null)}>Cancelar</button>
                        <button type="button" className="c-boton c-chico" onClick={() => intentar(async () => { actualizar(await concluirDebate(d.id, conclusion)); setConclusion(null); onAviso("Conclusión publicada: les avisamos a quienes participaron."); })}>Publicar</button>
                      </div>
                    </>
                  ) : d.conclusion ? (
                    <>
                      <TextoComunidad texto={d.conclusion.texto} className="mt-2 text-[15px]" />
                      {d.puedoConcluir && <button type="button" className="mt-2 text-[12px] font-semibold text-primary hover:underline" onClick={() => setConclusion(d.conclusion!.texto)}>Editar la conclusión</button>}
                    </>
                  ) : (
                    <button type="button" className="c-boton-fantasma c-chico mt-2" onClick={() => setConclusion("")}><span className="material-symbols-outlined" aria-hidden="true">edit</span>Escribir la conclusión</button>
                  )}
                </section>
              )}

              {vista.bloques.map((b) => (
                <BloqueDebate
                  key={b.id}
                  bloque={b}
                  debateId={d.id}
                  abierto={d.puedoAportar}
                  resultados={d.resultados}
                  comentarios={vista.comentarios}
                  yo={yo}
                  onDetalle={actualizar}
                  onRecargar={refrescar}
                  onPerfil={onPerfil}
                  onAviso={onAviso}
                />
              ))}

              <section aria-label="Conversación general">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <h3 className="font-headline text-lg font-bold text-white">Conversación</h3>
                  <div className="flex gap-1" role="radiogroup" aria-label="Ordenar">
                    {(["mejores", "nuevas", "antiguas", "polemicas"] as OrdenRespuestas[]).map((o) => (
                      <button key={o} type="button" role="radio" aria-checked={orden === o} onClick={() => setOrden(o)}
                        className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition ${orden === o ? "bg-white/10 text-white" : "text-on-surface-variant/60 hover:text-white"}`}>{o === "polemicas" ? "Polémicas" : o}</button>
                    ))}
                  </div>
                </div>
                {d.abierto && (
                  <div className="mt-3">
                    <CajaRespuesta placeholder="Sumate a la conversación…" onEnviar={async (texto, adjuntos) => { const r = await comentar("debate", d.id, texto, { adjuntos }); setNuevoId(r.comentario?.id ?? r.id); refrescar(); }} />
                  </div>
                )}
                <HiloRespuestas
                  comentarios={vista.comentarios.filter((c) => !c.aporteId)}
                  objetoTipo="debate"
                  objetoId={d.id}
                  yo={yo}
                  cerrado={!d.abierto}
                  orden={orden}
                  nuevoId={nuevoId}
                  onRespondido={(c) => { setNuevoId(c.id); refrescar(); }}
                  onCambio={refrescar}
                  onPerfil={onPerfil}
                  onAviso={onAviso}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
