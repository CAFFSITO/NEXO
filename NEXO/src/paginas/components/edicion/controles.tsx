// Controles chicos del modo edición, con la paleta de la escuela: interruptor,
// casilla del checklist y selector de ícono.

import { useEffect, useRef, useState } from "react";
import { ICONOS } from "../maestro/genomaUtil";

export function Interruptor({ activo, etiqueta, onCambiar, disabled }: { activo: boolean; etiqueta: string; onCambiar: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      title={etiqueta}
      className="e-interruptor disabled:opacity-40"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onCambiar(); }}
    />
  );
}

export function Casilla({ marcada, bloqueada }: { marcada: boolean; bloqueada?: boolean }) {
  return (
    <span className={`e-casilla ${marcada ? "is-marcada" : ""} ${bloqueada ? "is-bloqueada" : ""}`} aria-hidden="true">
      <span className="material-symbols-outlined">check</span>
    </span>
  );
}

interface PropsIcono {
  valor: string;
  onCambiar: (icono: string) => void;
  /** Ícono que se muestra cuando no hay uno propio ("" = el de siempre). */
  porDefecto: string;
  etiqueta?: string;
}

export function SelectorIcono({ valor, onCambiar, porDefecto, etiqueta = "Ícono" }: PropsIcono) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("pointerdown", fuera); window.removeEventListener("keydown", tecla); };
  }, [abierto]);

  const elegir = (icono: string) => { onCambiar(icono); setAbierto(false); };

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        className="e-icono-boton border border-white/10 !w-[42px] !h-[42px]"
        onClick={() => setAbierto(!abierto)}
        aria-label={`${etiqueta}: ${valor || porDefecto}`}
        aria-expanded={abierto}
        title={etiqueta}
      >
        <span className="material-symbols-outlined">{valor || porDefecto}</span>
      </button>
      {abierto && (
        <div className="e-selector-iconos e-aparecer">
          <div className="grid grid-cols-7 gap-1 max-h-56 overflow-y-auto">
            {valor && (
              <button type="button" className="e-icono-boton" title="Volver al de siempre" aria-label="Volver al ícono de siempre" onClick={() => elegir("")}>
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            )}
            {ICONOS.map((icono) => (
              <button key={icono} type="button" className={`e-icono-boton ${icono === valor ? "bg-white/15 !text-white" : ""}`} title={icono} aria-label={icono} onClick={() => elegir(icono)}>
                <span className="material-symbols-outlined">{icono}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
