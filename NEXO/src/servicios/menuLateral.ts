// El menú lateral en la computadora: se puede cerrar del todo y se puede hacer
// más angosto o más ancho arrastrando su borde (como en VS Code o Notion). Las
// dos cosas se recuerdan en este dispositivo. index.html las aplica antes de
// dibujar, para que la página no salte al cargar.
import { useSyncExternalStore } from "react";

export const ANCHO_POR_DEFECTO = 256;
export const ANCHO_MINIMO = 200;
export const ANCHO_MAXIMO = 420;
const CLAVE_ANCHO = "nexo:menu-ancho";
const CLAVE_CERRADO = "nexo:menu-cerrado";

const limitar = (n: number) => Math.round(Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, n)));

function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}
function guardar(clave: string, valor: string): void {
  try { localStorage.setItem(clave, valor); } catch { /* se aplica igual, sin recordarlo */ }
}

export function anchoMenu(): number {
  const n = Number(leer(CLAVE_ANCHO));
  return Number.isFinite(n) && n > 0 ? limitar(n) : ANCHO_POR_DEFECTO;
}

export function menuCerrado(): boolean {
  return leer(CLAVE_CERRADO) === "1";
}

function avisar() { window.dispatchEvent(new Event("nexo:menu")); }

/** Aplica el ancho en vivo (mientras se arrastra) sin guardarlo todavía. */
export function aplicarAncho(ancho: number): number {
  const n = limitar(ancho);
  document.documentElement.style.setProperty("--menu-ancho", `${n}px`);
  return n;
}

export function fijarAncho(ancho: number): void {
  guardar(CLAVE_ANCHO, String(aplicarAncho(ancho)));
  avisar();
}

export function fijarCerrado(cerrado: boolean): void {
  guardar(CLAVE_CERRADO, cerrado ? "1" : "0");
  if (cerrado) document.documentElement.dataset.menuCerrado = "";
  else delete document.documentElement.dataset.menuCerrado;
  avisar();
}

function escuchar(cambio: () => void) {
  window.addEventListener("nexo:menu", cambio);
  return () => window.removeEventListener("nexo:menu", cambio);
}

export function useMenuCerrado(): boolean {
  return useSyncExternalStore(escuchar, menuCerrado, () => false);
}
