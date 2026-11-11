// Las materias de un curso, dentro de "Organizar curso".
//
// Un solo buscador: se escribe parte de una materia o de un profesor ("matem",
// "vivi") y aparecen al instante todas las opciones "materia — profesor" que
// existen (las que se cargaron en la sección Materias). Se toca la que va y
// queda en el curso; abajo se ve la lista de lo que ya tiene el curso, con la
// opción de quitar.

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavegacion } from "../../../navegacion";
import { guardarCatedra } from "../../../servicios/gestionAcademica";
import { buscarOpciones, materiasSinProfesores, nombreMateria, normalizar, quitarCatedra, useCatalogoMaterias, type OpcionMateria } from "../../../servicios/materias";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import DialogoConfirmar from "../shared/DialogoConfirmar";

export interface CatedraDelCurso {
  id: string;
  materiaId: string;
  profesorId: string;
  materia: string;
  materiaAnio?: number | null;
  profesor: string;
}

interface Props {
  curso: { id: string; anio: number; division: string };
  catedras: CatedraDelCurso[];
  /** Después de sumar o quitar: recargar el curso y la lista de cursos. */
  onCambio: () => void;
}

type Pendiente = { tipo: "cambiar"; opcion: OpcionMateria; actual: CatedraDelCurso } | { tipo: "quitar"; catedra: CatedraDelCurso };

export default function MateriasDelCurso({ curso, catedras, onCambio }: Props) {
  const { navegar } = useNavegacion();
  const { datos, cargando, error, recargar } = useCatalogoMaterias();
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState("");
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [reciente, setReciente] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const idLista = useId();
  const nombreCurso = `${curso.anio}° ${curso.division}`;

  const materias = useMemo(() => datos?.materias ?? [], [datos]);
  const opciones = useMemo(() => buscarOpciones(materias, consulta, curso.anio), [materias, consulta, curso.anio]);
  const sinProfesores = useMemo(() => materiasSinProfesores(materias, consulta), [materias, consulta]);
  const palabras = useMemo(() => normalizar(consulta).split(/\s+/).filter(Boolean), [consulta]);
  const ordenadas = useMemo(() => [...catedras].sort((a, b) => a.materia.localeCompare(b.materia, "es")), [catedras]);
  const indice = Math.min(activo, Math.max(0, opciones.length - 1));

  const estadoDe = (o: OpcionMateria) => {
    const enCurso = catedras.find((c) => c.materiaId === o.materia.id);
    if (!enCurso) return { tipo: "nueva" as const };
    if (enCurso.profesorId === o.profesor.id) return { tipo: "ya" as const };
    return { tipo: "otra" as const, actual: enCurso };
  };

  const asignar = async (o: OpcionMateria) => {
    if (trabajando) return;
    setTrabajando(o.clave); setFallo(""); setAviso("");
    try {
      const r = await guardarCatedra(curso.id, o.materia.id, o.profesor.id);
      setAviso(r.reemplazo
        ? `Listo: ahora ${nombreMateria(o.materia)} la da ${o.profesor.nombre} en ${nombreCurso} (antes, ${r.reemplazo}).`
        : `Listo: ${nombreMateria(o.materia)} con ${o.profesor.nombre} quedó en ${nombreCurso}.`);
      setReciente(o.materia.id);
      onCambio();
      entrada.current?.focus();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo sumar la materia.");
    } finally {
      setTrabajando(null);
    }
  };
  const elegir = (o: OpcionMateria) => {
    const estado = estadoDe(o);
    if (estado.tipo === "ya") { setAviso(`${nombreMateria(o.materia)} con ${o.profesor.nombre} ya está en ${nombreCurso}.`); return; }
    if (estado.tipo === "otra") { setPendiente({ tipo: "cambiar", opcion: o, actual: estado.actual }); return; }
    void asignar(o);
  };
  const quitar = async (c: CatedraDelCurso) => {
    setFallo(""); setAviso("");
    try {
      await quitarCatedra(curso.id, c.id);
      setPendiente(null);
      setAviso(`Se quitó ${nombreMateria({ nombre: c.materia, anio: c.materiaAnio ?? null })} de ${nombreCurso}.`);
      onCambio();
    } catch (e) {
      setPendiente(null);
      setFallo(e instanceof Error ? e.message : "No se pudo quitar la materia.");
    }
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo(Math.min(indice + 1, opciones.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(Math.max(indice - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (opciones[indice]) elegir(opciones[indice]); }
    else if (e.key === "Escape" && consulta) { e.preventDefault(); e.stopPropagation(); setConsulta(""); }
  };

  const irAMaterias = <button type="button" className="font-semibold text-primary hover:underline" onClick={() => navegar("/admin/materias")}>Materias</button>;

  return (
    <section aria-labelledby="materias-curso-titulo">
      <h3 id="materias-curso-titulo" className="mb-1 font-bold text-on-surface">Materias y profesores del curso</h3>
      <p className="mb-3 text-sm text-on-surface-variant">
        Escribí el nombre de una materia o de un profesor y tocá la opción que corresponde a {nombreCurso}. Podés sumar todas las que necesites.
      </p>

      {cargando && !datos ? <Cargando que="las materias" /> : error ? <Fallo error={error} onReintentar={recargar} /> : (
        <>
          {materias.length === 0 ? (
            <p className="rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Todavía no hay materias creadas. Primero creálas (con sus profesores) en la sección {irAMaterias}; después volvé a este curso.
            </p>
          ) : (
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-5.5 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">search</span>
              <input
                ref={entrada}
                role="combobox"
                aria-expanded={opciones.length > 0}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={opciones[indice] ? `${idLista}-${indice}` : undefined}
                aria-label={`Buscar materia o profesor para ${nombreCurso}`}
                value={consulta}
                onChange={(e) => { setConsulta(e.target.value); setActivo(0); setAviso(""); setFallo(""); }}
                onKeyDown={alTeclear}
                className="nx-campo h-11 pl-10 pr-10 text-base"
                placeholder="Buscar materia o profesor (ej.: matem, Viviana)"
                autoComplete="off"
              />
              {consulta && <button type="button" onClick={() => { setConsulta(""); entrada.current?.focus(); }} aria-label="Borrar la búsqueda"
                className="absolute right-1.5 top-5.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-on-surface-variant hover:bg-white/5">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">close</span>
              </button>}

              {consulta.trim() && <div className="mt-2 rounded-xl bg-surface-container p-1.5">
                {opciones.length > 0 && <>
                  <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-on-surface-variant">
                    {opciones.length === 1 ? "1 opción" : `${opciones.length} opciones`} · tocá la que va en {nombreCurso}
                  </p>
                  <ul id={idLista} role="listbox" aria-label="Materias y profesores encontrados" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {opciones.map((o, i) => {
                      const estado = estadoDe(o);
                      const enfocada = i === indice;
                      return <li key={o.clave} id={`${idLista}-${i}`} role="option" aria-selected={enfocada}>
                        <button type="button" tabIndex={-1} disabled={Boolean(trabajando)} onMouseEnter={() => setActivo(i)} onClick={() => elegir(o)}
                          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors ${enfocada ? "bg-surface-container-high" : "hover:bg-surface-container-high"} ${estado.tipo === "ya" ? "opacity-70" : ""}`}>
                          <span className="material-symbols-outlined grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" style={{ fontSize: 20 }} aria-hidden="true">menu_book</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-on-surface">
                              <Resaltado texto={o.materia.nombre} palabras={palabras} />
                              {o.materia.anio && <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.materia.anio === curso.anio ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-on-surface-variant"}`}>{o.materia.anio}° año</span>}
                            </span>
                            <span className="block text-[13px] text-on-surface-variant">— <Resaltado texto={o.profesor.nombre} palabras={palabras} /></span>
                          </span>
                          <EtiquetaEstado estado={estado} cargando={trabajando === o.clave} />
                        </button>
                      </li>;
                    })}
                  </ul>
                </>}
                {sinProfesores.length > 0 && <p className="px-2.5 py-2 text-[13px] text-amber-300">
                  {sinProfesores.slice(0, 3).map((m) => nombreMateria(m)).join(", ")}{sinProfesores.length > 3 ? " y otras" : ""} {sinProfesores.length === 1 ? "todavía no tiene" : "todavía no tienen"} profesores: sumalos en {irAMaterias}.
                </p>}
                {opciones.length === 0 && sinProfesores.length === 0 && <p className="px-2.5 py-3 text-sm text-on-surface-variant">
                  No hay ninguna materia ni profesor con «{consulta.trim()}». Si falta la materia, creala en {irAMaterias}.
                </p>}
              </div>}
            </div>
          )}

          {aviso && <p role="status" className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{aviso}</p>}
          {fallo && <p role="alert" className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{fallo}</p>}

          {/* Lo que ya tiene el curso */}
          <h4 className="mb-2 mt-5 text-sm font-semibold text-on-surface">Ya en {nombreCurso} · {catedras.length} {catedras.length === 1 ? "materia" : "materias"}</h4>
          {ordenadas.length === 0 ? (
            <p className="rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">Todavía no tiene materias. Buscalas arriba y tocá la que corresponde.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {ordenadas.map((c) => (
                <li key={c.id} className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${reciente === c.materiaId ? "bg-emerald-500/10" : "bg-surface-container"}`}>
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }} aria-hidden="true">menu_book</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-on-surface">{nombreMateria({ nombre: c.materia, anio: c.materiaAnio ?? null })}</span>
                    <span className="block text-[13px] text-on-surface-variant">{c.profesor}</span>
                  </span>
                  <button type="button" onClick={() => { setAviso(""); setFallo(""); setPendiente({ tipo: "quitar", catedra: c }); }} className="nx-btn nx-btn-fantasma nx-btn-chico">
                    <span className="material-symbols-outlined" aria-hidden="true">remove_circle</span>Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {pendiente?.tipo === "cambiar" && <DialogoConfirmar titulo={`¿Cambiar el profesor de ${nombreMateria(pendiente.opcion.materia)} en ${nombreCurso}?`}
        textoConfirmar={`Sí, que la dé ${pendiente.opcion.profesor.nombre}`} icono="swap_horiz"
        onConfirmar={async () => { const o = pendiente.opcion; setPendiente(null); await asignar(o); }} onCancelar={() => setPendiente(null)}>
        Hoy la da {pendiente.actual.profesor}. Pasa a darla {pendiente.opcion.profesor.nombre}: las tareas, clases y avisos que la materia ya tiene en este curso quedan a su cargo.
      </DialogoConfirmar>}
      {pendiente?.tipo === "quitar" && <DialogoConfirmar titulo={`¿Quitar ${nombreMateria({ nombre: pendiente.catedra.materia, anio: pendiente.catedra.materiaAnio ?? null })} de ${nombreCurso}?`}
        textoConfirmar="Sí, quitarla del curso" tono="peligro" icono="remove_circle"
        onConfirmar={() => quitar(pendiente.catedra)} onCancelar={() => setPendiente(null)}>
        La materia deja de estar en {nombreCurso} (la da {pendiente.catedra.profesor}). La materia sigue existiendo en la sección Materias. Si ya tiene tareas o clases en este curso, NEXO no la quita, para no perder ese trabajo.
      </DialogoConfirmar>}
    </section>
  );
}

function EtiquetaEstado({ estado, cargando }: { estado: { tipo: "nueva" | "ya" | "otra"; actual?: CatedraDelCurso }; cargando: boolean }) {
  if (cargando) return <span className="shrink-0 text-xs font-semibold text-on-surface-variant">Sumando…</span>;
  if (estado.tipo === "ya") return <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">check_circle</span>Ya está en el curso</span>;
  if (estado.tipo === "otra") return <span className="shrink-0 rounded-lg bg-amber-500/15 px-2.5 py-1 text-right text-xs font-semibold text-amber-300">Cambiar<span className="block font-normal">hoy la da {estado.actual!.profesor}</span></span>;
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-acento px-3 py-1.5 text-xs font-semibold text-white"><span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">add</span>Sumar</span>;
}

/** Marca lo escrito dentro del texto, sin importar acentos ni mayúsculas. */
function Resaltado({ texto, palabras }: { texto: string; palabras: string[] }): ReactNode {
  if (!palabras.length) return texto;
  // Una letra normalizada por cada letra original, para no correr las posiciones.
  const plano = [...texto].map((c) => normalizar(c).charAt(0) || c).join("");
  const marcas = new Array<boolean>(plano.length).fill(false);
  for (const p of palabras) {
    let desde = 0;
    for (let i = plano.indexOf(p, desde); i !== -1; i = plano.indexOf(p, desde)) {
      for (let k = i; k < i + p.length; k++) marcas[k] = true;
      desde = i + p.length;
    }
  }
  const letras = [...texto];
  const partes: ReactNode[] = [];
  let i = 0;
  while (i < letras.length) {
    const marcada = marcas[i];
    let j = i;
    while (j < letras.length && marcas[j] === marcada) j++;
    const trozo = letras.slice(i, j).join("");
    partes.push(marcada ? <mark key={i} className="rounded-sm bg-acento/25 text-inherit">{trozo}</mark> : trozo);
    i = j;
  }
  return <>{partes}</>;
}
