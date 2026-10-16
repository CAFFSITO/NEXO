// Una publicación abierta: el hilo completo al que pertenece (estilo X, unido
// por una línea) y su conversación en hilos y sub-hilos (estilo Reddit), con
// la caja para responder y el orden de las respuestas. También abre, en solo
// lectura, una tendencia nacional de otra escuela.

import { useState } from "react";
import { createPortal } from "react-dom";
import { comentar, useDetalle, type ObjetoTipo, type Publicacion } from "../../../servicios/comunidad";
import { useDialogo } from "../../../servicios/useDialogo";
import { textoRelativo } from "../../../servicios/fechas";
import type { Rol } from "../shared/roles";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import TarjetaPublicacion from "./TarjetaPublicacion";
import HiloRespuestas from "./HiloRespuestas";
import CajaRespuesta from "./CajaRespuesta";
import { TextoComunidad } from "./piezas";
import type { OrdenRespuestas } from "./comunidadUtil";

interface Props {
  tipo: ObjetoTipo;
  id: string;
  yo: { id: number; rol: Rol };
  puedeFijar: boolean;
  puedePublicar: boolean;
  onCerrar: () => void;
  onCambio: () => void;
  onPerfil: (id: string) => void;
  onTag: (tag: string) => void;
  onCitar: (pub: Publicacion) => void;
  onDenunciar: (tipo: "publicacion" | "comentario", id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

const ORDENES: { id: OrdenRespuestas; texto: string }[] = [
  { id: "mejores", texto: "Mejores" }, { id: "nuevas", texto: "Nuevas" }, { id: "antiguas", texto: "Antiguas" }, { id: "polemicas", texto: "Polémicas" },
];

export default function DetallePublicacion({ tipo, id, yo, puedeFijar, puedePublicar, onCerrar, onCambio, onPerfil, onTag, onCitar, onDenunciar, onAviso }: Props) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const { datos, cargando, error, recargar } = useDetalle(tipo, id);
  const [orden, setOrden] = useState<OrdenRespuestas>("mejores");
  const [nuevoId, setNuevoId] = useState<string | null>(null);
  const soloLectura = Boolean(datos?.soloLectura);
  const refrescar = () => { recargar(); onCambio(); };
  const publicacion = tipo === "publicacion" && datos && !soloLectura ? (datos.objeto as unknown as Publicacion) : null;
  const cadena = datos?.hilo?.length ? datos.hilo : publicacion ? [publicacion] : [];
  const tarjeta = (p: Publicacion) => (
    <TarjetaPublicacion
      key={p.id}
      pub={p}
      yo={yo}
      puedeFijar={puedeFijar}
      puedePublicar={puedePublicar}
      onActualizar={() => refrescar()}
      onAbrir={() => {}}
      onPerfil={onPerfil}
      onTag={(t) => { onCerrar(); onTag(t); }}
      onCitar={onCitar}
      onRecargar={refrescar}
      onDenunciar={(x) => onDenunciar("publicacion", x)}
      onAviso={onAviso}
    />
  );

  return createPortal(
    <div className="c-velo" onClick={onCerrar}>
      <div ref={dialogo} className="c-dialogo" role="dialog" aria-modal="true" aria-label="Publicación" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center gap-3 rounded-t-[26px] border-b border-white/5 bg-[color-mix(in_srgb,var(--nexo-sup-1)_92%,black)] px-5 py-3 backdrop-blur">
          <button type="button" className="c-accion !p-1.5" onClick={onCerrar} aria-label="Volver"><span className="material-symbols-outlined">arrow_back</span></button>
          <h2 className="flex-1 font-headline text-lg font-bold text-white">{soloLectura ? `Tendencia de ${datos?.institucion}` : tipo === "debate" ? "Debate" : cadena.length > 1 ? `Hilo de ${cadena.length}` : "Publicación"}</h2>
        </header>
        <div className="p-4 sm:p-5">
          {cargando && !datos && <Cargando que="la publicación" />}
          {error && !datos && <Fallo error={error} onReintentar={recargar} />}
          {datos && (
            <>
              {soloLectura && (
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[12.5px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">public</span>Solo lectura y sin nombres: es de otra escuela.
                </p>
              )}
              {publicacion ? (
                <div className="flex flex-col">
                  {cadena.map((p, i) => (
                    <div key={p.id}>
                      {tarjeta(p)}
                      {i < cadena.length - 1 && <div className="ml-[38px] h-4 w-0.5 rounded bg-white/20" aria-hidden="true" />}
                    </div>
                  ))}
                </div>
              ) : (
                <article className="c-tarjeta">
                  <p className="text-[13px]"><b className="text-white">{datos.objeto.autor}</b> <span className="c-handle">· {textoRelativo(datos.objeto.creadoEn)}</span></p>
                  {datos.objeto.titulo && <h3 className="mt-1 font-headline text-xl font-bold text-white">{datos.objeto.titulo}</h3>}
                  <TextoComunidad texto={datos.objeto.contenido} className="mt-1 text-[15px]" />
                  <p className="mt-2 text-[12px] text-on-surface-variant/60">{datos.objeto.votosAFavor} a favor · {datos.objeto.votosEnContra} en contra</p>
                </article>
              )}

              {!soloLectura && (publicacion ? publicacion.puedoResponder : true) && (
                <div className="mt-4">
                  <CajaRespuesta
                    placeholder="Escribí tu respuesta…"
                    onEnviar={async (texto, adjuntos) => {
                      const r = await comentar(tipo, id, texto, { adjuntos });
                      setNuevoId(r.comentario?.id ?? r.id);
                      refrescar();
                    }}
                  />
                </div>
              )}
              {publicacion && !publicacion.puedoResponder && (
                <p className="mt-4 flex items-center gap-2 text-[12.5px] text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
                  {publicacion.responden === "mencionados" ? "Solo pueden responder las personas mencionadas." : "Solo pueden responder las personas que sigue quien publicó."}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                <p className="c-subtitulo">{datos.comentarios.filter((c) => !c.eliminado).length} respuestas</p>
                <div className="flex gap-1" role="radiogroup" aria-label="Ordenar respuestas">
                  {ORDENES.map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={orden === o.id} onClick={() => setOrden(o.id)}
                      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${orden === o.id ? "bg-white/10 text-white" : "text-on-surface-variant/60 hover:text-white"}`}>
                      {o.texto}
                    </button>
                  ))}
                </div>
              </div>
              <HiloRespuestas
                comentarios={datos.comentarios}
                objetoTipo={tipo}
                objetoId={id}
                yo={yo}
                soloLectura={soloLectura}
                orden={orden}
                nuevoId={nuevoId}
                onRespondido={(c) => { setNuevoId(c.id); refrescar(); }}
                onCambio={refrescar}
                onPerfil={soloLectura ? undefined : onPerfil}
                onDenunciar={(x) => onDenunciar("comentario", x)}
                onAviso={onAviso}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
