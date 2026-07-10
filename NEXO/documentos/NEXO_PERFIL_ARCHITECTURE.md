# 🟢 TIER 1 — Gestión Institucional


## MÓDULO: Gestión de Instituciones
│
│   Acceso: Solo Administrador 🔴
│   Propósito: Crear y configurar escuelas dentro del sistema
│
└─── VISTA: Crear Nueva Institución
     │
     ├─── COMPONENTE: FormularioInstitucion
     │    │
     │    ├─── COMPONENTE: InputNombreInstitucion
     │    │    └─── ACCIÓN: escribirNombre(texto)
     │    │         └─── Valida: nombre único, longitud
     │    │
     │    ├─── COMPONENTE: InputLogoYBranding
     │    │    ├─── ACCIÓN: subirLogo(archivo)
     │    │    │    └─── Valida: formato PNG/JPG, tamaño < 2MB
     │    │    └─── ACCIÓN: seleccionarColoresInstitucionales()
     │    │
     │    ├─── COMPONENTE: SelectorPlantillaInicial
     │    │    ├─── ACCIÓN: seleccionarSistemaCalificaciones()
     │    │    │    └─── Opciones: numérico (1-10), conceptual, personalizado
     │    │    └─── ACCIÓN: seleccionarPeriodosLectivos()
     │    │         └─── Opciones: trimestral, cuatrimestral, anual
     │    │
     │    └─── COMPONENTE: AsignadorAdminAcademico
     │         └─── ACCIÓN: asignarAdministracionAcademica()
     │              └─── Busca y vincula un perfil de Administración Académica
     │
     └─── COMPONENTE: BotonesAccion
          ├─── ACCIÓN: crearInstitucion()
          │    ├─── Valida campos obligatorios
          │    ├─── Crea silo independiente en base de datos
          │    └─── Envía credenciales al Administrador Académico
          └─── ACCIÓN: cancelar()


## MÓDULO: Gestión de Perfiles Académicos
│
│   Acceso: Solo Administración Académica 🟣
│   Propósito: Crear y administrar todos los usuarios de la institución
│
├─── VISTA: Crear Perfil Profesor
│    │
│    ├─── COMPONENTE: FormularioProfesor
│    │    ├─── COMPONENTE: InputDatosBasicos
│    │    │    ├─── ACCIÓN: escribirNombreApellido(texto)
│    │    │    ├─── ACCIÓN: escribirEmail(texto)
│    │    │    └─── ACCIÓN: escribirTelefono(texto)
│    │    │
│    │    ├─── COMPONENTE: AsignadorMaterias
│    │    │    └─── ACCIÓN: asignarMateriasCursos()
│    │    │         └─── Relación triple: Profesor → Materia → Curso
│    │    │
│    │    └─── COMPONENTE: ConfiguradorPermisos
│    │         └─── ACCIÓN: definirPermisosEspecificos()
│    │
│    └─── COMPONENTE: BotonesAccion
│         ├─── ACCIÓN: crearPerfilProfesor()
│         │    └─── Genera credenciales de acceso automáticamente
│         └─── ACCIÓN: cancelar()
│
├─── VISTA: Crear Perfil Estudiante
│    │
│    ├─── COMPONENTE: FormularioEstudiante
│    │    ├─── COMPONENTE: InputDatosBasicos (encriptados 🔒)
│    │    │    ├─── ACCIÓN: escribirNombreApellido(texto)
│    │    │    ├─── ACCIÓN: escribirDNI(texto)
│    │    │         └─── Se encripta en base de datos        
│    │    │
│    │    └─── COMPONENTE: SelectorCurso
│    │         └─── ACCIÓN: asignarCurso() (SI NO HAY CURSO NO SE PUEDE CREAR)
│    │              └─── Un estudiante pertenece a un solo curso
│    │
│    └─── COMPONENTE: BotonesAccion
│         └─── ACCIÓN: crearPerfilEstudiante()
│              └─── Genera credenciales → envía al estudiante/familia
│
├─── VISTA: Creación de Cursos
│    │
│    ├─── COMPONENTE: FormularioCurso
│    │    ├─── COMPONENTE: SelectorAnio
│    │    │    └─── ACCIÓN: seleccionarAnio()
│    │    │         └─── Opciones: 1°, 2°, 3°, 4°, 5°, 6°, 7°
│    │    │
│    │    ├─── COMPONENTE: SelectorDivision
│    │    │    └─── ACCIÓN: seleccionarDivision()
│    │    │         └─── Opciones: A, B, C, D, etc.
│    │    │
│    │    ├─── COMPONENTE: AsignadorPreceptor
│    │    │    └─── ACCIÓN: asignarPreceptor()
│    │    │
│    │    └─── COMPONENTE: AsignadorMaterias
│    │         └─── ACCIÓN: agregarMateriaAlCurso()
│    │              └─── Cada materia se vincula con un profesor responsable
│    │
│    └─── COMPONENTE: PapeleraDeReciclaje
│         └─── ACCIÓN: enviarPerfilAPapelera()
│              ├─── Soft delete → 7 días para restaurar
│              └─── Pasados 7 días → eliminación permanente
│
└─── VISTA: Creación de Centro de Estudiantes
     │
     ├─── COMPONENTE: FormularioCentroEstudiantes
     │    ├─── ACCIÓN: configurarNombreYBranding()
     │    └─── ACCIÓN: definirLimitesDePermisos()
     │         └─── Ej: cantidad de eventos que puede crear 
     │
     └─── COMPONENTE: BotonesAccion
          └─── ACCIÓN: crearPerfilCentroEstudiantes()
               └─── Genera perfil especial con un color

## MÓDULO: Panel de Salud del Sistema
│
│   Acceso: Solo Administrador 🔴
│   Propósito: Monitoreo de infraestructura técnica
│
├─── VISTA: Dashboard de Salud
│    │
│    ├─── COMPONENTE: MetricasRendimiento
│    │    ├─── COMPONENTE: GaugeTiempoDeRespuesta
│    │    │    └─── Muestra: latencia promedio en ms
│    │    │
│    │    ├─── COMPONENTE: GraficoUsoDeRecursos
│    │    │    ├─── Muestra: CPU, memoria, almacenamiento
│    │    │    └─── Alertas en rojo si superan umbral crítico
│    │    │
│    │    └─── COMPONENTE: ContadorUsuariosActivos
│    │         └─── Muestra: sesiones activas en tiempo real
│    │
│    ├─── COMPONENTE: PanelDeAlertasTecnicas
│    │    │
│    │    └─── COMPONENTE: TarjetaAlerta (repetida N veces)
│    │         ├─── Tipo: error, warning, info
│    │         ├─── Descripción del evento
│    │         ├─── Timestamp
│    │         └─── ACCIÓN: marcarComoResuelta()
│    │
│    └─── COMPONENTE: LogsDelSistema
│         │
│         │   Descripción: Todo lo que se mueve en la app,
│         │   sin mostrar datos sensibles encriptados
│         │
│         ├─── COMPONENTE: FiltroDeLogs
│         │    ├─── ACCIÓN: filtrarPorFecha()
│         │    ├─── ACCIÓN: filtrarPorTipo()
│         │    └─── ACCIÓN: buscarEnLogs(texto)
│         │
│         └─── COMPONENTE: TablaLogs (paginada)
│              └─── Columnas: timestamp, módulo, acción, perfil (anonimizado)
│
└─── VISTA: Configuración de Políticas de Privacidad
     │
     ├─── COMPONENTE: ConfiguradorCumplimientoNormativo
     │    └─── ACCIÓN: ajustarPoliticasSegunLegislacion()
     │         └─── Ajustes por país/región educativa
     │
     └─── COMPONENTE: GestorEncriptacion
          └─── ACCIÓN: rotarClavesDeEncriptacion()
               └─── Proceso automatizable, requiere confirmación

## MÓDULO: Panel de Actividades
│
│   Acceso: Solo Administrador 🔴
│   Propósito: Métricas de uso y adaptabilidad del sistema
│
└─── VISTA: Dashboard de Actividades
     │
     ├─── COMPONENTE: MetricasDeUso
     │    ├─── COMPONENTE: GraficoUsuariosActivos
     │    │    └─── Muestra: DAU/WAU/MAU por institución
     │    │
     │    ├─── COMPONENTE: ModulosMasUsados
     │    │    └─── Muestra: ranking de módulos por sesiones
     │    │
     │    └─── COMPONENTE: MapaDeCalor
     │         └─── Muestra: horarios pico de uso
     │
     ├─── COMPONENTE: MetricasPorInstitucion
     │    │
     │    └─── COMPONENTE: TarjetaInstitucion (repetida N veces)
     │         ├─── Nombre, país, usuarios activos
     │         ├─── Engagement general
     │         └─── ACCIÓN: verDetalleInstitucion()
     │
     └─── COMPONENTE: GeneradorDeReportes
          ├─── ACCIÓN: exportarReporteCSV()
          └─── ACCIÓN: exportarReportePDF()
               └─── Datos anonimizados, sin info sensible

# 🟣 TIER 2 — Módulos Operacionales

## MÓDULO: GPortafolio de Aprendizaje
│
│   Acceso: Profesores (creación y gestión), Estudiantes (visualiz. y entrega)
│   Propósito: Gestión integral del trabajo académico cotidiano
│
├─── VISTA: Mis Tareas (Estudiante)
│    │
│    │   URL: /portafolio/mis-tareas
│    │
│    ├─── COMPONENTE: HeaderVista
│    │    ├─── COMPONENTE: TituloSeccion ("Mis Tareas")
│    │    └─── COMPONENTE: BotonNuevaTareaPersonal
│    │         └─── ACCIÓN: abrirFormularioTareaPersonal()
│    │
│    ├─── COMPONENTE: BarraHerramientas
│    │    ├─── COMPONENTE: BuscadorTareas
│    │    │    └─── ACCIÓN: buscarPorTexto(query)
│    │    └─── COMPONENTE: FiltrosAvanzados
│    │         ├─── ACCIÓN: filtrarPorMateria()
│    │         ├─── ACCIÓN: filtrarPorEstado()
│    │         │    └─── Estados: pendiente, en progreso, entregada, vencida
│    │         └─── ACCIÓN: filtrarPorFecha()
│    │
│    └─── COMPONENTE: ListaTareas
│         │
│         └─── COMPONENTE: TarjetaTarea (repetida N veces)
│              ├─── COMPONENTE: BadgeMateria
│              ├─── COMPONENTE: TituloTarea
│              ├─── COMPONENTE: FechaLimite
│              │    └─── Color: verde (>7 días) / amarillo (3-7 días) / rojo (<3 días)
│              ├─── COMPONENTE: MetodoEstudioSugerido (condicional)
│              │    └─── Solo si el profesor lo asignó
│              └─── COMPONENTE: MenuAcciones
│                   ├─── ACCIÓN: abrirDetalle()
│                   ├─── ACCIÓN: marcarEnProgreso()
│                   └─── ACCIÓN: entregar()
│
├─── VISTA: Detalle de Tarea (Estudiante)
│    │
│    ├─── COMPONENTE: HeaderTarea
│    │    ├─── Título, materia, profesor, fecha límite
│    │    └─── COMPONENTE: IndicadorEstado
│    │
│    ├─── COMPONENTE: CuerpoTarea
│    │    ├─── Descripción completa de la consigna
│    │    └─── COMPONENTE: SeccionAdjuntos
│    │         ├─── PDFs, links, imágenes que el profesor subio
│    │         └─── ACCIÓN: descargarAdjunto(archivo)
│    │
│    ├─── COMPONENTE: SeccionMetodoEstudio (condicional)
│    │    └─── Método sugerido por el profesor + opciones de IA
│    │
│    ├─── COMPONENTE: SeccionEntrega
│    │    │
│    │    └─── FUNCIONALIDAD: SubirRespuesta
│    │         ├─── ACCIÓN: seleccionarArchivo()
│    │         ├─── ACCIÓN: escribirComentario()
│    │         └─── ACCIÓN: entregar()
│    │              ├─── Valida que haya contenido
│    │              ├─── Sube archivo al servidor
│    │              ├─── Marca tarea como entregada
│    │              └─── Envía notificación al profesor
│    │
│    └─── COMPONENTE: SeccionReflexion
│         └─── ACCIÓN: escribirReflexionMetacognitiva()
│              └─── "¿Qué aprendí? ¿Qué fue difícil? ¿Qué mejoraría?"
│
├─── VISTA: Gestión de Tareas (Profesor)
│    │
│    ├─── COMPONENTE: ListaTareasCreadas
│    │    │
│    │    └─── COMPONENTE: TarjetaTareaDocente (repetida N veces)
│    │         ├─── Título, curso, materia, fecha límite
│    │         ├─── COMPONENTE: IndicadorEntregas
│    │         │    └─── Muestra: X/Total entregadas
│    │         └─── COMPONENTE: MenuAcciones
│    │              ├─── ACCIÓN: verEntregas()
│    │              ├─── ACCIÓN: editar()
│    │              └─── ACCIÓN: eliminar()
│    │
│    └─── COMPONENTE: BotonCrearTarea
│         └─── ACCIÓN: abrirFormularioCreacion()
│
└─── VISTA: Crear / Editar Tarea (Profesor)
     │
     └─── FUNCIONALIDAD: CrearEditarTarea
          │
          ├─── COMPONENTE: FormularioTarea
          │    ├─── COMPONENTE: InputTitulo
          │    ├─── COMPONENTE: EditorDescripcion (rich text)
          │    ├─── COMPONENTE: SelectorCursoMateria
          │    ├─── COMPONENTE: DatePickerFechaEntrega
          │    ├─── COMPONENTE: UploadAdjuntos
          │    │    └─── ACCIÓN: adjuntarArchivo(archivo)
          │    │         └─── Valida tipo y tamaño. Con un metodo de seguridad
          │    ├─── COMPONENTE: SelectorMetodoEstudio
          │    │    └─── ACCIÓN: asignarMetodoEstudio()
          │    │         └─── Opciones basadas en evidencia científica
          │    └─── COMPONENTE: SelectorAsignacion
          │         └─── Opciones: individual, grupal, por curso completo
          │
          └─── COMPONENTE: BotonesAccion
               ├─── ACCIÓN: guardarTarea()
               │    ├─── Valida campos obligatorios
               │    ├─── Envía a API
               │    └─── Notifica a estudiantes del curso
               └─── ACCIÓN: cancelar()

## MÓDULO: Comunidad
│
│   Acceso: Estudiantes, Profesores, Preceptores, Bibliotecario, Dirección
│   Propósito: Home de la aplicación y espacio de participación colectiva
│   Nota: Es lo primero que ve cualquier usuario al ingresar a la plataforma
│
├─── VISTA: Comunidad Escolar (Home / Feed General)
│    │
│    │   URL: /comunidad
│    │   Acceso: Todos los perfiles
│    │
│    ├─── COMPONENTE: HeaderComunidad
│    │    ├─── Nombre de la institución + branding
│    │    └─── COMPONENTE: BotonNuevoPosteo (condicional por rol)
│    │         └─── ACCIÓN: abrirFormularioPosteo()
│    │
│    ├─── COMPONENTE: FeedPosteos
│    │    │
│    │    └─── COMPONENTE: TarjetaPosteo (repetida N veces)
│    │         │
│    │         ├─── COMPONENTE: HeaderPosteo
│    │         │    ├─── COMPONENTE: AvatarAutor
│    │         │    ├─── COMPONENTE: NombreAutor
│    │         │    │    └─── Con badge de rol (color especial para Admin/Centro)
│    │         │    └─── COMPONENTE: FechaPublicacion
│    │         │
│    │         ├─── COMPONENTE: CuerpoPosteo
│    │         │    └─── Contenido tipo Notion (texto, imágenes, embeds)
│    │         │
│    │         └─── COMPONENTE: AccionesPosteo
│    │              ├─── ACCIÓN: VotarPositivo()
│    │              │    └─── Anónimo. Solo un voto por usuario por posteo
│    │              ├─── ACCIÓN: VotarNegativo()
│    │              │    └─── Anónimo. Solo un voto por usuario por posteo
│    │              ├─── ACCIÓN: AbrirEnDetalle()
│    │              │    └─── Abre vista completa del posteo/hilo
│    │              └─── ACCIÓN: anclarPosteo() (condicional)
│    │                   └─── Solo Admin Académica
│    │
│    ├─── COMPONENTE: BotonCargarMas()
│    │    └─── ACCIÓN: cargarMasPosteos()
│    │         └─── Paginación tipo scroll infinito
│    │
│    ├─── COMPONENTE: FormularioNuevoPosteo
│    │    ├─── Editor rich text tipo Notion (bloques, embeds, multimedia)
│    │    ├─── ACCIÓN: publicarPosteo()
│    │    └─── ACCIÓN: guardarBorrador()
│    │
│    ├─── COMPONENTE: SidebarTendencias (condicional)
│    │    └─── Muestra: palabras más mencionadas,
│    │         artículos más votados (votos positivos - negativos)
│    │
│    └─── COMPONENTE: SeccionQuejas
│         └─── Componente de feedback estudiantil anónimo
│              └─── Solo visibile las quejaspara Admin Académica y Centro de Estudiantes
│
├─── VISTA: Comunidad del Curso
│    │
│    │   URL: /comunidad/curso/:id
│    │   Acceso: Estudiantes del curso, Preceptor asignado, Profesores (con permiso)
│    │   Nota: Espacio privado de cada curso, moderado por el preceptor
│    │
│    ├─── COMPONENTE: HeaderComunidadCurso
│    │    └─── Nombre del curso + preceptor asignado
│    │
│    ├─── COMPONENTE: FeedPosteosCurso
│    │    └─── (misma estructura que TarjetaPosteo del feed general)
│    │
│    ├─── COMPONENTE: FormularioPosteoCurso
│    │    └─── Habilitado solo cuando el preceptor lo abre
│    │
│    └─── COMPONENTE: BloqueadorHorario (condicional)
│         └─── Muestra: "Comunidad bloqueada durante clases"
│              Activado por: Administración Académica
│              Desbloqueo automático: recreos y fuera de horario
│              Desbloqueo manual: Profesor durante su clase
│
├─── VISTA: Debate
│    │
│    │   URL: /comunidad/debate/:id
│    │   Acceso: Todos los perfiles (lectura), permisos diferenciados para escribir
│    │
│    ├─── COMPONENTE: HeaderDebate
│    │    ├─── Título del debate, creador, fecha
│    │    └─── COMPONENTE: BadgeEstado (abierto / cerrado)
│    │
│    ├─── COMPONENTE: HiloDebate
│    │    └─── COMPONENTE: PosteoDebate (repetido N veces)
│    │         ├─── Autor, contenido, votos
│    │         └─── COMPONENTE: RespuestasAnidadas (tipo Reddit)
│    │
│    └─── COMPONENTE: FormularioRespuesta (condicional)
│         └─── Solo si el debate está abierto y el usuario tiene permiso
│
├─── VISTA: Noticias (Vista compartida)
│    │
│    │   URL: /comunidad/noticias
│    │   Acceso: Lectura para todos, escritura solo para Administrador y Admin Académica
│    │
│    └─── COMPONENTE: FeedNoticias
│         └─── COMPONENTE: TarjetaNoticia (repetida N veces)
│              ├─── Título, contenido, fecha, autor
│              └─── ACCIÓN: AbrirEnDetalle()
│
├─── VISTA: Acuerdo Institucional de Convivencia
│    │
│    │   URL: /comunidad/acuerdo-convivencia
│    │   Acceso: Lectura para todos, CRUD solo para Admin Académica
│    │
│    └─── COMPONENTE: DocumentoConvivencia
│         ├─── Editor tipo Notion (solo para Admin Académica)
│         └─── Vista de solo lectura (para estudiantes/profesores)
│
├─── VISTA: Reportes de Auditoría Educativa
│    │
│    │   URL: /comunidad/reportes-auditoria
│    │   Acceso: Solo Administración Académica
│    │
│    └─── COMPONENTE: GeneradorReportes
│         ├─── ACCIÓN: generarReporteInspeccion()
│         └─── ACCIÓN: exportarPDF()
│
└─── VISTA: Calendario Institucional Masivo
     │
     │   URL: /comunidad/calendario
     │   Acceso: CRUD para Admin Académica, lectura para todos
     │
     ├─── COMPONENTE: CalendarioGeneral
     │    ├─── Vista mensual / semanal / agenda
     │    └─── COMPONENTE: EventoCalendario (repetido N veces)
     │         └─── ACCIÓN: verDetalleEvento()
     │
     └─── COMPONENTE: FormularioEvento (condicional)
          └─── Solo Admin Académica y roles autorizados
               ├─── ACCIÓN: crearEvento()
               └─── ACCIÓN: editarEvento()

## MÓDULO: Biblioteca
│
│   Acceso: Todos los perfiles educativos (con permisos diferenciados)
│   Propósito: Repositorio de recursos educativos y materiales complementarios
│
├─── VISTA: Biblioteca Digital Nacional
│    │
│    │   URL: /biblioteca/nacional
│    │   Acceso: Lectura para todos (puede filtrarse por escuela origen)
│    │
│    ├─── COMPONENTE: BuscadorRecursos
│    │    └─── ACCIÓN: buscarRecursos(query)
│    │         └─── Filtros: materia, tipo de recurso, escuela origen, fecha, autor
│    │
│    ├─── COMPONENTE: FeedRecursos
│    │    │
│    │    └─── COMPONENTE: TarjetaRecurso (repetida N veces)
│    │         ├─── Título, tipo (Portadalibro, video, artículo, Librosimulación)
│    │         ├─── Escuela que lo subió
│    │         ├─── Puntaje de votos (tendencia)
│    │         ├─── ACCIÓN: VotarRecurso()
│    │         │    └─── Positivo o negativo, genera tendencia
│    │         └─── ACCIÓN: AbrirRecurso()
│    │
│    └─── COMPONENTE: SidebarTendencias
│         └─── Recursos más votados recientemente
│
├─── VISTA: Biblioteca Digital Institucional
│    │
│    │   URL: /biblioteca/institucional
│    │   Acceso: CRUD para Admin Académica, lectura para todos en la institución
│    │
│    ├─── COMPONENTE: FeedRecursosInstitucionales
│    │    └─── (misma estructura que TarjetaRecurso)
│    │
│    ├─── COMPONENTE: BotonAgregarRecurso (condicional)
│    │    └─── Solo Admin Académica 
│    │         └─── ACCIÓN: subirNuevoRecurso()
│    │
│    └─── COMPONENTE: BotonPresentarRecurso (condicional)
│         └─── Estudiantes y profesores
│              └─── ACCIÓN: presentarRecursoParaAprobacion()
│                   └─── Envía a Cola FIFO para revisión
│
└─── VISTA: Cola FIFO de Libros Presentados
     │
     │   URL: /biblioteca/cola-revision
     │   Acceso: Solo Administración Académica
     │
     ├─── COMPONENTE: ListaEnEspera
     │    │
     │    └─── COMPONENTE: TarjetaRecursoEnEspera (repetida N veces)
     │         ├─── Quién lo presentó, cuándo, descripción
     │         ├─── Preview del recurso
     │         ├─── ACCIÓN: aceptarRecurso()
     │         │    └─── Lo mueve a Biblioteca Institucional y/o Nacional
     │         └─── ACCIÓN: rechazarRecurso()
     │              └─── Notifica al presentador con motivo
     │
     └─── [FLUJO FIFO]
          └─── First In, First Out:
               El primer recurso presentado es el primero en revisarse

## MÓDULO: Portal Centro de Estudiantes
│
│   Acceso: Centro de Estudiantes (escritura), todos (lectura)
│   Propósito: Espacio de representación y participación estudiantil organizada
│
└─── VISTA: Portal Centro de Estudiantes
     │
     │   URL: /centro-estudiantes
     │   Nota: Portal propio dentro de la Comunidad General Escolar
     │
     ├─── COMPONENTE: HeaderPortal
     │    ├─── Nombre del Centro de Estudiantes + logo
     │    └─── Miembros actuales (si corresponde)
     │
     ├─── COMPONENTE: CalendarioPropio
     │    │
     │    │   Descripción: Calendario de actividades editable por el Centro,
     │    │   visible para toda la comunidad escolar
     │    │
     │    ├─── COMPONENTE: VistaMensualCalendario
     │    │    └─── COMPONENTE: EventoCentro (repetido N veces)
     │    │         ├─── Tipo: asamblea, taller, evento, salida
     │    │         └─── ACCIÓN: verDetalleEvento()
     │    │
     │    └─── COMPONENTE: FormularioEvento (solo Centro de Estudiantes)
     │         ├─── ACCIÓN: crearEvento()
     │         │    └─── Límite: 1-5 eventos/mes (define Admin Académica)
     │         └─── ACCIÓN: editarEvento()
     │
     ├─── COMPONENTE: VerQuejasEstudiantes
     │    │
     │    │   Descripción: Sistema de retroalimentación estudiantil anónima
     │    │   (también accesible para Admin Académica)
     │    │
     │    ├─── COMPONENTE: ListaQuejas
     │    │    │
     │    │    └─── COMPONENTE: TarjetaQueja (repetida N veces)
     │    │         ├─── Categoría: metodología, ritmo de clase, convivencia, etc.
     │    │         ├─── Texto anónimo de la queja/sugerencia
     │    │         └─── ACCIÓN: marcarComoVista()
     │    │
     │    └─── COMPONENTE: EstadisticasQuejas
     │         └─── Muestra: temas más frecuentes, tendencias
     │
     ├─── COMPONENTE: GestorArticulos
     │    ├─── COMPONENTE: FeedArticulosCentro
     │    └─── COMPONENTE: FormularioArticulo
     │         ├─── ACCIÓN: publicarArticulo()
     │         └─── ACCIÓN: modificarArticuloPropio()
     │
     └─── COMPONENTE: GestorDebates
          ├─── ACCIÓN: crearDebate()
          ├─── ACCIÓN: aprobarDebate()
          ├─── ACCIÓN: moderarDebate()
          └─── ACCIÓN: eliminarDebate()

## MÓDULO: Portafolio Digital Docente
│
│   Acceso: Solo Profesores 🔵 (cada uno ve el propio)
│   Propósito: Espacio de reflexión, planificación y desarrollo profesional docente
│
└─── VISTA: Portafolio Docente
     │
     │   URL: /portafolio-docente
     │
     ├─── COMPONENTE: DashboardDocente
     │    ├─── Resumen de cursos y materias actuales
     │    ├─── Tareas pendientes de corrección
     │    └─── Próximas clases del calendario
     │
     ├─── VISTA: Registros (Diario de Práctica Reflexiva)
     │    │
     │    │   Descripción: Espacio de registro y reflexión sobre la práctica docente
     │    │
     │    ├─── COMPONENTE: ListaRegistros
     │    │    │
     │    │    └─── COMPONENTE: TarjetaRegistro (repetida N veces)
     │    │         ├─── Fecha, materia, curso
     │    │         ├─── Resumen de la clase
     │    │         ├─── Reflexión: qué funcionó / qué mejorar
     │    │         └─── ACCIÓN: editarRegistro()
     │    │
     │    └─── COMPONENTE: FormularioNuevoRegistro
     │         ├─── COMPONENTE: InputFechaClase
     │         ├─── COMPONENTE: SelectorMateriaCurso
     │         ├─── COMPONENTE: EditorResumenClase
     │         ├─── COMPONENTE: EditorReflexion
     │         │    └─── "¿Qué funcionó? ¿Qué cambiaría? ¿Cómo respondió el grupo?"
     │         └─── ACCIÓN: guardarRegistro()
     │
     ├─── COMPONENTE: PlanificadorClases
     │    │
     │    ├─── COMPONENTE: CalendarioClases
     │    │    ├─── Vista semanal / mensual
     │    │    └─── COMPONENTE: EventoClase (repetido N veces)
     │    │         └─── ACCIÓN: arrastrarYReordenar()
     │    │
     │    └─── COMPONENTE: AsistenteIAPlanificacion
     │         └─── ACCIÓN: pedirSugerenciaIA(descripcionObjetivo)
     │              └─── IA sugiere: actividades, secuencia, recursos
     │
     ├─── COMPONENTE: BancoDeRecursos
     │    └─── Biblioteca personal del docente
     │         ├─── ACCIÓN: subirRecurso()
     │         └─── ACCIÓN: compartirConColegas() (opcional)
     │
     └─── COMPONENTE: MetricasEfectividad
          └─── IA analiza: qué tareas tuvieron mejor engagement y comprensión
               ├─── Tasa de completitud por tarea
               ├─── Tiempo promedio de realización
               └─── Consultas posteriores (indicador de confusión)

## MÓDULO: Panel de Objetivos Personales
│
│   Acceso: Solo Estudiantes 🟢
│   Propósito: Desarrollo de autonomía, metacognición y autorregulación
│   Filosofía: "El aprendizaje profundo ocurre cuando el estudiante
│               toma las riendas de su propio proceso"
│
├─── VISTA: Dashboard Principal
│    │
│    │   URL: /objetivos
│    │
│    ├─── COMPONENTE: ResumenDia
│    │    ├─── Objetivos activos con progreso
│    │    ├─── Hábitos de hoy (check-in pendiente)
│    │    └─── Competencias en desarrollo
│    │
│    ├─── COMPONENTE: CalendarioPersonal
│    │    └─── Tareas, fechas de entrega, metas propias integradas
│    │
│    └─── COMPONENTE: AccesoRapido
│         ├─── → Mis Objetivos
│         ├─── → Mis Hábitos
│         └─── → Mis Competencias
│
├─── VISTA: Mis Objetivos (Metas Académicas)
│    │
│    │   URL: /objetivos/metas
│    │
│    ├─── COMPONENTE: ListaObjetivos
│    │    │
│    │    └─── COMPONENTE: TarjetaObjetivo (repetida N veces)
│    │         ├─── COMPONENTE: TituloObjetivo
│    │         ├─── COMPONENTE: BarraProgreso
│    │         │    └─── Progreso: X% completado
│    │         ├─── COMPONENTE: MateriasVinculadas
│    │         ├─── COMPONENTE: FechaLimite
│    │         │    └─── Color según proximidad
│    │         └─── COMPONENTE: MenuAcciones
│    │              ├─── ACCIÓN: verDetalle()
│    │              ├─── ACCIÓN: editar()
│    │              └─── ACCIÓN: archivar()
│    │
│    └─── COMPONENTE: BotonNuevoObjetivo
│         └─── ACCIÓN: abrirFormularioObjetivo()
│
├─── VISTA: Detalle de Meta Académica
│    │
│    ├─── COMPONENTE: HeaderObjetivo
│    │    ├─── Título, materia, fecha límite
│    │    └─── COMPONENTE: BarraProgresoDetallada
│    │
│    ├─── COMPONENTE: ListaSubtareas
│    │    │
│    │    └─── COMPONENTE: Subtarea (repetida N veces)
│    │         ├─── COMPONENTE: CheckboxSubtarea
│    │         │    └─── ACCIÓN: toggleSubtarea()
│    │         ├─── Descripción de la subtarea
│    │         └─── Vinculación con tarea del profesor (condicional)
│    │
│    ├─── COMPONENTE: DiarioReflexivo
│    │    └─── ACCIÓN: escribirEntradaReflexiva()
│    │         └─── "¿Qué aprendí? ¿Qué fue difícil? ¿Qué sigue?"
│    │
│    └─── COMPONENTE: AsistenteIAaiaiai
│         └─── ACCIÓN: pedirSugerenciaEstudio()
│              └─── IA sugiere métodos según el tipo de contenido
│                   (active recall, práctica espaciada, etc.)
│
├─── VISTA: Mis Hábitos de Estudio
│    │
│    │   URL: /objetivos/habitos
│    │
│    ├─── COMPONENTE: ListaHabitos
│    │    │
│    │    └─── COMPONENTE: TarjetaHabito (repetida N veces)
│    │         ├─── Nombre del hábito (ej: "Estudiar 30 min sin distracciones")
│    │         ├─── Frecuencia: diario / semanal / días específicos
│    │         ├─── COMPONENTE: CalendarioRacha
│    │         │    └─── Visual de días cumplidos (verde) / incumplidos (gris)
│    │         ├─── COMPONENTE: ContadorRacha
│    │         │    └─── "🔥 12 días seguidos"
│    │         └─── ACCIÓN: registrarCumplimiento()
│    │              └─── Check diario del hábito
│    │
│    └─── COMPONENTE: FormularioNuevoHabito
│         ├─── ACCIÓN: escribirNombreHabito(texto)
│         ├─── ACCIÓN: seleccionarFrecuencia()
│         ├─── ACCIÓN: seleccionarHorario() (condicional)
│         └─── ACCIÓN: guardarHabito()
│
├─── VISTA: Matriz de Competencias
│    │
│    │   URL: /objetivos/competencias
│    │
│    ├─── COMPONENTE: MatrizCompetencias
│    │    │
│    │    │   Estructura: Competencias (filas) × Materias (columnas)
│    │    │
│    │    └─── COMPONENTE: CeldaCompetencia (repetida N×M veces)
│    │         ├─── Nivel: Inicial / En desarrollo / Avanzado / Experto
│    │         └─── ACCIÓN: verEvidencias()
│    │
│    └─── COMPONENTE: ListaCompetencias
│         └─── COMPONENTE: TarjetaCompetencia (repetida N veces)
│              ├─── Nombre (ej: Pensamiento Crítico, Creatividad, Colaboración)
│              ├─── Nivel actual con escala visual
│              ├─── COMPONENTE: ListaEvidencias
│              │    └─── COMPONENTE: EvidenciaItem (repetida N veces)
│              │         ├─── Trabajo o proyecto asociado
│              │         ├─── Reflexión del estudiante
│              │         └─── ACCIÓN: eliminarEvidencia()
│              └─── ACCIÓN: agregarEvidencia()
│
└─── VISTA: Detalle de Competencia
     │
     ├─── COMPONENTE: HeaderCompetencia
     │    ├─── Nombre y descripción de la competencia
     │    └─── COMPONENTE: IndiceDesarrollo (Inicial → Experto)
     │
     ├─── COMPONENTE: HistorialEvidencias
     │    └─── COMPONENTE: EvidenciaDetallada (repetida N veces)
     │         ├─── Trabajo/proyecto vinculado
     │         ├─── Reflexión metacognitiva del estudiante
     │         ├─── Materia y fecha
     │         └─── Sugerencia de IA (cómo seguir desarrollando)
     │
     └─── MODAL: Agregar Evidencia
          ├─── COMPONENTE: SelectorTrabajo
          │    └─── Vincula con tarea/proyecto existente
          ├─── COMPONENTE: EditorReflexion
          │    └─── "¿Cómo demuestro esta competencia en este trabajo?"
          └─── ACCIÓN: guardarEvidencia()

     ─────────────────────────────────────────────
     MODALS COMPARTIDOS:
     ─────────────────────────────────────────────

     MODAL: Crear Objetivo
     ├─── InputTituloObjetivo
     ├─── SelectorMateriaVinculada
     ├─── DatePickerFechaLimite
     ├─── EditorSubtareas (agregado dinámico)
     └─── guardarObjetivo()

     MODAL: Crear Hábito
     ├─── InputNombreHabito
     ├─── SelectorFrecuencia
     └─── guardarHabito()

     MODAL: Agregar Evidencia de Competencia
     ├─── SelectorTrabajo (desde portafolio)
     ├─── EditorReflexionMetacognitiva
     └─── guardarEvidencia()

     MODAL: Celebración de Logro 🎉
     └─── Aparece al: completar objetivo, lograr racha,
          subir nivel de competencia
          (Sin puntos ni rankings - solo celebración cualitativa)

     ─────────────────────────────────────────────
     CONEXIONES CON OTROS MÓDULOS:
     ─────────────────────────────────────────────
     Objetivos ↔ Portafolio de Aprendizaje (tareas como evidencias)
     Hábitos ↔ Calendario Personal (recordatorios integrados)
     Competencias ↔ IA (sugerencias de recursos y actividades)
     Competencias ↔ Portafolio de Aprendizaje (trabajos como evidencias)


## MÓDULO: Asistencia Académica
│
│   Acceso: Estudiantes (uso directo), Profesores (configuración y análisis)
│   Propósito: IA como tutora adaptativa y asistente pedagógico
│   Principio: "La IA sugiere caminos, el estudiante y el profesor
│               deciden la ruta"
│
├─── VISTA: Chat con IA (Estudiante)
│    │
│    │   URL: /asistencia-academica
│    │   Acceso a contexto: nombre, curso, materias, historial, objetivos activos
│    │
│    ├─── COMPONENTE: HistorialConversacion
│    │    │
│    │    └─── COMPONENTE: BurbujaMensaje (repetida N veces)
│    │         ├─── Tipo: usuario (derecha) / IA (izquierda)
│    │         └─── Contenido: texto, sugerencias, ejercicios
│    │
│    ├─── COMPONENTE: AreaInput
│    │    ├─── COMPONENTE: InputPregunta
│    │    └─── ACCIÓN: enviarPregunta()
│    │
│    └─── COMPONENTE: SugerenciasRapidas
│         └─── Botones de contexto rápido:
│              ├─── "Explicame este concepto"
│              ├─── "Dame ejercicios de práctica"
│              ├─── "Ayúdame a organizar mi estudio"
│              └─── "Revisa mi redacción"
│
├─── CAPACIDADES POR PERFIL
│
│    ├─── [Para Estudiantes]
│    │    ├─── Tutor Adaptativo
│    │    │    └─── Explica conceptos desde múltiples ángulos,
│    │    │         detecta brechas conceptuales
│    │    │
│    │    ├─── Mediador Socrático
│    │    │    └─── Hace preguntas guía en vez de dar respuestas directas
│    │    │         a tareas evaluables
│    │    │
│    │    ├─── Generador de Ejercicios
│    │    │    └─── Crea práctica personalizada con dificultad creciente
│    │    │
│    │    ├─── Asistente de Métodos de Estudio
│    │    │    └─── Sugiere: recuperación activa, práctica espaciada,
│    │    │         elaboración, ejemplos concretos
│    │    │         ⚠️ NUNCA sugiere "estilos de aprendizaje" (pseudociencia)
│    │    │
│    │    ├─── Asistente de Redacción Académica
│    │    │    └─── Ayuda a estructurar, NO escribe por el estudiante
│    │    │
│    │    └─── Analizador de Patrones
│    │         └─── Identifica horarios productivos y áreas de dificultad
│    │
│    └─── [Para Profesores]
│         ├─── Asistente de Planificación Docente
│         │    └─── Sugiere secuencias didácticas y actividades
│         │
│         ├─── Curador de Contenidos
│         │    └─── Busca y filtra recursos externos de calidad
│         │
│         ├─── Análisis de Efectividad
│         │    └─── Mide qué actividades tuvieron mejor engagement
│         │
│         └─── Detección de Estudiantes en Riesgo
│              └─── Identifica patrones: caída en entregas, aumento de consultas,
│                   reducción de participación
│                   → Alerta discreta SOLO al profesor del estudiante
│
└─── RESTRICCIONES (siempre activas)
     ├─── ❌ NO resuelve tareas evaluables por el estudiante
     ├─── ❌ NO comparte info entre usuarios sin permiso
     ├─── ❌ NO toma decisiones pedagógicas autónomas
     ├─── ❌ NO accede a datos de otras instituciones
     └─── ❌ NO lee chats privados (solo analiza comunidad pública)

# 🔵 TIER 3 — Infraestructura / Servicios

## SERVICIO: Gestión de Archivos
│
│   Tipo: Infraestructura invisible (sin interfaz propia)
│   Consumidores: Módulo de Portafolio, Comunidad, Chat, Biblioteca
│
├─── FUNCIONALIDADES
│    │
│    ├─── FUNCIONALIDAD: SubidaSegura
│    │    └─── PROCESO:
│    │         1. Validar tipo de archivo (whitelist de extensiones)
│    │         2. Validar tamaño (límite por tipo)
│    │         3. Escanear contenido (detección de malware)
│    │         4. Comprimir y optimizar (si aplica)
│    │         5. Almacenar en cloud storage
│    │         6. Generar URL firmada con expiración
│    │
│    ├─── FUNCIONALIDAD: AccesoControlado
│    │    └─── PROCESO:
│    │         1. Validar permisos del solicitante (RBAC)
│    │         2. Verificar que el archivo pertenece al contexto del usuario
│    │         3. Generar URL temporal firmada
│    │         4. Registrar acceso en logs
│    │
│    └─── FUNCIONALIDAD: GestionEliminacion
│         └─── PROCESO:
│              1. Soft delete (marcar como eliminado)
│              2. Mover a papelera de reciclaje (7 días)
│              3. Eliminación permanente programada
│
└─── RESTRICCIONES
     ├─── Solo Admin Académica y Profesores pueden subir archivos directamente
     ├─── Estudiantes: solo a través de entregas de tareas
     └─── URLs firmadas expiran automáticamente

## SERVICIO: Estructura IA
│
│   Tipo: Infraestructura transversal
│   Consumidores: Módulo de Asistencia Académica, Comunidad, Panel de Objetivos
│
├─── ARQUITECTURA MULTIMODELO
│    │
│    ├─── Modelo de Lenguaje (LLM)
│    │    └─── Para: conversaciones, explicaciones, planificación docente
│    │
│    ├─── Modelo de Clasificación
│    │    └─── Para: detección de contenido inapropiado en comunidad
│    │
│    ├─── Modelo de Recomendación
│    │    └─── Para: sugerencias de recursos educativos personalizados
│    │
│    ├─── Modelo de Análisis de Sentimiento
│    │    └─── Para: clima escolar en comunidad del curso
│    │
│    └─── Modelo de Detección de Anomalías
│         └─── Para: identificar estudiantes en riesgo académico
│
├─── CONTEXTO QUE CONOCE SOBRE EL USUARIO
│    ├─── Identidad: nombre, rol, curso, materias
│    ├─── Historial: tareas, calificaciones, objetivos activos
│    ├─── Patrones: hábitos registrados, horarios de actividad
│    └─── Contexto de invocación: desde qué módulo se llama
│
├─── PRIVACIDAD Y LÍMITES
│    ├─── ✅ Datos anonimizados para entrenamiento
│    ├─── ✅ Silos por institución (una escuela no ve datos de otra)
│    ├─── ❌ NO accede a chats privados
│    ├─── ❌ NO comparte conversaciones entre usuarios
│    └─── ❌ NO identifica estudiantes en dataset de entrenamiento
│
└─── DETECCIÓN DE MAL USO
     └─── Si el estudiante pide que la IA haga su tarea completa:
          RESPUESTA: "Entiendo que necesitas ayuda, pero no puedo
          escribir el trabajo por ti. En su lugar, puedo:
          1. Ayudarte a entender el tema
          2. Sugerirte estructura
          3. Revisar tu borrador y dar feedback
          ¿Por cuál empezamos?"

# 🔄 INTERCONEXIONES CRÍTICAS ENTRE MÓDULOS

## 🏗️ Arquitectura de Flujos Cruzados

PORTAFOLIO DE APRENDIZAJE
        ↕
OBJETIVOS PERSONALES ←→ ASISTENCIA ACADÉMICA (IA)
        ↕
PANEL DE SALUD (métricas)

COMUNIDAD ←→ NOTIFICACIONES
     ↕
BIBLIOTECA ←→ ASISTENCIA ACADÉMICA (IA, curación de recursos)

CHAT (Profesor ↔ Estudiante)
     ↕
PORTAFOLIO DE APRENDIZAJE (contexto de consultas)

GESTIÓN DE PERFILES ←→ SISTEMA DE PERMISOS (RBAC)
     ↓
TODOS LOS MÓDULOS (validan permisos en cada acción)

GESTIÓN DE ARCHIVOS → consumido por:
├─ Portafolio (entregas)
├─ Comunidad (adjuntos en posteos)
├─ Chat (adjuntos)
└─ Biblioteca (recursos)