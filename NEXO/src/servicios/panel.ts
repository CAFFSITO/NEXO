// src/servicios/panel.ts
// Puerta del Panel de la dirección hacia el servidor. Cada cifra que trae está
// calculada en la base (ver `servidor/panel.js`); ninguna está escrita a mano.

import { usarDatos } from "./api";

export interface PanelInstitucional {
  /** true si quien pregunta es el admin de plataforma (no tiene colegio). */
  sinInstitucion?: boolean;
  metricas?: {
    estudiantes: number;
    docentes: number;
    familias: number;
    cursos: number;
    /** % de entregas hechas en término. null si todavía no hay entregas. */
    entregasEnTermino: number | null;
    entregasContadas: number;
  };
  pulso?: {
    participacionComunidad: number;
    entregasEnTermino: number | null;
  };
  actividad?: {
    tipo: string;
    titulo: string;
    detalle: string;
    cuando: string;
  }[];
  alertas?: {
    sinCorregir: number;
    denunciasAbiertas: number;
    cursosSinPreceptor: number;
    recursosEnCola: number;
  };
}

export function usarPanelInstitucional() {
  const { datos, cargando, error, recargar } =
    usarDatos<PanelInstitucional>("/api/panel/institucional");
  return { datos, cargando, error, recargar };
}
