import type { Preferencias } from "./personalizacion";

/** Preferencias efectivas de la cuenta, separadas del tema institucional. */
export function aplicarPreferencias(preferencias: Preferencias | null): void {
  const raiz = document.documentElement;
  if (!preferencias) {
    delete raiz.dataset.densidad;
    delete raiz.dataset.preferenciaMovimiento;
    raiz.style.removeProperty("font-size");
    return;
  }
  raiz.dataset.densidad = preferencias.densidad ?? "comoda";
  raiz.dataset.preferenciaMovimiento = preferencias.movimiento ?? "sistema";
  raiz.style.fontSize = `${preferencias.tamanoTexto ?? 100}%`;
}
