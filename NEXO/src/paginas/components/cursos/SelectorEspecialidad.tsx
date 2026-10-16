// src/paginas/components/cursos/SelectorEspecialidad.tsx
// Especialidad del curso (opcional): el desplegable propio con la lista de la
// escuela y, debajo, "+ Agregar otra especialidad".

import type { DatoDeLista } from "../../../servicios/gestionAcademica";
import Selector from "../shared/Selector";
import AgregarOpcion from "./AgregarOpcion";

interface Props {
  especialidades: DatoDeLista[];
  valor: string;
  onCambiar: (especialidadId: string) => void;
  onCrear?: (nombre: string) => Promise<DatoDeLista>;
  className?: string;
  disabled?: boolean;
}

export default function SelectorEspecialidad({ especialidades, valor, onCambiar, onCrear, className, disabled = false }: Props) {
  return (
    <div>
      <Selector aria-label="Especialidad" className={className} value={valor} onChange={(e) => onCambiar(e.target.value)} disabled={disabled}>
        <option value="">Sin especialidad</option>
        {especialidades.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </Selector>
      {onCrear && (
        <AgregarOpcion
          etiqueta="Agregar otra especialidad"
          placeholder="Nombre de la especialidad (ej: Química)"
          existentes={especialidades}
          onElegir={onCambiar}
          onCrear={onCrear}
          disabled={disabled}
        />
      )}
    </div>
  );
}
