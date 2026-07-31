import GraficoProgresoAlumno from "./GraficoProgresoAlumno";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import { fechaCorta } from "../../../servicios/fechas";
import { usarProgresoAlumno } from "../../../servicios/materia";

// Panel (modal) del progreso de UN alumno en la materia. Vista del PROFESOR.
// Todo real, de nexo.db: la serie de notas sale de `correcciones`. El servidor
// ya valida que solo el docente dueño (o la dirección) reciba estos datos.

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

interface Props {
  catedraId: string;
  alumnoId: string;
  alumnoNombre: string;
  onCerrar: () => void;
}

export default function ModalProgresoAlumno({ catedraId, alumnoId, alumnoNombre, onCerrar }: Props) {
  const { progreso, cargando, error, recargar } = usarProgresoAlumno(catedraId, alumnoId);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-[#231340] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#231340] z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2D1B4E] flex items-center justify-center overflow-hidden text-xs font-bold text-white/60">
              {progreso?.alumno.avatar ? (
                <img src={progreso.alumno.avatar} alt={alumnoNombre} className="w-full h-full object-cover" />
              ) : (
                iniciales(alumnoNombre)
              )}
            </div>
            <div>
              <p className="text-white font-bold leading-tight">{progreso?.alumno.nombre ?? alumnoNombre}</p>
              <p className="text-white/40 text-xs">Progreso en la materia</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {cargando ? (
            <Cargando que="el progreso del alumno" />
          ) : error ? (
            <Fallo error={error} onReintentar={recargar} />
          ) : !progreso ? null : (
            <>
              {/* Gráfico (línea/barras) — vacío honesto si no hay notas */}
              <GraficoProgresoAlumno serie={progreso.serie} />

              {/* Tareas entregadas y adeudadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-lg">task_alt</span>
                    Entregadas ({progreso.entregadas.length})
                  </h4>
                  {progreso.entregadas.length === 0 ? (
                    <p className="text-slate-500 text-xs bg-[#1C1030] rounded-xl p-3">Todavía no entregó nada.</p>
                  ) : (
                    <div className="space-y-2">
                      {progreso.entregadas.map((t) => (
                        <div key={t.id} className="bg-[#1C1030] rounded-xl p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{t.titulo}</p>
                            <p className="text-slate-500 text-[11px]">
                              Entregó {fechaCorta(t.entregadoEn)}
                              {!t.enTermino && <span className="text-amber-400"> · tarde</span>}
                            </p>
                          </div>
                          {t.nota !== null ? (
                            <span
                              className={`shrink-0 text-sm font-black ${
                                t.nota >= 6 ? "text-green-400" : "text-amber-400"
                              }`}
                            >
                              {t.nota}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] text-slate-500 uppercase font-bold">sin corregir</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-lg">pending_actions</span>
                    Adeudadas ({progreso.adeudadas.length})
                  </h4>
                  {progreso.adeudadas.length === 0 ? (
                    <p className="text-slate-500 text-xs bg-[#1C1030] rounded-xl p-3">No adeuda ninguna tarea. 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {progreso.adeudadas.map((t) => (
                        <div key={t.id} className="bg-[#1C1030] rounded-xl p-3 border-l-2 border-red-500/50">
                          <p className="text-white text-sm font-medium truncate">{t.titulo}</p>
                          <p className="text-slate-500 text-[11px]">Vencía {fechaCorta(t.fechaLimite)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
