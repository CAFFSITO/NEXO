// Tipos compartidos del módulo Chat (perfil Familia)

export interface MensajeFamilia {
  id: string;
  emisor: "familia" | "contacto";
  contenido: string;
  hora: string; // Ej: "10:45 AM"
}

export interface ConversacionFamilia {
  id: string;
  nombre: string;
  ultimoMensaje: string;
  hora: string; // Ej: "10:45 AM", "Ayer", "Lun."
  enLinea: boolean;
  /** Si tiene foto usa avatarUrl; si no, muestra un ícono de Material Symbols. */
  avatarUrl?: string;
  icono?: string; // Ícono Material Symbols cuando no hay foto
  mensajes: MensajeFamilia[];
  noLeidos: number;
}
