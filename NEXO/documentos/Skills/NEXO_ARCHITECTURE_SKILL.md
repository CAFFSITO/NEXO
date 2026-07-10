# 🏗️ NEXO — SKILL DE ARQUITECTO DEL PROYECTO

## Rol
Sos el arquitecto del proyecto NEXO. Antes de crear, mover o modificar cualquier archivo, consultá este documento para respetar la estructura definida. **Nunca crees archivos fuera de esta estructura sin justificación.**

---

## Stack Tecnológico

- **Framework:** React 18+ con TypeScript 5+
- **Estilos:** Tailwind CSS 4+ (tokens en `tailwind.config.ts`)
- **Build:** Vite 6+
- **Íconos:** Material Symbols (CDN Google Fonts)
- **Fuentes:** Plus Jakarta Sans (headings) + Inter (body)
- **Tema:** Dark mode por defecto (`<html class="dark">`)

---

## Estructura Completa del Proyecto

```
NEXO/
│
├── 📁 docs/                                    ← DOCUMENTACIÓN (leé SIEMPRE antes de actuar)
│   ├── NEXO_ARCHITECTURE_SKILL.md              ← ESTE ARCHIVO — mapa general del proyecto
│   ├── NEXO_CONVERSION_SKILL.md                ← Reglas para convertir HTML Stitch → React+TS+Tailwind
│   ├── NEXO_COMPONENT_PATTERNS.md              ← Catálogo de componentes (existentes y planificados)
│   ├── NEXO_PROJECT_STRUCTURE.md               ← Reglas de ubicación de archivos
│   └── NEXO_PROMPT_TEMPLATE.md                 ← Plantillas de prompt para conversiones
│
├── 📁 modulos/                                  ← HTMLs ORIGINALES DE STITCH (solo referencia, no tocar)
│   ├── moduloLogin/
│   │   └── login.html                          ← Ref. visual de la pantalla de login
│   ├── moduloComunidad/
│   │   └── comunidad.html                      ⏳ (pendiente de agregar)
│   ├── moduloPortafolio/
│   │   └── mis-tareas.html                     ⏳
│   ├── moduloObjetivos/
│   │   └── dashboard-objetivos.html            ⏳
│   ├── moduloAulaVirtual/
│   │   └── aula-virtual.html                   ⏳
│   ├── moduloBiblioteca/
│   │   └── biblioteca.html                     ⏳
│   ├── moduloChat/
│   │   └── chat.html                           ⏳
│   ├── moduloAsistenciaIA/
│   │   └── asistencia-ia.html                  ⏳
│   └── moduloAdmin/
│       ├── crear-institucion.html              ⏳
│       ├── crear-perfil.html                   ⏳
│       └── salud-sistema.html                  ⏳
│
├── 📁 public/                                   ← Assets estáticos
│   └── (favicon, imágenes placeholder)
│
├── 📁 src/                                      ← CÓDIGO FUENTE
│   │
│   ├── main.tsx                                 ← Entry point (NO TOCAR)
│   ├── App.tsx                                  ← Router — importa páginas
│   ├── index.css                                ← Estilos globales + imports fuentes
│   │
│   ├── 📁 pages/                                ← Una página por vista principal
│   │   ├── LoginPage.tsx                        ✅ CREADO
│   │   ├── ComunidadPage.tsx                    ⏳
│   │   ├── MisTareasPage.tsx                    ⏳
│   │   ├── DetalleTareaPage.tsx                 ⏳
│   │   ├── GestionTareasPage.tsx                ⏳
│   │   ├── CrearTareaPage.tsx                   ⏳
│   │   ├── ObjetivosPage.tsx                    ⏳
│   │   ├── MisMetasPage.tsx                     ⏳
│   │   ├── MisHabitosPage.tsx                   ⏳
│   │   ├── CompetenciasPage.tsx                 ⏳
│   │   ├── AulaVirtualPage.tsx                  ⏳
│   │   ├── ResumenClasePage.tsx                 ⏳
│   │   ├── DashboardDocentePage.tsx             ⏳
│   │   ├── RegistrosDocentePage.tsx             ⏳
│   │   ├── BibliotecaNacionalPage.tsx           ⏳
│   │   ├── BibliotecaInstitucionalPage.tsx      ⏳
│   │   ├── ChatPage.tsx                         ⏳
│   │   ├── AsistenciaIAPage.tsx                 ⏳
│   │   ├── CalendarioPage.tsx                   ⏳
│   │   ├── ComunidadCursoPage.tsx               ⏳
│   │   └── CentroEstudiantesPage.tsx            ⏳
│   │
│   ├── 📁 components/
│   │   │
│   │   ├── 📁 shared/                          ← Reutilizables en toda la app
│   │   │   ├── NexoLogo.tsx                     ✅ CREADO — Logo con ícono + nombre + slogan
│   │   │   ├── InputField.tsx                   ✅ CREADO — Input con label + toggle password
│   │   │   ├── BackgroundGlow.tsx               ✅ CREADO — Fondo decorativo blur circles
│   │   │   ├── Sidebar.tsx                      ⏳ — Navegación lateral (todas las vistas auth)
│   │   │   ├── TopBar.tsx                       ⏳ — Header superior con búsqueda y notificaciones
│   │   │   ├── Avatar.tsx                       ⏳ — Foto o iniciales con degradado
│   │   │   ├── BadgeRol.tsx                     ⏳ — Pill de rol con color automático
│   │   │   ├── BadgeEstado.tsx                  ⏳ — Pill de estado (pendiente/entregada/vencida)
│   │   │   ├── BadgeMateria.tsx                 ⏳ — Pill de materia con color asignado
│   │   │   └── BarraProgreso.tsx                ⏳ — Barra de progreso con gradiente
│   │   │
│   │   ├── 📁 login/                           ← Módulo Login
│   │   │   ├── LoginForm.tsx                    ✅ CREADO
│   │   │   └── LoginFooter.tsx                  ✅ CREADO
│   │   │
│   │   ├── 📁 comunidad/                       ← Módulo Comunidad
│   │   │   ├── TarjetaPosteo.tsx                ⏳
│   │   │   ├── TarjetaDebate.tsx                ⏳
│   │   │   ├── FormularioPosteo.tsx             ⏳
│   │   │   ├── SidebarTendencias.tsx            ⏳
│   │   │   ├── TimelineActividad.tsx            ⏳
│   │   │   └── CardEvento.tsx                   ⏳
│   │   │
│   │   ├── 📁 portafolio/                      ← Módulo Portafolio de Aprendizaje
│   │   │   ├── TarjetaTarea.tsx                 ⏳
│   │   │   ├── CardConsigna.tsx                 ⏳
│   │   │   ├── CardEntrega.tsx                  ⏳
│   │   │   ├── CardReflexion.tsx                ⏳
│   │   │   └── CardMetodoEstudio.tsx            ⏳
│   │   │
│   │   ├── 📁 objetivos/                       ← Módulo Objetivos Personales
│   │   │   ├── TarjetaObjetivo.tsx              ⏳
│   │   │   ├── TarjetaHabito.tsx                ⏳
│   │   │   ├── CalendarioRacha.tsx              ⏳
│   │   │   └── EscalaCompetencia.tsx            ⏳
│   │   │
│   │   ├── 📁 aula-virtual/                    ← Módulo Aula Virtual (Docente)
│   │   │   ├── PanelTrayectoria.tsx             ⏳
│   │   │   ├── PulsoAula.tsx                    ⏳
│   │   │   ├── PreguntasPendientes.tsx          ⏳
│   │   │   └── BarraControles.tsx               ⏳
│   │   │
│   │   ├── 📁 biblioteca/                      ← Módulo Biblioteca
│   │   │   ├── TarjetaRecurso.tsx               ⏳
│   │   │   └── BuscadorRecursos.tsx             ⏳
│   │   │
│   │   ├── 📁 chat/                            ← Módulo Chat
│   │   │   ├── BurbujaMsg.tsx                   ⏳
│   │   │   └── ListaConversaciones.tsx          ⏳
│   │   │
│   │   └── 📁 admin/                           ← Módulo Admin / Gestión Institucional
│   │       ├── FormularioInstitucion.tsx         ⏳
│   │       ├── FormularioProfesor.tsx            ⏳
│   │       └── FormularioEstudiante.tsx          ⏳
│   │
│   └── 📁 types/                                ← Tipos compartidos de TypeScript
│       └── index.ts                              ⏳
│
├── tailwind.config.ts                           ✅ CREADO — Tokens del Design System
├── index.html                                   ✅ (Vite default + class="dark" + Material Symbols)
├── vite.config.ts                               ✅ (Vite default)
├── tsconfig.json                                ✅ (Vite default)
├── package.json                                 ✅
└── .gitignore                                   ✅
```

---

## Leyenda de Estados

| Símbolo | Significado |
|---|---|
| ✅ | Creado y funcional |
| ⏳ | Planificado, pendiente de crear |

---

## Reglas del Arquitecto

### Creación de archivos
1. **Páginas** → siempre en `src/pages/`, sufijo `Page.tsx`
2. **Componentes de un módulo** → en `src/components/[modulo]/`
3. **Componentes reutilizables** → en `src/components/shared/`
4. **HTMLs de Stitch** → en `modulos/[modulo]/`, solo como referencia visual
5. **Documentación** → en `docs/`
6. **NUNCA** crear archivos `.js`, `.jsx`, ni `.css` por componente

### Antes de crear un componente
1. Buscá en `docs/NEXO_COMPONENT_PATTERNS.md` si ya existe
2. Si existe en `shared/`, importalo — no lo dupliques
3. Si no existe pero se usará en 2+ módulos, crealo en `shared/`

### Antes de convertir un HTML de Stitch
1. Leé `docs/NEXO_CONVERSION_SKILL.md` — tiene todas las reglas
2. Consultá `tailwind.config.ts` — usá tokens, no hex hardcodeados
3. Respetá el árbol de arriba para ubicar los archivos

### Convención de nombres
| Tipo | Convención | Ejemplo |
|---|---|---|
| Archivo componente | `PascalCase.tsx` | `TarjetaPosteo.tsx` |
| Carpeta módulo | `kebab-case/` | `aula-virtual/` |
| Interface props | `PascalCase + Props` | `TarjetaPosteoProps` |
| Página | `PascalCase + Page` | `ComunidadPage.tsx` |
| Tipo compartido | `PascalCase` | `Usuario`, `Tarea` |

---

## Mapa de Módulos → Perfiles

| Módulo | Estudiante | Profesor | Admin | Preceptor |
|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | ✅ |
| Comunidad | ✅ Lee/Publica | ✅ Lee/Publica | ✅ Modera | ✅ Lee |
| Portafolio | ✅ Entrega | ✅ Crea/Corrige | — | — |
| Objetivos | ✅ Propio | — | — | — |
| Aula Virtual | ✅ Participa | ✅ Controla | — | — |
| Biblioteca | ✅ Lee/Presenta | ✅ Lee/Presenta | ✅ CRUD | — |
| Chat | ✅ | ✅ | ✅ | ✅ |
| Asistencia IA | ✅ | — | — | — |
| Admin Institución | — | — | ✅ | — |
| Salud Sistema | — | — | ✅ | — |

---

## Flujo de Trabajo

```
1. HTML de Stitch (referencia visual)
        ↓
2. Se guarda en modulos/moduloX/vista.html
        ↓
3. Se convierte con Antigravity usando prompt de NEXO_PROMPT_TEMPLATE.md
        ↓
4. Se generan archivos .tsx en src/pages/ y src/components/
        ↓
5. Se actualiza este archivo (NEXO_ARCHITECTURE_SKILL.md) marcando ✅
```
