# Instalar NEXO en el servidor de la escuela (XAMPP en Windows)

Esta guía arranca desde cero: un servidor Windows que ya tiene XAMPP y una escuela que va a usar NEXO de verdad. No se trae nada de la versión de prueba: la base arranca **vacía**, con una sola cuenta (la del Maestro), y la escuela se crea desde adentro de NEXO.

Tiempo estimado: 1 a 2 horas la primera vez.

---

## Cómo queda armado

```
 Celulares y computadoras
          │  https://nexo.miescuela.edu.ar
          ▼
 ┌─────────────────────────────┐
 │ Apache (el de XAMPP)        │  ← la puerta de entrada: el certificado HTTPS
 │ puertos 80 y 443            │
 └──────────────┬──────────────┘
                │  (solo dentro del servidor)
                ▼
 ┌─────────────────────────────┐
 │ NEXO (Node.js)              │  ← el programa
 │ 127.0.0.1:3073              │
 └──────────────┬──────────────┘
                ▼
   C:\nexo-datos\nexo.db           ← todos los datos (un solo archivo)
   C:\nexo-datos\archivos\         ← fotos, videos y documentos subidos
   C:\nexo-datos\respaldos\        ← las copias de cada noche
```

- **NEXO no usa PHP ni MySQL/MariaDB.** Lo que tengan en XAMPP puede seguir funcionando igual. De XAMPP se usa solamente **Apache**.
- NEXO es un programa de **Node.js** que guarda todo en un archivo **SQLite** (`nexo.db`). No hay que instalar ninguna base de datos aparte.
- Hay tres carpetas separadas:
  - `C:\nexo`: el programa.
  - `C:\nexo-datos`: los datos de la escuela.
  - `C:\xampp`: Apache.

  Así, actualizar NEXO nunca toca los datos.

---

## Antes de empezar: tres decisiones

1. **¿Con qué dirección se va a entrar?** NEXO necesita una dirección propia, por ejemplo `nexo.miescuela.edu.ar`. No puede vivir dentro de una carpeta del sitio de la escuela (como `miescuela.edu.ar/nexo`). Quien administra el dominio de la escuela tiene que crear ese subdominio.
2. **¿Se va a usar solo dentro de la escuela o también desde las casas?** Si estudiantes y familias van a entrar desde sus casas (lo normal), hacen falta tres cosas:
   - una **IP pública fija** (o un servicio de DNS dinámico);
   - que el **router** de la escuela reenvíe los puertos **80 y 443** al servidor;
   - que el subdominio apunte a esa IP pública.
3. **El certificado HTTPS.** Sin HTTPS no funcionan la cámara del aula virtual ni las alertas en el celular, y las contraseñas viajarían sin cifrar. Con un dominio público, el certificado es **gratis** con Let's Encrypt (paso 7).

**Lo que hace falta:**
- Un usuario **administrador** de Windows en el servidor.
- XAMPP instalado, con Apache funcionando.
- Unos 2 GB libres en disco, más el espacio de lo que se suba (videos, documentos).
- Para los respaldos, idealmente un **segundo disco** (o un disco externo o una carpeta de red).

---

## Paso 1 — Instalar Node.js

1. Entrá a <https://nodejs.org> y descargá la versión **LTS** (tiene que ser 24 o superior).
2. Instalala con las opciones por defecto: "Siguiente" hasta "Finalizar".
3. Abrí **PowerShell como administrador** (menú Inicio → escribí "PowerShell" → clic derecho → "Ejecutar como administrador") y comprobá:

```powershell
node -v
```

Tiene que decir `v24.` o un número mayor. Después instalá Yarn, que descarga las piezas que usa NEXO:

```powershell
npm install -g yarn
yarn -v
```

> Si dice que `node` o `yarn` "no se reconoce", cerrá PowerShell y abrilo de nuevo.

## Paso 2 — Copiar NEXO al servidor

Copiá la carpeta del proyecto (la que tiene adentro `NEXO`, `servidor` y `base-de-datos`) a **`C:\nexo`**.

- Si usan Git: `git clone <dirección-del-repositorio> C:\nexo`
- Si es un ZIP o una copia desde otra computadora: **no** copies las carpetas `node_modules` (pesan mucho y se vuelven a generar).

> ⚠️ **Nunca la pongas dentro de `C:\xampp\htdocs`.** Todo lo que está en `htdocs` se puede descargar desde internet, incluida la base con todas las contraseñas cifradas.

Como no se usa nada de lo que existe ahora (es todo de prueba), borrá los datos de prueba que vinieron con la copia:

```powershell
cd C:\nexo
Remove-Item base-de-datos\nexo.db, base-de-datos\nexo-respaldo-*.db -ErrorAction SilentlyContinue
Remove-Item servidor\almacen -Recurse -ErrorAction SilentlyContinue
```

## Paso 3 — Instalar las piezas y compilar la aplicación

En PowerShell, uno por uno, esperando que cada uno termine:

```powershell
cd C:\nexo
yarn install
yarn --cwd NEXO install
yarn --cwd servidor install
yarn --cwd NEXO build
```

El último comando arma la aplicación en `C:\nexo\NEXO\dist`. NEXO la sirve sola: no hace falta copiar nada a Apache.

## Paso 4 — Carpetas de datos y configuración

Creá las carpetas de los datos:

```powershell
New-Item -ItemType Directory -Force C:\nexo-datos\archivos, C:\nexo-datos\respaldos, C:\nexo-datos\certificados, C:\nexo-datos\acme
```

Creá el archivo de configuración a partir del ejemplo y abrilo con el Bloc de notas:

```powershell
Copy-Item C:\nexo\servidor\nexo.env.ejemplo C:\nexo\servidor\nexo.env
notepad C:\nexo\servidor\nexo.env
```

Revisá estas líneas (lo demás puede quedar como está):

| Línea | Qué poner |
|---|---|
| `NEXO_HOST=127.0.0.1` | Dejalo así: NEXO solo atiende a Apache, nadie entra directo. |
| `NEXO_PORT=3073` | Dejalo así, salvo que otro programa ya use el puerto 3073. |
| `NEXO_DB_PATH`, `NEXO_STORAGE_DIR` | Dejalos así (`C:/nexo-datos/...`). |
| `NEXO_RESPALDOS_DIR` | Si tienen otro disco, ponelo ahí (por ejemplo `D:/respaldos-nexo`). |
| `NEXO_COOKIE_SEGURA=1` | Dejalo en 1 (requiere HTTPS, que se arma en los pasos 7 y 8). |
| `NEXO_PUSH_CONTACTO` | Un correo de quien administra: `mailto:sistemas@miescuela.edu.ar`. |

Guardá y cerrá.

## Paso 5 — Crear la base vacía y la cuenta del Maestro

El **Maestro** es la cuenta que crea y diseña la escuela dentro de NEXO (colores, módulos, perfiles). Usá un correo real de quien administra la plataforma:

```powershell
cd C:\nexo\base-de-datos
node --env-file=..\servidor\nexo.env crear-base.mjs --vacia --email=sistemas@miescuela.edu.ar
```

Te va a pedir la contraseña dos veces (mientras la escribís se ven asteriscos). Tiene que tener **al menos 12 caracteres**. **Guardala en un lugar seguro**: esa cuenta controla toda la escuela.

Tiene que terminar diciendo `Base creada correctamente: C:\nexo-datos\nexo.db` y `Sin escuelas ni datos de ejemplo`.

La base queda así:
- Sin escuelas, sin personas de prueba y sin publicaciones.
- Solo la cuenta del Maestro.
- Los feriados nacionales fijos de este año y el próximo. Los feriados trasladables cambian cada año por decreto y no vienen cargados.

## Paso 6 — Probar que NEXO arranca

```powershell
cd C:\nexo\servidor
node --env-file=nexo.env servidor.js
```

Tiene que decir `Sirviendo la aplicación compilada...` y `Cocina de NEXO encendida en http://localhost:3073`. En el navegador **del servidor** abrí <http://127.0.0.1:3073/api/salud>: tiene que responder `"estado": "viva"`.

Apagalo con `Ctrl + C` (en el paso 9 queda funcionando solo). Todavía no intentes iniciar sesión: con `NEXO_COOKIE_SEGURA=1` el ingreso necesita HTTPS, que llega en los pasos 7 y 8.

## Paso 7 — El certificado HTTPS

### Opción A (recomendada): con dominio público, Let's Encrypt gratis

Hace falta que `nexo.miescuela.edu.ar` ya apunte a la IP pública de la escuela y que el puerto 80 llegue al servidor (ver "Antes de empezar").

1. **Primero Apache, con un certificado provisorio.** Let's Encrypt comprueba el dominio a través de Apache, pero Apache no arranca si el certificado que tiene configurado todavía no existe. Por eso, hacé primero el **paso 8** usando el certificado de prueba que trae XAMPP. En `nexo.conf` dejá estas dos líneas así:
   ```
   Define NEXO_CERTIFICADO C:/xampp/apache/conf/ssl.crt/server.crt
   Define NEXO_CLAVE C:/xampp/apache/conf/ssl.key/server.key
   ```
2. Descargá **win-acme** desde <https://www.win-acme.com> (el ZIP "x64 pluggable" o "trimmed"). Descomprimilo en `C:\win-acme`.
3. Ejecutá `C:\win-acme\wacs.exe` **como administrador** y elegí:
   - `M` → *Create certificate (full options)*
   - *Manual input* → escribí `nexo.miescuela.edu.ar`
   - Validación: *[http] Save verification files on (network) path* → `C:\nexo-datos\acme`
   - Clave: *RSA*
   - Guardado: *PEM encoded files* → `C:\nexo-datos\certificados` (sin contraseña)
   - Instalación: *Start external script or program*. Programa: `C:\Windows\System32\cmd.exe`. Parámetros: `/c "net stop Apache2.4 & net start Apache2.4"`. Así, cuando el certificado se renueve solo (cada 2 meses), Apache lo vuelve a cargar.
4. Win-acme deja en `C:\nexo-datos\certificados` los archivos `nexo.miescuela.edu.ar-chain.pem` y `nexo.miescuela.edu.ar-key.pem` (si los nombres varían un poco, usá el que termina en `-chain.pem` y el que termina en `-key.pem`). Volvé a `nexo.conf` y poné esas rutas en las dos líneas `Define`. Después reiniciá Apache.

### Opción B: solo dentro de la escuela, sin dominio público

- Se puede usar el certificado de prueba de XAMPP (como en el punto 1 de arriba) y entrar por `https://<nombre-o-IP-del-servidor>`.
- Los navegadores van a mostrar "La conexión no es privada" y hay que aceptar una vez en cada equipo. La cámara del aula virtual funciona; las **alertas en los celulares, no** (exigen un certificado reconocido).
- Si la escuela (o el ministerio) tiene su propia autoridad de certificación, pedí un certificado para el servidor y usalo en las líneas `Define`.

## Paso 8 — Configurar Apache (XAMPP)

1. Copiá la configuración preparada:
   ```powershell
   Copy-Item C:\nexo\scripts\windows\apache-nexo.conf C:\xampp\apache\conf\extra\nexo.conf
   notepad C:\xampp\apache\conf\extra\nexo.conf
   ```
2. Cambiá las tres líneas `Define` de arriba: la dirección de NEXO y las rutas del certificado (las provisorias del paso 7, punto 1, o las definitivas). Guardá.
3. Abrí `C:\xampp\apache\conf\httpd.conf` con el Bloc de notas y agregá al final:
   ```
   Include conf/extra/nexo.conf
   ```
4. Comprobá que Apache acepte todo:
   ```powershell
   C:\xampp\apache\bin\httpd.exe -t
   ```
   Tiene que decir `Syntax OK`. Si no, el mensaje dice en qué línea está el problema.
5. En el **XAMPP Control Panel** (abierto como administrador):
   - Reiniciá Apache (*Stop* y *Start*).
   - Tildá la casilla **Svc** al lado de Apache, para que quede instalado como servicio de Windows y arranque solo al encender el servidor.
6. **Firewall de Windows:** Apache tiene que poder recibir conexiones en los puertos 80 y 443 (XAMPP suele pedir el permiso la primera vez). **No abras el puerto 3000.**

> Si en el servidor hay otro programa usando el puerto 80 o 443 (IIS, Skype viejo), Apache no arranca. El XAMPP Control Panel muestra cuál es.

## Paso 9 — Dejar NEXO funcionando solo

En PowerShell **como administrador**:

```powershell
cd C:\nexo
powershell -ExecutionPolicy Bypass -File scripts\windows\instalar-tareas.ps1
```

Esto crea dos tareas en el Programador de tareas de Windows:
- **NEXO**:
  - arranca al encender el servidor, aunque nadie inicie sesión;
  - si se cae, vuelve a arrancar solo en 10 segundos;
  - lo que dice queda en `C:\nexo-datos\nexo.log`.
- **NEXO respaldo**: todas las noches a las 3 copia la base y los archivos nuevos, y guarda los últimos 30 días.

Probá desde **otra** computadora o un celular: `https://nexo.miescuela.edu.ar`. Tiene que aparecer la pantalla de ingreso, con el candado en la barra de direcciones.

## Paso 10 — Crear la escuela (Maestro)

1. Entrá con el correo y la contraseña del Maestro (paso 5).
2. **Estudio del Maestro → Forjar instancia.** Recorré los pasos:
   - **Identidad**:
     - El nombre real de la escuela.
     - **Dominio de las cuentas** (por ejemplo `miescuela.edu.ar`).
     - El **ciclo lectivo**.
     - El nombre y correo de quien dirige.
     - **No tildes "Crear una cuenta semilla por perfil"**: son cuentas de prueba.
     - La plantilla de materias es opcional ("Sin plantilla: la dirección carga sus materias").
   - **Paleta**: podés soltar el logo de la escuela y NEXO arma los colores.
   - El resto (módulos, perfiles, algoritmos) puede quedar como viene y ajustarse después.
3. En la **Ignición** aparece la contraseña de la dirección **una sola vez**. Anotala y entregásela a quien dirige.

## Paso 11 — Cargar la escuela (dirección)

La dirección entra con su correo y esa contraseña. La primera vez, NEXO le ofrece cambiarla. Después, en este orden:

1. **Cursos y materias**: crear los cursos (año, división, turno, cupo mínimo y máximo) y las materias.
2. **Perfiles académicos → Nuevo perfil**: dar de alta docentes, preceptores, estudiantes (cada uno en su curso), familias, biblioteca y Centro de Estudiantes. Cada cuenta nueva recibe una contraseña inicial que se muestra en pantalla para entregarla. Cada persona la puede cambiar al entrar.
3. En cada curso: asignar el **preceptor** y cada **materia con su docente**.

> Estudiantes, docentes y preceptores **no pueden entrar hasta tener un curso asignado** (verán un mensaje que lo explica). Conviene entregar las contraseñas después del punto 3.

4. **Modo edición** (opcional): colores, qué módulos se ven, el orden del menú.

---

## El día a día

**¿Está funcionando?**
- Desde el servidor: <http://127.0.0.1:3073/api/salud> responde `"estado": "viva"`.
- Lo que va diciendo NEXO queda en `C:\nexo-datos\nexo.log`. Se renueva solo al pasar los 20 MB.

**Apagar y encender NEXO** (PowerShell como administrador):
```powershell
powershell -ExecutionPolicy Bypass -File C:\nexo\scripts\windows\detener-nexo.ps1
Start-ScheduledTask -TaskName "NEXO"
```

**Alguien se olvidó la contraseña.**
1. En la pantalla de ingreso, esa persona toca "¿Olvidaste tu contraseña?" y escribe su correo.
2. NEXO **no manda correos**: el código de recuperación queda escrito en `C:\nexo-datos\nexo.log` (buscá "Código de recuperación para"). Vale 30 minutos y sirve una sola vez.
3. Quien administra el servidor busca el código y se lo pasa a la persona.

**"Hubo demasiados intentos fallidos".** Después de 10 contraseñas equivocadas en 15 minutos, esa cuenta queda frenada 15 minutos (así nadie puede adivinar contraseñas probando). Se puede esperar, o reiniciar NEXO para liberarla en el momento.

**Respaldos.**
- Cada noche se guarda una copia completa en `NEXO_RESPALDOS_DIR`:
  - `nexo-AAAA-MM-DD_HHMM.db`: la base, comprobada después de copiarla;
  - la carpeta `archivos`: lo subido.
- Para hacer uno en el momento: `C:\nexo\scripts\windows\respaldar-nexo.cmd`. El resultado queda en `C:\nexo-datos\respaldos.log`.
- Si los respaldos quedan en el mismo disco que los datos, una falla del disco se lleva las dos cosas. Copialos además a otro lado de vez en cuando.

**Volver a un respaldo:**
1. Apagá NEXO.
2. Renombrá `C:\nexo-datos\nexo.db` (por ejemplo a `nexo-roto.db`).
3. Copiá la copia elegida como `C:\nexo-datos\nexo.db`.
4. Copiá el contenido de `respaldos\archivos` a `C:\nexo-datos\archivos\almacen`.
5. Encendé NEXO.

**Actualizar NEXO a una versión nueva:**
1. Hacé un respaldo y apagá NEXO.
2. Reemplazá el contenido de `C:\nexo` por la versión nueva (`git pull`, o copiando los archivos). `C:\nexo-datos` **no se toca**.
3. Ejecutá de nuevo los comandos del paso 3 (`yarn install` ×3 y `yarn --cwd NEXO build`).
4. Encendé NEXO. La base se actualiza sola al arrancar, sin perder datos.

---

## Opcionales

- **Tutor con IA privada.** Instalá Ollama (<https://ollama.com>) en el servidor o en otra máquina de la red y descargá un modelo (`ollama pull llama3.2`). Si está en otra máquina, poné su dirección en `NEXO_IA_URL` dentro de `nexo.env`. Ver `IA_PRIVADA.md`.
- **Videollamadas desde fuera de la red de la escuela.** Dentro de la red funcionan solas. Desde las casas puede hacer falta un servidor TURN propio. Ver "Poner NEXO en producción" en `COMO_CORRER_LA_APP.md`.
- **Alertas en los celulares.** Funcionan solas si el certificado es reconocido (opción A) y el servidor puede salir a internet.

---

## Seguridad: lo mínimo

- `C:\nexo` y `C:\nexo-datos` **fuera** de `htdocs`.
- El puerto 3073 cerrado hacia afuera (NEXO escucha solo en `127.0.0.1`).
- Contraseña larga para el Maestro, guardada en un lugar seguro.
- Si el XAMPP también publica otros sitios, que **phpMyAdmin** y el panel de XAMPP (`/dashboard`) no queden accesibles desde internet.
- Windows con las actualizaciones al día.

---

## Problemas frecuentes

| Qué pasa | Qué revisar |
|---|---|
| Apache no arranca | Ejecutá `C:\xampp\apache\bin\httpd.exe -t`. Casi siempre es una ruta de certificado mal escrita (usá `/` y sin espacios), un archivo de certificado que no existe o el puerto 80/443 ocupado por otro programa. |
| "502 Proxy Error" o "Service Unavailable" | NEXO no está encendido. Mirá `C:\nexo-datos\nexo.log` y el Programador de tareas (tarea "NEXO"). |
| La página carga pero no deja iniciar sesión, o al recargar pide entrar otra vez | Se está entrando por `http://` con `NEXO_COOKIE_SEGURA=1`. Entrá por `https://`. Si todavía no tienen certificado, poné `NEXO_COOKIE_SEGURA=0` mientras tanto. |
| Los mensajes, avisos o clases en vivo no se actualizan solos | La parte "en vivo" (`/ws`) no pasa por Apache. Revisá que `nexo.conf` esté incluido y que `httpd.exe -t` diga `Syntax OK`. |
| No se pueden subir videos grandes | El límite de Apache está en 200 MB (`LimitRequestBody` en `nexo.conf`). |
| La cámara del aula virtual no funciona | Hace falta entrar por `https://`. |
| `node` no se reconoce | Reinstalá Node.js (paso 1) y abrí PowerShell de nuevo. |
| "No encuentro la base" | Falta el paso 5, o `NEXO_DB_PATH` en `nexo.env` apunta a otro lado. |
