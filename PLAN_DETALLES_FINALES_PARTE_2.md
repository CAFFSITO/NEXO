# NEXO — Plan de detalles finales · PARTE DOS

> **Qué es este documento.** La continuación directa de `PLAN_DETALLES_FINALES.md`
> (Prompts 1–17). Probando el perfil **BIBLIOTECARIO** aparecieron tres errores nuevos
> que no estaban en ningún informe anterior:
>
> 1. **No se puede revisar a detalle** lo que llega a la cola: el modal de revisión
>    muestra solo el título, la descripción y el nombre del archivo como texto; no se
>    puede ver la foto, abrir el PDF ni previsualizar el enlace antes de aprobar.
> 2. **"Inicio" y "Cola de revisión" son la misma pantalla**, y encima esa pantalla
>    tiene un banner que dice "Ir a cola de revisión" cuando ya estás parado en la cola
>    de revisión (te manda a donde ya estás).
> 3. **Tocar una notificación no te lleva a la notificación en sí**: te deja en la
>    sección general (el chat, las tareas, la cola) pero no abre el elemento exacto
>    que la notificación anuncia.
>
> **Cómo se usa.** Igual que la Parte 1: cada tarea es **un prompt completo, listo para
> copiar y pegar** a la IA que programa. Se hacen **de a uno, en orden**, y **se prueba
> cada uno antes de pasar al siguiente**. Después de cada prompt que funcione, la foto
> con git:
>
> ```
> cd C:\NEXO-main\NEXO-main
> git add -A
> git commit -m "Detalle terminado: <lo que hiciste>"
> ```
>
> La numeración continúa la de la Parte 1: estos son los **Prompts 18, 19 y 20**.

---

## Regla que va en TODOS los prompts de esta parte (heredada de la segunda tanda)

El frontend estuvo roto durante los períodos anteriores de solución de errores y tiene
que avanzar **a la par** del backend. Ningún prompt entrega "el endpoint anda pero la
pantalla después": cada prompt termina con **la pantalla conectada, probada con las
cuentas de prueba, y sin regresiones visuales en los otros roles**. Además siguen
vigentes las reglas de siempre:

1. **Ningún dato inventado.** Todo sale de `nexo.db` a través del servidor.
2. **Los permisos se validan en el servidor**, no escondiendo botones.
3. **Reutilizá lo que ya existe**; no dupliques helpers ni componentes.
4. **No toques el sistema de navegación** más allá de lo que el prompt pide explícito.
5. **Al terminar, la IA responde tres cosas:** (1) qué archivos cambió y por qué,
   (2) cómo lo pruebo paso a paso con qué cuenta, (3) qué quedó sin hacer.

### Cuentas de prueba (contraseña de todas: `nexo1234`)

| Rol | Email |
|---|---|
| Bibliotecario | `biblioteca@sanmartin.nexo.edu` |
| Profesor | `garcia@sanmartin.nexo.edu` |
| Estudiante | `julieta@sanmartin.nexo.edu` |
| Dirección | `direccion@sanmartin.nexo.edu` |

## Orden recomendado

| # | Tarea | Toca base | Depende de |
|---|---|---|---|
| 18 | Cola de revisión: revisar a detalle (previsualizar foto, PDF y enlace) | — | — |
| 19 | Bibliotecario: separar "Inicio" de "Cola de revisión" y matar el banner circular | — | — |
| 20 | Notificaciones: que tocar una te lleve al elemento exacto | — | — |

> Ninguno toca el esquema de la base: no hace falta recrearla con `--forzar`. El 18 y
> el 19 tocan la misma pantalla (`PanelBibliotecarioPage`); por eso conviene hacerlos
> en ese orden y no en paralelo. El 20 es transversal a todos los roles: probalo con
> varias cuentas, no solo con el bibliotecario.

---

# PROMPT 18 — Cola de revisión: revisar a detalle antes de aprobar (foto, PDF, enlace)

```
Tarea: que el bibliotecario pueda REVISAR DE VERDAD un recurso antes de decidir.
Hoy el modal de revisión (ModalRevisarRecurso) muestra el título, la descripción,
la categoría y —si hay— un link "Ver enlace" y el NOMBRE del archivo como texto
plano. No se puede ver la imagen, ni abrir/descargar el PDF, ni previsualizar
nada: se aprueba o rechaza a ciegas. Hay que agregar la previsualización real del
contenido, backend Y frontend juntos.

Contexto que tenés que leer antes de tocar nada:
- servidor/biblioteca.js → el endpoint GET /api/biblioteca/cola. HOY devuelve por
  ítem solo `archivo: nombre_original` (el nombre, sin id): por eso el frontend no
  puede armar la URL de descarga. La consulta `colaDe` ya trae r.archivo_id y hace
  LEFT JOIN con archivos: lo que falta es EXPONERLO en la respuesta (archivoId,
  tipo MIME o extensión, y tamaño legible como ya hace la lectura de recursos con
  su helper de peso).
- servidor/archivos.js → cómo se sirve GET /api/archivos/:id y qué permiso valida
  al entregar. El bibliotecario (y la dirección) de la institución del recurso
  TIENEN que poder pedir el archivo de un recurso en cola aunque no lo hayan
  subido ellos: si hoy el permiso no cubre ese caso, agregalo EN EL SERVIDOR
  (verificando que exista una fila de cola_revision/recursos de su institución que
  apunte a ese archivo), no abriendo los archivos a cualquiera.
- NEXO/src/servicios/biblioteca.ts → el tipo ItemCola (sumale archivoId, mime o
  etiqueta de tipo, y tamano) y usarCola.
- NEXO/src/paginas/components/bibliotecario/ModalRevisarRecurso.tsx → el modal a
  enriquecer. Reutilizá su estructura y sus botones de decisión tal como están.
- NEXO/src/paginas/BibliotecaPage.tsx / BibliotecaNacionalPage.tsx → cómo se
  descarga hoy un recurso aprobado vía /api/archivos/:id, para copiar el mismo
  patrón de descarga (no inventes otro).

Construí en el servidor:
- GET /api/biblioteca/cola devuelve además, por cada ítem: archivoId (string o
  null), el nombre original, la extensión o MIME real (de la tabla archivos) y el
  tamaño legible. Sin columnas nuevas: todo eso ya está en la base.
- Garantizá (con test manual) que el bibliotecario de la institución puede GET
  /api/archivos/:id de un archivo que está en su cola, y que un usuario de OTRA
  institución recibe 403. Permiso por fila en el servidor.

Construí en el frontend (ModalRevisarRecurso.tsx + servicios/biblioteca.ts):
- Si el archivo es una IMAGEN (png/jpg/jpeg/gif/webp por MIME o extensión):
  mostrala embebida en el modal (<img> apuntando a /api/archivos/:id, con
  max-height razonable y object-contain; clic = abrirla en pestaña nueva).
- Si es un PDF: previsualización embebida (<iframe> o <object> a
  /api/archivos/:id) con altura fija y scroll propio, más un botón "Descargar"
  con el mismo patrón de descarga que ya usa la biblioteca.
- Cualquier otro archivo (docx, etc.): sin preview embebida, pero con el nombre,
  el peso y el botón "Descargar" que funcione de verdad.
- Si es un ENLACE: mostrá la URL completa visible (no solo "Ver enlace"), el
  dominio destacado, y el botón para abrirla en pestaña nueva. No metas un iframe
  del sitio externo: la mayoría lo bloquea (X-Frame-Options) y quedaría un cuadro
  roto; URL clara + abrir en pestaña nueva es lo honesto.
- La descripción completa del recurso (sin truncar) y quién lo presentó, con rol.
- Si el modal queda chico para la preview, ensanchalo (max-w-2xl o similar) sin
  romper el scroll interno que ya tiene (max-h-[90vh] overflow-y-auto).

Reglas innegociables:
- Ningún dato inventado: la preview sale del archivo real vía /api/archivos/:id.
- Permisos en el servidor: el archivo de la cola lo ven bibliotecario/dirección
  de ESA institución; nadie más. No alcanza con no mostrar el link.
- Reutilizá el patrón de descarga existente y el modal existente; no crees un
  visor paralelo ni dupliques helpers de peso/extensión del servidor.
- No toques el sistema de navegación.
- Backend y frontend se entregan JUNTOS y probados.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo, paso a paso: con julieta@ presentá a la biblioteca un
   recurso con una FOTO, otro con un PDF y otro con un ENLACE; entrá con
   biblioteca@sanmartin.nexo.edu, abrí "Revisar" en cada uno y verificá que la
   foto se VE en el modal, que el PDF se previsualiza y se descarga, y que el
   enlace muestra la URL completa y abre en pestaña nueva; recién ahí aprobá o
   rechazá. Verificá también que pedir /api/archivos/:id de ese archivo con una
   cuenta de otra institución da 403.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 19 — Bibliotecario: "Inicio" y "Cola de revisión" dejan de ser lo mismo

```
Tarea: arreglar la navegación interna del bibliotecario. Hoy las rutas
/biblioteca/panel ("Inicio" del menú) y /biblioteca/cola-revision ("Cola de
Revisión" del menú) renderizan LA MISMA pantalla (PanelBibliotecarioPage), que
además tiene DOS elementos absurdos: un BannerCola con el botón "Ir a cola de
revisión" que solo hace window.scrollTo(top) —te invita a ir a donde ya estás— y
un ColaRevisionWidget en la columna derecha que repite la misma lista que está al
lado, con otro botón "Ver cola" que también scrollea arriba. Hay que separar las
dos secciones con contenido propio y eliminar la circularidad.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/navegacion.tsx → líneas ~150–154: las dos rutas apuntan a
  pagina: "panel-bibliotecario" con secciones distintas ("biblioteca-panel" y
  "cola-revision"). La página HOY ignora la sección. NO cambies el mapa de rutas
  ni el sistema de navegación: la página tiene que LEER la sección activa (fijate
  cómo otras páginas con subsecciones lo hacen, ej. ComunidadPage con sus
  pestañas) y mostrar una vista u otra.
- NEXO/src/paginas/PanelBibliotecarioPage.tsx → la pantalla única actual, con
  BannerCola, ColaRevisionWidget, el buscador y las estadísticas.
- NEXO/src/paginas/components/bibliotecario/ → BannerCola.tsx,
  ColaRevisionWidget.tsx, ModalRevisarRecurso.tsx.
- NEXO/src/paginas/components/shared/Sidebar.tsx → los dos ítems del menú del
  bibliotecario ("Inicio" → /biblioteca/panel, "Cola de Revisión" →
  /biblioteca/cola-revision). NO los toques: los destinos quedan; lo que cambia
  es lo que muestra cada destino.
- NEXO/src/servicios/biblioteca.ts → usarCola ya trae pendientes + conteo
  (pendiente/aprobado/rechazado). Alcanza para las dos vistas; NO agregues
  endpoints nuevos si el conteo actual te sirve. Si querés mostrar en el inicio
  "últimos aprobados/rechazados", podés extender la respuesta de
  /api/biblioteca/cola en servidor/biblioteca.js con esas listas (datos reales
  que ya están en la tabla cola_revision), pero es opcional.

Construí:
1. VISTA "INICIO" (/biblioteca/panel): un panel de resumen SIN la lista completa.
   Contiene: el saludo/título del panel, las estadísticas reales de la cola
   (pendientes/aprobados/rechazados, las que ya calcula usarCola), el BannerCola
   —que AHORA sí tiene sentido: su "Ir a cola de revisión" hace
   navegar("/biblioteca/cola-revision"), no un scroll— y el ColaRevisionWidget
   como adelanto de los primeros ítems, cuyo "Ver cola" también navega a
   /biblioteca/cola-revision. Desde el widget, "Revisar" un ítem puede abrir el
   modal directamente (eso ya funciona; conservalo). Los accesos a Biblioteca
   institucional y nacional quedan acá.
2. VISTA "COLA DE REVISIÓN" (/biblioteca/cola-revision): la lista completa con el
   buscador y los botones "Revisar", tal como hoy, pero SIN BannerCola y SIN
   ColaRevisionWidget (nada de invitarte a ir a donde estás ni de repetir la
   lista al costado). En su lugar, la columna derecha puede quedar para las
   estadísticas o directamente ensanchar la lista.
3. La sección activa del menú lateral tiene que marcar "Inicio" en una vista y
   "Cola de Revisión" en la otra (eso ya lo resuelve el mapa de rutas por
   sección: verificá que funcione, no lo reescribas).

Reglas innegociables:
- Ningún dato inventado: las dos vistas leen de usarCola (/api/biblioteca/cola).
- No toques el sistema de navegación (mapa de rutas, Sidebar): la página
  interpreta la sección, nada más.
- Reutilizá BannerCola, ColaRevisionWidget y ModalRevisarRecurso; cambiales las
  props/handlers que hagan falta (onIrACola → navegar), no los dupliques.
- Sin regresiones en otros roles: nada de esto puede afectar otras pantallas.
- Backend y frontend juntos (si extendés el endpoint, la pantalla lo usa ya).

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo, paso a paso: entrá con biblioteca@sanmartin.nexo.edu;
   verificá que "Inicio" muestra el resumen y que su botón "Ir a cola de
   revisión" me LLEVA a /biblioteca/cola-revision (cambia la pantalla y el ítem
   activo del menú); verificá que en la Cola de revisión ya NO existe ningún
   banner ni widget que me mande a la cola donde ya estoy; verificá que buscar,
   revisar, aprobar y rechazar siguen andando igual que antes.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 20 — Notificaciones: tocar una te lleva al elemento exacto, no a la sección

```
Tarea: que hacer clic en una notificación abra LA NOTIFICACIÓN EN SÍ: la
conversación exacta del chat, la tarea exacta (con su modal de detalle), el
comunicado exacto, el recurso exacto de la cola, el evento exacto del calendario.
Hoy NotificacionesPage tiene un mapa RUTA_POR_OBJETO que reconoce ser "aproximado
a propósito": navega a la sección general e ignora objetoId, así que el usuario
tiene que buscar a mano lo que la notificación le anunció. Esto es transversal a
TODOS los roles, no solo al bibliotecario.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/paginas/NotificacionesPage.tsx → RUTA_POR_OBJETO y la función abrir():
  ahí está el hueco (objetoId se descarta).
- NEXO/src/servicios/notificaciones.ts → el tipo Notificacion ya trae objetoTipo
  y objetoId: el dato EXISTE, solo no se usa.
- servidor/notificaciones.js → verificá qué guarda hoy en objeto_tipo/objeto_id
  para cada tipo de notificación (mensaje, corrección, comunicado, recurso,
  evento, denuncia). Si algún tipo se crea SIN objeto_id teniendo objeto real,
  corregí al CREADOR de esa notificación para que lo guarde (dato real, no
  inventado). No cambies el esquema.
- NEXO/src/navegacion.tsx → cómo funciona navegar() y el mapa de rutas. REGLA
  DURA: no agregues rutas nuevas ni cambies el mapa. El "abrir el elemento
  exacto" se resuelve pasando el objetivo por FUERA de la ruta: elegí UN
  mecanismo (un estado en la navegación si navegar() lo soporta, o un pequeño
  módulo compartido tipo NEXO/src/servicios/enfoque.ts que guarde
  { tipo, id } pendiente de consumir) y usalo IGUAL en todas las pantallas
  destino. Documentalo en el propio archivo.
- Las pantallas destino y sus piezas ya existentes (REUTILIZÁ, no dupliques):
  · ChatPage.tsx → cómo selecciona una conversación activa; al llegar con un
    objetivo de tipo "conversacion", la abre.
  · MisTareasEstudiantePage.tsx + components/portafolio/ModalDetalleTarea →
    al llegar con una tarea objetivo, abre su ModalDetalleTarea.
  · FamiliaComunicadosPage.tsx (o la pantalla real de comunicados del rol) →
    scrollea hasta el comunicado y resaltalo un instante.
  · PanelBibliotecarioPage.tsx (vista Cola de revisión del Prompt 19) → si el
    objetivo es un recurso en cola, abre su ModalRevisarRecurso.
  · La página de calendario del rol → posicionate en la fecha del evento y
    resaltalo.
- Si un objetivo ya no existe (borrado, decidido, fuera de la cola), la pantalla
  lo dice honesto ("Ese elemento ya no está disponible") y muestra la sección
  normal; nada de pantallas rotas.

Construí:
1. El mecanismo único de "objetivo pendiente" (estado de navegación o módulo
   compartido) que NotificacionesPage carga antes de navegar con objetoTipo y
   objetoId reales.
2. En abrir() de NotificacionesPage: marcar leída (como hoy), cargar el objetivo,
   navegar a la sección que ya indica RUTA_POR_OBJETO. Tipos sin destino: igual
   que hoy (solo marcar leída).
3. En CADA pantalla destino listada arriba: al montarse, consumir el objetivo
   pendiente (una sola vez) y abrir/enfocar el elemento exacto reutilizando el
   modal o la selección que esa pantalla ya tiene.
4. En el servidor, solo si el diagnóstico del punto de contexto lo mostró
   necesario: completar objeto_id donde algún creador de notificaciones no lo
   estuviera guardando.

Reglas innegociables:
- Ningún dato inventado: objetoTipo/objetoId reales de la notificación.
- Permisos: no se toca ninguno; el elemento abierto pasa por los mismos
  endpoints con los mismos permisos de siempre. Si el usuario no puede ver el
  objeto, la pantalla lo trata como "no disponible", no lo muestra igual.
- UN solo mecanismo de objetivo para todas las pantallas; no cinco soluciones
  distintas ni props en cadena.
- No agregues rutas ni toques el sistema de navegación; reutilizá los modales y
  selecciones existentes.
- Sin regresiones: cada pantalla destino tiene que seguir funcionando IGUAL
  cuando se entra por el menú normal, sin objetivo pendiente.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué, y qué mecanismo de objetivo elegiste.
2. Cómo lo pruebo yo, paso a paso, con al menos tres tipos:
   (a) con garcia@ mandale un mensaje de chat a julieta@; entrá con julieta@,
   tocá la notificación y verificá que se abre ESA conversación;
   (b) con garcia@ corregí una entrega de julieta@; con julieta@ tocá la
   notificación de corrección y verificá que se abre el detalle de ESA tarea;
   (c) con julieta@ presentá un recurso; con biblioteca@ tocá la notificación y
   verificá que se abre el modal de revisión de ESE recurso;
   y además: entrar a cada pantalla por el menú normal sigue igual que siempre,
   y tocar una notificación cuyo objeto ya no existe muestra el aviso honesto.
3. Qué quedó sin hacer, si algo quedó (ej. tipos de notificación que siguen
   siendo aproximados y por qué).
```

---

## Checklist de la Parte Dos

- [ ] Prompt 18 — El bibliotecario ve la foto, previsualiza/descarga el PDF y ve la URL
      completa del enlace ANTES de aprobar o rechazar; archivos de la cola protegidos
      por institución en el servidor.
- [ ] Prompt 19 — "Inicio" es un resumen con accesos y "Cola de revisión" es la lista;
      ningún botón te manda a donde ya estás.
- [ ] Prompt 20 — Tocar una notificación abre el elemento exacto (conversación, tarea,
      comunicado, recurso, evento); objetos borrados avisan honesto.

> Después del último que hagas: `yarn tsc --noEmit` y `yarn vite build` en `NEXO/` deben
> pasar sin errores, y `node --check` en cada archivo del servidor que hayas tocado.
> Sacá la foto con git.
