// Una unidad del temario mientras se edita. `clave` es solo para la pantalla
// (React necesita algo fijo para cada fila); `id` es el de la base, si ya existía.
export interface UnidadEditable { clave: string; id?: string; titulo: string; contenidos: string }

let contador = 0;
export const nuevaClave = () => `u${Date.now().toString(36)}${(contador++).toString(36)}`;
