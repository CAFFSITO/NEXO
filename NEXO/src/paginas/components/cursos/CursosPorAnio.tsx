import { Fragment, useMemo, useState } from "react";
import type { Curso } from "../../../servicios/perfiles";
import { agruparCursos, iconoTurno } from "../../../servicios/gestionAcademica";
import TarjetaCurso from "./TarjetaCurso";

const NOMBRES_ANIO: Record<number, string> = {
  1: "1eros", 2: "2dos", 3: "3eros", 4: "4tos", 5: "5tos", 6: "6tos", 7: "7mos",
};
const nombreAnio = (anio: number) => NOMBRES_ANIO[anio] ?? `${anio}° año`;

interface Props {
  cursos: Curso[];
  busqueda: string;
  conAlumnos: boolean;
  onVerDetalle: (id: string) => void;
}

interface Anio {
  anio: number;
  cursos: Curso[];
  /** Sus divisiones separadas por turno, en orden de división. */
  turnos: { clave: string; turno: Curso["turno"]; titulo: string; cursos: Curso[] }[];
}

/** La tarjeta de un año: el resumen de sus cursos. Al tocarla se abren debajo. */
function TarjetaAnio({ anio, abierto, conAlumnos, idPanel, onAlternar }: { anio: Anio; abierto: boolean; conAlumnos: boolean; idPanel: string; onAlternar: () => void }) {
  const sinPreceptor = anio.cursos.filter((c) => c.preceptor === null).length;
  const estudiantes = anio.cursos.reduce((total, c) => total + c.estudiantes, 0);
  const cantidad = `${anio.cursos.length} curso${anio.cursos.length === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      aria-expanded={abierto}
      aria-controls={idPanel}
      onClick={onAlternar}
      className={`group flex min-h-[150px] flex-col justify-between gap-5 rounded-[14px] p-5 text-left transition-all active:scale-[.98] sm:p-6 ${
        abierto ? "bg-acento/15 ring-2 ring-acento/60" : "bg-lienzo hover:bg-surface-container-high"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-headline text-2xl font-bold text-white">{nombreAnio(anio.anio)}</span>
          <span className="mt-1 block text-sm text-on-surface-variant">
            {conAlumnos ? `${cantidad} · ${estudiantes} estudiantes` : cantidad}
          </span>
        </span>
        <span
          className={`material-symbols-outlined rounded-full p-1.5 text-xl transition-transform ${
            abierto ? "rotate-180 bg-acento text-white" : "bg-white/5 text-on-surface-variant group-hover:text-white"
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </span>

      <span className="flex flex-wrap gap-2">
        {anio.turnos.map((grupo) => (
          <span key={grupo.clave} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">{grupo.turno ? iconoTurno(grupo.turno.nombre) : "help"}</span>
            {grupo.turno ? grupo.turno.nombre : "Sin turno"}
          </span>
        ))}
        {sinPreceptor > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-xs font-bold text-error">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
            {sinPreceptor} sin preceptor
          </span>
        )}
      </span>
    </button>
  );
}

/** Los cursos del año abierto, a todo el ancho, separados por turno. */
function PanelAnio({ anio, id, conAlumnos, onVerDetalle }: { anio: Anio; id: string; conAlumnos: boolean; onVerDetalle: (id: string) => void }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="col-span-full rounded-[20px] bg-surface-container-low p-5 sm:p-7">
      <h3 id={`${id}-titulo`} className="mb-5 font-headline text-xl font-bold text-white">Cursos de {nombreAnio(anio.anio)}</h3>
      <div className="flex flex-col gap-7">
        {anio.turnos.map((grupo) => (
          <section key={grupo.clave} aria-labelledby={`${id}-turno-${grupo.clave}`}>
            <h4 id={`${id}-turno-${grupo.clave}`} className="mb-4 flex items-center gap-2 text-base font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">{grupo.turno ? iconoTurno(grupo.turno.nombre) : "help"}</span>
              {grupo.titulo}
            </h4>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {grupo.cursos.map((curso) => <TarjetaCurso key={curso.id} curso={curso} onVerDetalle={onVerDetalle} conAlumnos={conAlumnos} />)}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

// Los años en tarjetas, uno al lado del otro. El panel de un año abierto va en
// el DOM justo después de su tarjeta y ocupa toda la fila; con el relleno
// "dense" de la grilla, las tarjetas que siguen completan la fila de arriba y
// el panel cae debajo de ella, sin importar cuántas columnas entren.
function GrillaAnios({ anios, abiertosAlEmpezar, conAlumnos, onVerDetalle }: { anios: Anio[]; abiertosAlEmpezar: boolean; conAlumnos: boolean; onVerDetalle: (id: string) => void }) {
  const [abiertos, setAbiertos] = useState<Set<number>>(() => new Set(abiertosAlEmpezar ? anios.map((a) => a.anio) : []));
  const alternar = (anio: number) => setAbiertos((antes) => {
    const despues = new Set(antes);
    if (!despues.delete(anio)) despues.add(anio);
    return despues;
  });

  return (
    <div className="mb-12 grid grid-flow-row-dense grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {anios.map((anio) => {
        const id = `cursos-anio-${anio.anio}`;
        const abierto = abiertos.has(anio.anio);
        return (
          <Fragment key={anio.anio}>
            <TarjetaAnio anio={anio} abierto={abierto} conAlumnos={conAlumnos} idPanel={id} onAlternar={() => alternar(anio.anio)} />
            {abierto && <PanelAnio anio={anio} id={id} conAlumnos={conAlumnos} onVerDetalle={onVerDetalle} />}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function CursosPorAnio({ cursos, busqueda, conAlumnos, onVerDetalle }: Props) {
  const anios = useMemo<Anio[]>(() => {
    const grupos = new Map<number, Curso[]>();
    for (const curso of cursos) {
      const grupo = grupos.get(curso.anio) ?? [];
      grupo.push(curso);
      grupos.set(curso.anio, grupo);
    }
    return [...grupos].sort(([a], [b]) => a - b).map(([anio, lista]) => ({
      anio,
      cursos: lista,
      turnos: agruparCursos(lista).map((grupo) => ({
        clave: grupo.clave,
        turno: grupo.turno,
        titulo: grupo.titulo,
        cursos: grupo.secciones.flatMap((seccion) => seccion.cursos)
          .sort((a, b) => a.division.localeCompare(b.division, "es", { numeric: true })),
      })),
    }));
  }, [cursos]);

  const q = busqueda.trim();
  // Una búsqueda abre sus resultados; actualizar un curso conserva lo desplegado.
  return <GrillaAnios key={q} anios={anios} abiertosAlEmpezar={Boolean(q)} conAlumnos={conAlumnos} onVerDetalle={onVerDetalle} />;
}
