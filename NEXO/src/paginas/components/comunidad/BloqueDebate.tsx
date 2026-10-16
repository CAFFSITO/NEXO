// Un bloque de un debate, listo para participar: postura, encuesta, escala,
// ranking (arrastrar u ordenar con flechas) o aportes (argumentos a favor y en
// contra en un mapa, propuestas, respuestas abiertas), cada aporte con sus
// votos, la Δ de "me hizo cambiar de opinión", reacciones y su propio hilo.

import { useState } from "react";
import {
  aportar,
  borrarAporte,
  comentar,
  convencio,
  reaccionar,
  responderBloque,
  votar,
  type Aporte,
  type BloqueDebate as Bloque,
  type Comentario,
  type DetalleDebate,
  type Voto,
} from "../../../servicios/comunidad";
import { textoRelativo } from "../../../servicios/fechas";
import type { Rol } from "../shared/roles";
import { Adjuntos, Avatar, Reacciones, TextoComunidad, Votos } from "./piezas";
import CajaRespuesta from "./CajaRespuesta";
import HiloRespuestas from "./HiloRespuestas";
import { TIPOS_BLOQUE } from "./debateUtil";

interface Props {
  bloque: Bloque;
  debateId: string;
  abierto: boolean;
  resultados: "siempre" | "al-participar" | "al-cierre";
  comentarios: Comentario[];
  yo: { id: number; rol: Rol };
  onDetalle: (d: DetalleDebate) => void;
  onRecargar: () => void;
  onPerfil: (id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

function Oculto({ resultados, abierto }: { resultados: Props["resultados"]; abierto: boolean }) {
  return (
    <p className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[12.5px] text-on-surface-variant">
      <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">visibility_off</span>
      {resultados === "al-cierre" && abierto ? "Los resultados se ven cuando cierre el debate." : "Respondé para ver qué opinan los demás."}
    </p>
  );
}

function Consenso({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return null;
  const v = Math.round(valor * 100);
  return <span className="c-reaccion !cursor-default !py-0.5" title="0 % = dividido; 100 % = todos piensan igual">Consenso <b>{v} %</b></span>;
}

export default function BloqueDebate(props: Props) {
  const { bloque, debateId, abierto, onDetalle, onAviso } = props;
  const meta = TIPOS_BLOQUE[bloque.tipo];
  const [ocupado, setOcupado] = useState(false);
  const responder = async (valor: unknown) => {
    setOcupado(true);
    try { onDetalle(await responderBloque(debateId, bloque.id, valor)); } catch (e) { onAviso(e instanceof Error ? e.message : "No se pudo responder.", "error"); } finally { setOcupado(false); }
  };
  const r = bloque.resultados;

  return (
    <section className="c-bloque c-aparecer" aria-label={bloque.titulo}>
      <p className="c-bloque-tipo" style={{ color: meta.color }}><span className="material-symbols-outlined !text-[15px]" aria-hidden="true">{meta.icono}</span>{meta.nombre}</p>
      <h3 className="mt-1 font-headline text-lg font-bold text-white">{bloque.titulo}</h3>
      {bloque.respondieron !== undefined && <p className="text-[12px] text-on-surface-variant/55">{bloque.respondieron} {bloque.respondieron === 1 ? "persona respondió" : "personas respondieron"}</p>}

      {bloque.tipo === "postura" && (
        <>
          <div className="mt-3 flex gap-2">
            {([["a-favor", "favor", "thumb_up", "A favor"], ...(bloque.config.neutral ? [["neutral", "neutral", "help", "Indeciso"]] : []), ["en-contra", "contra", "thumb_down", "En contra"]] as [string, string, string, string][]).map(([valor, clase, icono, texto]) => (
              <button key={valor} type="button" className={`c-postura ${clase}`} aria-pressed={bloque.miRespuesta === valor} disabled={!abierto || ocupado}
                onClick={() => void responder(bloque.miRespuesta === valor ? null : valor)}>
                <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>{texto}
              </button>
            ))}
          </div>
          {r ? (
            <div className="mt-4">
              <div className="c-barra-doble" aria-hidden="true">
                <span style={{ width: `${pct(r.aFavor ?? 0, r.total)}%`, background: "#10b981" }} />
                <span style={{ width: `${pct(r.neutral ?? 0, r.total)}%`, background: "#facc15" }} />
                <span style={{ width: `${pct(r.enContra ?? 0, r.total)}%`, background: "#f43f5e" }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px]">
                <span className="text-emerald-300"><b>{pct(r.aFavor ?? 0, r.total)} %</b> a favor ({r.aFavor})</span>
                {bloque.config.neutral && <span className="text-amber-200"><b>{pct(r.neutral ?? 0, r.total)} %</b> indecisos ({r.neutral})</span>}
                <span className="text-rose-300"><b>{pct(r.enContra ?? 0, r.total)} %</b> en contra ({r.enContra})</span>
                <Consenso valor={r.consenso} />
              </div>
            </div>
          ) : <Oculto resultados={props.resultados} abierto={abierto} />}
        </>
      )}

      {bloque.tipo === "opciones" && <BloqueOpciones {...props} ocupado={ocupado} responder={responder} />}
      {bloque.tipo === "escala" && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="hidden text-[11px] text-on-surface-variant/60 sm:block">{bloque.config.etiquetaMin}</span>
            <div className="c-escala flex-1">
              {Array.from({ length: (bloque.config.maximo ?? 5) - (bloque.config.minimo ?? 1) + 1 }, (_, i) => (bloque.config.minimo ?? 1) + i).map((v) => (
                <button key={v} type="button" aria-pressed={bloque.miRespuesta === v} disabled={!abierto || ocupado} onClick={() => void responder(bloque.miRespuesta === v ? null : v)} aria-label={`${v}`}>{v}</button>
              ))}
            </div>
            <span className="hidden text-[11px] text-on-surface-variant/60 sm:block">{bloque.config.etiquetaMax}</span>
          </div>
          {r ? (
            <div className="mt-4">
              <div className="flex h-20 items-end gap-1" aria-hidden="true">
                {r.distribucion?.map((d) => {
                  const max = Math.max(1, ...(r.distribucion ?? []).map((x) => x.cantidad));
                  return <span key={d.valor} className="flex-1 rounded-t-md bg-gradient-to-t from-acento to-primary transition-all" style={{ height: `${Math.max(4, (d.cantidad / max) * 100)}%` }} title={`${d.valor}: ${d.cantidad}`} />;
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-on-surface-variant">
                <span>Promedio <b className="text-white">{r.promedio ?? "—"}</b></span>
                <span>Mediana <b className="text-white">{r.mediana ?? "—"}</b></span>
                <Consenso valor={r.consenso} />
              </div>
            </div>
          ) : <Oculto resultados={props.resultados} abierto={abierto} />}
        </>
      )}
      {bloque.tipo === "ranking" && <BloqueRanking {...props} ocupado={ocupado} responder={responder} />}
      {["argumentos", "propuestas", "abierta"].includes(bloque.tipo) && <BloqueAportes {...props} />}
    </section>
  );
}

function BloqueOpciones({ bloque, abierto, resultados, ocupado, responder }: Props & { ocupado: boolean; responder: (v: unknown) => Promise<void> }) {
  const multiple = Boolean(bloque.config.multiple);
  const mias = Array.isArray(bloque.miRespuesta) ? (bloque.miRespuesta as string[]) : bloque.miRespuesta ? [bloque.miRespuesta as string] : [];
  const [eleccion, setEleccion] = useState<string[] | null>(null);
  const actual = eleccion ?? mias;
  const r = bloque.resultados;
  return (
    <>
      <div className="mt-3 flex flex-col gap-2">
        {bloque.config.opciones?.map((o) => {
          const votos = r?.opciones?.find((x) => x.id === o.id)?.votos ?? 0;
          const elegida = actual.includes(o.id);
          return (
            <button key={o.id} type="button" className={`c-opcion ${elegida ? "mia" : ""}`} aria-pressed={elegida} disabled={!abierto || ocupado}
              onClick={() => {
                if (!multiple) { void responder(mias[0] === o.id ? null : o.id); return; }
                const nueva = elegida ? actual.filter((x) => x !== o.id) : [...actual, o.id];
                if (nueva.length <= (bloque.config.maximo ?? 99)) setEleccion(nueva);
              }}>
              {r && <span className="c-opcion-barra" style={{ width: `${pct(votos, r.total)}%` }} aria-hidden="true" />}
              <span className="flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">{multiple ? (elegida ? "check_box" : "check_box_outline_blank") : elegida ? "radio_button_checked" : "radio_button_unchecked"}</span>{o.texto}
              </span>
              {r && <span className="font-bold tabular-nums">{pct(votos, r.total)} %</span>}
            </button>
          );
        })}
      </div>
      {multiple && abierto && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-on-surface-variant/60">
          <span>Elegí hasta {bloque.config.maximo}.</span>
          <button type="button" className="c-boton c-chico" disabled={!eleccion || ocupado} onClick={() => { void responder(actual.length ? actual : null).then(() => setEleccion(null)); }}>Guardar mi elección</button>
        </div>
      )}
      {!r && <Oculto resultados={resultados} abierto={abierto} />}
    </>
  );
}

function BloqueRanking({ bloque, abierto, resultados, ocupado, responder }: Props & { ocupado: boolean; responder: (v: unknown) => Promise<void> }) {
  const opciones = bloque.config.opciones ?? [];
  const inicial = Array.isArray(bloque.miRespuesta) ? (bloque.miRespuesta as string[]) : opciones.map((o) => o.id);
  const [orden, setOrden] = useState<string[] | null>(null);
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const actual = orden ?? inicial;
  const mover = (i: number, j: number) => { const n = [...actual]; const [x] = n.splice(i, 1); n.splice(j, 0, x); setOrden(n); };
  const r = bloque.resultados;
  return (
    <>
      <ol className="mt-3 flex flex-col gap-1.5">
        {actual.map((id, i) => (
          <li key={id} className={`c-ranking-item ${arrastrada === id ? "is-arrastrado" : ""}`} draggable={abierto}
            onDragStart={() => setArrastrada(id)} onDragEnd={() => setArrastrada(null)}
            onDragOver={(e) => { e.preventDefault(); if (arrastrada && arrastrada !== id) mover(actual.indexOf(arrastrada), i); }}>
            <span className="ranking c-ranking-pos">{i + 1}</span>
            <span className="min-w-0 flex-1 font-semibold text-white">{opciones.find((o) => o.id === id)?.texto}</span>
            {abierto && (
              <span className="flex">
                <button type="button" className="c-accion !p-1" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label="Subir"><span className="material-symbols-outlined">keyboard_arrow_up</span></button>
                <button type="button" className="c-accion !p-1" disabled={i === actual.length - 1} onClick={() => mover(i, i + 1)} aria-label="Bajar"><span className="material-symbols-outlined">keyboard_arrow_down</span></button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {abierto && (
        <div className="mt-2 flex justify-end gap-2">
          {Array.isArray(bloque.miRespuesta) && <button type="button" className="c-boton-fantasma c-chico" disabled={ocupado} onClick={() => void responder(null)}>Quitar mi orden</button>}
          <button type="button" className="c-boton c-chico" disabled={ocupado || (!orden && Array.isArray(bloque.miRespuesta))} onClick={() => void responder(actual).then(() => setOrden(null))}>
            {Array.isArray(bloque.miRespuesta) ? "Actualizar mi orden" : "Guardar mi orden"}
          </button>
        </div>
      )}
      {r ? (
        <div className="mt-4 rounded-2xl bg-black/20 p-3">
          <p className="c-subtitulo mb-2">Ranking de todos (conteo Borda)</p>
          <ol className="flex flex-col gap-1.5">
            {r.opciones?.map((o, i) => {
              const max = Math.max(1, ...(r.opciones ?? []).map((x) => x.puntos ?? 0));
              return (
                <li key={o.id} className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 text-right font-bold text-primary">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2"><span className="truncate text-white">{o.texto}</span><span className="tabular-nums text-on-surface-variant/60">{o.puntos} pts · pos. {o.posicionPromedio ?? "—"}</span></span>
                    <span className="mt-1 block h-1.5 rounded-full bg-white/5"><span className="block h-full rounded-full bg-acento" style={{ width: `${((o.puntos ?? 0) / max) * 100}%` }} /></span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : <Oculto resultados={resultados} abierto={abierto} />}
    </>
  );
}

function BloqueAportes({ bloque, debateId, abierto, comentarios, yo, onDetalle, onRecargar, onPerfil, onAviso }: Props) {
  const [cambios, setCambios] = useState<{ base: Aporte[] | undefined; mapa: Record<string, Partial<Aporte>> }>({ base: bloque.aportes, mapa: {} });
  const mapa = cambios.base === bloque.aportes ? cambios.mapa : {};
  const aportes = (bloque.aportes ?? []).map((a) => (mapa[a.id] ? { ...a, ...mapa[a.id] } : a));
  const actualizar = (id: string, c: Partial<Aporte>) => setCambios({ base: bloque.aportes, mapa: { ...mapa, [id]: { ...mapa[id], ...c } } });
  const [hiloAbierto, setHiloAbierto] = useState<string | null>(null);
  const intentar = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { onAviso(e instanceof Error ? e.message : "No se pudo.", "error"); } };
  const puntaje = (a: Aporte) => a.votosAFavor - a.votosEnContra + 2 * a.convencidos;
  const ordenados = [...aportes].sort((a, b) => puntaje(b) - puntaje(a) || a.creadoEn.localeCompare(b.creadoEn));
  const limite = bloque.config.maximoPorPersona;
  const nuevo = async (texto: string, adjuntos: number[], lado?: Voto) => {
    const r = await aportar(debateId, bloque.id, texto, lado ?? null, adjuntos);
    onDetalle(r);
    onAviso(bloque.tipo === "argumentos" ? "Sumaste tu argumento." : bloque.tipo === "propuestas" ? "Sumaste tu propuesta." : "Sumaste tu respuesta.");
  };

  const tarjeta = (a: Aporte) => (
    <article key={a.id} className="c-aporte c-aparecer">
      <header className="flex items-center gap-2 text-[12.5px]">
        <Avatar nombre={a.autor} url={a.autorAvatar} chico onClick={a.autorId ? () => onPerfil(a.autorId!) : undefined} />
        <span className="min-w-0 flex-1 truncate"><b className="text-white">{a.autor}</b> <span className="c-handle">{a.handle ? `@${a.handle} · ` : ""}{textoRelativo(a.creadoEn)}</span></span>
        {a.convencidos > 0 && <span className="c-reaccion !cursor-default !border-amber-300/40 !text-amber-200" title="Personas a las que les cambió la opinión">Δ <b>{a.convencidos}</b></span>}
      </header>
      <TextoComunidad texto={a.texto} onPersona={onPerfil} className="mt-1.5 text-[14px]" />
      <Adjuntos adjuntos={a.adjuntos} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Votos aFavor={a.votosAFavor} enContra={a.votosEnContra} miVoto={a.miVoto} onVotar={(v) => intentar(async () => {
          const r = await votar("aporte", a.id, v);
          actualizar(a.id, { miVoto: r.miVoto, votosAFavor: r.votosAFavor, votosEnContra: r.votosEnContra });
        })} />
        {!a.esMio && (
          <button type="button" className="c-delta" aria-pressed={a.meConvencio} disabled={!abierto} title="Me hizo cambiar de opinión" onClick={() => intentar(async () => {
            const r = await convencio(a.id);
            actualizar(a.id, { meConvencio: r.activo, convencidos: r.convencidos });
            if (r.activo) onAviso("Δ ¡Le diste un punto por cambiarte la opinión!");
          })}>Δ {a.meConvencio ? "Me convenció" : "Me hizo cambiar de opinión"}</button>
        )}
        <button type="button" className="c-accion responder" onClick={() => setHiloAbierto(hiloAbierto === a.id ? null : a.id)} aria-expanded={hiloAbierto === a.id}>
          <span className="material-symbols-outlined" aria-hidden="true">forum</span>{a.respuestas > 0 ? `${a.respuestas} ${a.respuestas === 1 ? "respuesta" : "respuestas"}` : "Responder"}
        </button>
        <Reacciones reacciones={a.reacciones} onReaccionar={(e) => intentar(async () => {
          const r = await reaccionar("aporte", a.id, e);
          actualizar(a.id, { reacciones: r.reacciones });
        })} />
        {a.puedoBorrar && (
          <button type="button" className="c-accion !p-1 hover:!text-rose-300" aria-label="Borrar aporte" title="Borrar" onClick={() => intentar(async () => { await borrarAporte(a.id); onRecargar(); })}>
            <span className="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        )}
      </div>
      {hiloAbierto === a.id && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <HiloRespuestas
            comentarios={comentarios.filter((c) => c.aporteId === a.id)}
            objetoTipo="debate"
            objetoId={debateId}
            yo={yo}
            cerrado={!abierto}
            orden="mejores"
            onRespondido={() => onRecargar()}
            onCambio={onRecargar}
            onPerfil={onPerfil}
            onAviso={onAviso}
          />
          {abierto && (
            <div className="mt-2">
              <CajaRespuesta placeholder="Responder a este aporte…" onEnviar={async (texto, adjuntos) => { await comentar("debate", debateId, texto, { aporteId: a.id, adjuntos }); onRecargar(); }} />
            </div>
          )}
        </div>
      )}
    </article>
  );

  if (bloque.tipo === "argumentos") {
    const lado = (l: Voto) => ordenados.filter((a) => a.lado === l);
    return (
      <div className="c-mapa mt-3">
        {(["a-favor", "en-contra"] as Voto[]).map((l) => (
          <div key={l} className={`c-mapa-col ${l === "a-favor" ? "favor" : "contra"}`}>
            <p className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${l === "a-favor" ? "text-emerald-300" : "text-rose-300"}`}>
              <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">{l === "a-favor" ? "thumb_up" : "thumb_down"}</span>
              {l === "a-favor" ? "A favor" : "En contra"} <span className="text-on-surface-variant/50">({lado(l).length})</span>
            </p>
            <div className="flex flex-col gap-2">
              {lado(l).map(tarjeta)}
              {lado(l).length === 0 && <p className="py-2 text-center text-[12px] text-on-surface-variant/50">Todavía no hay argumentos {l === "a-favor" ? "a favor" : "en contra"}.</p>}
              {abierto && <CajaRespuesta placeholder={`Un argumento ${l === "a-favor" ? "a favor" : "en contra"}…`} textoBoton="Sumar" onEnviar={(t, adj) => nuevo(t, adj, l)} />}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      {ordenados.map(tarjeta)}
      {ordenados.length === 0 && <p className="py-2 text-center text-[12.5px] text-on-surface-variant/55">{bloque.tipo === "propuestas" ? "Todavía no hay propuestas: ¡sumá la primera!" : "Todavía nadie respondió."}</p>}
      {abierto && (limite === undefined || (bloque.misAportes ?? 0) < limite) && (
        <CajaRespuesta placeholder={bloque.tipo === "propuestas" ? "Tu propuesta…" : "Tu respuesta…"} textoBoton="Sumar" onEnviar={(t, adj) => nuevo(t, adj)} />
      )}
      {abierto && limite !== undefined && (bloque.misAportes ?? 0) >= limite && <p className="text-[12px] text-on-surface-variant/55">Ya sumaste tus {limite} propuestas.</p>}
    </div>
  );
}
