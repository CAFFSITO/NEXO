// src/paginas/components/cursos/ModalDetalleCurso.tsx
// Vista de SOLO LECTURA de un curso, para la dirección (Error 6.C.2). Se abre con
// "Ver detalle" de una TarjetaCurso y muestra lo que ese curso tiene de verdad:
// preceptor, cátedras con su profesor real, alumnos inscriptos y tareas de sus
// cátedras. Nada se edita desde acá y ningún número está escrito a mano: todo lo
// trae el servidor de nexo.db (obtenerDetalleCurso), que además valida rol
// dirección y misma institución. Si una sección no tiene datos, se ve vacía y
// honesta.
//
// Reusa el mismo chrome de modal que ModalNuevoCurso (overlay + tarjeta #2D1B4E)
// para que se sienta parte de la misma pantalla.

import { useEffect, useState } from "react";
import { obtenerDetalleCurso, type DetalleCurso } from "../../../servicios/perfiles";
import { Cargando, Fallo } from "../shared/EstadoCarga";

interface ModalDetalleCursoProps {
  /** id del curso a mostrar, o null si el modal está cerrado. */
  cursoId: string | null;
  onCerrar: () => void;
}

export default function ModalDetalleCurso({ cursoId, onCerrar }: ModalDetalleCursoProps) {
  const [detalle, setDetalle] = useState<DetalleCurso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cursoId === null) return;

    // Si el modal se cierra (o cambia de curso) mientras el pedido viaja, la
    // respuesta que llega tarde no debe pisar el estado de otro curso.
    let vigente = true;
    setDetalle(null);
    setError(null);
    setCargando(true);

    obtenerDetalleCurso(cursoId)
      .then((datos) => {
        if (!vigente) return;
        setDetalle(datos);
        setCargando(false);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        setError(fallo instanceof Error ? fallo.message : "No se pudo traer el detalle.");
        setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [cursoId]);

  if (cursoId === null) return null;

  const etiqueta = detalle ? `${detalle.curso.anio}°${detalle.curso.division}` : "Curso";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl"
      >
        {/* ── Encabezado ── */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-headline">{etiqueta}</h3>
            <p className="text-on-surface-variant/70 text-sm mt-1">
              Detalle del curso · solo lectura
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {cargando && <Cargando que="el detalle del curso" />}
        {error && <Fallo error={error} />}

        {detalle && (
          <div className="space-y-6">
            {/* ── Preceptor ── */}
            <Seccion icono="badge" titulo="Preceptor">
              {detalle.preceptor ? (
                <p className="text-white text-sm">{detalle.preceptor}</p>
              ) : (
                <p className="text-error text-sm">Sin preceptor asignado</p>
              )}
            </Seccion>

            {/* ── Cátedras y profesores ── */}
            <Seccion
              icono="book"
              titulo={`Materias (${detalle.catedras.length})`}
            >
              {detalle.catedras.length > 0 ? (
                <ul className="space-y-2">
                  {detalle.catedras.map((c, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center bg-surface-container/40 rounded-lg px-3 py-2"
                    >
                      <span className="text-white text-sm">{c.materia}</span>
                      <span className="text-on-surface-variant text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {c.profesor}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Nada texto="Este curso todavía no tiene materias con profesor asignado." />
              )}
            </Seccion>

            {/* ── Alumnos ── */}
            <Seccion
              icono="groups"
              titulo={`Alumnos inscriptos (${detalle.alumnos.length})`}
            >
              {detalle.alumnos.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detalle.alumnos.map((a, i) => (
                    <li
                      key={i}
                      className="bg-surface-container/40 rounded-lg px-3 py-2"
                    >
                      <p className="text-white text-sm">{a.nombre}</p>
                      <p className="text-on-surface-variant/70 text-xs">{a.email}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Nada texto="Todavía no hay alumnos inscriptos en este curso." />
              )}
            </Seccion>

            {/* ── Tareas de sus cátedras ── */}
            <Seccion
              icono="assignment"
              titulo={`Tareas (${detalle.tareas.length})`}
            >
              {detalle.tareas.length > 0 ? (
                <ul className="space-y-2">
                  {detalle.tareas.map((t, i) => (
                    <li
                      key={i}
                      className="bg-surface-container/40 rounded-lg px-3 py-2"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="text-white text-sm">{t.titulo}</p>
                          <p className="text-on-surface-variant/70 text-xs">{t.materia}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-on-surface-variant text-xs">
                            Límite: {t.fechaLimite}
                          </p>
                          <p className="text-on-surface-variant/70 text-xs">
                            {t.cantidadEntregas} entrega{t.cantidadEntregas === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Nada texto="Este curso todavía no tiene tareas cargadas." />
              )}
            </Seccion>
          </div>
        )}
      </div>
    </div>
  );
}

interface SeccionProps {
  icono: string;
  titulo: string;
  children: React.ReactNode;
}

function Seccion({ icono, titulo, children }: SeccionProps) {
  return (
    <section>
      <h4 className="flex items-center gap-2 text-on-surface-variant text-xs uppercase tracking-wider mb-2">
        <span className="material-symbols-outlined text-base">{icono}</span>
        {titulo}
      </h4>
      {children}
    </section>
  );
}

function Nada({ texto }: { texto: string }) {
  return <p className="text-on-surface-variant/60 text-sm italic">{texto}</p>;
}
