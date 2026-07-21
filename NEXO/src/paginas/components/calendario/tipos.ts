// Tipos y helpers de color del módulo Calendario Institucional

// Las cuatro "familias" de color/ícono que tiene el diseño.
export type TipoEvento = "examen" | "conferencia" | "evento" | "reunion";

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-MM-dd
  horaInicio?: string;
  horaFin?: string;
  // El tipo real es texto libre (Error 6.E.4): lo escribe quien crea el evento
  // ("acto", "asamblea", "cita"…). No es una de cuatro opciones fijas. El color
  // y el ícono se eligen a partir de ese texto con `familiaDeTipo`.
  tipo: string;
  lugar?: string;
  descripcion?: string;
  creador?: string;
}

// Traduce el tipo libre de un evento a una de las cuatro familias visuales. Así
// "acto", "asamblea" y "reunión de padres" caen en "reunion/evento" y toman un
// color coherente, sin obligar a la base a usar solo cuatro palabras.
export function familiaDeTipo(tipo: string): TipoEvento {
  const t = tipo.toLowerCase();
  if (t.includes("examen") || t.includes("parcial") || t.includes("prueba")) return "examen";
  if (t.includes("reunión") || t.includes("reunion") || t.includes("cita") || t.includes("entrevista")) return "reunion";
  if (t.includes("conferencia") || t.includes("charla") || t.includes("taller")) return "conferencia";
  return "evento";
}

// Ícono para la lista de próximos eventos, según la familia del tipo.
export const ICONO_FAMILIA: Record<TipoEvento, string> = {
  examen: "schedule",
  conferencia: "location_on",
  evento: "groups",
  reunion: "videocam",
};

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
