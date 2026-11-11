// Materias de la escuela (sección Materias de la dirección) y el buscador de
// "materia — profesor" que se usa en Cursos.
import { enviar, useDatos } from "./api";

export interface UnidadTemario { id?: string; numero?: number; titulo: string; contenidos: string }
export interface ProfesorDeMateria { id: string; nombre: string; activo: boolean }
export interface CursoDeMateria { catedraId: string; cursoId: string; curso: string; anio: number; profesorId: string; profesor: string }
export interface Materia {
  id: string;
  nombre: string;
  anio: number | null;
  area: string | null;
  horasSemanales: number | null;
  descripcion: string;
  objetivos: string;
  evaluacion: string;
  bibliografia: string;
  temario: UnidadTemario[];
  profesores: ProfesorDeMateria[];
  cursos: CursoDeMateria[];
}
export interface CatalogoMaterias {
  materias: Materia[];
  /** Todos los profesores activos de la escuela (para elegir quién da cada materia). */
  profesores: { id: string; nombre: string; email: string }[];
  areas: string[];
  anios: { min: number; max: number };
}
/** Lo que se manda al crear o editar. */
export interface DatosMateria {
  nombre: string;
  anio: number | null;
  area: string;
  horasSemanales: number | null;
  descripcion: string;
  objetivos: string;
  evaluacion: string;
  bibliografia: string;
  profesorIds: string[];
  temario: { id?: string; titulo: string; contenidos: string }[];
}

export function useCatalogoMaterias() {
  return useDatos<CatalogoMaterias>("/api/gestion-academica/materias");
}
export function crearMateria(datos: DatosMateria) {
  return enviar<{ id: string; nombre: string }>("/api/materias", "POST", datos);
}
export function editarMateria(id: string, datos: Partial<DatosMateria>) {
  return enviar(`/api/materias/${id}`, "PUT", datos);
}
export function borrarMateria(id: string) {
  return enviar(`/api/materias/${id}`, "DELETE");
}
/** Saca una materia de un curso (si ya tiene tareas o clases, el servidor no deja y explica por qué). */
export function quitarCatedra(cursoId: string, catedraId: string) {
  return enviar(`/api/cursos/${cursoId}/catedras/${catedraId}`, "DELETE");
}

/** "Matemática · 1° año" o "Matemática". */
export const nombreMateria = (m: { nombre: string; anio: number | null }) => (m.anio ? `${m.nombre} · ${m.anio}° año` : m.nombre);

// ── Buscador inteligente ────────────────────────────────
// Sin acentos ni mayúsculas: "matem" encuentra "Matemáticas", "vivi" a Viviana.
export const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();

/** Una opción del buscador de Cursos: una materia con UNO de sus profesores. */
export interface OpcionMateria {
  clave: string;
  materia: Materia;
  profesor: ProfesorDeMateria;
}

/**
 * Busca "materia — profesor" por el nombre de la materia, del profesor o del
 * área (o una mezcla: "mate garcia"). Cada palabra escrita tiene que aparecer
 * en algún lado. Primero lo que empieza igual que lo escrito y las materias del
 * año del curso; los profesores inactivos no se ofrecen.
 */
export function buscarOpciones(materias: Materia[], consulta: string, anioCurso?: number, limite = 40): OpcionMateria[] {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  const resultados: { opcion: OpcionMateria; puntaje: number }[] = [];
  for (const materia of materias) {
    const nMateria = normalizar(materia.nombre);
    const nArea = normalizar(materia.area ?? "");
    for (const profesor of materia.profesores) {
      if (!profesor.activo) continue;
      const nProfesor = normalizar(profesor.nombre);
      const todo = `${nMateria} ${nProfesor} ${nArea}`;
      if (!palabras.every((p) => todo.includes(p))) continue;
      const inicioDePalabra = (texto: string, p: string) => texto.startsWith(p) || texto.includes(` ${p}`);
      let puntaje = 0;
      for (const p of palabras) {
        if (nMateria.startsWith(p)) puntaje += 6;
        else if (inicioDePalabra(nMateria, p)) puntaje += 4;
        else if (inicioDePalabra(nProfesor, p)) puntaje += 3;
        else puntaje += 1;
      }
      // Las materias del año del curso (o de todos los años) van primero.
      if (anioCurso != null && (materia.anio === anioCurso || materia.anio === null)) puntaje += 2;
      resultados.push({ opcion: { clave: `${materia.id}:${profesor.id}`, materia, profesor }, puntaje });
    }
  }
  return resultados
    .sort((a, b) => b.puntaje - a.puntaje
      || a.opcion.materia.nombre.localeCompare(b.opcion.materia.nombre, "es")
      || (a.opcion.materia.anio ?? 0) - (b.opcion.materia.anio ?? 0)
      || a.opcion.profesor.nombre.localeCompare(b.opcion.profesor.nombre, "es"))
    .slice(0, limite)
    .map((r) => r.opcion);
}

/** Materias que coinciden con lo escrito pero todavía no tienen profesores (para avisar). */
export function materiasSinProfesores(materias: Materia[], consulta: string): Materia[] {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  return materias.filter((m) => !m.profesores.some((p) => p.activo)
    && palabras.every((p) => `${normalizar(m.nombre)} ${normalizar(m.area ?? "")}`.includes(p)));
}

// ── Abrir Materias ya filtrada ──────────────────────────
// Desde otra pantalla (por ejemplo, el perfil de un profesor en Perfiles) se
// puede pedir que Materias se abra con la búsqueda ya escrita.
let busquedaPedida = "";
export function pedirBusquedaMaterias(texto: string): void { busquedaPedida = texto; }
export function leerBusquedaPedida(): string { return busquedaPedida; }
export function olvidarBusquedaPedida(): void { busquedaPedida = ""; }

/** Los años en que ya existe una materia con ese nombre (sin contar `sinContar`). */
export function aniosOcupados(materias: Materia[], nombre: string, sinContar?: string): Set<number | null> {
  const buscado = nombre.replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
  return new Set(materias.filter((m) => m.id !== sinContar && m.nombre.toLocaleLowerCase("es") === buscado).map((m) => m.anio));
}
