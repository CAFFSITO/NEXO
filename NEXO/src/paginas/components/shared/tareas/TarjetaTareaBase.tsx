import type { ReactNode } from "react";

// Base presentacional COMPARTIDA de una tarjeta de tarea (estilo Todoist).
//
// Es la única cáscara visual de una tarjeta de tarea en NEXO: antes existía una
// para el estudiante (TarjetaTarea) y otra casi igual para el profesor
// (TarjetaTareaDocente). Ahora hay UNA sola, y cada rol le pasa por props lo que
// cambia: los badges, la fila de metadatos y la botonera de acciones. Así el
// estudiante y el profesor —y cualquier perfil futuro— comparten el mismo
// contenedor, tipografía y comportamiento, sin duplicar markup.
//
// No sabe nada de "tareas": solo dibuja el layout. La lógica (qué badge, qué
// acción) vive en quien la usa.

interface TarjetaTareaBaseProps {
  /** Fila de badges (materia, estado, etc.). */
  badges: ReactNode;
  /** El título ya estilizado por quien la usa (para respetar tachado/atenuado). */
  titulo: ReactNode;
  /** Fila(s) de metadatos: profesor/vencimiento (alumno) o curso/entregas (docente). */
  meta: ReactNode;
  /** Botonera de acciones (incluye su propio wrapper/shrink-0). */
  acciones: ReactNode;
  /**
   * Modificadores del contenedor (borde y opacidad). Se pasan completos para
   * que cada estado —vencida, entregada— quede idéntico a como estaba. Si no
   * viene, usa el borde neutro con hover.
   */
  className?: string;
}

export default function TarjetaTareaBase({
  badges,
  titulo,
  meta,
  acciones,
  className = "border border-transparent hover:border-[#C548F5]/30",
}: TarjetaTareaBaseProps) {
  return (
    <div
      className={`bg-[#2D1B4E] rounded-[14px] p-6 hover:shadow-xl transition-all group ${className}`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-3 min-w-0 break-words">
          {badges}
          {titulo}
          {meta}
        </div>
        {acciones}
      </div>
    </div>
  );
}
