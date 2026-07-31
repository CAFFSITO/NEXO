

# PROMPT 13 — Comunidad: postear con fecha, permisos de dirección/centro, y sacar fijados

```
Tarea: tres arreglos de la comunidad/comunicados, backend Y frontend juntos:
(a) se tiene que poder postear con fecha programada (elegir cuándo se publica);
(b) la dirección (admin-academico) y el centro de estudiantes tienen que poder
postear — el servidor ya los deja (PUEDE_PUBLICAR en servidor/comunidad.js los
incluye), pero el frontend no les muestra el compositor o falla: encontrá dónde se
corta y arreglalo;
(c) la dirección puede FIJAR y DESFIJAR publicaciones/comunicados (hoy "fijado" es
decoración: con el Prompt 12 ya existe fijado_en/fijado_por_id en la base).

Contexto que tenés que leer antes de tocar nada:
- servidor/comunidad.js → PUEDE_PUBLICAR, cómo crea publicaciones y cómo valida
  institución. Acá van publicar_en y fijar/desfijar de publicaciones.
- El módulo del servidor que sirve los comunicados de la dirección (buscalo:
  institucion.js o donde esté) → ahí va fijar/desfijar de comunicados.
- NEXO/src/paginas/ComunidadPage.tsx, PortalCentroEstudiantesPage.tsx,
  PanelInstitucionalPage.tsx y components/comunidad/ (TarjetaPosteo, MenuTresPuntos)
  → el compositor y el menú de acciones por publicación.
- NEXO/src/servicios/comunidad.ts → el servicio del frontend.

Construí en el servidor:
- Al crear publicación/comunicado: aceptar publicar_en opcional (fecha-hora ISO
  futura; si viene en el pasado o no viene, se publica ya). Validá el formato.
- TODOS los listados (feed, tendencias, comunicados) excluyen filas con publicar_en
  futuro, salvo para su autor, que la ve marcada como "programada".
- POST /api/comunidad/publicaciones/:id/fijar y .../desfijar (o PUT con {fijado}):
  SOLO rol admin-academico de la MISMA institución. Igual para comunicados. Setea o
  limpia fijado_en/fijado_por_id. Permiso en el servidor, no escondiendo botones.
- Los listados devuelven fijado (y ordenan los fijados arriba donde corresponda).

Construí en el frontend:
- En el compositor: un selector opcional de fecha/hora de publicación ("Publicar
  ahora" por defecto). El autor ve sus programadas con la etiqueta y la fecha.
- Que dirección y centro de estudiantes VEAN y puedan usar el compositor (arreglando
  lo que hoy se los impide), sin dárselo a preceptor/bibliotecario (solo lectura).
- En MenuTresPuntos (o donde vaya): "Fijar"/"Desfijar" visible solo para la
  dirección, conectado a los endpoints. El pin que se ve en las tarjetas sale del
  dato real fijado_en, no de decoración.

Reglas innegociables:
- Ningún dato inventado: fijados y programadas salen de nexo.db.
- Permisos en el servidor (fijar/desfijar = solo dirección; publicar = el set
  PUEDE_PUBLICAR); el frontend solo refleja.
- Reutilizá el patrón de comunidad.js y los componentes existentes; no dupliques.
- No toques el sistema de navegación.
- Backend y frontend se entregan JUNTOS y probados.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: (a) con julieta@ programá un posteo para dentro de 5 minutos,
   verificá que los demás NO lo ven y que a los 5 minutos aparece; (b) con
   direccion@ y con centro@ publicá un posteo normal y verificá que sale en el feed;
   (c) con direccion@ desfijá el comunicado fijado del seed y verificá que el pin
   desaparece para todos; con julieta@ verificá que NO existe la opción de fijar y
   que pedir el endpoint a mano da 403.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 14 — Calendario: que los eventos le aparezcan a todos los que corresponde

```
Tarea: arreglar que el calendario no le aparece a todos los que debería. Un evento
creado con un alcance (ej. "todos" o "curso") tiene que verse en el calendario de
TODAS las cuentas alcanzadas, no solo en la de quien lo creó. Hay que encontrar la
causa real (no parchear a ciegas): puede estar en cómo se guardan las capas de
evento_visibilidad al crear, en la consulta que decide qué ve cada uno, o en qué
alcances ofrece el selector del frontend a cada rol.

Contexto que tenés que leer antes de tocar nada:
- servidor/calendario.js → LEELO ENTERO: la consulta de visibilidad (los OR de
  alcances sobre evento_visibilidad), validarVisibilidad, ALCANCES_POR_ROL y el
  endpoint de creación. La lógica parece completa: el bug está en algún detalle
  (capas que no se insertan, un alcance que la consulta no cubre, institución mal
  filtrada, o el frontend que manda mal las capas).
- base-de-datos/esquema.sql → eventos y evento_visibilidad.
- NEXO/src/paginas/CalendarioInstitucionalPage.tsx, FamiliaCalendarioPage.tsx y
  components/calendario/ModalNuevoEvento.tsx → cómo se eligen y mandan los alcances.
- NEXO/src/servicios/ (el servicio de calendario) → qué manda exactamente al crear.

Construí:
1. PRIMERO diagnosticá y contame la causa: creá un evento con cada alcance usando
   las cuentas de prueba y mirá qué filas quedan en evento_visibilidad y qué
   devuelve GET para cada cuenta. Decime exactamente dónde se corta.
2. Arreglá la causa real donde esté (servidor o frontend). Si un alcance del esquema
   no está cubierto por la consulta, cubrilo; si el frontend no manda las capas,
   arreglá el modal; si el seed no tiene capas, corregí el seed.
3. Verificá TODOS los alcances de ALCANCES_POR_ROL: para cada rol que puede crear,
   un evento de cada alcance que ofrece, visto desde una cuenta alcanzada y una NO
   alcanzada.

Reglas innegociables:
- Ningún dato inventado; nada de "mostrar todo a todos" para tapar el bug: la
  visibilidad por capas se respeta, solo que tiene que FUNCIONAR.
- Permisos en el servidor (validarVisibilidad sigue mandando).
- No rehagas el módulo: encontrá y arreglá el defecto puntual.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Cuál era la causa exacta del bug y qué archivos cambiaste.
2. Cómo lo pruebo yo: con direccion@ creá un evento alcance "todos" y verificá que
   lo ven julieta@, garcia@ y familia.rossi@; con garcia@ uno de "curso" y verificá
   que lo ve julieta@ (su curso) y NO un alumno de otro curso; con pereyra@ uno para
   familias y verificá que lo ve familia.rossi@.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 15 — Unificación de UI: todos los perfiles usan los mismos elementos

```
Tarea: terminar con las dos (o tres) versiones de cada elemento. El caso más grave:
las tareas del PROFESOR (GestionTareasProfesorPage, con ModalTareaDocente y
TarjetaTareaDocente) tienen su propia UI, distinta de la de las tareas del
ESTUDIANTE (estilo Todoist: TarjetaTarea, ModalDetalleTarea, ModalNuevaTareaPersonal
en components/portafolio/). Hay que hacer que el profesor use LOS MISMOS componentes
base que el estudiante, con las acciones propias de su rol, y dejar esos componentes
en un lugar compartido para que cualquier perfil futuro los reutilice.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/paginas/components/portafolio/ → TarjetaTarea, ModalDetalleTarea,
  ModalNuevaTareaPersonal, tiposTareas.ts: esta es la UI "buena" (estilo Todoist)
  que queda como única.
- NEXO/src/paginas/components/portafolio-docente/ → TarjetaTareaDocente,
  ModalTareaDocente, ModalPanelCorreccion: la UI duplicada del profesor. Lo que sea
  acción exclusiva del docente (corregir, ver entregas) se conserva; la cáscara
  visual duplicada muere.
- NEXO/src/paginas/MisTareasEstudiantePage.tsx y GestionTareasProfesorPage.tsx →
  las dos pantallas a unificar.
- NEXO/src/paginas/components/shared/ → acá (ej. shared/tareas/) van los
  componentes unificados si hace falta moverlos.

Construí:
1. Extraé los componentes de tarea del estudiante a components/shared/tareas/ (o
   dejalos donde están y importalos desde el profesor: elegí lo que menos rompa) y
   hacé que GestionTareasProfesorPage use TarjetaTarea y ModalDetalleTarea como
   base. Las acciones del docente (corregir, ver entregas, editar la tarea) entran
   como props/slots de esos componentes, NO como componentes paralelos.
2. Borrá los duplicados que queden sin uso (TarjetaTareaDocente, ModalTareaDocente)
   cuando ya nada los importe. ModalPanelCorreccion se conserva: es funcionalidad
   exclusiva del docente, no un duplicado.
3. Pasada rápida por el resto de los perfiles: donde detectes el mismo elemento
   dibujado dos veces (tarjetas, modales, badges de estado), anotalo en la
   respuesta final aunque no lo unifiques ahora.

Reglas innegociables:
- Cero cambios en el servidor y en los datos: esto es SOLO frontend.
- La vista del estudiante NO puede cambiar de aspecto ni de comportamiento.
- No dupliques: un componente, dos usos con props; no dos componentes parecidos.
- No toques el sistema de navegación.
- yarn tsc --noEmit y yarn vite build tienen que pasar sin errores al final.

Cuando termines, decime:
1. Qué archivos cambiaste/moviste/borraste y por qué.
2. Cómo lo pruebo yo: con julieta@ verificá que Mis Tareas está IGUAL que antes;
   con garcia@ verificá que sus tareas ahora se ven con las mismas tarjetas y modal
   que el estudiante, y que corregir y ver entregas siguen andando.
3. Qué quedó sin hacer y la lista de duplicados que detectaste para futuras pasadas.
```

---

# PROMPT 16 — Rendimiento: los modales de creación no pueden tildar la computadora

```
Tarea: los modales de creación (nueva tarea, nuevo evento del calendario, etc.)
están tan mal optimizados que tildan la computadora entera. Hay que encontrar la
causa REAL con el profiler (no adivinar) y arreglarla. Sospechosos típicos: la
página entera re-renderizándose en cada tecla porque el estado del formulario vive
arriba; listas grandes sin memo detrás del modal; efectos o intervalos que quedan
corriendo; CSS caro (backdrop-filter/blur animado) sobre toda la pantalla.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/paginas/components/calendario/ModalNuevoEvento.tsx
- NEXO/src/paginas/components/portafolio/ModalNuevaTareaPersonal.tsx y
  ModalDetalleTarea.tsx
- NEXO/src/paginas/components/portafolio-docente/ModalTareaDocente.tsx (si sigue
  existiendo tras el Prompt 15; coordiná con ese prompt)
- Las páginas que los montan (CalendarioInstitucionalPage, MisTareasEstudiantePage,
  GestionTareasProfesorPage) → dónde vive el estado del formulario y qué se
  re-renderiza al tipear.
- NEXO/src/paginas/components/shared/BackgroundGlow.tsx → si hay efectos visuales
  animados de fondo, mirá si siguen animando (y costando GPU) debajo del modal.

Construí:
1. Medí ANTES: abrí cada modal con el Profiler de React DevTools y la pestaña
   Performance del navegador, tipeá en un campo, y anotá qué componentes se
   re-renderizan y cuánto tarda cada commit. Decime qué encontraste.
2. Arreglá la causa real. Recetas permitidas (aplicá las que correspondan):
   - Estado del formulario LOCAL al modal (que tipear no re-renderice la página).
   - React.memo / useMemo / useCallback donde el profiler lo justifique (no en todo).
   - Montar el modal solo cuando está abierto (render condicional, no display:none
     con todo montado).
   - Limpiar intervalos/efectos al cerrar; pausar animaciones de fondo bajo el modal.
   - Reemplazar CSS caro (blur gigante animado) por algo barato equivalente.
3. Medí DESPUÉS con el mismo método y mostrame la comparación (commits y ms).

Reglas innegociables:
- Cero cambios de comportamiento: los formularios crean exactamente lo mismo.
- Nada de sacar funcionalidad para que "vuele"; se optimiza, no se amputa.
- Optimizaciones justificadas por el profiler, no memo por las dudas en todo.
- No toques el servidor ni el sistema de navegación.

Cuando termines, decime:
1. Qué causaba el tildado (con los números del profiler antes/después) y qué
   archivos cambiaste.
2. Cómo lo pruebo yo: abrí el modal de nueva tarea con julieta@ y el de nuevo
   evento con direccion@, tipeá rápido un texto largo, y la máquina no se tiene que
   tildar; el ventilador tampoco tiene que despegar con el modal abierto quieto.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 17 — Videollamadas propias: WebRTC sin servicio externo (chau Jitsi)

```
Tarea: reemplazar Jitsi por un sistema de videollamadas PROPIO. No podemos depender
de un servicio externo que se puede romper, cortar o cambiar sus reglas. La solución:
WebRTC nativo del navegador (RTCPeerConnection, sin librerías de servicio) con
nuestra propia señalización sobre el WebSocket que YA tenemos en
servidor/tiempo-real.js. Topología malla (mesh): cada participante conecta con cada
otro; alcanza para un aula de hasta ~8–10 cámaras y no necesita ningún servidor de
video.

Contexto que tenés que leer antes de tocar nada:
- servidor/tiempo-real.js → el WebSocket existente (canales, ping/pong). La
  señalización (ofertas/respuestas SDP y candidatos ICE) viaja por acá: sumá tipos
  de mensaje nuevos siguiendo su patrón, no abras otro WebSocket.
- servidor/aula.js → cómo se crea/entra a una sala hoy y qué permisos valida
  (profesor dueño de la cátedra, alumnos inscriptos). Los permisos QUEDAN: solo
  cambia el transporte del video.
- NEXO/src/paginas/components/aula-virtual/SalaJitsi.tsx y SalaClase.tsx →
  SalaJitsi muere; SalaClase se conecta al sistema nuevo. La pizarra, el pulso, el
  chat de clase y la alerta de ritmo (Etapa 9) NO se tocan: siguen andando igual.
- NEXO/src/servicios/aula.ts → el servicio del frontend.
- NEXO/package.json → al terminar, la dependencia de Jitsi se va del package.json.

Construí en el servidor (tiempo-real.js + aula.js):
- Mensajes de señalización por sala: unirse-video, oferta, respuesta, candidato-ice,
  salir-video. El servidor solo REENVÍA la señalización entre miembros de la MISMA
  sala; valida sesión y pertenencia a la sala antes de reenviar (permiso en el
  servidor, como siempre). No procesa media: el video va directo entre navegadores.
- Aviso a la sala cuando alguien entra o se va, para abrir/cerrar las conexiones.

Construí en el frontend:
- Un módulo de conexión (ej. NEXO/src/servicios/videollamada.ts): getUserMedia,
  una RTCPeerConnection por par, negociación oferta/respuesta y candidatos ICE por
  el WebSocket. Sin servidores STUN/TURN externos: en la red local de una escuela
  los candidatos host alcanzan; dejá el campo iceServers configurable y VACÍO por
  defecto, y documentá en un comentario que si algún día hace falta atravesar NAT
  se agrega un STUN/TURN propio, no uno ajeno.
- Un componente de sala propio (ej. aula-virtual/SalaVideo.tsx) que reemplaza a
  SalaJitsi en SalaClase: grilla de videos con nombre real de cada participante,
  micrófono y cámara con mute, compartir pantalla (getDisplayMedia), y salir.
  Estados honestos: "esperando participantes", "cámara denegada", "conexión caída
  con tal persona" (no congelar en silencio).
- Borrá SalaJitsi.tsx y la dependencia de Jitsi cuando nada las importe.

Reglas innegociables:
- CERO servicios externos: ni Jitsi, ni STUN/TURN de terceros, ni CDN. Todo lo que
  hace falta corre en nuestro servidor o en el navegador.
- Permisos en el servidor: solo miembros de la sala reciben señalización.
- Pizarra, pulso, chat de clase y alerta de ritmo siguen funcionando igual.
- Reutilizá tiempo-real.js; no abras un segundo WebSocket ni dupliques helpers.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste/borraste y por qué, y confirmá que Jitsi ya no
   está en package.json.
2. Cómo lo pruebo yo: con garcia@ abrí el aula virtual de su cátedra en una ventana
   y con julieta@ en otra ventana (o mejor, otra computadora de la misma red);
   verificá que se ven y escuchan, que el mute y compartir pantalla andan, que al
   cerrar una ventana la otra lo refleja, y que la pizarra y el chat de clase
   siguen andando. Verificá también que un alumno de otro curso no puede entrar.
3. Qué quedó sin hacer, si algo quedó (ej. límite de participantes probado, TURN
   propio para acceso desde fuera de la red).
```

---

## Checklist final (marcá a medida que probás)

- [ ] Prompt 1 — Base preparada; recreada con `--forzar`; tablas nuevas con datos de ejemplo.
- [ ] Prompt 2 — Diario del profesor: crear/editar/borrar y sobrevive a F5.
- [ ] Prompt 3 — Competencias: cambio de nivel y borrado de evidencia persisten.
- [ ] Prompt 4 — Detalle de curso de la dirección con materias, alumnos y tareas reales.
- [ ] Prompt 5 — Papelera: purga programada + historial auditable + "quedan N días".
- [ ] Prompt 6 — Voto de recursos nacionales persiste y es único por usuario.
- [ ] Prompt 7 — Sidebar de tendencias en el Feed, pulsable, lleva a Tendencias.
- [ ] Prompt 8 — Mis Cursos con subnavegación; se vuelve a Tareas/Calificaciones.
- [ ] Prompt 9 — Detalle de materia del estudiante: profesor, horarios, avisos (reacción/
      respuesta), tareas.
- [ ] Prompt 10 — Vista de materia del profesor: avisos, alumnos, gráficos de progreso (solo
      profesor, validado en el servidor), tareas hechas/adeudadas.
- [ ] Prompt 11 — (Opcional) Plantillas por institución.
- [ ] Prompt 12 — Base 2: publicar_en + fijado_en/fijado_por en la base, con seed.
- [ ] Prompt 13 — Postear con fecha programada; dirección y centro postean; la
      dirección fija/desfija (validado en el servidor).
- [ ] Prompt 14 — Calendario: los eventos aparecen a TODOS los alcanzados (probado
      alcance por alcance).
- [ ] Prompt 15 — Tareas del profesor con los mismos componentes (Todoist) del
      estudiante; duplicados borrados.
- [ ] Prompt 16 — Modales de creación fluidos: profiler antes/después, sin tildar la
      máquina.
- [ ] Prompt 17 — Videollamadas propias por WebRTC + tiempo-real.js; Jitsi eliminado.

> Después del último que hagas: `yarn tsc --noEmit` y `yarn vite build` en `NEXO/` deben pasar
> sin errores, y `node --check` en cada archivo nuevo del servidor. Sacá la foto con git.
</content>
</invoke>
