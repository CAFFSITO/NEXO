// src/paginas/components/materias/TarjetaMateria.tsx
// Tarjeta de una materia dentro de la grilla de la pestaña Materias.
// Resalta en estado de alerta cuando no tiene profesor responsable asignado.

import { colorDeMateria, type Materia } from "./tipos";

interface TarjetaMateriaProps {
  materia: Materia;
  onGestionar: (id: string) => void;
}

export default function TarjetaMateria({ materia, onGestionar }: TarjetaMateriaProps) {
  const sinProfesor = materia.profesor === null;
  const color = colorDeMateria(materia.nombre);

  return (
    <div
      className={`bg-[#2D1B4E] p-6 rounded-[14px] transition-all group flex flex-col justify-between relative overflow-hidden ${
        sinProfesor
          ? "border-2 border-error/50 hover:border-error"
          : "border border-surface-variant hover:border-primary/40"
      }`}
    >
      {/* Barra de color identificatoria de la materia */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: color }} />

      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg font-headline"
              style={{ backgroundColor: `${color}33`, color }}
            >
              {materia.nombre.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-headline font-bold text-white">{materia.nombre}</h3>
          </div>
          <span
            className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors cursor-pointer"
            onClick={() => onGestionar(materia.id)}
          >
            more_vert
          </span>
        </div>

        {sinProfesor && (
          <div className="bg-error/10 text-error p-3 rounded-lg text-xs font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs">error</span>
            Sin profesor responsable
          </div>
        )}

        <div className="space-y-3 mb-6">
          {!sinProfesor && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">person</span>
              <span className="text-sm">{materia.profesor}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">class</span>
            <span className="text-sm">{materia.cursos} curso{materia.cursos !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="text-sm">{materia.horasSemanales} hs semanales</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onGestionar(materia.id)}
        className="w-full py-2 rounded-xl text-primary font-medium border border-primary/20 hover:bg-primary/5 transition-colors active:scale-95"
      >
        Gestionar
      </button>
    </div>
  );
}
