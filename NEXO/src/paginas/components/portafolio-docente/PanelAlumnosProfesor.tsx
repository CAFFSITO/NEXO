import { useState } from "react";
import ModalProgresoAlumno from "./ModalProgresoAlumno";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { usarAlumnosMateria, type AlumnoMateria } from "../../../servicios/materia";

// Lista de alumnos de la materia (vista del PROFESOR). Al tocar un alumno se abre
// el panel de progreso con los gráficos reales. Solo lo ve el profesor: el
// servidor valida cada pedido (lista y progreso) por fila.

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export default function PanelAlumnosProfesor({ catedraId }: { catedraId: string }) {
  const { alumnos, cargando, error, recargar } = usarAlumnosMateria(catedraId);
  const [seleccionado, setSeleccionado] = useState<AlumnoMateria | null>(null);

  return (
    <section>
      <h2 className="text-lg font-bold text-white font-headline mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#C548F5]">group</span>
        Alumnos
        {alumnos && <span className="text-slate-500 text-sm font-normal">({alumnos.length})</span>}
      </h2>

      {cargando ? (
        <Cargando que="los alumnos" />
      ) : error ? (
        <Fallo error={error} onReintentar={recargar} />
      ) : !alumnos || alumnos.length === 0 ? (
        <p className="text-slate-400 text-sm bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-5">
          Todavía no hay alumnos inscriptos en este curso.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alumnos.map((a) => (
            <button
              key={a.id}
              onClick={() => setSeleccionado(a)}
              className="text-left bg-[#2D1B4E] border border-white/5 hover:border-[#C548F5]/40 rounded-xl p-4 flex items-center gap-3 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1C1030] flex items-center justify-center overflow-hidden text-xs font-bold text-white/60 shrink-0">
                {a.avatar ? (
                  <img src={a.avatar} alt={a.nombre} className="w-full h-full object-cover" />
                ) : (
                  iniciales(a.nombre)
                )}
              </div>
              <span className="text-white text-sm font-medium truncate flex-1">{a.nombre}</span>
              <span className="material-symbols-outlined text-white/30 group-hover:text-[#C548F5] transition-colors">
                bar_chart
              </span>
            </button>
          ))}
        </div>
      )}

      {seleccionado && (
        <ModalProgresoAlumno
          catedraId={catedraId}
          alumnoId={seleccionado.id}
          alumnoNombre={seleccionado.nombre}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </section>
  );
}
