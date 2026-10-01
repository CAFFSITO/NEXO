import { useEffect, useRef } from "react";

/** Mantiene el teclado dentro del diálogo y devuelve el foco al cerrarlo. */
export function useDialogo<T extends HTMLElement>(onCerrar: () => void) {
  const ref = useRef<T>(null);
  const cerrar = useRef(onCerrar);
  useEffect(() => { cerrar.current = onCerrar; }, [onCerrar]);
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const enfocables = () => Array.from(dialogo.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')).filter(e => e.getClientRects().length > 0);
    enfocables()[0]?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar.current(); }
      if (e.key !== "Tab") return;
      const lista = enfocables();
      if (!lista.length) { e.preventDefault(); return; }
      const primero = lista[0], ultimo = lista[lista.length-1];
      if (e.shiftKey && (document.activeElement === primero || !dialogo.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || !dialogo.contains(document.activeElement))) { e.preventDefault(); primero.focus(); }
    };
    dialogo.addEventListener("keydown", teclado);
    return () => { dialogo.removeEventListener("keydown", teclado); document.body.style.overflow = scroll; if (previo?.isConnected) previo.focus(); };
  }, []);
  return ref;
}
