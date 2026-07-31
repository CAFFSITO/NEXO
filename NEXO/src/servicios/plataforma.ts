// src/servicios/plataforma.ts
// Puerta del panel del administrador de PLATAFORMA hacia el servidor (sección 5).
// Todo lo que trae sale de la base: instituciones con sus totales, salud del
// sistema y los logs. Ningún dato interno de una escuela pasa por acá.

import { enviar, usarDatos } from "./api";

export interface InstitucionPlataforma {
  id: string;
  nombre: string;
  cicloLectivo: number;
  creadoEn: string;
  usuarios: number;
  estudiantes: number;
  docentes: number;
  cursos: number;
}

export interface SaludSistema {
  instituciones: number;
  usuarios: number;
  sesionesActivas: number;
  baseConectada: boolean;
}

export interface LogSistema {
  nivel: "info" | "aviso" | "error";
  mensaje: string;
  contexto: string;
  creadoEn: string;
}

export interface DatosPlataforma {
  instituciones: InstitucionPlataforma[];
  salud: SaludSistema;
  logs: LogSistema[];
}

export function usarPlataforma() {
  const { datos, cargando, error, recargar } =
    usarDatos<DatosPlataforma>("/api/plataforma");
  return { datos, cargando, error, recargar };
}

// ─── Alta de institución (sección 5.A.7) ────────────────

const SIN_COCINA = "No se pudo contactar al servidor de NEXO.";

export interface ResultadoInstitucion {
  ok: boolean;
  mensaje?: string;
  error?: string;
  direccionEmail?: string;
  contrasenaInicial?: string;
}

export interface DatosNuevaInstitucion {
  nombre: string;
  cicloLectivo: number;
  direccionNombre: string;
  direccionEmail: string;
}

export async function crearInstitucion(
  datos: DatosNuevaInstitucion,
): Promise<ResultadoInstitucion> {
  let respuesta: Response;
  try {
    respuesta = await fetch("/api/plataforma/instituciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch {
    return { ok: false, error: SIN_COCINA };
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    return { ok: false, error: cuerpo.error ?? "No se pudo crear la institución." };
  }
  return {
    ok: true,
    mensaje: cuerpo.mensaje,
    direccionEmail: cuerpo.direccionEmail,
    contrasenaInicial: cuerpo.contrasenaInicial,
  };
}

// ─── Plantillas por institución (detalles finales) ──────
// Estructura base (materias, competencias) que el operador define una vez y
// aplica a una escuela. Es estructura, no contenido: no toca alumnos ni notas.

export type TipoItemPlantilla = "materia" | "competencia";

export interface ItemPlantilla {
  tipo: TipoItemPlantilla;
  nombre: string;
}

export interface PlantillaPlataforma {
  id: string;
  nombre: string;
  creadoEn: string;
  materias: string[];
  competencias: string[];
}

export function usarPlantillas() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ plantillas: PlantillaPlataforma[] }>("/api/plataforma/plantillas");
  return { plantillas: datos?.plantillas ?? null, cargando, error, recargar };
}

/** Crear una plantilla con sus ítems (materias/competencias). */
export function crearPlantilla(nombre: string, items: ItemPlantilla[]) {
  return enviar<{ id: string }>("/api/plataforma/plantillas", "POST", { nombre, items });
}

/** Cuántas filas se crearon y cuántas se saltearon por ya existir. */
export interface ResultadoAplicar {
  creado: { materias: number; competencias: number };
  omitido: { materias: number; competencias: number };
}

/** Aplicar una plantilla a una institución (inserta la estructura que falta). */
export function aplicarPlantilla(institucionId: string, plantillaId: string) {
  return enviar<ResultadoAplicar>(
    `/api/plataforma/instituciones/${institucionId}/aplicar-plantilla`,
    "POST",
    { plantillaId: Number(plantillaId) },
  );
}
