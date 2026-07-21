// src/paginas/components/cursos/TarjetaCurso.tsx
// Tarjeta de un curso dentro de la grilla de Cursos Activos.
// Maneja el estado visual de alerta cuando el curso no tiene preceptor asignado.
//
// La forma de un curso la define el servidor (`servicios/perfiles.ts`), que es
// quien lo lee de la base. Acá se re-exporta para no romper a quien ya lo
// importaba de este archivo, pero la definición es una sola.

export type { Curso } from "../../../servicios/perfiles";
import type { Curso } from "../../../servicios/perfiles";

interface TarjetaCursoProps {
  curso: Curso;
  onVerDetalle: (id: string) => void;
}

export default function TarjetaCurso({ curso, onVerDetalle }: TarjetaCursoProps) {
  const sinPreceptor = curso.preceptor === null;
  const etiqueta = `${curso.anio}°${curso.division}`;

  return (
    <div
      className={`bg-[#2D1B4E] p-6 rounded-[14px] transition-all group flex flex-col justify-between relative overflow-hidden ${
        sinPreceptor
          ? "border-2 border-error/50 hover:border-error"
          : "border border-surface-variant hover:border-primary/40"
      }`}
    >
      {sinPreceptor && (
        <div className="absolute top-0 right-0 p-2">
          <span
            className="material-symbols-outlined text-error"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
        </div>
      )}

      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold text-white">{etiqueta}</h3>
          {curso.activo && !sinPreceptor && (
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
              Activo
            </span>
          )}
        </div>

        {sinPreceptor && (
          <div className="bg-error/10 text-error p-3 rounded-lg text-xs font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs">error</span>
            Sin preceptor asignado
          </div>
        )}

        <div className="space-y-3 mb-6">
          {!sinPreceptor && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">person</span>
              <span className="text-sm">{curso.preceptor}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">groups</span>
            <span className="text-sm">{curso.estudiantes} estudiantes</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">book</span>
            <span className="text-sm">{curso.materias} materias</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onVerDetalle(curso.id)}
        className="w-full py-2 rounded-xl text-primary font-medium border border-primary/20 hover:bg-primary/5 transition-colors active:scale-95"
      >
        Ver detalle
      </button>
    </div>
  );
}
