# Apps públicas educativas: alcance comprobado

El Maestro publica definiciones declarativas y gratuitas; la dirección instala una o varias copias en su comunidad. Cada instalación conserva su nombre, versión, ajustes y datos separados. Actualizar o revertir mueve sólo la definición: nunca importa datos de otra comunidad ni ejecuta código del creador.

## Bloques disponibles

- Texto, enlace a una función de NEXO, página HTTPS embebida sin permisos de scripts, bienvenida y accionable.
- Encuesta de opción única con respuesta propia y totales de la instalación. Los totales no muestran identidad de participantes.
- Juego de preguntas de opción única con devolución inmediata configurable; su ficha de evidencia muestra la valoración declarada por el creador y advierte que NEXO no la verificó.
- Reserva gratuita: uno de hasta ocho turnos por usuario, con cupo configurable por turno. La operación es transaccional: si se llena el último lugar, la siguiente solicitud recibe un conflicto. La persona puede cambiar o cancelar su turno. Los conteos son por instalación, sin datos personales de otras escuelas. Una actualización que cambiaría turnos con reservas activas se rechaza hasta que se cancelen.

Los enlaces del constructor ofrecen rutas de canales/foros/ayuda/sugerencias, comunidad, biblioteca/archivos, calendario/eventos, objetivos y cursos. Esas funciones mantienen sus permisos y datos nativos; el bloque sólo abre el destino, no copia información ni amplía acceso.

## Verificación y límites

`node --test servidor/tests/apps-publicas.test.js` aprobó 3 pruebas: instalación entre dos instituciones, actualización/reversión, datos por usuario, composición y URL segura, reservas/cupos/cancelación y totales. `npx eslint` de la UI y `npx tsc -b` aprobaron. No se ha recorrido cada bloque en navegador con una cuenta real; el catálogo completo de apps comunitarias de Whop tampoco se ha acreditado. La página embebida puede no cargar si el sitio de destino prohíbe `iframe`.
