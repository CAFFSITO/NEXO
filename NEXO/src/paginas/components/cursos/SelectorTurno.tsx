// src/paginas/components/cursos/SelectorTurno.tsx
// Turno del curso: botones grandes (Mañana / Tarde / Vespertino y los que sume
// la escuela) en vez de una lista. Con pocas opciones, verlas todas de entrada
// es más claro que abrir un desplegable. Debajo, "+ Agregar otro turno".

import { iconoTurno, type DatoDeLista } from "../../../servicios/gestionAcademica";
import AgregarOpcion from "./AgregarOpcion";

interface Props {
  turnos: DatoDeLista[];
  valor: string;
  onCambiar: (turnoId: string) => void;
  /** Si viene, se puede sumar un turno a la lista de la escuela. */
  onCrear?: (nombre: string) => Promise<DatoDeLista>;
  disabled?: boolean;
}

export default function SelectorTurno({ turnos, valor, onCambiar, onCrear, disabled = false }: Props) {
  return (
    <div>
      <div role="radiogroup" aria-label="Turno" className="grid grid-cols-2 gap-3">
        {turnos.map((t) => {
          const elegido = t.id === valor;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={elegido}
              disabled={disabled}
              onClick={() => onCambiar(t.id)}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 font-semibold transition-colors disabled:opacity-50 ${
                elegido ? "border-acento bg-acento/15 text-white" : "border-white/10 bg-fondo text-slate-300 hover:border-white/25"
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-xl" aria-hidden="true">{iconoTurno(t.nombre)}</span>
              <span className="truncate">{t.nombre}</span>
            </button>
          );
        })}
      </div>
      {onCrear && (
        <AgregarOpcion
          etiqueta="Agregar otro turno"
          placeholder="Nombre del turno (ej: Noche)"
          existentes={turnos}
          onElegir={onCambiar}
          onCrear={onCrear}
          disabled={disabled}
        />
      )}
    </div>
  );
}
