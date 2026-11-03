// Los cursos de la escuela como una tabla de gestión (como en cualquier sistema
// administrativo): indicadores arriba que también filtran, buscador, filtros por
// año, turno y estado del cupo, y una fila por curso. Tocar una fila abre UN
// detalle a la vez (antes las tarjetas por año se abrían todas y se pisaban).

import { useMemo, useState } from "react";
import type { Curso } from "../../../servicios/perfiles";
import { estadoCupo, ESTADOS_CUPO, iconoTurno, textoCupo, type EstadoCupo } from "../../../servicios/gestionAcademica";
import Selector from "../shared/Selector";

type Filtro = "todos" | "excedido" | "faltan" | "sin-preceptor";

function Indicador({ etiqueta, valor, icono, tono, activo, onClick }: { etiqueta: string; valor: number; icono: string; tono: string; activo?: boolean; onClick?: () => void }) {
  const contenido = <>
    <span className={`material-symbols-outlined grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tono}`} aria-hidden="true">{icono}</span>
    <span className="min-w-0">
      <span className="block text-xl font-semibold leading-tight text-on-surface">{valor}</span>
      <span className="block text-[13px] leading-snug text-on-surface-variant">{etiqueta}</span>
    </span>
  </>;
  const clase = `nx-tarjeta flex items-center gap-3 p-3.5 text-left ${activo ? "ring-2 ring-acento" : ""}`;
  return onClick
    ? <button type="button" className={`${clase} transition-colors hover:bg-surface-container-high`} onClick={onClick} aria-pressed={activo}>{contenido}</button>
    : <div className={clase}>{contenido}</div>;
}

function BarraCupo({ curso }: { curso: Curso }) {
  const estado = estadoCupo(curso);
  const tope = curso.cupoMaximo ?? Math.max(curso.cupoMinimo ?? 0, curso.estudiantes, 1);
  const ancho = Math.min(100, Math.round((curso.estudiantes / Math.max(1, tope)) * 100));
  const color = estado === "excedido" ? "bg-rose-500" : estado === "faltan" ? "bg-amber-500" : estado === "ok" ? "bg-emerald-500" : "bg-outline";
  return (
    <span className="flex min-w-[120px] flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium tabular-nums text-on-surface">{textoCupo(curso)}</span>
        {curso.cupoMinimo != null && curso.cupoMaximo != null && <span className="text-xs text-on-surface-variant">mín. {curso.cupoMinimo}</span>}
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest" aria-hidden="true">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
      </span>
    </span>
  );
}

function EstadoCupoChip({ estado }: { estado: EstadoCupo }) {
  const e = ESTADOS_CUPO[estado];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}><span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">{e.icono}</span>{e.etiqueta}</span>;
}

const nombreAnio = (anio: number) => `${anio}° año`;

export default function TablaCursos({ cursos, conAlumnos, onVerDetalle, onNuevo }: { cursos: Curso[]; conAlumnos: boolean; onVerDetalle: (id: string) => void; onNuevo: () => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState<number | "todos">("todos");
  const [turno, setTurno] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const anios = useMemo(() => [...new Set(cursos.map((c) => c.anio))].sort((a, b) => a - b), [cursos]);
  const turnos = useMemo(() => [...new Map(cursos.filter((c) => c.turno).map((c) => [c.turno!.id, c.turno!])).values()], [cursos]);
  const conteo = useMemo(() => ({
    estudiantes: cursos.reduce((n, c) => n + c.estudiantes, 0),
    excedido: cursos.filter((c) => estadoCupo(c) === "excedido").length,
    faltan: cursos.filter((c) => estadoCupo(c) === "faltan").length,
    sinPreceptor: cursos.filter((c) => c.preceptor === null).length,
  }), [cursos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cursos.filter((c) => {
      if (anio !== "todos" && c.anio !== anio) return false;
      if (turno && c.turno?.id !== turno) return false;
      if (filtro === "excedido" && estadoCupo(c) !== "excedido") return false;
      if (filtro === "faltan" && estadoCupo(c) !== "faltan") return false;
      if (filtro === "sin-preceptor" && c.preceptor !== null) return false;
      if (!q) return true;
      return [`${c.anio}°${c.division}`, `${c.anio} ${c.division}`, c.preceptor ?? "sin preceptor", c.especialidad?.nombre ?? "", c.aula ?? ""].some((t) => t.toLowerCase().includes(q));
    });
  }, [cursos, busqueda, anio, turno, filtro]);
  const porAnio = useMemo(() => {
    const grupos = new Map<number, Curso[]>();
    for (const c of visibles) grupos.set(c.anio, [...(grupos.get(c.anio) ?? []), c]);
    return [...grupos].sort(([a], [b]) => a - b).map(([a, lista]) => [a, lista.sort((x, y) => x.division.localeCompare(y.division, "es", { numeric: true }))] as const);
  }, [visibles]);
  const alternar = (f: Filtro) => setFiltro((actual) => (actual === f ? "todos" : f));

  return (
    <div className="flex flex-col gap-5">
      <div className={`grid gap-3 ${conAlumnos ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-3"}`}>
        <Indicador etiqueta="Cursos" valor={cursos.length} icono="school" tono="bg-primary/10 text-primary" activo={filtro === "todos"} onClick={() => setFiltro("todos")} />
        {conAlumnos && <Indicador etiqueta="Estudiantes" valor={conteo.estudiantes} icono="groups" tono="bg-sky-500/10 text-sky-300" />}
        {conAlumnos && <Indicador etiqueta="Excedidos" valor={conteo.excedido} icono="arrow_upward" tono="bg-rose-500/10 text-rose-300" activo={filtro === "excedido"} onClick={() => alternar("excedido")} />}
        {conAlumnos && <Indicador etiqueta="Debajo del mínimo" valor={conteo.faltan} icono="arrow_downward" tono="bg-amber-500/15 text-amber-300" activo={filtro === "faltan"} onClick={() => alternar("faltan")} />}
        <Indicador etiqueta="Sin preceptor" valor={conteo.sinPreceptor} icono="person_off" tono="bg-white/5 text-on-surface-variant" activo={filtro === "sin-preceptor"} onClick={() => alternar("sin-preceptor")} />
      </div>

      <div className="nx-tarjeta overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-linea p-3">
          <label className="relative min-w-[200px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: 19 }} aria-hidden="true">search</span>
            <input className="nx-campo pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar curso, preceptor, especialidad o aula" aria-label="Buscar cursos" />
          </label>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por año">
            {(["todos", ...anios] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAnio(a)} aria-pressed={anio === a}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${anio === a ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-white/5"}`}>
                {a === "todos" ? "Todos" : `${a}°`}
              </button>
            ))}
          </div>
          {turnos.length > 1 && (
            <Selector aria-label="Filtrar por turno" value={turno} onChange={(e) => setTurno(e.target.value)} className="nx-campo w-auto min-w-[150px]">
              <option value="">Todos los turnos</option>
              {turnos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Selector>
          )}
        </div>

        {visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }} aria-hidden="true">{cursos.length ? "search_off" : "school"}</span>
            <p className="font-medium text-on-surface">{cursos.length ? "Ningún curso coincide con los filtros" : "Todavía no hay cursos"}</p>
            {!cursos.length && <button type="button" className="nx-btn nx-btn-primario mt-2" onClick={onNuevo}><span className="material-symbols-outlined" aria-hidden="true">add</span>Crear el primer curso</button>}
          </div>
        ) : (
          <>
            {/* Computadora y tablet: tabla. */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Curso</th>
                  <th scope="col" className="px-4 py-2.5">Turno</th>
                  <th scope="col" className="hidden px-4 py-2.5 lg:table-cell">Especialidad</th>
                  <th scope="col" className="px-4 py-2.5">Preceptor</th>
                  {conAlumnos && <th scope="col" className="px-4 py-2.5">Estudiantes</th>}
                  {conAlumnos && <th scope="col" className="hidden px-4 py-2.5 xl:table-cell">Estado del cupo</th>}
                  {conAlumnos && <th scope="col" className="hidden px-4 py-2.5 lg:table-cell">Materias</th>}
                  <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              {porAnio.map(([a, lista]) => (
                <tbody key={a} className="divide-y divide-white/5">
                  <tr className="bg-surface-container-low"><th colSpan={8} scope="rowgroup" className="px-4 pb-1.5 pt-4 text-[13px] font-semibold text-on-surface">{nombreAnio(a)} <span className="font-normal text-on-surface-variant">· {lista.length} {lista.length === 1 ? "curso" : "cursos"}</span></th></tr>
                  {lista.map((c) => (
                    <tr key={c.id} onClick={() => onVerDetalle(c.id)} className="cursor-pointer border-t border-linea transition-colors hover:bg-surface-container-high">
                      <td className="px-4 py-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onVerDetalle(c.id); }} className="text-left font-semibold text-on-surface hover:underline">{c.anio}° {c.division}</button>
                        {c.aula && <span className="block text-xs text-on-surface-variant">{c.aula}</span>}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{c.turno ? <span className="inline-flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: 17 }} aria-hidden="true">{iconoTurno(c.turno.nombre)}</span>{c.turno.nombre}</span> : <span className="text-amber-300">Sin turno</span>}</td>
                      <td className="hidden px-4 py-3 text-on-surface-variant lg:table-cell">{c.especialidad?.nombre ?? "—"}</td>
                      <td className="px-4 py-3">{c.preceptor ?? <span className="inline-flex items-center gap-1 font-medium text-rose-300"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">person_off</span>Sin preceptor</span>}</td>
                      {conAlumnos && <td className="px-4 py-3"><BarraCupo curso={c} /></td>}
                      {conAlumnos && <td className="hidden px-4 py-3 xl:table-cell"><EstadoCupoChip estado={estadoCupo(c)} /></td>}
                      {conAlumnos && <td className="hidden px-4 py-3 tabular-nums text-on-surface-variant lg:table-cell">{c.materias}</td>}
                      <td className="px-2 py-3 text-on-surface-variant"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>

            {/* Celular: una fila por curso. */}
            <ul className="divide-y divide-white/5 md:hidden">
              {porAnio.map(([a, lista]) => (
                <li key={a}>
                  <p className="bg-surface-container-low px-4 pb-1.5 pt-3 text-[13px] font-semibold text-on-surface">{nombreAnio(a)}</p>
                  <ul>
                    {lista.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => onVerDetalle(c.id)} className="flex w-full items-center gap-3 border-t border-linea px-4 py-3 text-left">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 font-semibold text-primary">{c.anio}°{c.division}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-on-surface">{c.preceptor ?? "Sin preceptor"}</span>
                            <span className="block text-[13px] text-on-surface-variant">{[c.turno?.nombre, c.especialidad?.nombre, c.aula].filter(Boolean).join(" · ") || "Sin turno"}</span>
                            {conAlumnos && <span className="mt-1.5 flex flex-wrap items-center gap-2"><span className="text-[13px] tabular-nums">{textoCupo(c)} estudiantes</span><EstadoCupoChip estado={estadoCupo(c)} /></span>}
                          </span>
                          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
