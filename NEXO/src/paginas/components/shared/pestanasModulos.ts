// src/paginas/components/shared/pestanasModulos.ts
// Las pestañas de cada módulo, que van en la segunda fila del TopBar. Antes cada
// pantalla tenía su copia de la lista y su propia barra debajo del encabezado.
// Las de Comunidad dependen del genoma y viven en components/comunidad/pestanas.ts.

import type { PestanaTopBar } from "./TopBar";

/** Portafolio del estudiante: las tres son la misma sección del menú. */
export const PESTANAS_PORTAFOLIO: PestanaTopBar[] = [
  { label: "Mis Cursos", ruta: "/portafolio/mis-cursos" },
  { label: "Mis Tareas", ruta: "/portafolio/mis-tareas" },
  { label: "Calificaciones", ruta: "/portafolio/calificaciones" },
];

export const PESTANAS_OBJETIVOS: PestanaTopBar[] = [
  { label: "Dashboard", ruta: "/objetivos" },
  { label: "Mis Metas", ruta: "/objetivos/metas" },
  { label: "Hábitos", ruta: "/objetivos/habitos" },
  { label: "Competencias", ruta: "/objetivos/competencias" },
];

export const PESTANAS_PORTAFOLIO_DOCENTE: PestanaTopBar[] = [
  { label: "Dashboard", ruta: "/portafolio-docente" },
  { label: "Gestión de Tareas", ruta: "/portafolio/gestion" },
  { label: "Diario Reflexivo", ruta: "/portafolio-docente/diario" },
  { label: "Aula Virtual", ruta: "/portafolio-docente/aula-virtual" },
];

export const PESTANAS_BIBLIOTECA: PestanaTopBar[] = [
  { label: "Institucional", ruta: "/biblioteca/institucional" },
  { label: "Nacional", ruta: "/biblioteca/nacional" },
];
