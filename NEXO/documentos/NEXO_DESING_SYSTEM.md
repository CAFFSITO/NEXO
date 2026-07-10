# 🎨 NEXO — DESIGN SYSTEM

## Identidad Visual

**Nombre:** NEXO  
**Slogan:** Conectando el aprendizaje que importa  
**Logo:** Ícono de nodos conectados (tipo red/grafo) en magenta sobre fondo oscuro  
**Estilo:** Dark UI, moderno, educativo pero juvenil. Inspirado en plataformas tech premium.

---

NEXO — Colorimetría completa

BASES
Deep Midnight   #1C1030
Dark Plum       #2D1B4E
Surface         #3D2A6B

MARCA
Nexo Purple     #7B2FBE
Nexo Violet     #9333EA
Nexo Lilac      #C084FC
Nexo Mist       #EFE5FF

SEMÁNTICOS
Success         #22C55E
Warning         #F59E0B
Danger          #EF4444

FONDOS SEMÁNTICOS
Success bg      #DCFCE7
Warning bg      #FEF3C7
Danger bg       #FEE2E2
Purple bg       #EFE5FF
Warm bg         #FEF9F0

TEXTOS (sobre blanco)
Text Primary    #18103A
Text Mid        #4B3D6E
Text Soft       #8B7AB8
Text Disabled   #C4B8E0

BORDES
Border Light    #EDE9F7
Border Mid      #DDD5F5


---

## Tipografía

```
Font familia principal:  'Inter', sans-serif
Font display/headings:   'Plus Jakarta Sans', sans-serif  (alternativa: 'DM Sans')

--font-size-xs:    11px
--font-size-sm:    13px
--font-size-base:  15px
--font-size-md:    17px
--font-size-lg:    20px
--font-size-xl:    24px
--font-size-2xl:   30px
--font-size-3xl:   38px

--font-weight-normal:    400
--font-weight-medium:    500
--font-weight-semibold:  600
--font-weight-bold:      700
--font-weight-extrabold: 800
```

---

## Espaciado y Border Radius

```
--radius-sm:   6px    /* Badges, chips pequeños */
--radius-md:   10px   /* Inputs, botones */
--radius-lg:   14px   /* Cards principales */
--radius-xl:   20px   /* Modals, containers grandes */
--radius-full: 9999px /* Pills, avatares */

--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
```

---

## Componentes Base

### Sidebar de Navegación
- **Ancho:** 220px (desktop), colapsable en mobile
- **Fondo:** `--bg-sidebar`
- **Logo NEXO** arriba: ícono nodos + texto "NEXO" en blanco bold
- **Avatar de usuario** + nombre + badge de rol (debajo del logo)
- **Ítems de navegación:** ícono + label, altura 44px, border-radius 8px
- **Estado activo:** fondo `--accent-primary-muted`, borde izquierdo 3px `--accent-primary`, texto blanco
- **Estado hover:** fondo `rgba(197, 72, 245, 0.08)`
- **Logout** siempre abajo del todo, con ícono de salida

### Cards
```
background: --bg-surface
border: 1px solid --border-subtle
border-radius: --radius-lg
padding: 20px 24px
box-shadow: 0 2px 12px rgba(0,0,0,0.3)
```
**Card activa / hover:**
```
border-color: --border-active
box-shadow: 0 4px 20px --accent-glow
```

### Botones

**Primario (CTA):**
```
background: --accent-primary
color: #000  (texto negro sobre magenta)
font-weight: 700
border-radius: --radius-md
padding: 10px 20px
hover: --accent-primary-hover + scale(1.02)
```

**Secundario (outline):**
```
background: transparent
border: 1.5px solid --accent-primary
color: --accent-primary
hover: background --accent-primary-muted
```

**Ghost:**
```
background: transparent
color: --text-secondary
hover: color --text-primary, background rgba(255,255,255,0.05)
```

**Destructivo:**
```
background: rgba(239,68,68,0.15)
color: #EF4444
border: 1px solid rgba(239,68,68,0.3)
```

### Badges / Pills de Estado
```
Estructura: [• indicador] [TEXTO EN CAPS]
border-radius: --radius-sm
padding: 3px 8px
font-size: --font-size-xs
font-weight: 600
letter-spacing: 0.05em
```
Usar los colores de `--status-*` para fondo y texto correspondiente.

### Badges de Materia
Pills con colores vibrantes diferenciados por materia:
- Matemática: `#3B82F6` (azul)
- Historia: `#F97316` (naranja)
- Biología: `#10B981` (verde)
- Lengua: `#8B5CF6` (violeta)
- Inglés: `#EC4899` (rosa)

### Inputs y Campos de Formulario
```
background: --bg-input
border: 1px solid --border-input
border-radius: --radius-md
padding: 12px 16px
color: --text-primary
placeholder-color: --text-muted
focus: border-color --accent-primary, box-shadow 0 0 0 3px --accent-glow
```

### Barras de Progreso
```
background (track): rgba(155,142,196,0.15)
fill: linear-gradient(90deg, --accent-primary, #7C3AED)
height: 6px
border-radius: --radius-full
```

### Avatares
```
Circular, border-radius: 50%
Con inicial en fondo degradado si no hay foto
Tamaños: 24px (xs), 32px (sm), 40px (md), 48px (lg)
```

---

## Layout General (Desktop)

```
┌─────────────────────────────────────────────┐
│  SIDEBAR (220px)  │  MAIN CONTENT (flex 1)  │
│                   │                          │
│  Logo NEXO        │  [Header de vista]       │
│  Avatar + Rol     │                          │
│                   │  [Contenido principal]   │
│  Nav items        │                          │
│                   │                          │
│  [Logout]         │                          │
└─────────────────────────────────────────────┘
```

**Algunas vistas del Tier Docente** usan header top en lugar de sidebar:
```
┌─────────────────────────────────────────────┐
│  [TOP NAV: Logo | Materia/Curso | Acciones | Avatar] │
├─────────────────────────────────────────────┤
│  LEFT PANEL  │  MAIN CANVAS  │  RIGHT PANEL │
│  (240px)     │  (flex 1)     │  (260px)     │
└─────────────────────────────────────────────┘
```

---

## Íconos

Usar **Lucide Icons** o similar (línea fina, stroke-width: 1.5).  
Tamaño estándar: 18px en navegación, 16px en acciones inline.

Íconos clave del sistema:
- Comunidad: `users`
- Mis Cursos: `book-open`
- Calendario: `calendar`
- Biblioteca: `library`
- Mis Tareas: `check-square`
- Mis Objetivos: `target`
- Chat: `message-circle`
- Notificaciones: `bell`
- Configuración: `settings`
- Logout: `log-out`
- Subir archivo: `upload-cloud`
- IA / Asistente: `sparkles` o `stars`
- Nueva tarea: `plus`
- Buscar: `search`
- Filtros: `sliders`

---

## Datos de Ejemplo (para usar en prototipos)

### Usuario de prueba — Estudiante
- **Nombre:** Julieta Rossi
- **Curso:** 4° B
- **Ciclo:** 2025
- **Avatar:** Foto de perfil femenina

### Usuario de prueba — Profesor
- **Nombre:** Prof. García / Prof. Gómez / Prof. Méndez
- **Materia:** Matemática / Historia / Biología

### Materias de ejemplo
Matemática · Historia · Biología · Lengua · Inglés · Física · Ed. Física

### Institución de ejemplo
- **Nombre:** Colegio San Martín / School Alpha
- **País:** Argentina