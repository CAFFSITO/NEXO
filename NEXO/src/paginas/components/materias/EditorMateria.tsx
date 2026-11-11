// Crear o editar una materia, con todos sus detalles:
//   1. Datos: nombre, año (o todos los años), área y horas por semana.
//   2. Profesores que la dan: de todos los profesores de la escuela, se eligen
//      los que corresponden (por ejemplo, 10 de 60).
//   3. Programa (opcional): descripción, objetivos, evaluación y bibliografía.
//   4. Temario (opcional): unidades con sus contenidos, de referencia para los
//      profesores (lo ven al entrar a su materia).

import { useEffect, useMemo, useRef, useState } from "react";
import { borrarMateria, crearMateria, editarMateria, nombreMateria, type CatalogoMaterias, type DatosMateria, type Materia } from "../../../servicios/materias";
import DialogoConfirmar from "../shared/DialogoConfirmar";
import ElegirProfesores from "./ElegirProfesores";
import EditorTemario from "./EditorTemario";
import { nuevaClave, type UnidadEditable } from "./temario";

interface Props {
  /** null = materia nueva. */
  materia: Materia | null;
  catalogo: CatalogoMaterias;
  soloLectura: boolean;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

interface Formulario {
  nombre: string;
  anio: number | null;
  area: string;
  horas: string;
  descripcion: string;
  objetivos: string;
  evaluacion: string;
  bibliografia: string;
  profesorIds: string[];
  temario: UnidadEditable[];
}

function formularioDe(m: Materia | null): Formulario {
  return {
    nombre: m?.nombre ?? "",
    anio: m?.anio ?? null,
    area: m?.area ?? "",
    horas: m?.horasSemanales == null ? "" : String(m.horasSemanales),
    descripcion: m?.descripcion ?? "",
    objetivos: m?.objetivos ?? "",
    evaluacion: m?.evaluacion ?? "",
    bibliografia: m?.bibliografia ?? "",
    profesorIds: m?.profesores.map((p) => p.id) ?? [],
    temario: (m?.temario ?? []).map((u) => ({ clave: nuevaClave(), id: u.id, titulo: u.titulo, contenidos: u.contenidos })),
  };
}
/** Para saber si hay cambios sin guardar (sin contar las claves internas del temario). */
const huella = (f: Formulario) => JSON.stringify({ ...f, temario: f.temario.map(({ id, titulo, contenidos }) => [id ?? "", titulo, contenidos]) });

const PROGRAMA = [
  { clave: "descripcion", titulo: "Descripción o fundamentación", ayuda: "De qué trata la materia y por qué se enseña.", filas: 4 },
  { clave: "objetivos", titulo: "Objetivos", ayuda: "Qué se espera que los estudiantes logren.", filas: 4 },
  { clave: "evaluacion", titulo: "Criterios de evaluación", ayuda: "Cómo se evalúa: trabajos, exámenes, participación…", filas: 3 },
  { clave: "bibliografia", titulo: "Bibliografía y materiales", ayuda: "Libros, apuntes o recursos de referencia.", filas: 3 },
] as const;

export default function EditorMateria({ materia, catalogo, soloLectura, onCerrar, onGuardado }: Props) {
  const inicial = useMemo(() => formularioDe(materia), [materia]);
  const [f, setF] = useState<Formulario>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [programaAbierto, setProgramaAbierto] = useState(() => PROGRAMA.some((p) => inicial[p.clave].trim() !== ""));
  const [confirmar, setConfirmar] = useState<null | "salir" | "borrar">(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const cambiar = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) => { setF((actual) => ({ ...actual, [clave]: valor })); setError(""); };
  const hayCambios = huella(f) !== huella(inicial);

  const anios = useMemo(() => {
    const lista = Array.from({ length: Math.max(0, catalogo.anios.max - catalogo.anios.min + 1) }, (_, i) => catalogo.anios.min + i);
    if (materia?.anio != null && !lista.includes(materia.anio)) lista.push(materia.anio);
    return lista.sort((a, b) => a - b);
  }, [catalogo.anios, materia]);
  const sugerenciasArea = useMemo(() => {
    const escrito = f.area.trim().toLocaleLowerCase("es");
    return catalogo.areas.filter((a) => a.toLocaleLowerCase("es") !== escrito && (!escrito || a.toLocaleLowerCase("es").includes(escrito))).slice(0, 6);
  }, [catalogo.areas, f.area]);
  // Quien da la materia en un curso no se puede sacar de la lista (primero hay
  // que quitarla o cambiarle el profesor en ese curso).
  const bloqueados = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const c of materia?.cursos ?? []) mapa.set(c.profesorId, [...(mapa.get(c.profesorId) ?? []), c.curso]);
    return mapa;
  }, [materia]);

  const intentarCerrar = () => {
    // Con un cartel de confirmación abierto, Escape lo cierra a él y nada más.
    if (guardando || confirmar) return;
    if (hayCambios && !soloLectura) setConfirmar("salir");
    else onCerrar();
  };
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) intentarCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || soloLectura) return;
    const nombre = f.nombre.replace(/\s+/g, " ").trim();
    if (!nombre) { setError("Escribí el nombre de la materia."); nombreRef.current?.focus(); return; }
    const sinTitulo = f.temario.findIndex((u) => !u.titulo.trim());
    if (sinTitulo >= 0) { setError(`Ponele un título a la unidad ${sinTitulo + 1} del temario (o quitala).`); return; }
    const horas = f.horas.trim() === "" ? null : Number(f.horas);
    if (horas !== null && (!Number.isInteger(horas) || horas < 1 || horas > 40)) { setError("Las horas por semana van de 1 a 40 (o dejalas vacías)."); return; }
    const datos: DatosMateria = {
      nombre, anio: f.anio, area: f.area.trim(), horasSemanales: horas,
      descripcion: f.descripcion, objetivos: f.objetivos, evaluacion: f.evaluacion, bibliografia: f.bibliografia,
      profesorIds: f.profesorIds,
      temario: f.temario.map((u) => ({ ...(u.id ? { id: u.id } : {}), titulo: u.titulo.trim(), contenidos: u.contenidos })),
    };
    setGuardando(true);
    setError("");
    try {
      if (materia) {
        await editarMateria(materia.id, datos);
        onGuardado(`Listo: se guardaron los cambios de ${nombreMateria({ nombre, anio: f.anio })}.`);
      } else {
        await crearMateria(datos);
        onGuardado(`Listo: se creó ${nombreMateria({ nombre, anio: f.anio })}${datos.profesorIds.length ? ` con ${datos.profesorIds.length === 1 ? "1 profesor" : `${datos.profesorIds.length} profesores`}` : ""}.`);
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar la materia.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!materia) return;
    try {
      await borrarMateria(materia.id);
      onGuardado(`Se borró ${nombreMateria(materia)}.`);
    } catch (fallo) {
      setConfirmar(null);
      setError(fallo instanceof Error ? fallo.message : "No se pudo borrar la materia.");
    }
  };

  const etiqueta = "block text-sm font-medium text-on-surface";
  const opcional = <span className="font-normal text-on-surface-variant">(opcional)</span>;
  const titulo = materia ? nombreMateria(materia) : "Nueva materia";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-0 sm:p-4" onClick={intentarCerrar}>
      <form role="dialog" aria-modal="true" aria-labelledby="editor-materia-titulo" onSubmit={guardar} onClick={(e) => e.stopPropagation()}
        className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-surface-container-low shadow-xl sm:h-auto sm:max-h-[94dvh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7">
          <div className="min-w-0">
            <h2 id="editor-materia-titulo" className="text-xl font-semibold text-on-surface">{titulo}</h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {soloLectura ? "Solo lectura." : "Solo el nombre es obligatorio. Lo demás lo podés completar ahora o más adelante."}
            </p>
          </div>
          <button type="button" onClick={intentarCerrar} disabled={guardando} aria-label="Cerrar" className="nexo-icon-button"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-7">
        <fieldset disabled={soloLectura || guardando} className="m-0 min-w-0 border-0 p-0">
          <div className="flex flex-col gap-8">
            {/* ── 1. Datos ── */}
            <section aria-labelledby="materia-datos" className="flex flex-col gap-4">
              <h3 id="materia-datos" className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Datos de la materia</h3>
              <label className={etiqueta}>Nombre de la materia
                <input ref={nombreRef} autoFocus={!materia} required maxLength={100} value={f.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className="nx-campo mt-1.5 text-base" placeholder="Ej.: Matemática y Ciencias Políticas" />
              </label>
              <div>
                <p className={etiqueta}>¿Para qué año es?</p>
                <p className="mt-0.5 text-[13px] text-on-surface-variant">Si se da igual en varios años, elegí "Todos los años".</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Año de la materia">
                  {[null, ...anios].map((a) => {
                    const elegido = f.anio === a;
                    return <button key={a ?? "todos"} type="button" role="radio" aria-checked={elegido} onClick={() => cambiar("anio", a)}
                      className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${elegido ? "bg-acento text-white" : "bg-surface-container text-on-surface hover:bg-surface-container-high"}`}>
                      {a === null ? "Todos los años" : `${a}°`}
                    </button>;
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div>
                  <label className={etiqueta}>Área o departamento {opcional}
                    <input maxLength={60} value={f.area} onChange={(e) => cambiar("area", e.target.value)} className="nx-campo mt-1.5" placeholder="Ej.: Ciencias exactas" />
                  </label>
                  {sugerenciasArea.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Áreas que ya usa la escuela">
                    {sugerenciasArea.map((a) => <button key={a} type="button" onClick={() => cambiar("area", a)} className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">{a}</button>)}
                  </div>}
                </div>
                <label className={etiqueta}>Horas por semana {opcional}
                  <input type="number" min={1} max={40} inputMode="numeric" value={f.horas} onChange={(e) => cambiar("horas", e.target.value)} className="nx-campo mt-1.5" placeholder="Ej.: 4" />
                </label>
              </div>
            </section>

            {/* ── 2. Profesores ── */}
            <section aria-labelledby="materia-profesores" className="flex flex-col gap-3">
              <div>
                <h3 id="materia-profesores" className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Profesores que la dan</h3>
                <p className="mt-1 text-[13px] text-on-surface-variant">Marcá a todos los que dan esta materia. En Cursos vas a elegir cuál de ellos la da en cada curso.</p>
              </div>
              <ElegirProfesores
                profesores={catalogo.profesores}
                vinculados={materia?.profesores ?? []}
                elegidos={f.profesorIds}
                bloqueados={bloqueados}
                onCambiar={(ids) => cambiar("profesorIds", ids)}
              />
            </section>

            {/* Dónde se da hoy (solo al editar). */}
            {materia && materia.cursos.length > 0 && <section aria-labelledby="materia-cursos" className="flex flex-col gap-2">
              <h3 id="materia-cursos" className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Dónde se da · {materia.cursos.length} {materia.cursos.length === 1 ? "curso" : "cursos"}</h3>
              <ul className="flex flex-wrap gap-2">
                {materia.cursos.map((c) => <li key={c.catedraId} className="rounded-lg bg-surface-container px-3 py-2 text-sm"><span className="font-semibold text-on-surface">{c.curso}</span><span className="text-on-surface-variant"> · {c.profesor}</span></li>)}
              </ul>
              <p className="text-[13px] text-on-surface-variant">Esto se cambia desde Cursos. Mientras se dé en algún curso, la materia no se puede borrar.</p>
            </section>}

            {/* ── 3. Programa ── */}
            <section aria-labelledby="materia-programa" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="materia-programa" className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Programa {opcional}</h3>
                  <p className="mt-1 text-[13px] text-on-surface-variant">Descripción, objetivos, evaluación y bibliografía.</p>
                </div>
                <button type="button" onClick={() => setProgramaAbierto((a) => !a)} aria-expanded={programaAbierto} className="nx-btn nx-btn-secundario">
                  <span className="material-symbols-outlined" aria-hidden="true">{programaAbierto ? "expand_less" : "edit_note"}</span>
                  {programaAbierto ? "Ocultar el programa" : "Completar el programa"}
                </button>
              </div>
              {programaAbierto && <div className="flex flex-col gap-4">
                {PROGRAMA.map((p) => (
                  <label key={p.clave} className={etiqueta}>{p.titulo}
                    <span className="block text-[13px] font-normal text-on-surface-variant">{p.ayuda}</span>
                    <textarea rows={p.filas} maxLength={4000} value={f[p.clave]} onChange={(e) => cambiar(p.clave, e.target.value)}
                      className="nx-campo mt-1.5 h-auto py-2.5 leading-relaxed" />
                  </label>
                ))}
              </div>}
            </section>

            {/* ── 4. Temario ── */}
            <section aria-labelledby="materia-temario" className="flex flex-col gap-3">
              <div>
                <h3 id="materia-temario" className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Temario {opcional}</h3>
                <p className="mt-1 text-[13px] text-on-surface-variant">Sirve de referencia para los profesores: lo ven al entrar a la materia. Podés dejarlo vacío.</p>
              </div>
              <EditorTemario unidades={f.temario} onCambiar={(u) => cambiar("temario", u)} soloLectura={soloLectura} />
            </section>
          </div>
        </fieldset>
        </div>

        {error && <p role="alert" className="mx-5 mb-3 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container sm:mx-7">{error}</p>}

        <footer className="flex flex-wrap items-center justify-between gap-2 bg-surface-container px-5 py-3 sm:px-7">
          <div>
            {materia && !soloLectura && materia.cursos.length === 0 && (
              <button type="button" disabled={guardando} onClick={() => setConfirmar("borrar")} className="nx-btn nx-btn-peligro">
                <span className="material-symbols-outlined" aria-hidden="true">delete</span>Borrar materia
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={guardando} onClick={intentarCerrar} className="nx-btn nx-btn-secundario">{soloLectura ? "Cerrar" : "Cancelar"}</button>
            {!soloLectura && <button type="submit" disabled={guardando || !f.nombre.trim()} className="nx-btn nx-btn-primario">
              {guardando ? "Guardando…" : materia ? "Guardar cambios" : "Crear materia"}
            </button>}
          </div>
        </footer>
      </form>

      {confirmar === "salir" && <DialogoConfirmar titulo="¿Salir sin guardar?" textoConfirmar="Sí, salir sin guardar" tono="peligro" icono="edit_off"
        onConfirmar={onCerrar} onCancelar={() => setConfirmar(null)}>
        Hiciste cambios en esta materia que todavía no se guardaron. Si salís ahora, se pierden.
      </DialogoConfirmar>}
      {confirmar === "borrar" && materia && <DialogoConfirmar titulo={`¿Borrar ${nombreMateria(materia)}?`} textoConfirmar="Sí, borrar la materia" tono="peligro" icono="delete"
        onConfirmar={borrar} onCancelar={() => setConfirmar(null)}>
        Se borran la materia, su programa y su temario. No se puede deshacer. No se da en ningún curso, así que ningún estudiante pierde nada.
      </DialogoConfirmar>}
    </div>
  );
}
