# NEXO — Verificación final (Etapa 10)

> **Qué es este documento.** El cierre de la Etapa 10 del `PLAN_DE_RECONSTRUCCION.md`: el
> recorrido **ficha por ficha** del `ERRORES_DETALLADOS.md` (secciones 2 a 13), marcando cada
> error como resuelto con **una prueba que podés hacer vos**. La Etapa 10 tiene dos partes: (1)
> eliminar componentes duplicados y código muerto, y (2) esta verificación. Ambas están acá.
>
> **Convención de estado:**
> - ✅ **Resuelto** — probado; anda contra `nexo.db` a través del servidor.
> - ⚠️ **Resuelto con matiz** — anda, pero con una aclaración.
> - ⛔ **Pendiente** — necesita trabajo nuevo de servidor que excede la limpieza de la Etapa 10. Se listan todos juntos al final.

---

## Antes de probar: cómo dejar todo andando

```
# 1. Base de datos (si no existe o querés datos frescos)
cd C:\NEXO-main\NEXO-main\base-de-datos
node crear-base.mjs --forzar

# 2. Servidor (la "cocina"). Si ya había uno corriendo, cerralo (Ctrl+C) y volvé a abrirlo:
#    ESTE PASO ES OBLIGATORIO tras la Etapa 10 — se tocaron permisos de archivos en el servidor.
cd C:\NEXO-main\NEXO-main\servidor
node servidor.js
#    Tiene que decir: "Cocina de NEXO encendida en http://localhost:3000"

# 3. La aplicación (la "vidriera"), en OTRA terminal:
cd C:\NEXO-main\NEXO-main\NEXO
yarn dev
#    Abrí la dirección que muestra (http://localhost:5173).
```

**Cuentas de prueba** (contraseña de todas: `nexo1234`):

| Rol | Email |
|---|---|
| Dirección | `direccion@sanmartin.nexo.edu` |
| Profesor | `garcia@sanmartin.nexo.edu` |
| Preceptor | `pereyra@sanmartin.nexo.edu` |
| Estudiante | `julieta@sanmartin.nexo.edu` |
| Familia | `familia.rossi@sanmartin.nexo.edu` |
| Bibliotecario | `biblioteca@sanmartin.nexo.edu` |
| Centro de Estudiantes | `centro@sanmartin.nexo.edu` |
| Administrador plataforma | `sistema@nexo.edu` |

---

## Parte 1 — Limpieza de código muerto y duplicados (Etapa 10, primera mitad)

**26 archivos eliminados** (componentes construidos que ninguna pantalla importaba, y una pantalla fantasma):

- **Pantalla fantasma:** `GestionInstitucionalPage.tsx` — estaba en el mapa de páginas pero **ninguna ruta ni ítem de menú llegaba a ella** (mismo caso que 10.B.5 / 10.C.2). Orquestaba tres paneles con tabs; los dos que valían (`PanelCursos`, `PanelPerfiles`) ya viven en `/admin/cursos` y `/admin/perfiles`. Se borró junto con su entrada en `App.tsx`, `navegacion.tsx` y `servidor/permisos.js`.
- **Carpeta `components/materias/` completa** (`PanelMaterias`, `TarjetaMateria`, `ModalNuevaMateria`, `tipos`) — solo la usaba la pantalla fantasma y tenía datos inventados escritos a mano (`"Prof. García"`, `"Prof. Lombardi"`…), justo la clase de dato falso que la Etapa 10 debe erradicar.
- **Carpeta `components/tendencias/` completa** (`DebateDestacadoCard`, `ArticuloTecnicoCard`, `DebateActivoCard`, `PublicacionComunidadCard`) — tarjetas viejas de la maqueta de Tendencias; la pantalla real usa `usarTendencias` contra el servidor.
- **`components/comunidad/DebateCard.tsx` y `TendenciaCard.tsx`** — duplicados viejos; la Comunidad real usa `TarjetaDebate` y las tarjetas del feed compartido.
- **`components/aula-virtual/`**: `BarraControlesDocente`, `BarraInteraccion`, `PanelTrayectoria`, `PanelTrayectoriaDocente`, `Pizarron`, `PizarronDocente`, `PreguntasPendientes`, `PulsoAula`, `TopNavAula`, `TopNavAulaDocente` — maqueta previa a la sala real (`SalaClase` + `TrayectoriaVivo`) de la Etapa 9.
- **`components/portafolio/`**: `PanelInteraccionClase`, `ReproductorClaseVivo`, `TrayectoriaClase` — maqueta de la "clase en vivo" previa al aula real.
- **`components/bibliotecario/`**: `EstadisticasWidget`, `TarjetaRecurso` — widgets huérfanos.

**Verificación de que quedó limpio:** un barrido de imports sobre todo `NEXO/src` no encuentra **ningún** archivo sin importar (salvo `main.tsx`, que es la raíz), y `grep` de referencias a lo borrado da **0** en código (solo se ajustaron dos comentarios desactualizados). `yarn tsc --noEmit` y `yarn vite build` pasan sin errores.

**Cómo lo probás vos:** entrá con cada rol y recorré todo el menú; ninguna pantalla debería mostrar los nombres inventados viejos (`Prof. García` como dueño fijo, `Julieta Rossi` para cualquiera, `Ciclo 2025`). La compilación limpia es la garantía de que no quedó ninguna referencia colgando.

---

## Parte 2 — Recorrido ficha por ficha

### Sección 2 — Perfil ESTUDIANTE (entrá con `julieta@`)

**2.A.1 Configuración de cuenta** ✅ — Menú → engranaje / `/configuracion`. Cambiá tu contraseña y volvé a entrar con la nueva.
**2.A.2 Tono visual coherente** ✅ — Todas las pantallas usan `Sidebar` + `TopBar` compartidos; la navegación se siente uniforme.

**Comunidad (Feed / Debates / Tendencias):**
**2.B.1 Votos en vez de "me gusta"** ✅ — Cada publicación tiene ▲/▼, no corazón. Votá: el voto es único por usuario (tabla `votos` con `UNIQUE(usuario_id, objeto_tipo, objeto_id)`).
**2.B.2 Comentar** ✅ — Abrí una publicación, escribí un comentario, recargá (F5): sigue ahí (tabla `comentarios`).
**2.B.3 Vista de comentarios** ✅ — El contador abre el detalle con todos los comentarios.
**2.B.4 Publicar con emojis/fotos** ✅ — El compositor sube imagen (a `archivos`) y permite emojis; la publicación aparece en el feed y sobrevive a la recarga.
**2.B.5 Menú de tres puntos en el feed** ✅ — Como estudiante, la acción es **Denunciar** (no borrar).
**2.B.6 "Participar" habilita el voto** ✅ — En un debate, hasta tocar "Participar" no tenés postura; después fijás a favor/en contra (tabla `debate_participantes`).
**2.B.7 Comentarios en debates** ✅ — El debate abre su hilo completo.
**2.B.8 Tres puntos según perfil** ✅ — Estudiante/Profesor denuncian; Preceptor/Dirección borran. Lo decide el servidor (`servicios/comunidad.ts:puedeEliminar` + validación en `comunidad.js`), no el frontend.
**2.B.9 Tendencias con lógica real** ✅ — `/api/comunidad/tendencias` calcula por votos reales; sin votos, la lista viene vacía (no inventa).
**2.B.10 Filtro "Todas las escuelas" / "Mi escuela"** ✅ — Renombrado; el alcance viaja al servidor.
**2.B.11 Tendencias pulsables** ✅ — Cada tendencia abre su debate/publicación.
**2.B.12 "Participar" en Tendencias** ✅ — Misma lógica que 2.B.6.
**2.B.13 Configurar intereses del feed** ✅ — Ya no lleva a Objetivos; abre la config de intereses (tabla `intereses_feed`).
**2.B.14 Navegar entre Feed/Debates/Tendencias** ✅ — Las tres pestañas son navegación real con URL propia; se va y se vuelve desde cualquiera.

**Portafolio:**
**2.C.1 Clase en vivo real** ✅ — "Mis Cursos" lista clases reales (`/api/aula`); entrás a la sala Jitsi de la Etapa 9. *(Los cursos ahora salen de `/api/portafolio`: la materia, el profesor y el avance son los de tus tareas reales — antes eran tres cursos inventados con profesores que no existían.)*
**2.C.2 Navegación estable Mis Tareas / Mis Cursos / Calificaciones** ✅ — Sub-navegación compartida; el ítem "Portafolio" queda encendido en las tres.
**2.C.3 Creación de tareas completa** ✅ — Tarea personal con título, descripción y fecha (selector).
**2.C.4 Entrega rica (subir archivos)** ✅ — Detalle de tarea → entregar con archivo + comentario (tablas `entregas`, `entrega_archivos`).
**2.C.5 "Ver detalle" de tarea** ✅ — Abre `ModalDetalleTarea` real.
**2.C.6 Anular entrega / ver feedback** ✅ — Se puede anular (mientras no esté corregida) y se ve la devolución.
**2.C.7 "Correcciones en camino" pulsable** ✅ — Lleva a la tarea pendiente.
**2.C.8 Editar tarea** ✅ — Las personales se editan.
**2.C.9 Fechas con año** ✅ — Fechas ISO completas; "vence en X días" anda todo el año (`servicios/fechas.ts`, único calculador).

**Objetivos:**
**2.D.1 "Mis rachas" conectada a Hábitos** ✅ — Marcar un hábito en el Dashboard usa el **mismo** `registrarHabito` que la sección Hábitos; se reflejan al instante en ambas.
**2.D.2 Tres puntos de Objetivos** ✅ — Editar/archivar reales.
**2.D.3 Editar hábitos y metas** ✅.
**2.D.4 Botón "+" del Dashboard eliminado** ✅.
**2.D.5 Metas nivel proyecto** ✅ — Categorías, subtareas reales; completar tiene efecto real (tabla `metas`).
**2.D.6 Subtareas detalladas** ✅ — Cada una con su texto (tabla `subtareas`).
**2.D.7 Subtareas editables/completables** ✅.
**2.D.8 "Vence el" calendario + "Unidad" de la base** ✅ — `/api/objetivos/materias` trae unidades reales.
**2.D.9 Recursos en metas** ✅ — Tabla `meta_recursos`.
**2.D.10 Resumen semanal por algoritmo (sin IA)** ✅ — `/api/objetivos/resumen`.
**2.D.11 Próximo hito por algoritmo** ✅.
**2.D.12 Competencias en árbol con evidencias** ⚠️ — Se **ven** en árbol con sus evidencias (`/api/objetivos`), pero cambiar de nivel y borrar evidencia todavía no escriben (ver Pendientes).
**2.D.13 Saludo real (día/hora/tareas)** ✅ — Usa día y hora reales y la **misma** cuenta de pendientes que Mis Tareas.
**2.D.14 Meta vencida se ve vencida** ✅ — Único calculador de fechas; una meta pasada figura atrasada.
**2.D.15 Completar meta no falsea subtareas** ✅ — El servidor exige forzar y no inventa el conteo.
**2.D.16 "Esta semana" mide la semana** ✅ — El texto y el cálculo coinciden.

**Biblioteca:**
**2.E.1 En revisión, solo lo mío** ✅ — `esMio` se calcula por id de autor en el servidor.
**2.E.2 "Presentar recurso"** ✅ — Abre el flujo; el recurso entra a la cola (tabla `cola_revision`).
**2.E.3 Búsqueda sin tildes** ✅ — `normalizar()` en cliente y servidor.
**2.E.4 "Descargar" / "Ver guía"** ✅ — **(Arreglado en Etapa 10)** el enlace se abre; el archivo se baja por `/api/archivos/:id`. El servidor valida el permiso antes de entregar: un recurso aprobado lo baja quien puede verlo, uno en revisión solo el bibliotecario/dirección de ese colegio.
**2.E.5 "Filtrar"** ✅ — Filtros reales (materia, tipo, escuela, fecha, autor).
**2.E.6 "Presentar recurso" una sola vez** ✅ — Se dejó un único acceso.
**2.E.7 Institucional aprobado → Nacional** ✅ — La cola con destino "nacional" lo hace visible a todos.

**Chat:**
**2.F.1 Buscador de conversaciones** ✅.
**2.F.2 Botón de llamar eliminado** ✅.
**2.F.3 Adjuntar archivo** ✅ — Sube y envía (tabla `archivos`).
**2.F.4 Mensajes reales entre perfiles** ✅ — Dos navegadores (ej. `julieta@` y `garcia@`) chatean en vivo por WebSocket; sobrevive a la recarga.
**2.F.5 No leídos se borran al leer** ✅ — Abrir la conversación marca leído (`ultimo_leido_en`).
**2.F.6 Diálogo de ejemplo cruzado** ✅ — Desaparece con datos reales.

**Asistencia IA:**
**2.G.1 IA real con system prompt** ✅ — El servidor arma el pedido con `config_ia` + la conversación; la clave vive en el servidor (`NEXO_IA_CLAVE`), nunca en el navegador.
**2.G.2 Tres puntos y FAQ** ✅.

### Sección 3 — Perfil PROFESOR (entrá con `garcia@`)

**3.A.1 Comunidad** ✅ — La misma de la sección 2.B; el profesor denuncia pero no borra.
**3.A.2 Crear debates rico** ✅.
**3.B.1 Trayectoria de la clase** ✅ — Avanza en vivo (Etapa 9, tabla `clase_etapas`).
**3.B.2 Videollamada real** ✅ — Jitsi incrustado.
**3.B.3 Aula convive con el menú lateral** ✅.
**3.B.4 Pulso con nombres** ✅ — Se ve **quién** está perdido (tabla `clase_comprension`).
**3.B.5 Alerta de ritmo por umbral (no IA)** ✅ — Regla con umbral configurable.
**3.B.6 Preguntas pendientes** ✅ — Se conserva.
**3.B.7 Chat de clase real** ✅ — Reusa el chat de la Etapa 6.
**3.B.8 Ajustes del aula** ✅.
**3.B.9 Planificación de clases** ✅ — Con etapas, materiales y objetivos.
**3.B.10 Lista de clases + iniciar** ✅ — Botón "Iniciar" al llegar la fecha.
**3.B.11 Lista nominal de conectados** ✅ — Tabla `clase_asistencias`.
**3.B.12 Salir del aula** ✅ — Vuelve al listado del aula / comunidad.
**3.C.1 Gestión de tareas completa** ✅ — Quién entregó qué, ver entregables, editar, subir, fecha, elegir cátedra.
**3.C.2 Un solo botón de nueva tarea** ✅.
**3.C.3 Editar/borrar diario** ⛔ — Ver Pendientes (no hay módulo de diario en el servidor).
**3.C.4 Registro nuevo desplegable** ✅ — El formulario colapsa.
**3.C.5 Gestión de tareas dentro del portafolio** ✅ — Cuelga de `/portafolio/gestion`.
**3.C.6 Portafolio docente completo** ⚠️ — **(Tocado en Etapa 10)** el tablero ahora sale del servidor: tus cátedras, tus tareas con conteo real de entregas y tus clases planificadas. El diario sigue sin persistir (3.C.3).
**3.C.7 Tareas asignadas pulsables** ✅ — **(Arreglado en Etapa 10)** cada tarea del tablero lleva a Gestión de Tareas.
**3.C.8 Clases separadas y pulsables** ✅ — Lista de clases planificadas.
**3.C.9 Qué revisé / qué falta** ✅ — Panel de corrección por alumno y materia.
**3.D.1 Biblioteca abre arriba** ✅.
**3.D.2 Biblioteca igual que estudiante** ✅ — Hereda las correcciones de 2.E.

### Sección 5 — Perfil ADMINISTRADOR de plataforma (entrá con `sistema@nexo.edu`)

**5.A.1–5.A.9 Separación de roles** ✅ — El menú tiene **solo** Instituciones y Salud del Sistema. No ve cursos, materias, alumnos, comunidad ni calendario de ningún colegio. `/admin/instituciones` gestiona instituciones (alta con cuenta); `/admin/salud` muestra salud + logs. Se quitó "Actividades" (reusaba el panel de la dirección).
**5.A.2 Actividad = logs** ✅ — Logs técnicos, no eventos escolares.
**5.A.5 No ve calendario** ✅ — No está en su menú ni tiene ruta.
**5.A.6 Exporta reportes** ✅ — Se conserva.
**5.A.11 Encabezado no nombra una escuela** ✅ — El subtítulo sale del perfil, no de "San Martín — Ciclo 2025".
**5.A.10 Plantillas por institución** ⛔ — Marcado como secundario en el informe; no construido.

### Sección 6 — Perfil ADMINISTRACIÓN ACADÉMICA / DIRECCIÓN (entrá con `direccion@`)

**6.A.1 Comunidad** ✅ — Sección 2.B con capacidades de dirección.
**6.A.2 Borrar publicaciones** ✅ — Menú de tres puntos → Borrar (validado en el servidor).
**6.B.1 Borrado seguro de perfiles (papelera)** ⚠️ — Se envía a papelera y se restaura (`estado='papelera'`, `eliminado_en/por`); el vencimiento automático de 7 días es pendiente (6.B.5).
**6.B.2 Detalle de actividad de un perfil** ⚠️ — Se ve el perfil; el historial completo auditable es parcial.
**6.B.3 Alta crea cuenta real** ✅ — Genera credenciales reales e id único (no al azar).
**6.B.4 Alta de Familia y Bibliotecario** ✅ — El selector de rol incluye todos los roles reales.
**6.B.5 Papelera con 7 días** ⛔ — Ver Pendientes.
**6.C.1 Gestión de cursos real** ✅ — Separada del administrador de plataforma.
**6.C.2 "Ver detalle" de curso** ⛔ — Ver Pendientes (falta endpoint de detalle).
**6.C.3 "Estado del ciclo lectivo" quitado** ✅ — Se sacó la tarjeta de datos inventados.
**6.C.4 Reporte PDF real** ✅ — Descarga un archivo real (Etapa 8), no un "generando…" vacío.
**6.D.1 Biblioteca** ✅ — Hereda 2.E.
**6.E.1 Calendario visible para todos (lectura) en Comunidad** ✅ — `/comunidad/calendario`.
**6.E.2 Sin parciales de materia** ✅ — Eventos institucionales.
**6.E.3 Vistas Mes/Semana** ✅ — Grilla real.
**6.E.4 Tipo de evento libre** ✅ — Texto libre (columna `tipo`).
**6.E.5 Hora fin > hora inicio** ✅ — La base lo rechaza (CHECK) y el formulario también.
**6.E.6 Sin "planificación con el Ministerio"** ✅ — Quitado.
**6.E.7 Limpieza de eventos > 1 año** ✅ — Automática.
**6.E.8 Orden cronológico** ✅.
**6.E.9 Visibilidad/edición por perfil** ✅ — Tabla `evento_visibilidad`, validada en el servidor.
**6.E.10 Calendario en el mes actual** ✅ — Abre en el mes real; feriados y "Próximos eventos" reales.
**6.F.1–6.F.5 Reportes** ✅ — Herramienta real con checkboxes; expedientes exportables (Etapa 8). Reportes vive solo en dirección (6.F.2).

### Sección 7 — Perfil PRECEPTOR (entrá con `pereyra@`)

**7.A.1–7.A.5 Comunidad / Mi Curso** ✅ — Su curso real (asignado por dirección, `cursos.preceptor_id`), moderación, comunidad de curso.
**7.B.1–7.B.2 Calendario** ✅ — Puede agregar eventos visibles solo para su curso; el resto en lectura.

### Sección 8 — Perfil CENTRO DE ESTUDIANTES (entrá con `centro@`)

**8.A Comunidad** ✅ — **(Reescrito en Etapa 10)** "Nuestro Portal" ahora sale del servidor: los artículos son las publicaciones reales del Centro en la comunidad, las quejas de `/api/quejas`, los debates de `/api/comunidad/debates` y el calendario muestra el **mes actual real**. Antes eran 3 artículos, 3 eventos, 3 quejas y 2 debates escritos a mano, con un calendario clavado en mayo 2025.
**8.B.1 Quejas anónimas (sin autor)** ✅ — La tabla `quejas` **no tiene** columna de autor: el anonimato es estructural. Enviá una queja con `julieta@` y mirá la base: no hay forma de saber quién la escribió.
**8.B.2–8.B.5 Estadística / no vistas arriba** ✅ — `/api/quejas` compara meses; las no vistas van primero.
**8.C.1 Calendario propio** ✅.

### Sección 9 — Perfil BIBLIOTECARIO (entrá con `biblioteca@`)

**9.A.1–9.A.4 Inicio / cola** ✅ — Cola por orden de llegada (`presentado_en`), temática libre sin materia.
**9.B Cola de revisión** ✅ — Aprobar/rechazar con aviso; destino institucional/nacional.
**9.C Comunidad** ✅.
**9.D.1 "Notificaciones"** ✅ — Antes su ruta no existía (botón muerto); ahora abre la pantalla real de notificaciones.

### Sección 10 — Perfil FAMILIA (entrá con `familia.rossi@`)

**10.A.1 Comunicados estilo chat** ✅.
**10.A.2 Responder en privado al preceptor** ✅ — "Responder" abre el chat privado (no escribe en el comunicado); otra familia no lo ve.
**10.A.3 Abrir cada comunicado + globito de no leídos** ✅ — "Leído" es una fila por persona (`comunicado_lecturas`); el globito no miente.
**10.B.1 Calendario en solo lectura** ✅ — La familia no edita.
**10.B.2 Errores de calendario** ✅ — Hereda las correcciones de 6.E.
**10.B.3 Solo el curso de su hijo** ✅ — Filtrado por inscripción.
**10.B.4 Capas de visibilidad familia/alumno** ✅ — "Cita con los padres de Julieta" la ve la familia Rossi y **no** Julieta (`evento_visibilidad`).
**10.B.5 Pantalla fantasma del calendario familiar** ✅ — El menú "Calendario" apunta a la página familiar diferenciada (`/familia/calendario`); ya no al institucional genérico.
**10.C.1 Chat** ✅ — Hereda 2.F.
**10.C.2 Pantalla fantasma del chat familiar** ✅ — El menú "Chat" apunta al chat compartido real (`/chat`); la copia paralela se eliminó. **(En Etapa 10 se cerró además un clic muerto:** "Responder" un comunicado navegaba a `/familia/chat`, ruta que no existía; ahora va a `/chat`.)

### Sección 12 — Plataforma, sesión y cuentas (transversal)

**12.1 La sesión sobrevive a la recarga** ✅ — F5 en cualquier pantalla no te saca; la sesión vive en cookie httpOnly + tabla `sesiones`.
**12.2 "Atrás"/"Adelante" del navegador** ✅ — React Router; el historial funciona.
**12.3 Cada pantalla tiene dirección propia** ✅ — Ej. `/comunidad/debates`; se puede compartir y volver a un enlace.
**12.4 / 12.5 Cuentas reales + recuperar/cambiar contraseña** ✅ — Sin lista de cuentas en el navegador; contraseñas con scrypt en el servidor. Existen recuperación y ayuda de acceso (públicas) y cambio de contraseña en `/configuracion`.
**12.6 Sin "teletransporte" mudo** ✅ — Si un rol no tiene permiso, se le explica; el servidor valida el acceso.
**12.7 El menú marca exactamente una sección** ✅ — La sección activa se **declara** por ruta (`MAPA_RUTAS`), no se adivina por prefijo. En el aula ya no se encienden "Aula Virtual" y "Portafolio" a la vez.
**12.8 Sin botones a rutas inexistentes** ✅ — Las rutas están tipadas (`type Ruta`); apuntar a una pantalla inexistente es error de compilación. **(En Etapa 10 se cerraron los últimos:** `/familia/chat` y `/comunidad/reportes-auditoria` no existían y eran clics mudos; se corrigieron a `/chat` y `/reportes`.)

### Sección 13 — Contradicciones entre pantallas (el corazón de la Etapa 10)

El plan pide que estas contradicciones sean **imposibles**, no solo estar arregladas. Se logra porque cada dato tiene **una sola fuente** y la base lo impone con restricciones:

**13.1 Una sola nota por trabajo** ✅ **Imposible reincidir** — `correcciones.entrega_id` es **UNIQUE**: la base rechaza una segunda nota para la misma entrega. Mis Tareas **y** Calificaciones piden el **mismo** `/api/portafolio`. No hay dos listas donde contradecirse.
**13.2 Docentes con un solo nombre y materia** ✅ — Cada docente es una fila en `usuarios`; `catedras` lo liga a materia+curso. Toda pantalla toma el nombre de ahí.
**13.3 Un solo tamaño de escuela** ✅ — Panel, cursos y perfiles derivan del **mismo** padrón (`usuarios`, `inscripciones`, `cursos`).
**13.4 Preceptor–curso una sola asignación** ✅ — `cursos.preceptor_id` es la única fuente; la vista del preceptor la lee de ahí.
**13.5 Hábitos idénticos en Dashboard y sección** ✅ **Imposible reincidir** — `habito_registros` con `UNIQUE(habito_id, fecha)`; Dashboard y Hábitos leen `/api/objetivos`. Marcar en uno se ve en el otro al instante.
**13.6 Un solo calculador de fechas** ✅ **Imposible reincidir** — Mis Tareas y Mis Metas importan **la misma** función `diasHasta` de `servicios/fechas.ts`. No hay dos copias con veredictos opuestos.
**13.7 Ciclo lectivo de una sola fuente** ✅ — `institucion.ciclo_lectivo`; **0** textos "Ciclo 2025" fijos en las pantallas.

**Cómo lo probás vos:** corregí una entrega como `garcia@` con nota 8; entrá como `julieta@` a Mis Tareas y a Calificaciones: las dos muestran **8**, no dos números. Marcá un hábito en el Dashboard de Objetivos y andá a Hábitos: aparece marcado. Es la misma tabla; no hay dónde discrepar.

---

## Qué quedó SIN hacer (pendientes que exceden la limpieza de la Etapa 10)

Estos huecos necesitan **módulos o endpoints nuevos en el servidor**, no limpieza de código. Construirlos sería avanzar a features de etapas previas, así que se dejan documentados, no improvisados:

1. **Diario reflexivo del profesor — editar/borrar y persistir (Errores 3.C.3, y parte de 3.C.6).** No existe módulo de diario en el servidor (no hay `/api/diario`). El diario funciona en la memoria de la pantalla: se puede crear un registro dentro de la sesión, pero editar/borrar no está y no sobrevive a la recarga. *Se quitaron los 3 registros de ejemplo y el "Prof. García" fijo (dato inventado), así que hoy arranca vacío y honesto en vez de mostrar datos falsos.* Falta la tabla-endpoint (`diario_registros` ya existe en el esquema; falta el CRUD en el servidor).
2. **Competencias — cambiar de nivel y borrar evidencia (Error 2.D.12).** Se ven en árbol con evidencias (lectura), pero no hay endpoints de escritura para avanzar de nivel ni eliminar evidencia.
3. **Detalle de curso para la dirección (Error 6.C.2).** Falta un endpoint que devuelva las tareas/contenidos de un curso en modo lectura.
4. **Papelera de perfiles con plazo de 7 días (Error 6.B.5).** El envío/restauración a papelera existe; falta el vencimiento automático a los 7 días y el registro completo de quién borró/restauró.
5. **Votar recursos de la Biblioteca Nacional.** El gesto existe pero no persiste (no hay tabla de votos de recurso); no es un error listado con número, es un pulido pendiente.
6. **Plantillas por institución (Error 5.A.10).** Marcado como *secundario* en el propio informe.

Ninguno de estos afecta a la **Sección 13**: las contradicciones siguen siendo estructuralmente imposibles con o sin estos features.
