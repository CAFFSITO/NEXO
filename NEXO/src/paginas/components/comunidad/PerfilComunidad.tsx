// El perfil de una persona en la comunidad: quién es, a cuántos sigue y cuántos
// la siguen, silenciar, y sus publicaciones y reposts.

import { createPortal } from "react-dom";
import { silenciar, usePerfilComunidad, usePublicaciones, type Publicacion } from "../../../servicios/comunidad";
import { useDialogo } from "../../../servicios/useDialogo";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { ROL_LABELS } from "../shared/roles";
import { Avatar } from "./piezas";
import TarjetaPublicacion from "./TarjetaPublicacion";
import { numeroCorto } from "./comunidadUtil";
import type { Rol } from "../shared/roles";

interface Props {
  id: string;
  yo: { id: number; rol: Rol };
  puedeFijar: boolean;
  puedePublicar: boolean;
  onCerrar: () => void;
  onAbrir: (id: string) => void;
  onPerfil: (id: string) => void;
  onTag: (tag: string) => void;
  onCitar: (pub: Publicacion) => void;
  onDenunciar: (id: string) => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

export default function PerfilComunidad({ id, yo, puedeFijar, puedePublicar, onCerrar, onAbrir, onPerfil, onTag, onCitar, onDenunciar, onAviso }: Props) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const { datos: perfil, error, recargar } = usePerfilComunidad(id);
  const { publicaciones, cargando, recargar: recargarFeed } = usePublicaciones({ vista: "perfil", usuario: id });

  const alternarSilencio = async () => {
    try {
      const r = await silenciar(id);
      onAviso(r.activo ? `Silenciaste a @${perfil?.handle}.` : `Volviste a ver a @${perfil?.handle}.`);
      recargar();
    } catch (e) {
      onAviso(e instanceof Error ? e.message : "No se pudo.", "error");
    }
  };

  return createPortal(
    <div className="c-velo" onClick={onCerrar}>
      <div ref={dialogo} className="c-dialogo" role="dialog" aria-modal="true" aria-label="Perfil" onClick={(e) => e.stopPropagation()}>
        {error && !perfil && <div className="p-6"><Fallo error={error} onReintentar={recargar} /></div>}
        {!perfil && !error && <div className="p-6"><Cargando que="el perfil" /></div>}
        {perfil && (
          <>
            <div className="relative h-28 rounded-t-[26px]" style={{ background: `linear-gradient(120deg, ${perfil.perfil.color}66, color-mix(in srgb, var(--nexo-acento) 40%, transparent))` }}>
              <button type="button" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white" onClick={onCerrar} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="px-5 pb-4">
              <div className="-mt-10 flex items-end justify-between gap-3">
                <span className="rounded-full ring-4 ring-[var(--nexo-sup-1)]"><span className="block scale-[1.9] origin-bottom-left"><Avatar nombre={perfil.nombre} url={perfil.avatar} /></span></span>
                {!perfil.esYo && (
                  <div className="flex gap-2 pt-12">
                    <button type="button" className="c-boton-fantasma c-chico" onClick={() => void alternarSilencio()}>
                      <span className="material-symbols-outlined" aria-hidden="true">{perfil.silenciado ? "volume_up" : "volume_off"}</span>{perfil.silenciado ? "Dejar de silenciar" : "Silenciar"}
                    </button>
                  </div>
                )}
              </div>
              <h2 className="mt-8 font-headline text-2xl font-bold text-white">{perfil.nombre}</h2>
              <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant/70">
                @{perfil.handle}
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: perfil.perfil.color + "26", color: perfil.perfil.color }}>
                  <span className="material-symbols-outlined !text-[14px]" aria-hidden="true">{perfil.perfil.icono}</span>{perfil.perfil.nombre || ROL_LABELS[perfil.rol]}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13.5px]">
                <span><b className="text-white">{numeroCorto(perfil.publicaciones)}</b> <span className="text-on-surface-variant/60">publicaciones</span></span>
                <span><b className="text-white">{numeroCorto(perfil.debates)}</b> <span className="text-on-surface-variant/60">debates</span></span>
                <span><b className={perfil.votosRecibidos >= 0 ? "text-emerald-300" : "text-rose-300"}>{perfil.votosRecibidos >= 0 ? "+" : ""}{perfil.votosRecibidos}</b> <span className="text-on-surface-variant/60">votos recibidos</span></span>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/5 p-4">
              {cargando && !publicaciones && <Cargando que="sus publicaciones" />}
              {publicaciones?.length === 0 && <p className="py-6 text-center text-sm text-on-surface-variant/60">Todavía no publicó nada.</p>}
              {publicaciones?.map((p) => (
                <TarjetaPublicacion key={p.clave} pub={p} yo={yo} puedeFijar={puedeFijar} puedePublicar={puedePublicar}
                  onActualizar={() => recargarFeed()} onAbrir={onAbrir} onPerfil={(x) => { if (x !== id) onPerfil(x); }} onTag={(t) => { onCerrar(); onTag(t); }}
                  onCitar={onCitar} onRecargar={recargarFeed} onDenunciar={onDenunciar} onAviso={onAviso} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
