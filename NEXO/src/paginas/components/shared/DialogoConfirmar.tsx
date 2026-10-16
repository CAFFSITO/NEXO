// src/paginas/components/shared/DialogoConfirmar.tsx
// El cartel de "¿Estás seguro?" antes de una acción que cuesta deshacer.
//
// Dice con todas las letras qué va a pasar y tiene dos botones grandes con
// verbos claros ("Sí, eliminar" / "Cancelar"), en vez de un "Aceptar" que no
// dice qué acepta. Escape y el clic afuera cancelan; el foco arranca en
// "Cancelar" para que un Enter apurado no confirme sin querer.

import { useEffect, useRef, useState, type ReactNode } from "react";

interface DialogoConfirmarProps {
  titulo: string;
  /** Qué va a pasar, explicado para quien no conoce el sistema. */
  children: ReactNode;
  textoConfirmar: string;
  /** "peligro" pinta el botón en rojo: para lo que no tiene vuelta atrás. */
  tono?: "normal" | "peligro";
  icono?: string;
  /** Puede ser asíncrono: el botón queda en "Un momento..." hasta que termine. */
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
}

export default function DialogoConfirmar({
  titulo,
  children,
  textoConfirmar,
  tono = "normal",
  icono = "help",
  onConfirmar,
  onCancelar,
}: DialogoConfirmarProps) {
  const [trabajando, setTrabajando] = useState(false);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCancelar]);

  const confirmar = async () => {
    if (trabajando) return;
    setTrabajando(true);
    try {
      await onConfirmar();
    } finally {
      setTrabajando(false);
    }
  };

  const peligro = tono === "peligro";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onCancelar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-lienzo border border-surface-variant rounded-2xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span
            className={`material-symbols-outlined text-3xl shrink-0 ${peligro ? "text-error" : "text-acento"}`}
            aria-hidden="true"
          >
            {icono}
          </span>
          <div className="min-w-0">
            <h3 id="dialogo-confirmar-titulo" className="text-xl font-bold text-white font-headline">
              {titulo}
            </h3>
            <div className="text-sm text-slate-300 mt-2 space-y-2">{children}</div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-7">
          <button
            ref={cancelar}
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={trabajando}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-60 ${
              peligro ? "bg-red-600 hover:bg-red-500" : "bg-acento hover:bg-acento/90"
            }`}
          >
            {trabajando ? "Un momento..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
