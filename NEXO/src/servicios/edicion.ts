// src/servicios/edicion.ts
// El MODO EDICIÓN de la dirección: la jerarquía del menú (secciones y orden),
// los módulos (ocultar, desocultar, nombre, ícono y checklist de funciones) y
// sus algoritmos (encender, apagar, calibrar). El servidor decide qué se puede
// tocar y guarda cada cambio como una versión nueva del genoma firmada por la
// dirección; acá se arma el borrador y se lo manda.

import { enviar, useDatos } from "./api";
import type { AlgoritmoCatalogo, ModuloCatalogo, SeccionMenu } from "./maestro";
import type { Tema } from "./tema";
import type { Personalizacion } from "./personalizacion";

export type { SeccionMenu };

export interface ModuloEstado {
  oculto: boolean;
  orden: number;
  etiqueta: string;
  icono: string;
  seccion: string;
  /** Solo se guardan las funciones APAGADAS (false). */
  funciones: Record<string, boolean>;
}

export interface ModuloDePerfilEstado {
  oculto?: boolean;
  orden?: number;
  etiqueta?: string;
  icono?: string;
  funciones?: Record<string, boolean>;
}

export interface PerfilEdicion {
  clave: string;
  nombre: string;
  arquetipo: string;
  color: string;
  icono: string;
  predeterminado: boolean;
  inicio: string;
  modulos: Record<string, ModuloDePerfilEstado>;
}

export interface AlgoritmoEdicion {
  activo: boolean;
  variante: "nativo" | "personalizado";
  parametros: Record<string, number>;
  /** El Maestro dejó un diseño de nodos aprobado que la dirección puede elegir. */
  disenoMaestro: boolean;
}

export interface EntradaHistorial {
  version: number;
  nota: string;
  autorRol: "maestro" | "direccion" | "sistema";
  autor: string;
  creadoEn: string;
}

export type PoliticaNivel = "nivel-y-abajo" | "abajo" | "personal";

/** Los niveles de la escuela (de arriba hacia abajo) y en cuál está cada perfil. */
export interface Jerarquia {
  niveles: { id: string; nombre: string; politica: PoliticaNivel }[];
  perfiles: Record<string, string>;
}

export interface Edicion {
  personalizacion?: Personalizacion;
  version: number;
  escuela: { nombre: string; lema: string; icono: string };
  tema: Tema;
  secciones: SeccionMenu[];
  modulos: Record<string, ModuloEstado>;
  perfiles: PerfilEdicion[];
  jerarquia: Jerarquia;
  /** Qué perfiles tienen cada capacidad (subir multimedia, fijar…). */
  capacidades: Record<string, string[]>;
  algoritmos: Record<string, AlgoritmoEdicion>;
  catalogo: { modulos: ModuloCatalogo[]; algoritmos: AlgoritmoCatalogo[]; capacidades: CapacidadCatalogo[] };
  historial: EntradaHistorial[];
}

/** Lo que la dirección puede cambiar: el borrador sobre el que trabaja la pantalla. */
export type Borrador = Pick<Edicion, "secciones" | "modulos" | "perfiles" | "algoritmos" | "jerarquia" | "capacidades" | "personalizacion">;

/** Lo que solo algunos perfiles pueden hacer; la dirección elige cuáles. */
export interface CapacidadCatalogo { id: string; modulo: string; nombre: string; descripcion: string; arquetipos: string[]; porDefecto: string[] }

export interface Cambio { icono: string; texto: string }

export function useEdicion() {
  return useDatos<Edicion>("/api/instancia/edicion");
}

function cuerpoDe(borrador: Borrador) {
  return {
    secciones: borrador.secciones,
    modulos: borrador.modulos,
    perfiles: Object.fromEntries(borrador.perfiles.map((p) => [p.clave, { inicio: p.inicio, modulos: p.modulos }])),
    algoritmos: Object.fromEntries(Object.entries(borrador.algoritmos).map(([id, a]) => [id, { activo: a.activo, variante: a.variante, parametros: a.parametros }])),
    jerarquia: borrador.jerarquia,
    capacidades: borrador.capacidades,
    personalizacion: borrador.personalizacion,
  };
}

/** Qué cambiaría y qué conviene mirar, sin guardar nada. */
export function revisarEdicion(borrador: Borrador) {
  return enviar<{ cambios: Cambio[]; advertencias: string[] }>("/api/instancia/edicion/revisar", "POST", cuerpoDe(borrador));
}

/** Guarda el borrador como versión nueva (409 si alguien guardó en el medio). */
export function guardarEdicion(version: number, nota: string, borrador: Borrador) {
  return enviar<{ version: number; cambios: Cambio[]; edicion: Edicion }>("/api/instancia/edicion", "PUT", { version, nota, ...cuerpoDe(borrador) });
}

export interface ItemRanking {
  clave: string;
  titulo: string;
  detalle: string;
  /** Puesto con lo guardado (null = no aparecía). */
  antes: number | null;
  despues: number;
  puntaje: number | null;
  nacional?: boolean;
}

export interface Distribucion { probabilidad: number; media: number; histograma: number[] }

export type VistaPrevia =
  | { tipo: "ranking"; titulo: string; texto: string; items: ItemRanking[]; entran?: number; salen?: number }
  | { tipo: "impacto"; titulo: string; texto: string; cifras: { etiqueta: string; antes: number; despues: number }[] }
  | { tipo: "distribucion"; titulo: string; texto: string; antes: Distribucion | null; despues: Distribucion | null }
  | { tipo: "vacio"; texto: string };

/** Cómo quedaría un algoritmo con estos valores, corrido sobre los datos reales de la escuela. */
export function vistaPreviaAlgoritmo(slot: string, config: Pick<AlgoritmoEdicion, "activo" | "variante" | "parametros">) {
  return enviar<VistaPrevia>("/api/instancia/edicion/vista-previa", "POST", { slot, config });
}
