// src/servicios/biblioteca.ts
// Puerta de la Biblioteca (institucional y nacional) hacia el servidor.
//
// Alcance de la Etapa 2: LECTURA. Presentar un recurso, descargarlo, filtrar y
// buscar sin tildes son escritura/lógica de la Etapa 5/7; acá lo que cambia es
// que los recursos que se ven existen de verdad.

import type { Rol } from "../paginas/components/shared/roles";
import { enviar, usarDatos } from "./api";
import { subirArchivo } from "./archivos";

export type AmbitoBiblioteca = "institucional" | "nacional";

export interface Recurso {
  id: string;
  titulo: string;
  descripcion: string;
  /** La materia, o la temática libre si no pertenece a ninguna materia. */
  categoria: string;
  tipo: "documento" | "guia" | "video" | "enlace" | "libro";
  autor: string;
  autorRol: Rol;
  autorAvatar?: string;
  /** "PDF", "DOCX", "LINK"… derivado del archivo real. */
  etiquetaArchivo: string;
  /** Peso legible ("313 KB"), o null si es un enlace sin archivo. */
  tamano: string | null;
  enlaceUrl: string | null;
  /** El archivo del recurso, para descargarlo vía /api/archivos/:id. */
  archivoId: string | null;
  /** Lo que dice la base: 'aprobado' / 'en-revision' / 'rechazado'. */
  estado: "aprobado" | "en-revision" | "rechazado" | "papelera";
  alcance: AmbitoBiblioteca;
  institucion: string | null;
  creadoEn: string;
  /** true si lo presentó quien está mirando (para la sección "en revisión"). */
  esMio: boolean;
}

export function usarBiblioteca(ambito: AmbitoBiblioteca) {
  const { datos, cargando, error, recargar } = usarDatos<{
    ambito: AmbitoBiblioteca;
    recursos: Recurso[];
  }>(`/api/biblioteca/recursos?ambito=${ambito}`);
  return { recursos: datos?.recursos ?? null, cargando, error, recargar };
}

/**
 * Búsqueda tolerante a tildes y mayúsculas (Error 2.E.3). Vive acá y no en cada
 * pantalla para que Biblioteca institucional y nacional busquen igual.
 */
export function normalizar(texto: string): string {
  // NFD separa cada letra acentuada en letra + tilde; el rango ̀-ͯ son
  // esas tildes combinantes, que se borran. Así "canción" y "cancion" coinciden.
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// ─── Filtros reales (materias y tipos de la base) ────────

export interface FiltrosBiblioteca {
  materias: { id: number; nombre: string }[];
  tipos: Recurso["tipo"][];
}

export function usarFiltros() {
  const { datos, cargando, error } =
    usarDatos<FiltrosBiblioteca>("/api/biblioteca/filtros");
  return { filtros: datos, cargando, error };
}

// ─── Presentar un recurso (Error 2.E.2) ─────────────────

export interface DatosPresentarRecurso {
  titulo: string;
  descripcion?: string;
  tipo: Recurso["tipo"];
  /** La materia elegida, o nada si trae temática libre. */
  materiaId?: number | null;
  tematicaLibre?: string;
  /** Un enlace externo, o un archivo a subir: al menos uno de los dos. */
  enlaceUrl?: string;
  archivo?: File | null;
}

/**
 * Presenta un recurso a la cola de revisión. Si trae archivo, primero lo sube
 * al servicio de archivos (14.19) y manda la referencia; el destino final
 * (institucional o nacional) lo decide el bibliotecario, no quien lo presenta.
 */
export async function presentarRecurso(
  datos: DatosPresentarRecurso,
): Promise<{ id: string }> {
  let archivoId: string | undefined;
  if (datos.archivo) {
    const subido = await subirArchivo(datos.archivo);
    archivoId = subido.id;
  }
  return enviar<{ id: string }>("/api/biblioteca/recursos", "POST", {
    titulo: datos.titulo,
    descripcion: datos.descripcion ?? "",
    tipo: datos.tipo,
    materiaId: datos.materiaId ?? undefined,
    tematicaLibre: datos.tematicaLibre ?? undefined,
    enlaceUrl: datos.enlaceUrl ?? undefined,
    archivoId,
  });
}

// ─── Cola de revisión del bibliotecario (sección 9) ─────

export interface ItemCola {
  id: string;
  recursoId: string;
  titulo: string;
  descripcion: string;
  tipo: Recurso["tipo"];
  categoria: string;
  presentadoPor: string;
  presentadoPorRol: Rol;
  presentadoEn: string;
  enlaceUrl: string | null;
  archivo: string | null;
}

export interface ConteoCola {
  pendiente: number;
  aprobado: number;
  rechazado: number;
}

export function usarCola() {
  const { datos, cargando, error, recargar } = usarDatos<{
    pendientes: ItemCola[];
    conteo: ConteoCola;
  }>("/api/biblioteca/cola");
  return {
    pendientes: datos?.pendientes ?? null,
    conteo: datos?.conteo ?? { pendiente: 0, aprobado: 0, rechazado: 0 },
    cargando,
    error,
    recargar,
  };
}

/** Aprobar (institucional o nacional) o rechazar con motivo un ítem de la cola. */
export async function decidirCola(
  id: string,
  decision:
    | { decision: "aprobar"; destino: "institucional" | "nacional" }
    | { decision: "rechazar"; motivo: string },
): Promise<void> {
  await enviar(`/api/biblioteca/cola/${id}/decidir`, "POST", decision);
}
