# Revisión de plataforma — 02/11/2026

No se acredita terminación al 100%. Se revisaron código de servidor, componentes, contratos y pruebas de personalización, comunicación, apps públicas y conectores. Esta revisión no accedió a una cuenta privada Whop ni ejecutó APIs externas con credenciales reales.

## Requisitos y alcance observado

| Requisito | Evidencia real | Estado y límite |
|---|---|---|
| Personalización por institución, perfil y cuenta | `personalizacion.js`, `preferencias-cuenta.js`, `genoma.js`; `EditorPreferencias.tsx`, `aplicarPreferencias.ts` | Herencia, densidad, movimiento y tamaño de texto funcionan; genoma conserva configuración, visibilidad, jerarquías y algoritmos. No significa personalización de absolutamente cada comportamiento: las preferencias de cuenta nuevas son tres campos y hay límites codificados. |
| Evidencia científica visible | `normalizarFichaEvidencia` conserva fuentes/contexto/fecha; constructor de apps y renderer muestran valoración declarada | Parcial: la app pública usa un subconjunto de estados y una sola URL, sin la ficha completa con fecha y contexto; no hay evaluación científica automática ni una certificación universal. |
| Crear y configurar canales, foros, ayuda y sugerencias | `canales.js`, `CanalesDialogo.tsx`; historial/adjuntos/bus existentes | Cubierto para los tipos implementados, con permisos y aislamiento probados. La pertenencia y los destinos siguen dependiendo de la institución y del perfil configurado. |
| Interacción ligada a objetivos y entregas | `canales.js` resuelve tarea, entrega y meta y sincroniza participantes | Parcial: esos tres contextos existen; no hay contexto de proyecto registrado. No se certifica todo perfil con toda combinación de genoma. |
| Respuestas humanas y avisos | Anuncios, respuestas privadas, adjuntos, notas de voz y notificaciones existentes | Cubierto en contratos principales. Velocidad humana y entrega push real en dispositivos no se acreditan con pruebas de API. |
| Publicación gratuita e instalación con + | `apps-publicas.js`, `AppsPublicasMaestro.tsx`, `PanelAppsPublicas.tsx` | Cubierto en el flujo Maestro→Dirección. No hay comercio. |
| Definición independiente de datos, actualización y reversión | Tablas de definiciones/versiones, instancias por institución y datos por usuario; pruebas de dos instituciones | Cubierto para las definiciones implementadas; reservas activas bloquean cambios incompatibles de turnos/capacidad. |
| Todas las capacidades/apps comunitarias de Whop | Ocho bloques: texto, enlace, accionable, embed, encuesta, juego, bienvenida y reserva | Parcial. Un enlace a una función nativa no publica esa función como app independiente. No hay un motor general de operaciones o algoritmos declarativos nuevos creado por el usuario, ni catálogo completo demostrado. |
| Conectores con las herramientas pedidas | `conectores.js` y convertidores; `ConectoresCuenta.tsx` | Lectura de nueve servicios; importación conservadora de ocho; exportación manual sólo Calendar/Todoist. WhatsApp Business devuelve 501. Hay una cuenta por proveedor/usuario, consultas manuales, sin webhooks ni propagación general de cambios o eliminaciones. |
| Sincronización real y optimizada de cada conector | Pruebas de cuentas cifradas, permisos, conversores y adaptadores | Sin acreditar. No hay cuentas externas reales configuradas en las pruebas ni cobertura integral de reintentos/conflictos remotos. En Calendar se rechaza exportar recurrencia; Todoist exporta tareas personales sólo de estudiantes. |

## Bugs corregidos durante esta revisión

1. **Avances de apps perdidos entre interacciones:** `PUT /comunidad/:id/datos` reemplazaba todo el mapa y el cliente enviaba un snapshot anterior. Dos bloques guardados desde pestañas o interacciones independientes podían borrar el primero. La API fusiona únicamente los cambios y el cliente manda el campo modificado; la actualización visual también fusiona sólo ese campo. La prueba envía dos peticiones concurrentes y comprueba que ambas sobreviven junto al avance previo.
2. **Condiciones sólo visuales:** el cliente ocultaba los bloques dependientes pero la API permitía responderlos o reservarlos directamente. Se valida el bloque requerido en los datos persistidos/cambios enviados y se responde 409 si falta. Cancelar una reserva sigue permitido para poder liberar cupo.
3. **Horas imposibles en Calendar:** el adaptador aceptaba `24:00` a `29:59` y finales anteriores al comienzo. Se valida el intervalo 00–23 y un final estrictamente posterior; las pruebas incluyen esos errores.

## Verificación ejecutada

`node --test servidor/tests/apps-publicas.test.js servidor/tests/conectores-exportacion.test.js servidor/tests/personalizacion.test.js servidor/tests/personalizacion-integracion.test.js servidor/tests/canales.test.js servidor/tests/conectores.test.js`: **38/38 aprobadas**. Usan bases temporales; no alteran la base de uso. Se ampliaron dos pruebas existentes para concurrencia/condiciones y horas de exportación. Estas pruebas no sustituyen recorridos visuales ni conectividad con cuentas externas.

## Pendientes concretos de aceptación

- Contrastar y recorrer el catálogo educativo/comunitario actual de Whop, con acceso a la cuenta autorizada, y mapear cada capacidad a una función NEXO real.
- Completar la composición de apps con capacidades nativas y operaciones configurables, más la ficha científica contextual completa; verificar cada bloque con dos comunidades y usuarios.
- Conectar cuentas reales, verificar importación/exportación por servicio, ampliar las operaciones ausentes según APIs disponibles, e implementar WhatsApp Business cuando exista configuración autorizada.
- Recorrer perfiles personalizados, cambios de acceso y combinaciones de genoma en navegador/dispositivos; medir entrega push y flujos humanos.

El hecho de que esta revisión o la suite general aprueben no convierte los alcances parciales anteriores en una entrega completa.
