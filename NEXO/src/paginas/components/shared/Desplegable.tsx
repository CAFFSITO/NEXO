// Un menú desplegable (⋮, la flechita de un mensaje): se ubica junto al botón
// que lo abrió, se cierra con Escape o tocando afuera y se recorre con flechas.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  ancla: HTMLElement;
  onCerrar: () => void;
  children: ReactNode;
  /** Hacia qué lado se alinea con el botón. */
  alineado?: "izquierda" | "derecha";
  etiqueta?: string;
}

export default function Desplegable({ ancla, onCerrar, children, alineado = "derecha", etiqueta }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [lugar, setLugar] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const r = ancla.getBoundingClientRect();
    const ancho = caja.current?.offsetWidth ?? 220;
    const alto = caja.current?.offsetHeight ?? 200;
    const left = Math.max(8, Math.min(window.innerWidth - ancho - 8, alineado === "derecha" ? r.right - ancho : r.left));
    const abajo = r.bottom + 4 + alto <= window.innerHeight - 8;
    setLugar({ left, top: abajo ? r.bottom + 4 : Math.max(8, r.top - alto - 4) });
  }, [ancla, alineado]);

  useEffect(() => {
    caja.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCerrar(); ancla.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const botones = [...(caja.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        const i = botones.indexOf(document.activeElement as HTMLButtonElement);
        botones[(i + (e.key === "ArrowDown" ? 1 : -1) + botones.length) % botones.length]?.focus();
        e.preventDefault();
      }
    };
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node) && !ancla.contains(e.target as Node)) onCerrar();
    };
    const cerrar = () => onCerrar();
    window.addEventListener("keydown", tecla, true);
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("resize", cerrar);
    return () => {
      window.removeEventListener("keydown", tecla, true);
      window.removeEventListener("pointerdown", fuera);
      window.removeEventListener("resize", cerrar);
    };
  }, [ancla, onCerrar]);

  return createPortal(
    <div ref={caja} className="wa-desplegable" role="menu" aria-label={etiqueta}
      style={lugar ? { top: lugar.top, left: lugar.left } : { top: -9999, left: -9999 }}
      onClick={(e) => { if ((e.target as HTMLElement).closest("button[role='menuitem']")) onCerrar(); }}>
      {children}
    </div>,
    document.body,
  );
}
