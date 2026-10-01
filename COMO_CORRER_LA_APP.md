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
| Admin de plataforma | `sistema@nexo.edu` |

¡Listo! Ya estás adentro. 🎉

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
