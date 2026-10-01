// src/servicios/enfoque.ts
// UN solo mecanismo para "abrir el elemento exacto" de una notificación.
//
// El problema: al tocar una notificación queremos abrir SU objeto (esa
// conversación, esa tarea, ese recurso de la cola, ese comunicado), pero
// `navegar()` solo mueve la dirección (la ruta), no lleva datos: no hay dónde
// meter "…y además abrí el ítem 7". Y la regla es dura: no se agregan rutas ni
// se toca el mapa de navegación.
//
// La solución: un "objetivo pendiente" { tipo, id } guardado acá, a nivel de
// módulo (no en estado de React), así SOBREVIVE al cambio de ruta sin pasar
// props en cadena. NotificacionesPage lo MARCA antes de navegar; la pantalla
// destino, al montarse y una vez que cargaron sus datos, lo LEE (verEnfoque),
// abre/enfoca el elemento y recién ahí lo LIMPIA (limpiarEnfoque). Un solo
// objetivo a la vez: cada notificación pisa al anterior.
//
// Por qué "leer sin consumir" y limpiar después (y no "leer-y-borrar" de una):
// React corre en StrictMode, que monta y vuelve a montar en desarrollo. Si
// borráramos al leer, el segundo montaje ya no encontraría el objetivo. Leyendo
// sin borrar, el valor sigue disponible hasta que la pantalla actúa de verdad y
// llama a limpiarEnfoque(). Entrar a una pantalla por el menú normal (sin
// objetivo marcado) no dispara nada: verEnfoque devuelve null y todo sigue igual.

/** El objetivo pendiente de abrir, o null si no hay ninguno. */
let pendiente: { tipo: string; id: string } | null = null;

/**
 * Marca a dónde ir. Lo llama NotificacionesPage con el objetoTipo/objetoId
 * REALES de la notificación, justo antes de `navegar()`. `id` se guarda como
 * texto para comparar sin pelear con number/string (los ids del front son texto).
 */
export function marcarEnfoque(tipo: string, id: string): void {
  pendiente = { tipo, id };
}

/**
 * El id pendiente para `tipo`, o null si no hay o es de otro tipo. NO consume:
 * es una lectura pura, segura de llamar en render. La pantalla la usa para saber
 * si tiene que abrir algo, y consume con `limpiarEnfoque()` cuando ya actuó.
 */
export function verEnfoque(tipo: string): string | null {
  return pendiente && pendiente.tipo === tipo ? pendiente.id : null;
}

/** Consume el objetivo: la pantalla lo llama una sola vez, después de actuar. */
export function limpiarEnfoque(): void {
  pendiente = null;
}
