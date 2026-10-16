// Un botón que muestra un ícono y, al tocarlo, despliega la grilla para elegir
// otro. Se cierra con Escape o tocando afuera.

import { useEffect, useRef, useState } from "react";
import { ICONOS } from "./genomaUtil";

interface Props {
  valor: string;
  onCambiar: (icono: string) => void;
  /** Ícono que se muestra cuando no hay uno propio ("" = el de siempre). */
  porDefecto?: string;
  etiqueta?: string;
}

export default function SelectorIcono({ valor, onCambiar, porDefecto = "hub", etiqueta = "Ícono" }: Props) {
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

  return (
    <div className="relative" ref={caja}>
      <button type="button" className="m-icono-boton border border-white/10" onClick={() => setAbierto(!abierto)} aria-label={`${etiqueta}: ${valor || porDefecto}`} aria-expanded={abierto} title={etiqueta}>
        <span className="material-symbols-outlined">{valor || porDefecto}</span>
      </button>
      {abierto && (
        <div className="absolute z-30 mt-2 right-0 w-[272px] m-cristal m-cristal-fuerte p-3 shadow-2xl m-aparecer" style={{ background: "rgba(16, 9, 34, .97)" }}>
          <div className="grid grid-cols-7 gap-1 max-h-56 overflow-y-auto m-scroll">
            {valor && (
              <button type="button" className="m-icono-boton" title="Volver al de siempre" onClick={() => { onCambiar(""); setAbierto(false); }}>
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            )}
            {ICONOS.map((icono) => (
              <button
                key={icono}
                type="button"
                className={`m-icono-boton ${icono === valor ? "bg-white/15 text-white" : ""}`}
                title={icono}
                onClick={() => { onCambiar(icono); setAbierto(false); }}
              >
                <span className="material-symbols-outlined">{icono}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
