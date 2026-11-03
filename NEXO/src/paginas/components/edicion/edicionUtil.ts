// Ayudas del modo edición de la dirección para trabajar sobre el BORRADOR: la
// jerarquía (secciones → módulos → submódulos), mover módulos, contar cambios y
// armar la vista previa del menú de cada perfil. El servidor es el que valida y
// guarda; esto solo dibuja lo que va a pasar.

import { MAPA_RUTAS, type RutaPrivada } from "../../../navegacion";
import { completarPersonalizacion } from "../../../servicios/personalizacion";
import type { Borrador, Edicion, ModuloDePerfilEstado } from "../../../servicios/edicion";
import type { ModuloCatalogo, SeccionMenu } from "../../../servicios/maestro";
import { agruparMenu, SECCION_BASE, type GrupoMenu } from "../shared/navegacionItems";
import { clonar, claveUnica, menuDePerfil, modulosDePerfil } from "../maestro/genomaUtil";

export function borradorDe(e: Edicion): Borrador {
  return clonar({ secciones: e.secciones, modulos: e.modulos, perfiles: e.perfiles, algoritmos: e.algoritmos, jerarquia: e.jerarquia, capacidades: e.capacidades ?? {}, personalizacion: completarPersonalizacion(e.personalizacion) });
}

/** Un grupo de la jerarquía: "Mi espacio" o una sección, con sus módulos de primer nivel en orden. */
export interface GrupoJerarquia {
  seccion: SeccionMenu;
  base: boolean;
  ids: string[];
}

export function jerarquia(b: Borrador, catalogo: ModuloCatalogo[]): GrupoJerarquia[] {
  const grupos: GrupoJerarquia[] = [
    { seccion: SECCION_BASE, base: true, ids: [] },
    ...b.secciones.map((s) => ({ seccion: s, base: false, ids: [] as string[] })),
  ];
  const porId = new Map(grupos.map((g) => [g.seccion.id, g]));
  catalogo
    .map((m, i) => ({ m, orden: b.modulos[m.id]?.orden ?? i, i }))
    .filter(({ m }) => !m.padre)
    .sort((x, y) => x.orden - y.orden || x.i - y.i)
    .forEach(({ m }) => (porId.get(b.modulos[m.id]?.seccion ?? "") ?? grupos[0]).ids.push(m.id));
  return grupos;
}

/**
 * Escribe en el borrador la sección y el orden de cada módulo según la
 * jerarquía. Los submódulos (Debates, Tendencias) viajan detrás de su padre:
 * comparten sus ventanillas y no se separan de él.
 */
export function aplicarJerarquia(b: Borrador, grupos: GrupoJerarquia[], catalogo: ModuloCatalogo[]) {
  let n = 0;
  for (const g of grupos) {
    for (const id of g.ids) {
      b.modulos[id].seccion = g.seccion.id;
      b.modulos[id].orden = n++;
      for (const hijo of catalogo.filter((m) => m.padre === id)) {
        b.modulos[hijo.id].seccion = g.seccion.id;
        b.modulos[hijo.id].orden = n++;
      }
    }
  }
}

/** Mueve un módulo a `destino` (id de sección, "" = Mi espacio) en la posición `indice`. */
export function moverModulo(grupos: GrupoJerarquia[], id: string, destino: string, indice: number): GrupoJerarquia[] {
  const copia = grupos.map((g) => ({ ...g, ids: g.ids.filter((x) => x !== id) }));
  const g = copia.find((x) => x.seccion.id === destino) ?? copia[0];
  const original = grupos.find((x) => x.ids.includes(id));
  // Si se mueve dentro del mismo grupo hacia abajo, al sacarlo el índice corre uno.
  const desde = original?.seccion.id === g.seccion.id ? original.ids.indexOf(id) : -1;
  const donde = desde >= 0 && desde < indice ? indice - 1 : indice;
  g.ids.splice(Math.max(0, Math.min(g.ids.length, donde)), 0, id);
  return copia;
}

export function idDeSeccion(nombre: string, secciones: SeccionMenu[]): string {
  return claveUnica(nombre, new Set(secciones.map((s) => s.id)), "seccion");
}

/** Deja la entrada de un módulo en un perfil sin claves vacías (y la borra si queda vacía). */
export function limpiarModuloDePerfil(modulos: Record<string, ModuloDePerfilEstado>, id: string) {
  const m = modulos[id];
  if (!m) return;
  if (!m.oculto) delete m.oculto;
  if (!m.etiqueta) delete m.etiqueta;
  if (!m.icono) delete m.icono;
  if (m.orden === undefined) delete m.orden;
  if (m.funciones && Object.keys(m.funciones).length === 0) delete m.funciones;
  if (Object.keys(m).length === 0) delete modulos[id];
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Cuántos cambios hay entre lo guardado y el borrador (el reordenamiento cuenta como uno). */
export function contarCambios(base: Borrador, b: Borrador, catalogo: ModuloCatalogo[]): number {
  let n = 0;
  if (!igual(base.personalizacion, b.personalizacion)) n++;
  if (!igual(base.secciones, b.secciones)) n++;
  const orden = (x: Borrador) => jerarquia(x, catalogo).map((g) => g.seccion.id + ":" + g.ids.join(",")).join("|");
  if (orden(base) !== orden(b)) n++;
  for (const id of Object.keys(base.modulos)) {
    const a = base.modulos[id];
    const d = b.modulos[id];
    if (a.oculto !== d.oculto || a.etiqueta !== d.etiqueta || a.icono !== d.icono || !igual(a.funciones, d.funciones)) n++;
  }
  for (const p of base.perfiles) {
    const d = b.perfiles.find((x) => x.clave === p.clave);
    if (d && (p.inicio !== d.inicio || !igual(p.modulos, d.modulos))) n++;
  }
  if (!igual(base.jerarquia.niveles, b.jerarquia.niveles)) n++;
  for (const id of new Set([...Object.keys(base.capacidades), ...Object.keys(b.capacidades)])) {
    const a = new Set(base.capacidades[id] ?? []);
    const d = new Set(b.capacidades[id] ?? []);
    n += [...d].filter((x) => !a.has(x)).length + [...a].filter((x) => !d.has(x)).length;
  }
  for (const clave of Object.keys(base.jerarquia.perfiles)) if (base.jerarquia.perfiles[clave] !== b.jerarquia.perfiles[clave]) n++;
  for (const id of Object.keys(base.algoritmos)) {
    const a = base.algoritmos[id];
    const d = b.algoritmos[id];
    if (a.activo !== d.activo || a.variante !== d.variante || !igual(a.parametros, d.parametros)) n++;
  }
  return n;
}

/** El menú (en secciones) que vería un perfil con este borrador. */
export function menuDeMuestra(b: Borrador, catalogo: ModuloCatalogo[], perfil: Borrador["perfiles"][number]): GrupoMenu[] {
  return agruparMenu(menuDePerfil(b, { modulos: catalogo }, perfil), b.secciones);
}

/** El módulo del catálogo al que pertenece una ruta del menú. */
export function moduloDeRuta(catalogo: ModuloCatalogo[], ruta: string): ModuloCatalogo | null {
  const pagina = MAPA_RUTAS[ruta as RutaPrivada]?.pagina;
  return pagina ? catalogo.find((m) => m.paginas.includes(pagina)) ?? null : null;
}

/** Las rutas del menú de un perfil que pertenecen a un módulo (para destacarlas). */
export function rutasDeModulo(grupos: GrupoMenu[], catalogo: ModuloCatalogo[], moduloId: string): string[] {
  return grupos.flatMap((g) => g.items).filter((it) => moduloDeRuta(catalogo, it.ruta)?.id === moduloId).map((it) => it.ruta);
}

/** Los módulos de un perfil, resueltos (visibles u ocultos y por qué). */
export function modulosResueltos(b: Borrador, catalogo: ModuloCatalogo[], perfil: Borrador["perfiles"][number]) {
  return modulosDePerfil(b, { modulos: catalogo }, perfil);
}

/** Quién usa un módulo: los perfiles de la escuela cuyo arquetipo lo tiene. */
export function perfilesDeModulo(b: Borrador, modulo: ModuloCatalogo) {
  return b.perfiles.filter((p) => modulo.arquetipos.includes(p.arquetipo));
}
