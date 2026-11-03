// src/servicios/maestro.ts
// Puerta del estudio del Maestro hacia el servidor. Los tipos reflejan el
// genoma tal como lo valida servidor/genoma.js: lo que se arma acá es un
// borrador; la verdad (y la validación) es del servidor.

import { enviar, pedir, useDatos } from "./api";
import type { Tema } from "./tema";
import type { Personalizacion } from "./personalizacion";

// ── Genoma ──────────────────────────────────────────────

export interface ModuloGenoma {
  oculto: boolean;
  orden: number;
  etiqueta: string;
  icono: string;
  /** Sección del menú donde vive ("" = "Mi espacio"). La arma la dirección en su modo edición. */
  seccion?: string;
  /** Solo se guardan las funciones APAGADAS (false). */
  funciones: Record<string, boolean>;
}

export interface ModuloPerfil {
  oculto?: boolean;
  orden?: number;
  etiqueta?: string;
  icono?: string;
  funciones?: Record<string, boolean>;
}

export interface PerfilGenoma {
  clave: string;
  arquetipo: string;
  nombre: string;
  color: string;
  icono: string;
  predeterminado: boolean;
  inicio: string;
  modulos: Record<string, ModuloPerfil>;
}

export interface DatosNodo {
  en?: Record<string, number>;
  [campo: string]: unknown;
}

export interface Nodo {
  id: string;
  tipo: string;
  x: number;
  y: number;
  datos: DatosNodo;
}

export interface Conexion {
  de: string;
  salida: string;
  a: string;
  entrada: string;
}

export interface Grafo {
  nodos: Nodo[];
  conexiones: Conexion[];
}

export interface Aprobacion {
  huella: string;
  probabilidad: number;
  media: number;
  iteraciones: number;
  aprobadoEn: string;
}

export interface AlgoritmoGenoma {
  activo: boolean;
  variante: "nativo" | "personalizado";
  parametros: Record<string, number>;
  grafo: Grafo | null;
  aprobacion: Aprobacion | null;
}

export interface FlujoGenoma {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  limiteHora: number;
  grafo: Grafo;
  aprobacion: Aprobacion | null;
}

/** Una sección con nombre del menú lateral (la jerarquía de la instancia). */
export interface SeccionMenu {
  id: string;
  nombre: string;
  icono: string;
}

export interface Genoma {
  personalizacion?: Personalizacion;
  version: number;
  identidad: { nombre: string; lema: string; icono: string; dominio: string; semilla: number };
  tema: Tema;
  secciones?: SeccionMenu[];
  modulos: Record<string, ModuloGenoma>;
  algoritmos: Record<string, AlgoritmoGenoma>;
  perfiles: PerfilGenoma[];
  flujos: FlujoGenoma[];
}

// ── Catálogo ────────────────────────────────────────────

export interface FuncionCatalogo { id: string; nombre: string; arquetipos: string[] }

export interface ModuloCatalogo {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  descripcion: string;
  padre: string | null;
  paginas: string[];
  arquetipos: string[];
  funciones: FuncionCatalogo[];
}

export interface ParametroCatalogo {
  id: string;
  nombre: string;
  min: number;
  max: number;
  paso: number;
  defecto: number;
  fueraDelGrafo?: boolean;
}

export interface EntradaCatalogo { id: string; nombre: string; rango: [number, number] }

export interface AlgoritmoCatalogo {
  id: string;
  modulo: string;
  nombre: string;
  descripcion: string;
  salida: string;
  alDesactivar: string;
  admiteGrafo: boolean;
  entradas: EntradaCatalogo[];
  parametros: ParametroCatalogo[];
}

export type TipoCampo = "numero" | "texto" | "plantilla" | "variable" | "evento" | "metrica" | "hora" | "dias" | "destino";

export interface CampoNodo { id: string; tipo: TipoCampo; nombre: string; min?: number; max?: number }

export type CategoriaNodo = "entrada" | "contexto" | "disparador" | "matematica" | "logica" | "probabilidad" | "salida" | "accion";

export interface TipoNodo {
  tipo: string;
  nombre: string;
  categoria: CategoriaNodo;
  modos: ("algoritmo" | "flujo")[];
  descripcion: string;
  entradas: { id: string; nombre: string; defecto: number }[];
  salidas: string[];
  campos: CampoNodo[];
}

export interface ArquetipoCatalogo { id: string; nombre: string; color: string; icono: string }

export interface Catalogo {
  arquetipos: ArquetipoCatalogo[];
  necesidades: { id: string; nombre: string; icono: string }[];
  armonias: string[];
  temaBase: Tema;
  modulos: ModuloCatalogo[];
  algoritmos: AlgoritmoCatalogo[];
  /** El algoritmo de las tendencias nacionales: uno para toda la plataforma. */
  algoritmoNacional: AlgoritmoCatalogo;
  eventos: { id: string; nombre: string; modulo: string; anonimo: boolean }[];
  metricas: { id: string; nombre: string }[];
  nodos: TipoNodo[];
  genomaPorDefecto: Genoma;
}

export function useCatalogo() {
  return useDatos<Catalogo>("/api/maestro/catalogo");
}

// ── Instancias ──────────────────────────────────────────

export interface Combinatoria { log10: number; exponente: number }

export interface ResumenGenoma {
  tema: Tema;
  identidad: Genoma["identidad"];
  modulosVisibles: number;
  modulosOcultos: number;
  perfiles: number;
  perfilesPropios: number;
  funcionesApagadas: number;
  algoritmosPersonalizados: number;
  algoritmosApagados: number;
  flujos: number;
  flujosActivos: number;
  combinatoria: Combinatoria;
}

export interface InstanciaResumen {
  id: string;
  nombre: string;
  cicloLectivo: number;
  creadoEn: string;
  usuarios: number;
  cursos: number;
  version: number;
  actualizadoEn: string | null;
  genoma: ResumenGenoma;
}

export function useInstancias() {
  return useDatos<{ instancias: InstanciaResumen[] }>("/api/maestro/instancias");
}

export interface DetalleInstancia {
  institucion: { id: string; nombre: string; cicloLectivo: number; creadoEn: string };
  genoma: Genoma;
  version: number;
  versiones: { version: number; nota: string; autorRol: "maestro" | "direccion" | "sistema"; creadoEn: string }[];
  actividad: { flujoId: string; disparos: number; acciones: number; ultimo: string }[];
  usuariosPorPerfil: Record<string, number>;
  resumen: ResumenGenoma;
}

export function useDetalleInstancia(id: string | null) {
  return useDatos<DetalleInstancia>(id ? `/api/maestro/instancias/${encodeURIComponent(id)}` : null);
}

export function guardarGenoma(id: string, genoma: Genoma, versionBase: number, nota: string) {
  return enviar<{ version: number; genoma: Genoma; resumen: ResumenGenoma }>(
    `/api/maestro/instancias/${encodeURIComponent(id)}/genoma`, "PUT", { genoma, versionBase, nota },
  );
}

export function restaurarVersion(id: string, version: number) {
  return enviar<{ version: number; genoma: Genoma }>(
    `/api/maestro/instancias/${encodeURIComponent(id)}/restaurar`, "POST", { version },
  );
}

export interface DatosForja {
  genoma: Genoma;
  cicloLectivo: number;
  direccion: { nombre: string; email: string };
  cuentasSemilla: boolean;
  plantillaId: number | null;
}

export interface Credencial { perfil: string; color: string; nombre: string; email: string; contrasena: string }

export interface ResultadoForja {
  id: string;
  version: number;
  resumen: ResumenGenoma;
  credenciales: Credencial[];
  mensaje: string;
}

export function forjarInstancia(datos: DatosForja) {
  return enviar<ResultadoForja>("/api/maestro/instancias", "POST", datos);
}

// ── Probabilidad y nodos ────────────────────────────────

export interface Decision {
  tipo: "modulo" | "funcion" | "parametros" | "paleta" | "perfil";
  id: string;
  nombre: string;
  probabilidad: number;
  resultado: boolean;
  valores?: Record<string, number>;
}

export interface Propuesta {
  genoma: Genoma;
  decisiones: Decision[];
  combinatoria: Combinatoria;
}

export function proponerGenoma(necesidades: Record<string, number>, semilla: number, base?: Genoma) {
  return enviar<Propuesta>("/api/maestro/proponer", "POST", { necesidades, semilla, base });
}

export function pedirGrafoNativo(slot: string, parametros: Record<string, number>) {
  return enviar<{ grafo: Grafo; huella: string }>("/api/maestro/grafo-nativo", "POST", { slot, parametros });
}

export type ModoGrafo = "algoritmo" | "flujo";

export interface OpcionesGrafo {
  slot?: string;
  genoma?: Genoma;
  rangos?: Record<string, [number, number]>;
  iteraciones?: number;
  semilla?: number;
}

export interface Evaluacion {
  salida: number | null;
  valores: Record<string, Record<string, number | Record<string, number>>>;
  acciones: { nodoId: string; tipo: string; valor: number }[];
}

export function evaluarGrafo(modo: ModoGrafo, grafo: Grafo, valores: Record<string, number>, opciones: OpcionesGrafo = {}) {
  return enviar<Evaluacion>("/api/maestro/evaluar", "POST", { modo, grafo, valores, ...opciones });
}

export interface Simulacion {
  modo: ModoGrafo;
  iteraciones: number;
  semilla: number;
  media: number;
  desvio: number;
  min: number;
  max: number;
  p5: number;
  p50: number;
  p95: number;
  histograma: { desde: number; hasta: number; cuenta: number }[];
  probabilidad: number;
  intervalo: [number, number];
  influencias: { variable: string; correlacion: number }[];
  acciones: { nodoId: string; probabilidad: number; intervalo: [number, number] }[];
}

export function simularGrafo(modo: ModoGrafo, grafo: Grafo, opciones: OpcionesGrafo = {}) {
  return enviar<Simulacion>("/api/maestro/simular", "POST", { modo, grafo, ...opciones });
}

export function aprobarGrafo(modo: ModoGrafo, grafo: Grafo, opciones: OpcionesGrafo = {}) {
  return enviar<{ aprobacion: Aprobacion; grafo: Grafo; simulacion: Simulacion }>(
    "/api/maestro/aprobar", "POST", { modo, grafo, ...opciones },
  );
}

/** Totales, combinatoria y (si lo hay) el motivo por el que el servidor no lo guardaría. */
export function resumirGenoma(genoma: Genoma) {
  return enviar<{ resumen: ResumenGenoma; error: string | null }>("/api/maestro/resumen", "POST", { genoma });
}

/** La instancia tal como está ahora en el servidor (para recargar tras un conflicto). */
export function obtenerDetalleInstancia(id: string) {
  return pedir<DetalleInstancia>(`/api/maestro/instancias/${encodeURIComponent(id)}`);
}

// ── Tendencias nacionales (algoritmo de plataforma) ─────

export interface EstadisticasNacionales {
  aprobadas: number;
  propuestas: number;
  descartadas: number;
  escuelasConAprobadas: number;
}

export function useAlgoritmoNacional() {
  return useDatos<{ config: AlgoritmoGenoma; estadisticas: EstadisticasNacionales }>("/api/maestro/tendencias-nacionales");
}

export function guardarAlgoritmoNacional(config: AlgoritmoGenoma) {
  return enviar<{ config: AlgoritmoGenoma; estadisticas: EstadisticasNacionales }>("/api/maestro/tendencias-nacionales", "PUT", { config });
}
