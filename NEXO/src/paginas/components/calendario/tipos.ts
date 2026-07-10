// Tipos y helpers de color del módulo Calendario Institucional

export type TipoEvento = "examen" | "conferencia" | "evento" | "reunion";

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-MM-dd
  horaInicio?: string;
  horaFin?: string;
  tipo: TipoEvento;
  lugar?: string;
  icono: string; // Material Symbol mostrado en la lista de próximos eventos
}

export interface Feriado {
  fecha: string; // ISO yyyy-MM-dd
  nombre: string;
}

// Paleta por tipo de evento (chip en grilla + caja de fecha en panel lateral)
interface PaletaEvento {
  label: string;
  chip: string; // clases para el chip dentro de la celda del día
  texto: string; // clase de color de texto (hover en tarjeta lateral)
  caja: string; // clases para la caja de fecha del panel "Próximos eventos"
}

export const PALETA_EVENTO: Record<TipoEvento, PaletaEvento> = {
  examen: {
    label: "Examen",
    chip: "bg-orange-500/20 border border-orange-500/30 text-orange-400",
    texto: "group-hover:text-orange-400",
    caja: "bg-orange-500/10 border border-orange-500/20 text-orange-400",
  },
  conferencia: {
    label: "Conferencia",
    chip: "bg-blue-500/20 border border-blue-500/30 text-blue-400",
    texto: "group-hover:text-blue-400",
    caja: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  },
  evento: {
    label: "Evento",
    chip: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400",
    texto: "group-hover:text-emerald-400",
    caja: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  },
  reunion: {
    label: "Reunión",
    chip: "bg-purple-500/20 border border-purple-500/30 text-purple-300",
    texto: "group-hover:text-purple-400",
    caja: "bg-purple-500/10 border border-purple-500/20 text-purple-400",
  },
};
