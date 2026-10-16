// Un debate en la lista: estado, pregunta, de qué bloques está hecho, cuánta
// gente participa, cuántos cambiaron de opinión y, si se puede ver, el consenso.

import type { Debate } from "../../../servicios/comunidad";
import { textoRelativo } from "../../../servicios/fechas";
import { Avatar } from "./piezas";
import { TIPOS_BLOQUE } from "./debateUtil";

export default function TarjetaDebate({ debate: d, onAbrir }: { debate: Debate; onAbrir: () => void }) {
  const total = d.votosAFavor + d.votosEnContra;
  return (
    <article className={`c-tarjeta c-aparecer cursor-pointer ${d.fijado ? "is-fijada" : ""}`} onClick={onAbrir} aria-label={`Debate: ${d.titulo}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        {d.fijado && <span className="inline-flex items-center gap-1 font-semibold text-on-surface-variant/70"><span className="material-symbols-outlined !text-[15px]" aria-hidden="true">push_pin</span>Fijado</span>}
        <span className={`rounded-full px-2 py-0.5 font-bold ${d.abierto ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-on-surface-variant"}`}>{d.abierto ? "Abierto" : "Cerrado"}</span>
        {d.abierto && d.cierraEn && <span className="text-on-surface-variant/60">Cierra el {new Date(d.cierraEn + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>}
        {d.conclusion && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 font-bold text-amber-200">Con conclusión</span>}
        {d.anonimo && <span className="text-on-surface-variant/60">· anónimo</span>}
      </div>
      <h3 className="mt-2 font-headline text-xl font-bold leading-snug text-white">{d.titulo}</h3>
      {d.descripcion && <p className="mt-1 line-clamp-2 text-[14px] text-on-surface-variant/75">{d.descripcion}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.bloques.map((b) => (
          <span key={b.id} className="c-reaccion !cursor-default !py-0.5 !text-[11.5px]" title={b.titulo}>
            <span className="material-symbols-outlined !text-[14px]" style={{ color: TIPOS_BLOQUE[b.tipo].color }} aria-hidden="true">{TIPOS_BLOQUE[b.tipo].icono}</span>{TIPOS_BLOQUE[b.tipo].nombre}
          </span>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-3">
          <div className="c-barra-doble !h-2" aria-hidden="true">
            <span style={{ width: `${(d.votosAFavor / total) * 100}%`, background: "#10b981" }} />
            <span style={{ width: `${(d.votosEnContra / total) * 100}%`, background: "#f43f5e" }} />
          </div>
          <p className="mt-1 text-[11.5px] text-on-surface-variant/60">{d.votosAFavor} a favor · {d.votosEnContra} en contra{d.consenso !== null ? ` · consenso ${Math.round(d.consenso * 100)} %` : ""}</p>
        </div>
      )}
      <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-on-surface-variant/65">
        <span className="flex items-center gap-1.5"><Avatar nombre={d.autor} url={d.autorAvatar} chico />{d.autor} · {textoRelativo(d.creadoEn)}</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-[16px]" aria-hidden="true">groups</span>{d.participantes}</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-[16px]" aria-hidden="true">campaign</span>{d.aportes} aportes</span>
        <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-[16px]" aria-hidden="true">forum</span>{d.comentarios}</span>
        {d.cambiosDeOpinion > 0 && <span className="flex items-center gap-1 text-amber-200">Δ {d.cambiosDeOpinion} cambios de opinión</span>}
        {d.estoyParticipando && <span className="ml-auto rounded-full bg-acento/20 px-2 py-0.5 font-semibold text-primary">Participás</span>}
      </footer>
    </article>
  );
}
