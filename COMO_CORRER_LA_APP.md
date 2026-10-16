# Cómo instalar y correr NEXO (guía para cualquiera)

Esta guía explica, paso a paso y desde cero, cómo dejar la aplicación funcionando en tu computadora. No hace falta saber programar: solo copiar y pegar comandos.

NEXO tiene dos partes que corren al mismo tiempo:

- **El servidor** (carpeta `servidor/`): el "backend". Guarda y sirve los datos. Corre en `http://localhost:3000`.
- **La aplicación** (carpeta `NEXO/`): el "frontend", lo que ves en el navegador. Corre en `http://localhost:5173` y le pide los datos al servidor.

Además hay una carpeta `base-de-datos/` con el archivo `nexo.db`, donde vive toda la información.

---

## Arranque unificado

Usá **Node.js 24 o superior**. Desde la raíz del proyecto, con las dependencias instaladas:

```powershell
npm run dev
```

Este comando levanta el servidor y Vite juntos. Espera a que el backend esté listo y abre la aplicación en `http://localhost:5173`. Si uno falla, detiene el otro. `Ctrl+C` cierra ambos. Una base existente se conserva; si falta la base predeterminada, se crea con los datos iniciales.

- `npm run check`: lint, compilación y pruebas de integración.
- `npm test`: pruebas contra una base temporal, sin modificar `nexo.db`.
- `npm run build` y después `npm start`: servir la versión compilada en `http://localhost:3000`.
- `npm run dev:frontend` / `npm run dev:backend`: arrancar cada parte por separado.

`NEXO_PORT`, `NEXO_HOST`, `NEXO_DB_PATH` y `NEXO_STORAGE_DIR` permiten cambiar puerto, interfaz, base y almacenamiento. Para usar un backend en otra dirección, configurá `NEXO_API_ORIGIN` antes de iniciar Vite. En desarrollo usá HTTP local; para HTTPS seguí las instrucciones de producción de abajo.

Los pasos 6 y 7 describen la alternativa manual; no los ejecutes a la vez que `npm run dev` porque ocuparían los mismos puertos.

## Paso 1 — Instalar Node.js (versión 24 o superior)

Node.js es el programa que ejecuta tanto el servidor como la aplicación.

1. Entrá a <https://nodejs.org> y descargá la versión **LTS** (botón grande verde).
2. Instalalo con "Siguiente, Siguiente, Finalizar" (dejá todas las opciones por defecto).
3. Cerrá y volvé a abrir la terminal, y verificá que quedó instalado:

```
node -v
```

Tiene que mostrar `v24.0.0` **o superior**. Esta versión permite usar SQLite integrado y las herramientas de compilación del frontend. Si te muestra una versión más vieja, desinstalá Node y volvé a instalar la LTS actual.

> 💡 ¿Qué terminal uso? En Windows: buscá "PowerShell" en el menú Inicio. En Mac/Linux: la aplicación "Terminal".

## Paso 2 — Instalar Yarn

Yarn es el gestor que descarga las librerías que el proyecto necesita. Se instala con un solo comando (npm ya viene con Node):

```
npm install -g yarn
```

Verificá:

```
yarn -v
```

Cualquier versión que muestre está bien.

## Paso 3 — Descargar el proyecto y pararse en su carpeta

Si te pasaron el proyecto como ZIP, descomprimilo. Después, en la terminal, entrá a la carpeta raíz del proyecto (la que contiene `NEXO/`, `servidor/` y `base-de-datos/`):

```
cd C:\NEXO-main\NEXO-main
```

(Ajustá la ruta según dónde lo hayas guardado. En Mac/Linux sería algo como `cd ~/Descargas/NEXO-main`.)

## Paso 4 — Instalar las librerías (los `node_modules`)

Hay que instalarlas en **tres** lugares: la raíz, la aplicación y el servidor. Copiá y pegá estos comandos, uno por uno, esperando a que cada uno termine:

```
yarn install
cd NEXO
yarn install
cd ../servidor
yarn install
cd ..
```

Esto descarga React, Vite, Express y todo lo demás. Puede tardar unos minutos la primera vez. Al final volvés a estar parado en la carpeta raíz.

## Paso 5 — Crear la base de datos (solo si no existe)

El servidor necesita el archivo `base-de-datos/nexo.db`. Si el proyecto ya vino con ese archivo, **salteá este paso**. Si no existe (o el servidor te dice "No encuentro la base"), crealo así:

```
cd base-de-datos
node crear-base.mjs
cd ..
```

> Si alguna vez querés borrar todo y empezar con datos limpios: `node crear-base.mjs --forzar` (⚠️ esto pisa la base existente y se pierde lo cargado).

## Paso 6 — Encender el servidor

Abrí una terminal, entrá a la carpeta del servidor y arrancalo:

```
cd C:\NEXO-main\NEXO-main\servidor
node servidor.js
```

Si todo salió bien vas a ver:

```
Cocina de NEXO encendida en http://localhost:3000
```

**Dejá esta terminal abierta.** Si la cerrás, el servidor se apaga. Podés comprobar que está vivo entrando en el navegador a <http://localhost:3000/api/salud> — tiene que responder `"estado": "viva"`.

## Paso 7 — Encender la aplicación

Abrí **otra** terminal (sin cerrar la del servidor), entrá a la carpeta de la aplicación y arrancala:

```
cd C:\NEXO-main\NEXO-main\NEXO
yarn dev
```

Se va a abrir solo el navegador en `http://localhost:5173`. Si no se abre, entrá vos a esa dirección.

## Paso 8 — Entrar a la app

En la pantalla de ingreso, usá alguna de las cuentas de prueba. **La contraseña de todas es `nexo1234`.**

| Rol | Correo |
|---|---|
| Dirección | `direccion@sanmartin.nexo.edu` |
| Profesor | `garcia@sanmartin.nexo.edu` |
| Preceptor | `pereyra@sanmartin.nexo.edu` |
| Estudiante | `julieta@sanmartin.nexo.edu` |
| Familia | `familia.rossi@sanmartin.nexo.edu` |
| Bibliotecario | `biblioteca@sanmartin.nexo.edu` |
| Centro de Estudiantes | `centro@sanmartin.nexo.edu` |
| Maestro (super admin de la plataforma) | `sistema@nexo.edu` |

¡Listo! Ya estás adentro. 🎉

---

## El perfil Maestro: crear y diseñar escuelas

El Maestro (`sistema@nexo.edu`) crea **instancias**: cada escuela es un NEXO
independiente con su propio "genoma". No escribe código: elige, tilda, ordena y
conecta nodos.

- **Estudio del Maestro** (`/maestro`): todas las escuelas como planetas, cada una con su paleta.
- **Forjar instancia** (`/maestro/forja`): arranca con una intro de película y recorre ocho pasos:
  1. **Génesis**: seis perillas de necesidades + una semilla. El servidor propone un genoma por
     probabilidad (curvas logísticas, sin IA) y muestra la probabilidad de cada decisión; cada una se
     puede aprobar o invertir.
  2. **Identidad**: nombre, lema, ícono, dominio, ciclo, cuenta de la dirección, plantilla de materias
     y cuentas semilla (una por perfil, para entrar a probar).
  3. **Paleta**: rueda cromática, armonías, contraste WCAG, redondez y movimiento.
  4. **Módulos**: ocultar (nunca eliminar), reordenar, renombrar, ícono y checklist de funciones.
  5. **Algoritmos**: orden del feed, tendencias, alerta de ritmo, orden del catálogo, rachas, papelera
     y limpieza del calendario. Se apagan, se calibran o se reescriben como grafo de nodos.
  6. **Perfiles**: los siete de siempre y los que se inventen. Cada perfil nace de un arquetipo, que es
     su techo; dentro de él se eligen módulos, orden, nombres, funciones e inicio.
  7. **Flujos**: funciones nuevas hechas con nodos (cuando pasa algo o a cierta hora → condiciones,
     cálculos y puertas de probabilidad → avisar o registrar).
  8. **Revisión** y **Ignición**: se mantiene presionado el núcleo, corre la cuenta regresiva, pasan los
     créditos y al final se muestran las contraseñas (una sola vez).
- Ningún algoritmo personalizado ni flujo se activa sin **simularlo y aprobarlo** (el editor de nodos
  corre miles de casos y muestra con qué probabilidad actúa).
- Todo lo aplica el **servidor**: un módulo oculto o una función apagada responden 403 aunque se llame
  a la API a mano.
- La **dirección** de cada escuela retoca su instancia desde el **Modo edición** (ver abajo). Al dar de
  alta a alguien puede asignarle un perfil diseñado por el Maestro.
- Cada guardado es una **versión**; desde el estudio se puede volver a cualquiera.

No hace falta recrear la base: al arrancar, el servidor agrega solo lo que falta (tablas del genoma y
la columna del perfil de cada persona) sin tocar los datos existentes.

---

## El modo edición de la dirección

La dirección entra con `direccion@sanmartin.nexo.edu` y toca **Modo edición** en el menú
(`/admin/edicion`; `/admin/modulos` lleva al mismo lugar). Tiene cuatro pestañas:

- **Menú y módulos**:
  - A la izquierda, el árbol del menú: **Mi espacio** y las **secciones** que se creen (nombre, ícono,
    subir, bajar, quitar; hasta 12). Los módulos se arrastran de una sección a otra o se mueven con las
    flechas. Debates y Tendencias viajan siempre con Comunidad (comparten pantalla).
  - El **ojo** oculta o vuelve a mostrar un módulo para toda la escuela. Nada se borra: lo oculto queda
    tachado y se puede volver a mostrar (también lo que ocultó el Maestro).
  - En el centro, el módulo elegido: su nombre e ícono en el menú, su sección, **quién lo ve** (toda la
    escuela o perfil por perfil), el **checklist de funciones** (para toda la escuela o para un perfil) y
    sus **algoritmos**. En **Comunidad** aparecen además los bloques **Quién puede**: qué perfiles suben
    fotos, videos y archivos (de fábrica, dirección y Centro de Estudiantes) y quiénes fijan publicaciones
    y debates (de fábrica, la dirección). Se activan perfil por perfil con un interruptor.
  - A la derecha, **Así lo ve**: el menú real de cada perfil con los colores de la escuela, por qué
    pantalla entra y qué tiene oculto. Tocar un ítem abre ese módulo.
- **Jerarquía de perfiles**: los niveles de la escuela, de arriba hacia abajo (de fábrica: 1. Dirección y
  Centro de Estudiantes · 2. Profesores, biblioteca y preceptoría · 3. Estudiantes y familias). Se
  renombran, se agregan (hasta 6), se ordenan y se quitan; los perfiles se arrastran de un nivel a otro
  (también los que diseñó el Maestro). Cada nivel elige a quién le muestra eventos: a su nivel y a los de
  abajo, solo a los de abajo, o solo eventos personales. Una tabla muestra quién le muestra a quién. La
  dirección queda siempre arriba.
- **Algoritmos**: todos juntos. Se encienden, se apagan y se calibran con perillas; cada cambio se prueba
  al instante sobre los **datos reales** de la escuela (cómo quedaría el feed, las tendencias, el
  catálogo; cuántos perfiles se purgarían, cuántos eventos se limpiarían, cuántas rachas siguen vivas) o
  en 1500 escenarios simulados para la alerta de ritmo. Si el Maestro dejó un diseño de nodos aprobado,
  se lo puede elegir; los nodos los sigue editando solo el Maestro.
- **Historial**: cada versión del genoma, quién la firmó (Maestro o dirección) y su nota.

Todo se arma en un borrador (con deshacer y rehacer, Ctrl+Z / Ctrl+Shift+Z) y se guarda de una vez con
**Revisar y guardar**: el servidor lista exactamente qué cambia, avisa lo delicado (un perfil que se
queda sin módulos, algo que la propia dirección deja de ver) y guarda una versión nueva. Si alguien
guardó en el medio, se elige entre traer esa versión o guardar encima. La dirección **no** toca colores,
identidad, perfiles nuevos, flujos ni grafos: eso sigue siendo del Maestro (y el servidor lo ignora
aunque se mande a mano).

---

## El calendario con jerarquía

Está en **Calendario** (`/comunidad/calendario`; las familias, en `/familia/calendario`). Todos crean
eventos, pero cada uno se los puede mostrar solo a su nivel y a los de abajo:

- **Dirección y Centro de Estudiantes**: a cualquiera, toda la escuela incluida (el centro, hasta 5 eventos
  con destinatarios por mes).
- **Profesores, biblioteca y preceptoría**: a su nivel y a estudiantes y familias, nunca a la dirección.
  Quien dicta o tiene a cargo cursos llega solo a los estudiantes, familias, profesores y preceptor de
  **sus** cursos (por ejemplo: "solo yo", o "mis alumnos de 4° B y su preceptor").
- **Estudiantes y familias**: eventos personales, que solo ven ellos.
- El Maestro no cuenta (no tiene escuela). Los niveles se cambian desde el modo edición.

Cada evento puede tener: categoría (evaluación, entrega, clase, acto, reunión, salida, institucional, sin
clases, personal…) y color; todo el día, horario o **varios días**; **repetición** (todos los días, días
de clase, cada semana ciertos días, cada 2 semanas, cada mes el día N o "el segundo martes" o "el último
viernes", cada año; hasta una fecha o N veces; **saltando feriados**); lugar, enlace y detalle;
destinatarios (toda la escuela, un nivel, perfiles, grupos de un curso, personas, la familia de un
estudiante); **obligatorio** (nadie lo oculta), **pedir confirmación** (voy / quizás / no voy, con la
cuenta para quien organiza), **avisar ahora** y **recordatorios** (minutos, horas, días o una semana antes;
cada persona puede elegir los suyos). Mientras se arma, el editor muestra a cuántas personas les llega y
**con qué choca** (otro evento de esas mismas personas a esa hora; lo ajeno aparece sin título).

En una serie se edita o borra **solo este**, **este y los siguientes** o **todos**. Vistas: día, semana,
mes (se arrastra un evento a otro día para moverlo), año y agenda; capas por tipo y por nivel; búsqueda;
ocultar de mi calendario; exportar a `.ics` (Google Calendar, Outlook, el teléfono). La dirección puede
activar **Supervisión** para ver lo que cada nivel le muestra a otros (nunca lo personal).

Al arrancar, el servidor actualiza solo una base vieja (los eventos y a quién le llegaban se conservan).

---

## La Comunidad (estilo X y Reddit)

Está en **Comunidad → Feed** (`/comunidad`). Pestañas: **Para vos** (las fijadas arriba y después lo que
más se mueve), **Siguiendo** (solo a quienes seguís), **Recientes**, **Guardados** y **Menciones**.

- **Publicar**: hasta 1000 caracteres con contador; `@` sugiere personas de la escuela (cada una tiene su
  `@usuario`, que es la parte del correo antes de la arroba) y les llega un aviso; los `#temas` se
  vuelven enlaces y alimentan **Qué está pasando**. Botón de **emojis** con buscador y recientes;
  **encuesta** (2 a 6 opciones, de 1 hora a 7 días); **programar** para una fecha; **quién puede
  responder** (todos, solo quienes sigo, solo quienes menciono); **hilos** de varias partes con el **+**.
- **Votos**: no hay "me gusta". Flecha **verde** a favor y **roja** en contra (tocar la misma de nuevo la
  saca). Aparte, **reacciones con emoji** (hasta 10 por persona en cada publicación o respuesta).
- **Respuestas estilo Reddit**: al abrir una publicación se ve el hilo con **líneas verticales** que
  siguen cada conversación; se responde a cualquier respuesta (sub-hilos), se ordena por Mejores, Nuevas,
  Antiguas o Polémicas, y **tocar la línea pliega** esa rama. Lo borrado queda como "[eliminada]" para
  no romper la conversación. Pasado el 6.° nivel aparece **Seguir el hilo**.
- **Lo demás de X**: repostear, **citar** (repost con comentario), guardar, copiar enlace, vistas,
  editar en los primeros 30 minutos (queda "editada"), **perfil** de cada persona (seguidores, siguiendo,
  sus publicaciones), seguir y **silenciar**, buscador y **A quién seguir**.
- **Fijar**: sin límite; la última que se fija queda arriba de todo. De fábrica, la dirección.
- **Fotos, videos y archivos de todo tipo** (videos hasta 100 MB, el resto hasta 15 MB; los ejecutables y
  las páginas web se rechazan por seguridad): de fábrica, dirección y Centro de Estudiantes. La dirección
  se lo da a otros perfiles en **Modo edición → Comunidad → Quién puede**.

### Debates por bloques

En **Comunidad → Debates**, un debate se arma combinando **bloques** (o se parte de una plantilla: Clásico,
Consulta, Lluvia de ideas, Debate completo):

- **Postura** (a favor / en contra, con neutral si se quiere), **Encuesta** (una o varias
  opciones), **Escala** (1 a 5 o 1 a 10, con promedio y consenso), **Ranking** (ordenar opciones;
  puntaje Borda), **Argumentos** (mapa en dos columnas, cada argumento con sus votos y su propio hilo de
  respuestas), **Propuestas** (cada uno suma ideas y se votan) y **Pregunta abierta**.
- Al crear se elige **cuándo se ven los resultados** (siempre, al responder o recién al cierre), fecha de
  cierre y **aportes anónimos** (la dirección igual ve quién fue, para moderar).
- **Δ "me convenció"**: si un argumento te hizo cambiar de opinión, le das un Δ; el contador muestra
  cuántas opiniones cambió el debate.
- Quien lo creó (o la dirección) lo **cierra** y escribe una **conclusión**; a quienes participaron les
  llega un aviso.

Para probarlo: `julieta@sanmartin.nexo.edu` → Feed (abrir "¿Alguien tiene los apuntes…?" para ver el hilo
anidado) y Debates → "¿Cómo organizamos la Semana de las Ciencias?". Con
`direccion@sanmartin.nexo.edu` se fija y se sube una foto; en Modo edición se le da multimedia a
Estudiantes.

Al arrancar, el servidor actualiza solo una base vieja (los debates de antes quedan como un bloque de
postura con sus votos).

---

## Tendencias: de la escuela a lo nacional

En **Comunidad → Tendencias** hay dos pestañas:

- **Mi escuela**: lo que se está moviendo ahora. El puntaje combina la energía reciente (votos,
  comentarios, posturas y un "pulso" donde lo de hoy pesa más que lo de hace días), cuántas
  **personas distintas** participaron y qué tan bien recibido fue (confianza de los votos). Lo que hace
  el propio autor no cuenta. El Maestro puede calibrar este algoritmo por escuela en la Forja.
- **Nacional**: solo entra lo que la **dirección** de cada escuela aprobó. El algoritmo de la escuela
  le propone a la dirección lo mejor de su ranking (le llega un aviso); la dirección lo aprueba, lo
  descarta o, si ya salió, lo retira. El ranking nacional es uno solo para toda la plataforma (lo
  calibra el Maestro desde su Estudio), compensa el tamaño de cada escuela y pone un máximo por escuela.
  Las demás escuelas lo ven en modo lectura y **sin nombres de personas**.

Para probarlo con una base nueva (los datos de ejemplo traen actividad de las últimas horas):

1. `direccion@sanmartin.nexo.edu` → Tendencias: en "Llevar a lo nacional" aparece propuesto el club
   de robótica. Tocá **Aprobar**.
2. `julieta@sanmartin.nexo.edu` → Tendencias → **Nacional**: aparece con la marca "Tu escuela".
3. `sistema@nexo.edu` → Estudio del Maestro → "Tendencias nacionales": perillas, simulación y editor
   de nodos del algoritmo nacional.

Con una base existente cuya actividad es vieja, las tendencias aparecen apenas haya votos o
comentarios de la última semana (o recreando la base con `node crear-base.mjs --forzar`, que borra lo
cargado).

---

## Anuncios obligatorios (dirección ↔ preceptoría)

Avisos que no se pueden ignorar. No son un chat y no se responden: a quien le llega, el aviso le aparece
como una **tarjeta grande encima de todo NEXO**, con el color de su grupo, quién lo mandó, la fecha y la
hora, y un botón para copiar el texto. **No puede seguir usando NEXO** hasta leerlos todos:

- El botón **Marcar como leído** recién se habilita al llegar al final del texto (si es largo, se baja
  dentro de la tarjeta). Después aparece una fila de emojis para reaccionar (es opcional).
- Para pasar al siguiente: **deslizar** a un lado en el celular, o la **flecha** en la computadora (o las
  flechas del teclado). Los pendientes asoman por detrás de la tarjeta que se está leyendo.
- Lo leído queda en **Anuncios → Leídos**, con fecha y hora. No existe casilla de "no leídos".

Participan **preceptores y dirección** (sumar a los profesores es agregar `"profesor"` a la lista
`anuncios` de `servidor/permisos.js`). En **Anuncios → Nuevo aviso** se elige a quién va (un grupo o
personas puntuales) y se escribe; en **Enviados** se ve quién lo leyó, a qué hora y con qué emoji, en
vivo.

**Grupos de difusión** (los arma la dirección en **Anuncios → Grupos**, y el Maestro desde
**Grupos de anuncios** eligiendo la escuela): **uno a muchos** (una persona avisa a varias), **muchos a
uno** (varias le escriben a una sola) y **todos con todos**. Cada grupo tiene su color. No se borran: se
archivan y los avisos viejos conservan su color.

**Alertas que suenan:**

- Con NEXO **abierto**: suena un timbre durante 45 segundos (y de nuevo cada 2 minutos si nadie toca la
  pantalla) y el título de la pestaña parpadea.
- Con NEXO **cerrado**: notificación push del sistema, que queda fija hasta tocarla. Si el aviso sigue
  sin leer, se insiste cada 10 minutos, hasta 6 veces; entre las 21 y las 7 no se insiste (el primer
  aviso igual suena). Cada persona tiene que tocar **Activar alertas** una vez en cada dispositivo
  (Anuncios muestra el estado y un botón **Probar alerta**).
- El push funciona en Chrome, Edge y Firefox (computadora y Android). **Necesita que NEXO se abra con
  https** (ver "Poner NEXO en producción"); en `localhost` funciona igual para probar. El aviso viaja
  cifrado por el servicio de notificaciones del navegador (Google, Mozilla o Microsoft), que no puede
  leerlo. Las claves se generan solas la primera vez; no hay que configurar nada.

Para probarlo con una base nueva: `pereyra@sanmartin.nexo.edu` entra y tiene 2 avisos (uno largo, para
ver cómo hay que bajar hasta el final); `direccion@sanmartin.nexo.edu` tiene 1 y es quien arma los
grupos; `sistema@nexo.edu` → **Grupos de anuncios**. Con una base existente las tablas se crean solas al
arrancar, sin grupos: la dirección arma los suyos (o manda directo a una persona mientras tanto).

---

## Resumen para el día a día

Una vez instalado todo, ejecutá `npm run dev` desde la raíz. Como alternativa, podés repetir los pasos 6 y 7:

1. **Terminal 1:** `cd servidor` → `node servidor.js`
2. **Terminal 2:** `cd NEXO` → `yarn dev`
3. Navegador en `http://localhost:5173`.

Para apagar todo: `Ctrl + C` en cada terminal.

---

## Opcional — Asistencia con IA

El asistente de IA necesita una clave que **no** viene en el proyecto. Sin ella, la app funciona igual (solo esa función queda apagada). Si tenés una clave, definila antes de arrancar el servidor:

- **Windows (PowerShell):** `$env:NEXO_IA_CLAVE = "tu-clave"` y en esa misma terminal corré `node servidor.js`.
- **Mac/Linux:** `NEXO_IA_CLAVE="tu-clave" node servidor.js`

---

## Guardar tus cambios con Git (hacer un commit)

Git es la "máquina de fotos" del proyecto: cada commit es una foto de cómo está el código en ese momento, a la que siempre podés volver. El proyecto ya viene con Git inicializado en la carpeta raíz (`NEXO-main/`).

Cada vez que termines un cambio que quieras guardar:

**1. Pararse en la carpeta del proyecto:**

```
cd C:\NEXO-main\NEXO-main
```

**2. Ver qué cambió:**

```
git status
```

Te muestra en rojo los archivos modificados o nuevos. Es solo informativo, no cambia nada.

**3. Marcar qué entra en la foto:**

```
git add .
```

El punto significa "todo lo que cambió". No te preocupes por `node_modules`, `nexo.db` o los archivos subidos por usuarios: el archivo `.gitignore` ya los excluye solo (son pesados o se regeneran con un comando, no hace falta guardarlos).

**4. Sacar la foto (el commit) con un mensaje que diga qué hiciste:**

```
git commit -m "Descripción corta de lo que cambiaste"
```

Por ejemplo: `git commit -m "Arreglado el filtro del calendario"`.

**5. Verificar que quedó guardado:**

```
git status
```

Tiene que decir `nothing to commit, working tree clean` (no hay nada pendiente). Con `git log --oneline` ves la lista de fotos, con la tuya arriba de todo.

> 💡 Si es tu primera vez con Git en esa computadora, te va a pedir identificarte una única vez:
> ```
> git config --global user.name "Tu Nombre"
> git config --global user.email "tu@correo.com"
> ```

---

## Poner NEXO en producción (HTTPS y la cámara del aula virtual)

En desarrollo alcanza con lo de arriba (servidor en `localhost:3000`, Vite en
`localhost:5173`). Pero la **videollamada del aula virtual** usa la cámara del
navegador, y **los navegadores sólo dan acceso a la cámara en `https` o en
`localhost`**. Por eso, para que el video funcione entre computadoras de la
escuela, hay que servir NEXO por **HTTPS**. Todo se hace con nuestro propio
servidor; no depende de ningún servicio externo.

1. **Compilar la aplicación** (una vez por cada versión nueva):
   ```
   cd NEXO
   yarn build
   ```
   Esto genera la carpeta `NEXO/dist`. Cuando esa carpeta existe, el servidor la
   sirve solo: la app, `/api` y el video quedan todos en el **mismo sitio** (ya no
   hace falta Vite ni el puerto 5173 en producción).

2. **Encender con HTTPS**, indicándole al servidor un certificado y su clave
   (propios de la institución) con dos variables de entorno:
   ```
   # Windows (PowerShell), en la carpeta servidor/
   $env:NEXO_TLS_CERT="C:\ruta\certificado.pem"
   $env:NEXO_TLS_KEY="C:\ruta\clave.pem"
   node servidor.js
   ```
   Si arranca bien vas a ver `Cocina de NEXO encendida en https://localhost:3000`.
   Entrás desde cualquier computadora de la red a `https://<ip-del-servidor>:3000`.
   Sin esas variables, el servidor sigue en `http` (que ya alcanza para localhost).

3. **(Opcional) Acceso desde FUERA de la red de la escuela.** En una red local no
   hace falta nada más. Si algún día se quiere entrar al aula desde otra red
   (internet), los navegadores necesitan un servidor **STUN/TURN** para cruzar el
   router. Se usa uno **propio** de la institución (nunca uno ajeno), sin tocar
   código, al compilar:
   ```
   # ejemplo: definir la variable antes de "yarn build"
   VITE_ICE_SERVERS='[{"urls":"turn:turn.miescuela.edu:3478","username":"u","credential":"c"}]'
   ```
   Mientras no se defina, la videollamada usa sólo la red local.

> El tope de cámaras simultáneas por clase es 12 (la videollamada es en malla y no
> escala más allá de una decena). Se puede ajustar con la variable `NEXO_MAX_VIDEO`
> en el servidor.

> **Alertas push de Anuncios en los celulares.** También necesitan `https`, y además
> que el celular **confíe** en el certificado (uno emitido por una autoridad
> reconocida, no uno hecho a mano). El servidor tiene que poder salir a internet
> para entregar los avisos al servicio de notificaciones de cada navegador. La
> variable opcional `NEXO_PUSH_CONTACTO` (por ejemplo `mailto:sistemas@miescuela.edu`)
> es el contacto que esos servicios ven si algo falla.

---

## Problemas frecuentes

**"No encuentro la base en ...nexo.db"**
→ Falta la base de datos. Hacé el Paso 5.

**Error que menciona `node:sqlite` o "unknown builtin module"**
→ Tu Node es más viejo que 22.5. Volvé al Paso 1 e instalá la versión LTS actual.

**"EADDRINUSE" o "puerto 3000 en uso"**
→ Ya hay un servidor corriendo de antes. Cerrá la otra terminal donde esté corriendo (o reiniciá la computadora si no la encontrás) y volvé a arrancarlo.

**La app abre pero al iniciar sesión da error o "no se pudo conectar"**
→ Casi seguro el servidor (Paso 6) no está corriendo. Revisá que la terminal 1 siga abierta y diga "Cocina de NEXO encendida".

**`yarn` no se reconoce como comando**
→ Falta el Paso 2, o hay que cerrar y volver a abrir la terminal después de instalarlo.

**La página queda en blanco**
→ Apretá `F12` en el navegador, mirá la pestaña "Console" y buscá el error en rojo; suele indicar que el servidor no responde.
