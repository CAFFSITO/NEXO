// El modo de color elegido en este dispositivo (claro / oscuro / automático),
// al día aunque se cambie desde otro lado (el menú de la cuenta, Configuración).
import { useSyncExternalStore } from "react";
import { preferenciaModo, type PreferenciaModo } from "./tema";

function escucharModo(cambio: () => void) {
  window.addEventListener("nexo:modo", cambio);
  return () => window.removeEventListener("nexo:modo", cambio);
}

export function usePreferenciaModo(): PreferenciaModo {
  return useSyncExternalStore(escucharModo, preferenciaModo, () => "claro");
}
