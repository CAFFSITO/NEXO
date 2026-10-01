import { useState } from "react";
import { ICONO_EMISOR, type Comunicado } from "./tipos";

interface Props {
  comunicado: Comunicado;
  onMarcarLeido: (id: string) => Promise<void>;
  onDescargarAdjunto?: (id: string) => void;
  onResponder?: (id: string) => Promise<void>;
}

export default function TarjetaComunicado({ comunicado: c, onMarcarLeido, onDescargarAdjunto, onResponder }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const ejecutar = async (accion: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true); setError("");
    try { await accion(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { setOcupado(false); }
  };
  return <article className={`rounded-xl border bg-surface-container-low p-5 sm:p-6 ${c.leido ? "border-outline-variant/30" : "border-primary/40"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {c.fijado && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><span className="material-symbols-outlined text-sm">keep</span>Fijado</span>}
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${c.leido ? "bg-white/5 text-slate-400" : "bg-primary/15 text-primary"}`}>{c.leido ? "Leído" : "Nuevo"}</span>
      </div>
      <time className="text-xs text-slate-400" dateTime={c.fechaISO}>{c.fecha}</time>
    </div>
    <h3 className="font-headline text-lg font-bold text-on-surface break-words mb-2">{c.titulo}</h3>
    <p className="flex items-center gap-2 text-xs text-on-surface-variant/70 mb-5"><span className="material-symbols-outlined text-base">{ICONO_EMISOR[c.emisorTipo]}</span>{c.emisor}</p>
    <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words mb-6">{c.contenido}</p>
    {error && <p role="alert" className="text-sm text-red-300 mb-4">{error}</p>}
    <div className="flex flex-wrap gap-3 items-center justify-between border-t border-outline-variant/30 pt-4">
      {c.adjunto && <button type="button" onClick={() => onDescargarAdjunto?.(c.id)} className="max-w-full flex items-center gap-2 text-primary text-xs text-left rounded-lg bg-primary/10 p-3"><span className="material-symbols-outlined text-base shrink-0">attachment</span><span className="break-all">{c.adjunto.nombre}</span></button>}
      <div className="flex flex-wrap gap-2 items-center ml-auto">
        {onResponder && <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => onResponder(c.id))} className="border border-outline-variant rounded-lg px-4 py-2 text-xs font-semibold hover:bg-white/5 disabled:opacity-50">Responder</button>}
        {!c.leido && <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => onMarcarLeido(c.id))} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">{ocupado ? "Procesando…" : "Marcar como leído"}</button>}
      </div>
    </div>
  </article>;
}
