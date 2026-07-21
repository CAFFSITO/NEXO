// src/servicios/diario.ts
// Puerta ÚNICA del Diario Reflexivo del docente hacia el servidor.
//
// Antes el diario no pedía nada: cada registro vivía en la memoria de la
// pantalla y desaparecía al recargar (Errores 3.C.3 y 3.C.6). Ahora todo viaja
// a la base a través de `/api/diario`, que guarda un registro como tres campos:
// titulo, contenido y etiquetas. Qué estructura le da la pantalla a ese
// contenido es cosa de la pantalla; el servidor guarda texto tal cual.
//
// Ver `servidor/diario.js`.

import { enviar, usarDatos } from "./api";

/** Un registro del diario, como lo devuelve la cocina. */
export interface RegistroDiario {
  id: string;
  titulo: string;
  contenido: string;
  etiquetas: string;
  creadoEn: string;
  editadoEn: string | null;
}

export interface DatosDiario {
  registros: RegistroDiario[];
}

/** Lee mis registros (los del profesor de la sesión), más nuevos primero. */
export function usarDiario() {
  const { datos, cargando, error, recargar } = usarDatos<DatosDiario>("/api/diario");
  return { datos, cargando, error, recargar };
}

/** Los tres campos con que la cocina guarda un registro. */
export interface CuerpoRegistro {
  titulo: string;
  contenido: string;
  etiquetas: string;
}

export function crearRegistro(cuerpo: CuerpoRegistro) {
  return enviar<{ id: string }>("/api/diario", "POST", cuerpo);
}

export function editarRegistro(id: string, cuerpo: CuerpoRegistro) {
  return enviar("/api/diario/" + id, "PUT", cuerpo);
}

export function eliminarRegistro(id: string) {
  return enviar("/api/diario/" + id, "DELETE");
}
