// src/paginas/components/shared/roles.ts
// Los ocho perfiles de NEXO y cómo se escribe cada uno en pantalla.
//
// Está separado del Sidebar por dos motivos. El primero es de fondo: cómo se
// llama un rol no es asunto del menú lateral, y cualquier pantalla que muestre
// el rol de alguien tiene que decir lo mismo que el menú (sección 1.4: una sola
// fuente de verdad, no una copia por pantalla). El segundo es práctico: un
// archivo de componentes que además exporta constantes rompe la recarga en
// caliente de Vite mientras se programa.
//
// OJO: esta lista es solo el TEXTO que se muestra. Qué puede hacer cada rol se
// decide en el servidor (`servidor/permisos.js`) y no acá.

export type Rol =
    | "estudiante"
    | "profesor"
    | "admin-academico"
    | "preceptor"
    | "centro-estudiantes"
    | "bibliotecario"
    | "administrador"
    | "familia";

export const ROL_LABELS: Record<Rol, string> = {
    estudiante: "Estudiante",
    profesor: "Profesor",
    "admin-academico": "Admin. Académica",
    preceptor: "Preceptor",
    "centro-estudiantes": "Centro de Estudiantes",
    bibliotecario: "Bibliotecario",
    administrador: "Administrador",
    // Decía "Familia · Ciclo 2025", con el año escrito a mano (Error 13.7). El
    // ciclo lectivo real vive en `instituciones.ciclo_lectivo` y cambia todos
    // los años; un año fijo iba a estar mintiendo desde el 1 de enero. Se saca
    // en vez de arrastrarlo a la pantalla de Configuración, que es nueva.
    familia: "Familia",
};
