import { enviar, useDatos } from "./api";

export interface PersonaAcademica { id: string; nombre: string }
export interface OpcionesGestionAcademica {
  preceptores: PersonaAcademica[];
  profesores: PersonaAcademica[];
  estudiantes: (PersonaAcademica & { cursoId: string | null })[];
  familias: PersonaAcademica[];
  materias: PersonaAcademica[];
  cursos: { id: string; anio: number; division: string }[];
}
export interface DatosCurso { anio: number; division: string; preceptorId: string | null }
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
export function guardarCatedra(id: string, materiaId: string, profesorId: string) {
  return enviar<{ id: string }>(`/api/cursos/${id}/catedras`, "POST", { materiaId, profesorId });
}
export function crearMateria(nombre: string) {
  return enviar<{ id: string; nombre: string }>("/api/materias", "POST", { nombre });
}
export function guardarVinculosFamilia(id: string, estudiantes: { id: string; parentesco: string }[]) {
  return enviar(`/api/perfiles/${id}/vinculos`, "PUT", { estudiantes });
}
