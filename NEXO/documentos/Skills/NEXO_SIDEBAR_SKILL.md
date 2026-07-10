# 🧭 NEXO — SIDEBAR: NÚCLEO DE NAVEGACIÓN

## Propósito
El Sidebar es el componente MÁS IMPORTANTE de NEXO. Es la navegación principal de toda la app una vez autenticado. **Todas las vistas autenticadas DEBEN usar este componente.** Este documento define su estructura, comportamiento y variantes por perfil.

**Leé este archivo SIEMPRE antes de crear una nueva página o vista.**

---

## Estructura Visual

```
┌──────────────────────┐
│  NEXO (logo texto)   │  ← Logo siempre arriba, text-2xl font-black
│                      │
│  ┌────────────────┐  │
│  │ 👤 Avatar      │  │  ← Avatar 40px + nombre + badge rol
│  │ Nombre         │  │
│  │ [ROL]          │  │
│  └────────────────┘  │
│                      │
│  ■ Item activo       │  ← border-left magenta + bg gradient + glow
│  ○ Item normal       │  ← text-slate-400, hover: text-white + bg sutil
│  ○ Item normal       │
│  ○ Item normal       │
│  ○ Item normal       │
│  ○ Item normal       │
│                      │
│                      │
│  ○ Cerrar Sesión     │  ← Siempre al fondo, text-slate-400
└──────────────────────┘
```

---

## Items de Navegación por Perfil

### 🟢 Estudiante
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Comunidad | `group` | `/comunidad` |
| 2 | Portafolio | `school` | `/portafolio/mis-tareas` |
| 3 | Objetivos | `target` | `/objetivos` |
| 4 | Biblioteca | `local_library` | `/biblioteca/institucional` |
| 5 | Chat | `chat` | `/chat` |
| 6 | Asistencia IA | `auto_awesome` | `/asistencia-academica` |

### 🔵 Profesor
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Comunidad | `group` | `/comunidad` |
| 2 | Aula Virtual | `cast_for_education` | `/portafolio-docente/aula-virtual` |
| 3 | Gestión de Tareas | `assignment` | `/portafolio/gestion` |
| 4 | Mi Portafolio | `menu_book` | `/portafolio-docente` |
| 5 | Biblioteca | `local_library` | `/biblioteca/institucional` |
| 6 | Chat | `chat` | `/chat` |

### 🟣 Administración Académica
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Comunidad | `group` | `/comunidad` |
| 2 | Gestión de Perfiles | `manage_accounts` | `/admin/perfiles` |
| 3 | Gestión de Cursos | `class` | `/admin/cursos` |
| 4 | Biblioteca | `local_library` | `/biblioteca/institucional` |
| 5 | Calendario | `calendar_today` | `/comunidad/calendario` |
| 6 | Reportes | `assessment` | `/comunidad/reportes-auditoria` |

### 📋 Preceptor
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Comunidad | `group` | `/comunidad` |
| 2 | Mi Curso | `groups` | `/comunidad/curso/:id` |
| 3 | Chat | `chat` | `/chat` |
| 4 | Calendario | `calendar_today` | `/comunidad/calendario` |

### 🟠 Centro de Estudiantes
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Comunidad | `group` | `/comunidad` |
| 2 | Nuestro Portal | `campaign` | `/centro-estudiantes` |
| 3 | Calendario | `calendar_today` | `/comunidad/calendario` |

### 🔴 Administrador (Sistema)
| Orden | Label | Ícono (Material Symbols) | Ruta |
|---|---|---|---|
| 1 | Instituciones | `domain` | `/admin/instituciones` |
| 2 | Salud del Sistema | `monitor_heart` | `/admin/salud` |
| 3 | Actividades | `analytics` | `/admin/actividades` |

---

## Especificaciones Técnicas

### Dimensiones
- **Ancho:** 220px fijo (desktop)
- **Alto:** 100vh (ocupa toda la pantalla)
- **Position:** fixed, left: 0, top: 0
- **z-index:** 50

### Colores
- **Fondo sidebar:** `bg-[#160D28]`
- **Borde derecho:** `border-r border-surface-container-high`
- **Shadow:** `shadow-2xl shadow-purple-900/20`

### Logo
- **Texto:** "NEXO" — `text-2xl font-black tracking-widest font-headline`
- **Color:** `text-primary-container` (#C548F5 en el Stitch original)
- **Padding:** `px-6 mb-10`

### Avatar + Info usuario
- **Container:** `flex items-center gap-3 p-2 rounded-lg bg-surface-container-highest/30`
- **Avatar:** `w-10 h-10 rounded-full border-2 border-primary/30`
- **Nombre:** `text-sm font-bold text-white truncate`
- **Rol:** `text-xs text-slate-400 truncate`
- **Ubicación:** Debajo del logo, arriba de la nav

### Item de navegación
```
Contenedor: flex items-center gap-3 px-4 py-3
Fuente: font-headline text-sm font-medium tracking-tight
Altura efectiva: ~44px (py-3 = 12px arriba + 12px abajo + ~20px contenido)
```

### Estado: Normal
```
color: text-slate-400
hover: text-white bg-surface-container-highest/50
transition: transition-all duration-200
```

### Estado: Activo
```
color: text-primary-container (magenta)
border-left: border-l-4 border-primary-container
background: bg-gradient-to-r from-primary-container/10 to-transparent
shadow: shadow-[0_0_15px_rgba(197,72,245,0.3)]
ícono: font-variation-settings: 'FILL' 1 (ícono relleno)
```

### Cerrar Sesión
```
Ubicación: mt-auto (siempre al fondo)
Ícono: logout
Color: text-slate-400
Hover: text-red-400
```

---

## Props del Componente

```tsx
interface SidebarProps {
  usuario: {
    nombre: string;
    rol: "estudiante" | "profesor" | "admin-academico" | "preceptor" | "centro-estudiantes" | "administrador";
    avatarUrl?: string;
    curso?: string;        // Solo estudiantes: "4° B"
    materia?: string;      // Solo profesores: "Matemática"
  };
  rutaActiva: string;      // Ej: "/comunidad" — determina qué item está activo
  onNavegar: (ruta: string) => void;
  onCerrarSesion: () => void;
}
```

---

## Reglas Críticas

1. **El Sidebar SIEMPRE está presente** en vistas autenticadas — nunca se oculta en desktop
2. **El item activo se determina comparando `rutaActiva`** con la ruta de cada item
3. **Los items de nav cambian según el rol** — usar las tablas de arriba
4. **Cerrar Sesión siempre está al fondo**, separado visualmente de la nav
5. **El avatar va debajo del logo**, no al fondo (el Stitch original lo tenía abajo — CORREGIDO)
6. **Comunidad es siempre el PRIMER item** para todos los perfiles educativos (no para Admin Sistema)
7. **Cada página nueva debe recibir el Sidebar** como parte del layout
