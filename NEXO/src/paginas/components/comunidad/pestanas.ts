// Las pestañas del módulo Comunidad (Feed / Debates / Tendencias). Vivían
// copiadas en tres pantallas; ahora son una sola lista, y cada persona ve solo
// las que el genoma de su escuela deja visibles (el Maestro puede ocultar
// Debates o Tendencias).

import type { RutaPrivada } from "../../../navegacion";
import { useInstancia } from "../../../servicios/instancia";
import { rutaVisible } from "../shared/navegacionItems";

export const PESTANAS_COMUNIDAD: { label: string; ruta: RutaPrivada }[] = [
  { label: "Feed", ruta: "/comunidad" },
  { label: "Debates", ruta: "/comunidad/debates" },
  { label: "Tendencias", ruta: "/comunidad/tendencias" },
];

export function usePestanasComunidad() {
  const { instancia } = useInstancia();
  return PESTANAS_COMUNIDAD.filter((p) => rutaVisible(instancia, p.ruta));
}
