// Tipos y paleta del Calendario de Familia (vista de solo lectura).
// A diferencia del institucional, cada evento tiene estado de lectura y
// puede requerir confirmación de asistencia por parte de la familia.

export type TipoEventoFamilia = "examen" | "aviso" | "reunion" | "especial";

export interface EventoFamilia {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-MM-dd
  tipo: TipoEventoFamilia;
  etiqueta: string; // Texto del chip (ej: "Acto escolar", "Aviso")
  leido: boolean;
  requiereConfirmacion?: boolean; // true en reuniones de padres
  confirmado?: boolean; // asistencia confirmada por la familia
  lugar?: string;
  horaInicio?: string;
  horaFin?: string;
}

interface PaletaEventoFamilia {
  label: string; // Nombre de la categoría en la leyenda
  punto: string; // Clases del punto/dot en la grilla mensual
  chip: string; // Clases del chip de etiqueta
  dot: string; // Color plano del punto en la leyenda
}

// Colores según el mock de Familia: examen=rojo, aviso/acto=naranja,
// reunión=azul, evento especial=verde.
export const PALETA_FAMILIA: Record<TipoEventoFamilia, PaletaEventoFamilia> = {
  examen: {
    label: "Exámenes",
    punto: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    chip: "bg-red-500/10 text-red-400 border border-red-500/20",
    dot: "bg-red-500",
  },
  aviso: {
    label: "Actos / Avisos",
    punto: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
    chip: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    dot: "bg-orange-500",
  },
  reunion: {
    label: "Reuniones",
    punto: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    chip: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    dot: "bg-blue-500",
  },
  especial: {
    label: "Eventos especiales",
    punto: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    chip: "bg-green-500/10 text-green-400 border border-green-500/20",
    dot: "bg-green-500",
  },
};

// Orden de categorías para la leyenda del pie.
export const ORDEN_LEYENDA: TipoEventoFamilia[] = ["examen", "aviso", "reunion", "especial"];
