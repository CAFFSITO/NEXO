// src/paginas/components/materias/tipos.ts
// Tipos y paleta de la pestaña "Materias" de Gestión Institucional.
// Cada materia tiene un profesor responsable y se dicta en N cursos (NEXO_PERFIL_ARCHITECTURE).

export interface Materia {
  id: string;
  nombre: string;
  profesor: string | null; // null => sin profesor responsable (estado de alerta)
  cursos: number; // cantidad de cursos donde se dicta
  horasSemanales: number;
}

// Colores por materia del Design System NEXO (badges de materia).
export const COLOR_MATERIA: Record<string, string> = {
  Matemática: "#3B82F6",
  Historia: "#F97316",
  Biología: "#10B981",
  Lengua: "#8B5CF6",
  Inglés: "#EC4899",
  Física: "#06B6D4",
  Química: "#F59E0B",
  Geografía: "#14B8A6",
};

// Color de respaldo para materias fuera de la paleta predefinida.
export const COLOR_MATERIA_DEFAULT = "#C548F5";

export function colorDeMateria(nombre: string): string {
  return COLOR_MATERIA[nombre] ?? COLOR_MATERIA_DEFAULT;
}
