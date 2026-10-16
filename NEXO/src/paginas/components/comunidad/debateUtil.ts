// Los tipos de bloque de un debate (nombre, ícono, color, para qué sirven) y
// las plantillas para armar uno en un toque.

import type { TipoBloque } from "../../../servicios/comunidad";

export const TIPOS_BLOQUE: Record<TipoBloque, { nombre: string; icono: string; color: string; ayuda: string }> = {
  postura: { nombre: "Postura", icono: "thumbs_up_down", color: "#a78bfa", ayuda: "A favor o en contra (y, si querés, indeciso). Muestra el consenso." },
  opciones: { nombre: "Encuesta", icono: "ballot", color: "#38bdf8", ayuda: "Una o varias opciones para elegir." },
  escala: { nombre: "Escala", icono: "linear_scale", color: "#facc15", ayuda: "¿Cuánto? Del 1 al 5 (o al 10), con promedio y consenso." },
  ranking: { nombre: "Ranking", icono: "format_list_numbered", color: "#fb923c", ayuda: "Ordenar opciones por preferencia (conteo Borda)." },
  argumentos: { nombre: "Argumentos", icono: "balance", color: "#34d399", ayuda: "Mapa de argumentos a favor y en contra, que se votan, se responden y pueden cambiar opiniones (Δ)." },
  propuestas: { nombre: "Propuestas", icono: "lightbulb", color: "#f472b6", ayuda: "Lluvia de ideas: cada quien suma propuestas y se votan." },
  abierta: { nombre: "Pregunta abierta", icono: "edit_note", color: "#2dd4bf", ayuda: "Respuestas libres a una pregunta, votadas y con su hilo." },
};

export interface BloqueBorrador {
  clave: string;
  tipo: TipoBloque;
  titulo: string;
  neutral?: boolean;
  opciones?: string[];
  multiple?: boolean;
  maximo?: number;
  minimo?: number;
  maximoEscala?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
  maximoPorPersona?: number;
}

let contador = 0;
export const nuevaClave = () => `b${++contador}`;

export function bloqueVacio(tipo: TipoBloque): BloqueBorrador {
  const base = { clave: nuevaClave(), tipo, titulo: "" };
  if (tipo === "postura") return { ...base, neutral: true };
  if (tipo === "opciones") return { ...base, opciones: ["", ""], multiple: false, maximo: 2 };
  if (tipo === "escala") return { ...base, minimo: 1, maximoEscala: 5, etiquetaMin: "Nada", etiquetaMax: "Totalmente" };
  if (tipo === "ranking") return { ...base, opciones: ["", "", ""] };
  if (tipo === "propuestas") return { ...base, maximoPorPersona: 3 };
  return base;
}

/** El bloque como lo espera el servidor. */
export function bloqueParaServidor(b: BloqueBorrador) {
  const config: Record<string, unknown> = {};
  if (b.tipo === "postura") config.neutral = Boolean(b.neutral);
  if (b.tipo === "opciones") Object.assign(config, { opciones: (b.opciones ?? []).map((o) => o.trim()).filter(Boolean), multiple: Boolean(b.multiple), maximo: b.maximo });
  if (b.tipo === "escala") Object.assign(config, { minimo: b.minimo, maximo: b.maximoEscala, etiquetaMin: b.etiquetaMin, etiquetaMax: b.etiquetaMax });
  if (b.tipo === "ranking") config.opciones = (b.opciones ?? []).map((o) => o.trim()).filter(Boolean);
  if (b.tipo === "propuestas") config.maximoPorPersona = b.maximoPorPersona;
  return { tipo: b.tipo, titulo: b.titulo.trim(), config };
}

export const PLANTILLAS: { nombre: string; icono: string; descripcion: string; bloques: () => BloqueBorrador[] }[] = [
  { nombre: "Clásico", icono: "balance", descripcion: "Postura + mapa de argumentos", bloques: () => [bloqueVacio("postura"), bloqueVacio("argumentos")] },
  { nombre: "Consulta", icono: "ballot", descripcion: "Encuesta + escala + pregunta abierta", bloques: () => [bloqueVacio("opciones"), bloqueVacio("escala"), { ...bloqueVacio("abierta"), titulo: "¿Qué más querés agregar?" }] },
  { nombre: "Lluvia de ideas", icono: "lightbulb", descripcion: "Propuestas votadas + ranking final", bloques: () => [bloqueVacio("propuestas"), bloqueVacio("ranking")] },
  { nombre: "Debate completo", icono: "forum", descripcion: "Postura, argumentos, escala y propuestas", bloques: () => [bloqueVacio("postura"), bloqueVacio("argumentos"), bloqueVacio("escala"), bloqueVacio("propuestas")] },
];

export const VISIBILIDAD = {
  siempre: "Resultados siempre a la vista",
  "al-participar": "Resultados al responder",
  "al-cierre": "Resultados recién al cierre",
} as const;
