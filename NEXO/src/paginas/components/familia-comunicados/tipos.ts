// Tipos del módulo Comunicados (Portal de Familia)

export type EmisorTipo = "admin-academico" | "preceptor";

export interface Adjunto {
  nombre: string;
  // Nombre del ícono de Material Symbols para el tipo de archivo
  icono?: string;
}

export interface Comunicado {
  id: string;
  titulo: string;
  fecha: string; // formato dd/MM/yyyy para mostrar
  fechaISO: string; // yyyy-MM-dd para ordenar
  emisor: string;
  emisorTipo: EmisorTipo;
  adjunto?: Adjunto;
  leido: boolean;
  fechaLeido?: string; // dd/MM cuando se marcó como leído
}

// Ícono de Material Symbols según el tipo de emisor
export const ICONO_EMISOR: Record<EmisorTipo, string> = {
  "admin-academico": "person",
  preceptor: "badge",
};
