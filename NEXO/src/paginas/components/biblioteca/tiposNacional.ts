// Tipos del módulo Biblioteca Digital Nacional
// Vista: /biblioteca/nacional

export type TipoRecurso = "pdf" | "video" | "linea-tiempo" | "simulador" | "articulo";

// Voto del usuario sobre un recurso: solo uno por usuario por recurso (anónimo)
export type Voto = "positivo" | "negativo" | null;

export interface RecursoNacional {
  id: string;
  titulo: string;
  materia: string;
  escuela: string;
  tipo: TipoRecurso;
  // Votos base (sin contar el voto del usuario actual)
  votosPositivos: number;
  votosNegativos: number;
  fechaPublicacion: string; // ISO date
}

// Mapea cada tipo de recurso a su ícono de Material Symbols
export const ICONO_POR_TIPO: Record<TipoRecurso, string> = {
  pdf: "picture_as_pdf",
  video: "play_circle",
  "linea-tiempo": "calendar_month",
  simulador: "interactive_space",
  articulo: "article",
};

export const LABEL_POR_TIPO: Record<TipoRecurso, string> = {
  pdf: "PDF",
  video: "Video",
  "linea-tiempo": "Línea de tiempo",
  simulador: "Simulador",
  articulo: "Artículo",
};
