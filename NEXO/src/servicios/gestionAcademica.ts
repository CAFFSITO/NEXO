import { enviar, useDatos } from "./api";

export interface PersonaAcademica { id: string; nombre: string }
/** Un turno o una especialidad de la lista de la escuela: su id y su nombre. */
export interface DatoDeLista { id: string; nombre: string }
export interface OpcionesGestionAcademica {
  preceptores: PersonaAcademica[];
  profesores: PersonaAcademica[];
  estudiantes: (PersonaAcademica & { cursoId: string | null })[];
  familias: PersonaAcademica[];
  materias: PersonaAcademica[];
  cursos: { id: string; anio: number; division: string; turno: DatoDeLista | null; especialidad: DatoDeLista | null }[];
  turnos: DatoDeLista[];
  especialidades: DatoDeLista[];
}
/**
 * Al crear, el turno es obligatorio. Al editar, lo que no se manda (turno,
 * especialidad) queda como estaba: así guardar el preceptor no los toca.
 */
export interface DatosCurso { anio: number; division: string; preceptorId: string | null; turnoId?: string; especialidadId?: string | null; cupoMinimo?: number | null; cupoMaximo?: number | null; aula?: string | null }

// ── Cupo de un curso ─────────────────────────────────────
// Con un mínimo y un máximo de estudiantes, el panel avisa qué cursos están
// excedidos, cuáles tienen menos de lo previsto y cuáles están dentro.
export type EstadoCupo = "excedido" | "faltan" | "ok" | "libre";
export function estadoCupo(c: { estudiantes: number; cupoMinimo: number | null; cupoMaximo: number | null }): EstadoCupo {
  if (c.cupoMaximo != null && c.estudiantes > c.cupoMaximo) return "excedido";
  if (c.cupoMinimo != null && c.estudiantes < c.cupoMinimo) return "faltan";
  if (c.cupoMinimo == null && c.cupoMaximo == null) return "libre";
  return "ok";
}
export const ESTADOS_CUPO: Record<EstadoCupo, { etiqueta: string; icono: string; clase: string }> = {
  excedido: { etiqueta: "Excedido", icono: "arrow_upward", clase: "bg-rose-500/10 text-rose-300" },
  faltan: { etiqueta: "Debajo del mínimo", icono: "arrow_downward", clase: "bg-amber-500/15 text-amber-300" },
  ok: { etiqueta: "Dentro del cupo", icono: "check", clase: "bg-emerald-500/10 text-emerald-300" },
  libre: { etiqueta: "Sin cupo definido", icono: "remove", clase: "bg-white/5 text-on-surface-variant" },
};
/** "24 / 30", "24 (mín. 15)" o "24". */
export function textoCupo(c: { estudiantes: number; cupoMinimo: number | null; cupoMaximo: number | null }): string {
  if (c.cupoMaximo != null) return `${c.estudiantes} / ${c.cupoMaximo}`;
  if (c.cupoMinimo != null) return `${c.estudiantes} (mín. ${c.cupoMinimo})`;
  return String(c.estudiantes);
}
export function useOpcionesGestionAcademica() {
  return useDatos<OpcionesGestionAcademica>("/api/gestion-academica/opciones");
}
export function crearCurso(datos: DatosCurso) {
  return enviar<{ id: string }>("/api/cursos", "POST", datos);
}
export function editarCurso(id: string, datos: DatosCurso) {
  return enviar(`/api/cursos/${id}`, "PUT", datos);
}
export function guardarInscripciones(id: string, estudianteIds: string[]) {
  return enviar(`/api/cursos/${id}/inscripciones`, "PUT", { estudianteIds });
}
/** Suma "materia — profesor" al curso. Si la materia ya estaba con otro profesor, `reemplazo` dice con quién. */
export function guardarCatedra(id: string, materiaId: string, profesorId: string) {
  return enviar<{ id: string; reemplazo: string | null }>(`/api/cursos/${id}/catedras`, "POST", { materiaId, profesorId });
}
/** Suma un turno a la lista de la escuela (por ejemplo "Noche"). */
export function crearTurno(nombre: string) {
  return enviar<DatoDeLista>("/api/cursos/turnos", "POST", { nombre });
}
/** Suma una especialidad a la lista de la escuela. */
export function crearEspecialidad(nombre: string) {
  return enviar<DatoDeLista>("/api/cursos/especialidades", "POST", { nombre });
}

/** El ícono de un turno según su nombre (los propios de cada escuela, un reloj). */
export function iconoTurno(nombre: string): string {
  const n = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (n.includes("manana")) return "light_mode";
  if (n.includes("tarde")) return "wb_twilight";
  if (n.includes("vespertino") || n.includes("noche")) return "nights_stay";
  return "schedule";
}

// Crear y editar materias: servicios/materias.ts (sección Materias).
export function guardarVinculosFamilia(id: string, estudiantes: { id: string; parentesco: string }[]) {
  return enviar(`/api/perfiles/${id}/vinculos`, "PUT", { estudiantes });
}

// ── Cursos agrupados ───────────────────────────────────
// Cada vez que se muestran cursos, van separados por TURNO y, dentro de cada
// turno, por CICLO (básico: 1° a 3°; superior: el resto) y ESPECIALIDAD. Una
// sola regla para todas las pantallas.

/** "basico" (1° a 3°) o "superior" (4° en adelante). */
export const cicloDe = (anio: number): "basico" | "superior" => (anio <= 3 ? "basico" : "superior");
export const NOMBRE_CICLO = { basico: "Ciclo básico", superior: "Ciclo superior" } as const;

export interface SeccionDeCursos<T> { clave: string; titulo: string; cursos: T[] }
export interface GrupoDeTurno<T> { clave: string; turno: DatoDeLista | null; titulo: string; secciones: SeccionDeCursos<T>[] }

/**
 * Agrupa cursos por turno → ciclo → especialidad. El orden de los turnos y de
 * las especialidades es el de la lista de la escuela (el id); los cursos sin
 * turno van al final, y dentro de cada sección, por año y división.
 */
export function agruparCursos<T extends { anio: number; division?: string; nombre?: string; turno: DatoDeLista | null; especialidad: DatoDeLista | null }>(cursos: T[]): GrupoDeTurno<T>[] {
  const orden = (d: DatoDeLista | null) => (d ? Number(d.id) || 0 : Number.MAX_SAFE_INTEGER);
  const etiqueta = (c: T) => c.nombre ?? `${c.anio}° ${c.division ?? ""}`;
  const ordenados = [...cursos].sort((a, b) =>
    orden(a.turno) - orden(b.turno) || a.anio - b.anio || etiqueta(a).localeCompare(etiqueta(b), "es", { numeric: true }));
  const grupos: GrupoDeTurno<T>[] = [];
  for (const c of ordenados) {
    const claveTurno = c.turno?.id ?? "sin-turno";
    let grupo = grupos.find((g) => g.clave === claveTurno);
    if (!grupo) {
      grupo = { clave: claveTurno, turno: c.turno, titulo: c.turno ? `Turno ${c.turno.nombre.toLocaleLowerCase("es")}` : "Sin turno", secciones: [] };
      grupos.push(grupo);
    }
    const ciclo = cicloDe(c.anio);
    const claveSeccion = `${ciclo}:${c.especialidad?.id ?? "-"}`;
    let seccion = grupo.secciones.find((s) => s.clave === claveSeccion);
    if (!seccion) {
      seccion = { clave: claveSeccion, titulo: NOMBRE_CICLO[ciclo] + (ciclo === "basico" ? " (1° a 3°)" : "") + (c.especialidad ? ` · ${c.especialidad.nombre}` : ""), cursos: [] };
      grupo.secciones.push(seccion);
    }
    seccion.cursos.push(c);
  }
  // Primero el ciclo básico, después el superior; dentro, por especialidad
  // (en el básico, sin especialidad primero; en el superior, al final).
  const pesoSeccion = (s: SeccionDeCursos<T>) => {
    const c = s.cursos[0];
    const basico = cicloDe(c.anio) === "basico";
    const esp = c.especialidad ? orden(c.especialidad) : basico ? -1 : Number.MAX_SAFE_INTEGER;
    return [basico ? 0 : 1, esp];
  };
  for (const g of grupos) {
    g.secciones.sort((a, b) => {
      const [ca, ea] = pesoSeccion(a);
      const [cb, eb] = pesoSeccion(b);
      return ca - cb || ea - eb;
    });
  }
  return grupos;
}
