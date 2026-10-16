// src/servicios/instancia.ts
// La instancia de NEXO de quien está adentro: la escuela con el genoma que
// diseñó el Maestro. De acá salen los colores de la aplicación, el nombre que se
// ve en el menú, el perfil de la persona y qué módulos ve, en qué orden y con
// qué nombre. Todo lo decide y lo custodia el servidor (/api/instancia): acá
// solo se lo trae y se lo reparte a las pantallas.

import { createContext, useContext } from "react";
import { pedir, useDatos } from "./api";
import type { Tema } from "./tema";
import type { SeccionMenu } from "./maestro";

export interface ModuloResuelto {
  id: string;
  padre: string | null;
  /** Pantallas (las del tipo Page) que pertenecen a este módulo para esta persona. */
  paginas: string[];
  /** Nombre propio que le dio el Maestro ("" = el de siempre). */
  etiqueta: string;
  icono: string;
  orden: number;
  /** Sección del menú donde aparece ("" = "Mi espacio"). */
  seccion: string;
  visible: boolean;
}

export interface PerfilResuelto {
  clave: string;
  nombre: string;
  color: string;
  icono: string;
  arquetipo: string;
  predeterminado: boolean;
}

export interface Instancia {
  institucion: { id: string; nombre: string; cicloLectivo: number } | null;
  identidad: { nombre: string; lema: string; icono: string };
  tema: Tema;
  perfil: PerfilResuelto;
  /** Las secciones con nombre del menú, en orden (vacío = todo en "Mi espacio"). */
  secciones: SeccionMenu[];
  modulos: ModuloResuelto[];
  funcionesDesactivadas: string[];
  /** Lo que solo algunos perfiles pueden (subir multimedia, fijar): lo elige la dirección. */
  capacidades?: string[];
  /** Módulo de inicio que eligió el Maestro para este perfil ("" = el habitual). */
  inicio: string;
}

export function pedirInstancia(signal?: AbortSignal): Promise<Instancia> {
  return pedir<Instancia>("/api/instancia", signal);
}

interface ValorInstancia {
  instancia: Instancia | null;
  recargar: () => void;
  /** true cuando ya se intentó traerla (aunque haya fallado). */
  lista: boolean;
}

export const InstanciaContext = createContext<ValorInstancia>({ instancia: null, recargar: () => {}, lista: true });

export function useInstancia(): ValorInstancia {
  return useContext(InstanciaContext);
}

/**
 * ¿Esta función del checklist está habilitada para mí? Sirve para no mostrar un
 * botón que el servidor va a rechazar igual (regla de oro 4: el permiso real se
 * decide allá; esto solo evita ofrecer lo que no se puede).
 */
export function useFuncion(id: string): boolean {
  const { instancia } = useInstancia();
  return !instancia?.funcionesDesactivadas.includes(id);
}

/**
 * ¿Mi perfil tiene esta capacidad (por ejemplo "comunidad.multimedia")? Solo
 * evita ofrecer lo que el servidor va a rechazar igual.
 */
export function useCapacidad(id: string): boolean {
  const { instancia } = useInstancia();
  return Boolean(instancia?.capacidades?.includes(id));
}

/** El módulo al que pertenece una pantalla, según la instancia. */
export function moduloDePagina(instancia: Instancia | null, pagina: string): ModuloResuelto | null {
  return instancia?.modulos.find((m) => m.paginas.includes(pagina)) ?? null;
}

// ── Para la dirección ───────────────────────────────────
// (El modo edición completo vive en servicios/edicion.ts.)

export interface PerfilDeLaEscuela {
  clave: string;
  nombre: string;
  arquetipo: string;
  color: string;
  icono: string;
  predeterminado: boolean;
  usuarios: number;
}

/** Los perfiles de la escuela (los de siempre y los que diseñó el Maestro). */
export function usePerfilesEscuela() {
  const { datos, cargando, error, recargar } = useDatos<{ perfiles: PerfilDeLaEscuela[] }>("/api/instancia/perfiles");
  return { perfiles: datos?.perfiles ?? null, cargando, error, recargar };
}
