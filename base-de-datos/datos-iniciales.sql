
-- ============================================================================
-- NEXO — Datos iniciales de demostración (coherentes)
-- ----------------------------------------------------------------------------
-- Este juego de datos reemplaza a los ejemplos contradictorios que hoy viven
-- dentro de las pantallas (sección 13 de ERRORES_DETALLADOS.md). Acá hay UNA
-- sola verdad: cada docente tiene un nombre y una materia, cada curso un
-- preceptor, cada trabajo una nota.
--
-- Contraseña de TODAS las cuentas de demostración: nexo1234
-- Guardada con scrypt y una sal distinta para cada usuario, por eso los 18
-- hashes son diferentes aunque la contraseña sea la misma. El formato es
-- scrypt$N$r$p$sal$hash y lo produce servidor/contrasenas.js, único lugar del
-- proyecto que cifra y verifica contraseñas.
--
-- Las fechas de ejemplo giran alrededor de julio de 2026.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ── Institución ─────────────────────────────────────────────────────────────
INSERT INTO instituciones (id, nombre, ciclo_lectivo) VALUES
  (1, 'Colegio San Martín', 2026);

-- ── Usuarios (contraseña de todos: nexo1234) ───────────────────────────────
INSERT INTO usuarios (id, institucion_id, email, hash_contrasena, nombre, rol, avatar_url) VALUES
  (1,  1, 'direccion@sanmartin.nexo.edu', 'scrypt$16384$8$1$7637e2889f3186d12fcf039259d556c6$1d8baef742eda924b4832c40cbf16743cce34480803b5bf2b6e94fa84e77c4ba', 'Directora Ana Romero',        'admin-academico',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Romero'),
  (2,  1, 'garcia@sanmartin.nexo.edu',    'scrypt$16384$8$1$ad8f285ef3bd2719bef6a5abbe58277c$9fee35530618032c6f433563b8285e52284c0260c79741c18cb537e061e6635b', 'Prof. Diego García',          'profesor',          'https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia'),
  (3,  1, 'lombardi@sanmartin.nexo.edu',  'scrypt$16384$8$1$2c30818f07ac4d6ade99fa779376bdad$7c8f85b9a3573a68765851f188ea5c7c09abcad8946c77a6903b8e574881061b', 'Prof. Silvia Lombardi',       'profesor',          NULL),
  (4,  1, 'mendez@sanmartin.nexo.edu',    'scrypt$16384$8$1$faabcb3e8a674cae788babff63b445fc$e9e2e6dfdb980384a90a4f9f01a7e03acce0600ddf860aa1630effbfb3104f86', 'Prof. Hernán Méndez',         'profesor',          NULL),
  (5,  1, 'sosa@sanmartin.nexo.edu',      'scrypt$16384$8$1$ab06080d92b475b49c6fb9179c5bc3fc$047fada1d7b81707f9145509a11f0f725d57fe9c70bf97f539eea5bda75597a0', 'Prof. Carolina Sosa',         'profesor',          NULL),
  (6,  1, 'pereyra@sanmartin.nexo.edu',   'scrypt$16384$8$1$d6d8ea360e024f54f882b1058e2f05c5$0f9e4d28852b5121147f974ad194ba6aec80a44bcf3d2f6f77fd001dcb96e35e', 'Carlos Pereyra',              'preceptor',         'https://api.dicebear.com/7.x/avataaars/svg?seed=Pereyra'),
  (7,  1, 'martinez@sanmartin.nexo.edu',  'scrypt$16384$8$1$62c6e012cedfed89f123d4847ecd9999$e80509113d0593280b42ebe3676973761d6bd3ad6c524a0573513a51f34f8084', 'Preceptora Laura Martínez',   'preceptor',         NULL),
  (8,  1, 'julieta@sanmartin.nexo.edu',   'scrypt$16384$8$1$e7f462885b2fb8f8c916dae036664b42$00f350016500265a887e83bfbc2a82b9f90368da1a61a6e17a07bda49b943d58', 'Julieta Rossi',               'estudiante',        'https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta'),
  (9,  1, 'martin@sanmartin.nexo.edu',    'scrypt$16384$8$1$5bd7307a7c0f56edee08ee9f48645b9a$7f91bf52f8ccf152eab9d91e7120a4eec1cfff4f1bcb8d8f8a94bded017c494f', 'Martín López',                'estudiante',        NULL),
  (10, 1, 'sofia.chen@sanmartin.nexo.edu','scrypt$16384$8$1$135108d331bf3dbd92601dce6a3e106c$2b282999ad484d442308d98e352d6d4d756107b8cf994772fa931c5652efa37b', 'Sofía Chen',                  'estudiante',        NULL),
  (11, 1, 'lucas@sanmartin.nexo.edu',     'scrypt$16384$8$1$68ac61536f413e2c3e95b1b176e89234$e7d4cb7e2eb8e9de688c8c1060ba7d7efa811bff6df64701f77a639039d53829', 'Lucas Fernández',             'estudiante',        NULL),
  (12, 1, 'valentina@sanmartin.nexo.edu', 'scrypt$16384$8$1$2028506abb7422a6cf1870e464d08c4d$76d1b52920e22c94eaad4d22ec72078a1bb2fb12cf6ee1b9a8d814026d73bcd9', 'Valentina Gutiérrez',         'estudiante',        NULL),
  (13, 1, 'tomas@sanmartin.nexo.edu',     'scrypt$16384$8$1$36f42c17cfc1536b92fcb0df7f491c0a$b16200af8dc60f23528985ad9359ba4c6ce90ebabfdabd9265c6d291924650e7', 'Tomás Ríos',                  'estudiante',        NULL),
  (14, 1, 'familia.rossi@sanmartin.nexo.edu', 'scrypt$16384$8$1$bef63ca0fca613ff8ac079b14b2dd270$2e3ef6e10578da34bae419c5a1a78f1bb54132b6dbe022436f14c38cd705b163', 'Familia Rossi',           'familia',           'https://api.dicebear.com/7.x/initials/svg?seed=Rossi'),
  (15, 1, 'familia.lopez@sanmartin.nexo.edu', 'scrypt$16384$8$1$acb5ad7d7a804cbae3855fc32c5bbb7f$65fc306031360c9d1f1595b9daae94ec8c5a107669b065cb46da158858e9fa05', 'Familia López',           'familia',           NULL),
  (16, 1, 'biblioteca@sanmartin.nexo.edu','scrypt$16384$8$1$d56f1dd5551c677c9b26907b7e15ce28$23ccfcfe66a61071bd19ed47f11ee7ecd85067d0335bfff484a78a95aadc3ca8', 'Bruno Ledesma',               'bibliotecario',     NULL),
  (17, 1, 'centro@sanmartin.nexo.edu',    'scrypt$16384$8$1$bdca1987167225ab2d3ed3d92c0105eb$cae4a21d69e9659c16ac7977bd27b84d7922d516b4b1f413a6ff8f8c3505b863', 'Centro de Estudiantes',       'centro-estudiantes',NULL),
  (18, NULL, 'sistema@nexo.edu',          'scrypt$16384$8$1$0a89513c81e99b07fefcf612ba574ce2$37baf3f972fb6dca7747f51e2bcbacdf409cf0c1f08934a8e56bd26c48a8a1b8', 'Administrador de Plataforma', 'administrador',     NULL);

-- ── Cursos (UNA sola verdad de preceptores: Error 13.4) ────────────────────
INSERT INTO cursos (id, institucion_id, anio, division, preceptor_id) VALUES
  (1, 1, 4, 'A', 6),   -- 4°A a cargo de Carlos Pereyra
  (2, 1, 4, 'B', 6),   -- 4°B a cargo de Carlos Pereyra
  (3, 1, 3, 'A', 7),   -- 3°A a cargo de Laura Martínez
  (4, 1, 3, 'B', 7);   -- 3°B a cargo de Laura Martínez

-- ── Materias y unidades ─────────────────────────────────────────────────────
INSERT INTO materias (id, institucion_id, nombre) VALUES
  (1, 1, 'Matemática'), (2, 1, 'Historia'), (3, 1, 'Biología'),
  (4, 1, 'Lengua'),     (5, 1, 'Inglés');

INSERT INTO unidades (id, materia_id, numero, titulo) VALUES
  (1, 1, 1, 'Ecuaciones de segundo grado'),
  (2, 1, 2, 'Funciones'),
  (3, 1, 3, 'Geometría analítica'),
  (4, 2, 1, 'La Revolución de Mayo'),
  (5, 2, 2, 'Las independencias americanas'),
  (6, 3, 1, 'La célula'),
  (7, 3, 2, 'Genética'),
  (8, 4, 1, 'El texto argumentativo'),
  (9, 4, 2, 'Literatura latinoamericana');

-- ── Cátedras (UNA sola verdad de docentes: Error 13.2) ─────────────────────
INSERT INTO catedras (id, materia_id, curso_id, profesor_id) VALUES
  (1, 1, 2, 2),   -- Matemática 4°B — Prof. García
  (2, 1, 1, 2),   -- Matemática 4°A — Prof. García
  (3, 2, 2, 3),   -- Historia 4°B — Prof. Lombardi
  (4, 3, 2, 4),   -- Biología 4°B — Prof. Méndez
  (5, 4, 2, 5);   -- Lengua 4°B — Prof. Sosa

-- ── Inscripciones y familias ────────────────────────────────────────────────
INSERT INTO inscripciones (curso_id, estudiante_id) VALUES
  (2, 8), (2, 9), (2, 10), (2, 11),   -- 4°B
  (1, 12),                            -- 4°A
  (4, 13);                            -- 3°B

INSERT INTO familiares (usuario_familia_id, estudiante_id, parentesco) VALUES
  (14, 8, 'madre/padre'),
  (15, 9, 'madre/padre');

-- ── Archivos ────────────────────────────────────────────────────────────────
INSERT INTO archivos (id, nombre_original, ruta_local, tipo_mime, tamano_bytes, subido_por) VALUES
  (1, 'guia_laboratorio_quimica_v2.pdf', 'almacen/guia_laboratorio_quimica_v2.pdf', 'application/pdf', 482000, 16),
  (2, 'informe_celulas_julieta.pdf',     'almacen/informe_celulas_julieta.pdf',     'application/pdf', 210500, 8),
  (3, 'circular_reunion_julio.pdf',      'almacen/circular_reunion_julio.pdf',      'application/pdf',  95300, 6),
  (4, 'mapa_revolucion_mayo.png',        'almacen/mapa_revolucion_mayo.png',        'image/png',       730000, 3),
  (5, 'apunte_inversiones_basicas.pdf',  'almacen/apunte_inversiones_basicas.pdf',  'application/pdf', 154000, 9),
  (6, 'guia_ecuaciones_2do_grado.pdf',   'almacen/guia_ecuaciones_2do_grado.pdf',   'application/pdf', 320000, 2);

-- ── Tareas académicas ───────────────────────────────────────────────────────
INSERT INTO tareas (id, catedra_id, titulo, consigna, fecha_limite, metodo_estudio, tipo_asignacion) VALUES
  (1, 1, 'Ecuaciones de segundo grado',
      'Resolver la guía de ejercicios 1 a 20. Mostrar el desarrollo completo de cada resolución.',
      '2026-07-10', 'Práctica espaciada', 'individual'),
  (2, 3, 'Línea de tiempo: Revolución de Mayo',
      'Armar una línea de tiempo de 1806 a 1816 con los hechos principales y una fuente por hecho.',
      '2026-06-25', NULL, 'individual'),
  (3, 4, 'Informe: células procariotas',
      'Describir la estructura de la célula procariota y compararla con la eucariota. Extensión: 2 a 4 carillas.',
      '2026-06-20', 'Mapa conceptual previo', 'individual'),
  (4, 5, 'Ensayo argumentativo sobre Cortázar',
      'Escribir un ensayo (800-1200 palabras) tomando posición sobre el fantástico en los cuentos leídos.',
      '2026-07-15', NULL, 'individual');

INSERT INTO tarea_adjuntos (tarea_id, archivo_id) VALUES (2, 4);

-- Entregas y correcciones (UNA sola nota por trabajo: Error 13.1)
INSERT INTO entregas (id, tarea_id, estudiante_id, comentario, entregado_en) VALUES
  (1, 3, 8, 'Profe, agregué un cuadro comparativo al final.', '2026-06-19T20:15:00'),
  (2, 3, 9, 'Perdón por la demora.',                          '2026-06-21T22:40:00'),
  (3, 2, 8, '',                                               '2026-06-24T18:05:00');

INSERT INTO entrega_archivos (entrega_id, archivo_id) VALUES (1, 2);

INSERT INTO correcciones (entrega_id, nota, devolucion, corregido_en) VALUES
  (1, 8.0, 'Muy buena descripción de la estructura celular. Podés profundizar la comparación con las eucariotas en el próximo informe.', '2026-06-26T10:00:00'),
  (3, 6.5, 'La línea de tiempo está completa, pero faltan las fuentes de tres hechos. Repasá las causas económicas.',                    '2026-07-01T09:30:00');

INSERT INTO tareas_personales (estudiante_id, titulo, descripcion, fecha_limite) VALUES
  (8, 'Repasar vocabulario de Inglés', 'Unidades 3 y 4 del cuadernillo.', '2026-07-08');

-- ── Metas, subtareas ────────────────────────────────────────────────────────
INSERT INTO metas (id, estudiante_id, titulo, categoria, materia_id, unidad_id, vence_el, estado, completada_en) VALUES
  (1, 8, 'Preparar examen de Historia',    'académica', 2, 4,    '2026-07-20', 'en-curso',   NULL),
  (2, 8, 'Avanzar nivel B2 de Francés',    'idiomas',   NULL, NULL, '2026-08-30', 'en-curso',   NULL),
  (3, 8, 'Informe de Células Madre',       'académica', 3, 6,    '2026-06-12', 'completada', '2026-06-12T19:00:00');

INSERT INTO subtareas (meta_id, titulo, orden, completada_en) VALUES
  (1, 'Leer capítulos 4 y 5 del manual',        1, '2026-06-28T18:00:00'),
  (1, 'Hacer resumen de causas y consecuencias',2, '2026-06-30T17:30:00'),
  (1, 'Armar línea de tiempo propia',           3, '2026-07-01T19:10:00'),
  (1, 'Resolver el cuestionario de repaso',     4, NULL),
  (1, 'Autoevaluación final',                   5, NULL),
  (2, 'Escuchar un podcast por semana',         1, '2026-06-20T10:00:00'),
  (2, 'Terminar unidad 5 del curso online',     2, '2026-06-27T10:00:00'),
  (2, 'Terminar unidad 6 del curso online',     3, NULL),
  (2, 'Leer un cuento corto en francés',        4, NULL),
  (2, 'Práctica de conversación (2 sesiones)',  5, NULL),
  (2, 'Redactar una carta formal',              6, NULL),
  (2, 'Repasar conectores argumentativos',      7, NULL),
  (2, 'Simulacro de examen B2',                 8, NULL),
  (3, 'Buscar bibliografía',                    1, '2026-06-05T15:00:00'),
  (3, 'Redactar borrador',                      2, '2026-06-08T15:00:00'),
  (3, 'Corregir y pasar en limpio',             3, '2026-06-11T15:00:00');

-- ── Hábitos (la racha se CALCULA de estos registros: Error 13.5) ───────────
INSERT INTO habitos (id, estudiante_id, nombre, frecuencia) VALUES
  (1, 8, 'Lectura diaria',    'diario'),
  (2, 8, 'Repaso de notas',   'diario'),
  (3, 8, 'Meditación',        'diario'),
  (4, 8, 'Ejercicio físico',  'diario');

INSERT INTO habito_registros (habito_id, fecha) VALUES
  -- Lectura diaria
  (1,'2026-06-24'),(1,'2026-06-25'),(1,'2026-06-27'),(1,'2026-06-30'),
  (1,'2026-07-01'),(1,'2026-07-02'),(1,'2026-07-03'),
  -- Repaso de notas
  (2,'2026-06-25'),(2,'2026-06-28'),(2,'2026-07-01'),(2,'2026-07-02'),
  -- Ejercicio físico
  (4,'2026-06-26'),(4,'2026-06-27'),(4,'2026-06-28'),(4,'2026-06-29'),
  (4,'2026-06-30'),(4,'2026-07-01'),(4,'2026-07-02'),(4,'2026-07-03');
  -- Meditación: sin registros (racha 0)

-- ── Competencias (árbol) y avances ──────────────────────────────────────────
INSERT INTO competencias (id, institucion_id, nombre, padre_id) VALUES
  (1, 1, 'Pensamiento Crítico',   NULL),
  (2, 1, 'Análisis de fuentes',   1),
  (3, 1, 'Argumentación',         1),
  (4, 1, 'Colaboración',          NULL),
  (5, 1, 'Trabajo en equipo',     4),
  (6, 1, 'Autogestión',           NULL);

INSERT INTO competencia_avances (competencia_id, estudiante_id, nivel, actualizado_en) VALUES
  (2, 8, 'en-desarrollo', '2026-06-26T10:00:00'),
  (3, 8, 'iniciado',      '2026-06-01T10:00:00'),
  (4, 8, 'avanzado',      '2026-06-15T10:00:00'),
  (6, 8, 'en-desarrollo', '2026-06-20T10:00:00');

INSERT INTO evidencias (competencia_id, estudiante_id, titulo, descripcion, archivo_id) VALUES
  (2, 8, 'Análisis de fuentes primarias de 1810',
      'Trabajo de Historia donde comparé dos actas del Cabildo con lectura crítica.', NULL);

-- ── Comunidad: publicaciones, debates, votos, comentarios ───────────────────
INSERT INTO publicaciones (id, institucion_id, autor_id, contenido, creado_en) VALUES
  (1, 1, 9,  '¿Alguien tiene los apuntes de la clase de Biología de ayer?',                        '2026-07-01T14:20:00'),
  (2, 1, 17, 'La asamblea estudiantil de julio ya tiene fecha: ¡viernes 17/07 en el SUM!',         '2026-07-02T09:00:00'),
  (3, 1, 2,  'Subí a la biblioteca una guía nueva de ecuaciones. Recomendada antes del parcial.',  '2026-07-02T11:45:00'),
  (4, 1, 8,  'Propuesta: armar un grupo de estudio de Historia los miércoles después de clase.',   '2026-07-03T10:30:00');

INSERT INTO debates (id, institucion_id, autor_id, titulo, descripcion, cierra_en, creado_en) VALUES
  (1, 1, 2,  '¿Debería usarse IA para hacer la tarea?',
      'Debate para 4° año: ¿la IA es una herramienta de estudio legítima o un atajo que impide aprender? Fundamentar cada postura.',
      '2026-07-20', '2026-06-28T12:00:00'),
  (2, 1, 17, '¿Hay que renovar el uniforme escolar?',
      'El Centro de Estudiantes quiere conocer la opinión de todos antes de llevar la propuesta a la dirección.',
      NULL, '2026-07-01T16:00:00');

INSERT INTO debate_participantes (debate_id, usuario_id, postura, unido_en) VALUES
  (1, 8,  'a-favor',   '2026-06-29T10:00:00'),
  (1, 9,  'en-contra', '2026-06-29T11:30:00'),
  (1, 10, 'a-favor',   '2026-06-30T09:15:00'),
  (2, 8,  NULL,        '2026-07-02T13:00:00'),
  (2, 11, 'en-contra', '2026-07-02T15:40:00');

INSERT INTO votos (usuario_id, objeto_tipo, objeto_id, valor, creado_en) VALUES
  (8,  'publicacion', 1,  1, '2026-07-01T15:00:00'),
  (10, 'publicacion', 1,  1, '2026-07-01T16:10:00'),
  (9,  'publicacion', 4,  1, '2026-07-03T11:00:00'),
  (11, 'publicacion', 4,  1, '2026-07-03T11:20:00'),
  (12, 'publicacion', 4, -1, '2026-07-03T12:00:00'),
  (8,  'debate',      1,  1, '2026-06-29T10:05:00'),
  (9,  'debate',      1,  1, '2026-06-29T11:35:00'),
  (13, 'debate',      2, -1, '2026-07-02T18:00:00');

INSERT INTO comentarios (usuario_id, objeto_tipo, objeto_id, contenido, creado_en) VALUES
  (10, 'publicacion', 1, 'Yo los tengo, te los paso por chat.',                          '2026-07-01T16:12:00'),
  (8,  'debate',      1, 'Depende: para entender un tema sí, para copiar la tarea no.',  '2026-06-29T10:10:00'),
  (9,  'debate',      1, 'Si la usás para todo, no aprendés nada.',                      '2026-06-29T11:40:00'),
  (2,  'debate',      1, 'Interesante. ¿Y como herramienta de corrección entre pares?',  '2026-06-30T08:50:00');

INSERT INTO denuncias (denunciante_id, objeto_tipo, objeto_id, motivo, creado_en) VALUES
  (11, 'publicacion', 3, 'Me parece publicidad y no una publicación de la comunidad.', '2026-07-02T14:00:00');

INSERT INTO intereses_feed (usuario_id, tema) VALUES
  (8, 'historia'), (8, 'tecnología'), (8, 'deportes');

-- ── Biblioteca y cola de revisión ───────────────────────────────────────────
INSERT INTO recursos (id, institucion_id, autor_id, titulo, descripcion, materia_id, tematica_libre, tipo, archivo_id, enlace_url, alcance, estado, creado_en) VALUES
  (1, 1, 16, 'Guía de Laboratorio de Química v2', 'Protocolos de seguridad y prácticas para el laboratorio.', NULL, 'química',              'guia',      1, NULL, 'institucional', 'aprobado',    '2026-05-10T10:00:00'),
  (2, 1, 3,  'Mapa interactivo: Revolución de Mayo', 'Mapa con los hechos de la Semana de Mayo, para trabajar en clase.', 2, NULL,          'documento', 4, NULL, 'institucional', 'aprobado',    '2026-06-15T09:00:00'),
  (3, 1, 2,  'Guía de ejercicios: ecuaciones de segundo grado', '60 ejercicios con resultados, del básico al avanzado.', 1, NULL,           'guia',      6, NULL, 'institucional', 'aprobado',    '2026-07-02T11:30:00'),
  (4, 1, 9,  'Apunte: inversiones básicas para principiantes', 'Introducción al ahorro y la inversión. No pertenece a ninguna materia.', NULL, 'educación financiera', 'documento', 5, NULL, 'institucional', 'en-revision', '2026-07-02T17:00:00'),
  (5, 1, 5,  'Antología de cuentos de Julio Cortázar', 'Selección de cuentos de dominio público comentados.', 4, NULL,                     'libro',     NULL, 'https://ejemplo.org/antologia-cortazar', 'nacional', 'aprobado', '2026-06-10T08:00:00'),
  (6, 1, 11, 'Memes de matemática', 'Colección de memes.', 1, NULL,                                                                        'documento', NULL, NULL, 'institucional', 'rechazado',   '2026-06-28T20:00:00');

INSERT INTO cola_revision (recurso_id, presentado_por, presentado_en, estado, destino, motivo_rechazo, decidido_por, decidido_en) VALUES
  (2, 3,  '2026-06-15T09:00:00', 'aprobado',  'institucional', NULL, 16, '2026-06-16T10:00:00'),
  (5, 5,  '2026-06-10T08:00:00', 'aprobado',  'nacional',      NULL, 16, '2026-06-11T12:00:00'),
  (6, 11, '2026-06-28T20:00:00', 'rechazado', NULL, 'No es material educativo. Podés compartirlo en la comunidad.', 16, '2026-06-29T09:00:00'),
  (4, 9,  '2026-07-02T17:00:00', 'pendiente', NULL, NULL, NULL, NULL);

-- ── Aula virtual: clases, etapas, asistencia, comprensión ───────────────────
INSERT INTO clases_planificadas (id, catedra_id, titulo, fecha_hora, objetivos, materiales, estado) VALUES
  (1, 1, 'Ecuaciones: repaso general antes del parcial', '2026-07-06T10:00:00',
      'Repasar resolución por fórmula y por factoreo; despejar dudas del cuestionario.',
      'Guía de ejercicios (recurso de biblioteca), pizarra digital.', 'planificada'),
  (2, 4, 'La célula: cierre de unidad', '2026-06-18T08:30:00',
      'Cerrar la comparación procariota/eucariota y presentar la unidad de Genética.',
      'Láminas de la unidad 1.', 'finalizada');

INSERT INTO clase_etapas (clase_id, orden, titulo, duracion_estimada_min, iniciada_en, completada_en) VALUES
  (1, 1, 'Repaso de fórmula general',      20, NULL, NULL),
  (1, 2, 'Ejercicios en pizarra',          30, NULL, NULL),
  (1, 3, 'Dudas y cierre',                 10, NULL, NULL),
  (2, 1, 'Repaso comparativo',             25, '2026-06-18T08:30:00', '2026-06-18T08:55:00'),
  (2, 2, 'Puesta en común de informes',    25, '2026-06-18T08:55:00', '2026-06-18T09:20:00'),
  (2, 3, 'Presentación: Genética',         10, '2026-06-18T09:20:00', '2026-06-18T09:32:00');

INSERT INTO clase_asistencias (clase_id, estudiante_id, conectado_en, desconectado_en) VALUES
  (2, 8,  '2026-06-18T08:29:00', '2026-06-18T09:33:00'),
  (2, 9,  '2026-06-18T08:31:00', '2026-06-18T09:33:00'),
  (2, 10, '2026-06-18T08:30:00', '2026-06-18T09:20:00');

INSERT INTO clase_comprension (clase_id, estudiante_id, estado, actualizado_en) VALUES
  (2, 8,  'entiendo',    '2026-06-18T09:00:00'),
  (2, 9,  'mas-o-menos', '2026-06-18T09:05:00'),
  (2, 10, 'entiendo',    '2026-06-18T08:50:00');

INSERT INTO clase_preguntas (clase_id, estudiante_id, texto, creado_en, respondida_en) VALUES
  (2, 9, '¿La bacteria tiene núcleo o no?', '2026-06-18T08:47:00', '2026-06-18T08:52:00');

INSERT INTO pizarra_trazos (clase_id, secuencia, datos) VALUES
  (2, 1, '{"tipo":"texto","x":40,"y":30,"contenido":"Procariota vs. Eucariota"}'),
  (2, 2, '{"tipo":"linea","desde":[40,60],"hasta":[400,60]}');

-- ── Diario reflexivo del docente ────────────────────────────────────────────
INSERT INTO diario_registros (profesor_id, titulo, contenido, etiquetas, creado_en) VALUES
  (2, 'El repaso espaciado funcionó', 'El grupo que siguió el método de práctica espaciada resolvió mejor los ejercicios combinados. Repetir la estrategia antes del próximo parcial.', 'metodología,matemática', '2026-06-30T18:00:00'),
  (2, 'Dudas recurrentes con el discriminante', 'Varios estudiantes confunden el signo del discriminante. Preparar un ejemplo visual para la clase del 06/07.', 'planificación', '2026-07-02T19:30:00');

-- ── Calendario: eventos, visibilidad y feriados ─────────────────────────────
INSERT INTO eventos (id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin) VALUES
  (1, 1, 1,  'Feria de Ciencias',                    'evento institucional', 'Presentación de proyectos de todos los cursos.', 'Toda la institución', '2026-07-22', '09:00', '13:00'),
  (2, 1, 6,  'Reunión de padres — 4°B',              'reunión',              'Reunión informativa de mitad de ciclo.',          'Aula de 4°B',        '2026-07-28', '17:00', '18:30'),
  (3, 1, 1,  'Cita con los padres de Julieta Rossi', 'cita',                 'Entrevista con la dirección.',                    'Dirección',          '2026-07-08', '09:00', '09:30'),
  (4, 1, 17, 'Asamblea estudiantil',                 'asamblea',             'Asamblea abierta organizada por el Centro de Estudiantes.', 'SUM',     '2026-07-17', '13:30', '15:00'),
  (5, 1, 1,  'Acto por el Día de la Independencia',  'acto',                 'Acto conmemorativo del 9 de Julio.',              'Patio central',      '2026-07-07', '10:00', '11:00');

INSERT INTO evento_visibilidad (evento_id, alcance, curso_id, estudiante_id) VALUES
  (1, 'todos',                 NULL, NULL),
  (2, 'familias-curso',        2,    NULL),   -- solo familias de 4°B; los alumnos no lo ven
  (3, 'familia-de-estudiante', NULL, 8),      -- solo la familia de Julieta
  (4, 'todos',                 NULL, NULL),
  (5, 'todos',                 NULL, NULL);

INSERT INTO feriados (fecha, nombre) VALUES
  ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural');

-- ── Chat: conversaciones, miembros, mensajes ────────────────────────────────
INSERT INTO conversaciones (id, tipo, curso_id, clase_id) VALUES
  (1, 'directa',     NULL, NULL),   -- Julieta ↔ Martín
  (2, 'directa',     NULL, NULL),   -- Julieta ↔ Prof. García
  (3, 'directa',     NULL, NULL),   -- Familia Rossi ↔ Preceptor Pereyra
  (4, 'grupo-curso', 2,    NULL);   -- Comunidad del curso 4°B

INSERT INTO conversacion_miembros (conversacion_id, usuario_id, ultimo_leido_en) VALUES
  (1, 8,  '2026-07-02T14:00:00'),
  (1, 9,  '2026-07-03T13:50:00'),
  (2, 8,  '2026-07-01T11:05:00'),
  (2, 2,  '2026-07-01T11:05:00'),
  (3, 14, '2026-07-02T08:00:00'),
  (3, 6,  '2026-07-03T14:05:00'),
  (4, 6,  '2026-07-03T12:00:00'),
  (4, 8,  '2026-07-03T12:00:00'),
  (4, 9,  '2026-07-02T18:00:00'),
  (4, 10, '2026-07-03T12:00:00'),
  (4, 11, '2026-07-01T09:00:00');

INSERT INTO mensajes (conversacion_id, autor_id, contenido, enviado_en) VALUES
  (1, 9, 'Hola, ¿cómo estás?',                                   '2026-07-02T13:45:00'),
  (1, 8, 'Bien, ¿y vos?',                                        '2026-07-02T13:46:00'),
  (1, 9, '¿Ya entendiste la tarea de Historia?',                 '2026-07-03T14:30:00'),
  (2, 8, 'Hola profe, tengo una duda sobre el material.',        '2026-07-01T10:45:00'),
  (2, 2, '¿Cuál es tu pregunta?',                                '2026-07-01T10:46:00'),
  (2, 8, '¿Entra la unidad 2 en el parcial?',                    '2026-07-01T10:50:00'),
  (2, 2, 'Sí, entra. Cualquier duda, consultame.',               '2026-07-01T11:00:00'),
  (3, 14, 'Buenas, consulta por la inasistencia de ayer.',       '2026-07-02T13:20:00'),
  (3, 6,  'Buenas. Quedó justificada, y le confirmo la reunión del 28.', '2026-07-03T14:00:00'),
  (4, 6,  'Recuerden que mañana hay acto a las 10.',             '2026-07-03T11:55:00'),
  (4, 10, '¿Hay que ir con uniforme completo?',                  '2026-07-03T11:58:00'),
  (4, 6,  'Sí, uniforme completo.',                              '2026-07-03T12:00:00');

-- ── Comunicados a familias y lecturas ───────────────────────────────────────
INSERT INTO comunicados (id, institucion_id, emisor_id, curso_id, titulo, contenido, archivo_id, enviado_en) VALUES
  (1, 1, 6, 2,    'Reunión de padres — 4°B',
      'Los esperamos el martes 28/07 a las 17:00 en el aula de 4°B. Adjuntamos la circular con los temas.', 3, '2026-07-01T09:00:00'),
  (2, 1, 1, NULL, 'Acto por el Día de la Independencia',
      'El acto se realizará el martes 07/07 a las 10:00 en el patio central. Las familias están invitadas.', NULL, '2026-07-02T10:00:00');

INSERT INTO comunicado_lecturas (comunicado_id, usuario_id, leido_en) VALUES
  (2, 14, '2026-07-02T12:30:00');

-- ── Quejas anónimas (SIN autor) ─────────────────────────────────────────────
INSERT INTO quejas (institucion_id, categoria, contenido, creado_en, vista_en, vista_por, estado) VALUES
  (1, 'infraestructura', 'Los ventiladores del aula de 4°B no funcionan desde hace dos semanas.', '2026-06-10T10:00:00', '2026-06-11T09:00:00', 17, 'en-tratamiento'),
  (1, 'convivencia',     'En los recreos siempre se ocupa la cancha el mismo grupo. ¿Se puede armar un cronograma?', '2026-07-01T13:00:00', NULL, NULL, 'nueva'),
  (1, 'servicios',       'Los precios de la cantina subieron mucho este mes.', '2026-07-02T12:00:00', NULL, NULL, 'nueva');

-- ── Notificaciones ──────────────────────────────────────────────────────────
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, objeto_tipo, objeto_id, creado_en, leida_en) VALUES
  (8,  'correccion', 'Tenés una devolución nueva',      'Historia — Línea de tiempo: nota 6,5.',                    'tarea',      2, '2026-07-01T09:31:00', NULL),
  (14, 'comunicado', 'Comunicado nuevo de 4°B',         'Reunión de padres — 4°B.',                                 'comunicado', 1, '2026-07-01T09:01:00', NULL),
  (9,  'recurso',    'Tu recurso está en revisión',     'Apunte: inversiones básicas para principiantes.',          'recurso',    4, '2026-07-02T17:01:00', '2026-07-02T18:00:00'),
  (16, 'recurso',    'Nuevo recurso para revisar',      'Apunte: inversiones básicas — presentado por Martín López.', 'recurso',  4, '2026-07-02T17:01:00', NULL);

-- ── Configuración de la Asistencia IA ───────────────────────────────────────
INSERT INTO config_ia (id, institucion_id, system_prompt, proveedor, modelo, temperatura, activo) VALUES
  (1, NULL,
   'Sos el tutor académico de NEXO para estudiantes de secundaria. Explicá paso a paso, con ejemplos simples y en español rioplatense. Guiá al estudiante para que llegue solo a la respuesta: no resuelvas la tarea por él. Si te piden hacer la tarea completa, proponé en cambio un plan de estudio. Adaptá la dificultad al nivel que muestre el estudiante.',
   'groq', 'llama-3.1-8b-instant', 0.7, 1);

-- ── Logs del sistema (lo ÚNICO que ve el Administrador de plataforma) ───────
INSERT INTO logs_sistema (nivel, mensaje, contexto, creado_en) VALUES
  ('info',  'Institución creada: Colegio San Martín', 'alta-institucion', '2026-03-01T09:00:00'),
  ('info',  'Copia de seguridad diaria completada',   'respaldo',         '2026-07-03T03:00:00'),
  ('aviso', 'Se registraron 3 intentos de inicio de sesión fallidos', 'seguridad', '2026-07-02T21:14:00');

-- ============================================================================
-- DETALLES FINALES — datos de ejemplo (usan SOLO ids ya existentes)
-- ============================================================================

-- ── Horarios de cátedra ─────────────────────────────────────────────────────
-- Cátedras de García (1: Mate 4°B, 2: Mate 4°A) y del curso de Julieta / 4°B
-- (1: Mate, 3: Historia, 4: Biología, 5: Lengua). 2-3 bloques por materia.
INSERT INTO catedra_horarios (catedra_id, dia_semana, hora_inicio, hora_fin, aula) VALUES
  (1, 'lunes',     '08:30', '10:00', 'Aula 12'),      -- Matemática 4°B (García)
  (1, 'miercoles', '10:15', '11:45', 'Aula 12'),
  (1, 'viernes',   '08:30', '09:15', 'Aula 12'),
  (2, 'martes',    '08:30', '10:00', 'Aula 8'),       -- Matemática 4°A (García)
  (2, 'jueves',    '10:15', '11:45', 'Aula 8'),
  (3, 'martes',    '10:15', '11:45', 'Aula 12'),      -- Historia 4°B (Lombardi)
  (3, 'jueves',    '08:30', '10:00', 'Aula 12'),
  (4, 'lunes',     '10:15', '11:45', 'Laboratorio 1'),-- Biología 4°B (Méndez)
  (4, 'miercoles', '08:30', '10:00', 'Aula 12'),
  (5, 'martes',    '08:30', '10:00', 'Aula 12'),      -- Lengua 4°B (Sosa)
  (5, 'viernes',   '10:15', '11:45', 'Aula 12');

-- ── Avisos de cátedra (los publica el profesor dueño; los ve el curso 4°B) ──
INSERT INTO catedra_avisos (id, catedra_id, autor_id, titulo, contenido, archivo_id, creado_en) VALUES
  (1, 1, 2, 'Parcial de ecuaciones el 21/07',
      'Recuerden que el parcial cubre fórmula general y factoreo. Subí la guía de repaso como adjunto; háganla antes de la clase del viernes.', 6, '2026-07-14T09:00:00'),
  (2, 3, 3, 'Entrega de la línea de tiempo',
      'La línea de tiempo de la Revolución de Mayo se entrega el miércoles. No olviden citar una fuente por hecho.', NULL, '2026-07-15T18:30:00'),
  (3, 4, 4, NULL,
      'Buen trabajo con los informes de células. La semana que viene arrancamos Genética: repasen la unidad 1.', NULL, '2026-07-16T11:00:00');

-- ── Reacciones de alumnos reales del curso 4°B (8, 9, 10, 11) ───────────────
INSERT INTO aviso_reacciones (aviso_id, usuario_id, emoji, creado_en) VALUES
  (1, 8,  '👍', '2026-07-14T09:30:00'),
  (1, 10, '✅', '2026-07-14T10:05:00'),
  (1, 11, '❤️', '2026-07-14T10:40:00'),
  (2, 8,  '🎉', '2026-07-15T19:00:00'),
  (2, 9,  '👍', '2026-07-15T19:20:00'),
  (3, 9,  '😮', '2026-07-16T12:00:00');

-- ── Respuestas de alumnos a los avisos ──────────────────────────────────────
INSERT INTO aviso_respuestas (aviso_id, usuario_id, contenido, creado_en) VALUES
  (1, 8, '¿Entra también factoreo o solo fórmula general?', '2026-07-14T12:10:00'),
  (2, 9, 'Ya casi termino la línea de tiempo, gracias profe.', '2026-07-15T20:00:00');

-- ── Votos de recurso (reutiliza la tabla votos, objeto_tipo='recurso') ──────
-- Recurso 5 = "Antología de cuentos de Julio Cortázar" (alcance nacional).
INSERT INTO votos (usuario_id, objeto_tipo, objeto_id, valor, creado_en) VALUES
  (8,  'recurso', 5, 1, '2026-07-14T16:00:00'),
  (10, 'recurso', 5, 1, '2026-07-15T10:30:00');

