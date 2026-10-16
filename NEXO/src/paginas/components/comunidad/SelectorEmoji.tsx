// El selector de emojis: categorías, búsqueda en castellano y los usados hace
// poco. Se usa para reaccionar y para escribir.

import { useEffect, useMemo, useRef, useState } from "react";
import { buscarEmojis, CATEGORIAS_EMOJI, REACCIONES_RAPIDAS } from "./emojis";

const CLAVE_RECIENTES = "nexo:emojis-recientes";
function leerRecientes(): string[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE_RECIENTES);
    return crudo ? (JSON.parse(crudo) as string[]).slice(0, 24) : [];
  } catch {
    return [];
  }
}
function guardarReciente(e: string) {
  try {
    const lista = [e, ...leerRecientes().filter((x) => x !== e)].slice(0, 24);
    window.localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch { /* sin almacenamiento, no se recuerdan */ }
}

interface Props {
  onElegir: (emoji: string) => void;
  onCerrar: () => void;
  /** Dónde se abre respecto de su botón. */
  lado?: "arriba" | "abajo";
  alinear?: "izquierda" | "derecha";
  /** Muestra la fila de reacciones de un toque arriba de todo. */
  rapidas?: boolean;
}

export default function SelectorEmoji({ onElegir, onCerrar, lado = "abajo", alinear = "izquierda", rapidas = false }: Props) {
  const [recientes] = useState(leerRecientes);
  const [categoria, setCategoria] = useState(recientes.length ? "recientes" : CATEGORIAS_EMOJI[0].id);
  const [buscar, setBuscar] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const encontrados = useMemo(() => buscarEmojis(buscar), [buscar]);

  useEffect(() => {
    const fuera = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onCerrar(); } };
    // Un instante después, para que el toque que lo abrió no lo cierre.
    const t = window.setTimeout(() => window.addEventListener("pointerdown", fuera), 0);
    window.addEventListener("keydown", tecla, true);
    return () => { window.clearTimeout(t); window.removeEventListener("pointerdown", fuera); window.removeEventListener("keydown", tecla, true); };
  }, [onCerrar]);

  const elegir = (e: string) => { guardarReciente(e); onElegir(e); };
  const lista = buscar.trim()
    ? encontrados
    : categoria === "recientes" ? recientes : CATEGORIAS_EMOJI.find((c) => c.id === categoria)?.emojis.map((x) => x.e) ?? [];

  return (
    <div
      ref={panel}
      className="c-emoji-panel p-3"
      style={{ [lado === "arriba" ? "bottom" : "top"]: "calc(100% + 6px)", [alinear === "izquierda" ? "left" : "right"]: 0 }}
      role="dialog"
      aria-label="Elegir un emoji"
      onClick={(e) => e.stopPropagation()}
    >
      {rapidas && (
        <div className="mb-2 flex justify-between gap-1 border-b border-white/5 pb-2">
          {REACCIONES_RAPIDAS.map((e) => <button key={e} type="button" className="c-emoji !text-[22px]" onClick={() => elegir(e)} aria-label={`Reaccionar con ${e}`}>{e}</button>)}
        </div>
      )}
      <input className="c-input mb-2 !py-1.5 !text-[13px]" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar: risa, corazón, libro…" aria-label="Buscar emoji" autoFocus />
      {!buscar.trim() && (
        <div className="mb-2 flex gap-0.5" role="tablist" aria-label="Categorías">
          {recientes.length > 0 && (
            <button type="button" role="tab" aria-selected={categoria === "recientes"} className="c-emoji-tab" title="Usados hace poco" onClick={() => setCategoria("recientes")}>
              <span className="material-symbols-outlined" aria-hidden="true">history</span>
            </button>
          )}
          {CATEGORIAS_EMOJI.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={categoria === c.id} className="c-emoji-tab" title={c.nombre} aria-label={c.nombre} onClick={() => setCategoria(c.id)}>
              <span className="material-symbols-outlined" aria-hidden="true">{c.icono}</span>
            </button>
          ))}
        </div>
      )}
      <div className="c-emoji-grilla max-h-56 overflow-y-auto">
        {lista.map((e) => <button key={e} type="button" className="c-emoji" onClick={() => elegir(e)} aria-label={e}>{e}</button>)}
        {lista.length === 0 && <p className="col-span-8 py-6 text-center text-xs text-on-surface-variant/60">No encontramos ese emoji.</p>}
      </div>
    </div>
  );
}
