# 🧩 NEXO — CATÁLOGO DE COMPONENTES Y PATRONES

## Propósito
Este documento lista los componentes reutilizables del proyecto NEXO, su ubicación, props, y en qué vistas se usan. **Consultá este archivo antes de crear un componente nuevo** para no duplicar algo que ya existe.

---

## Componentes Compartidos (`components/shared/`)

Estos componentes se usan en MÚLTIPLES vistas y módulos.

### NexoLogo
**Archivo:** `components/shared/NexoLogo.tsx`
**Se usa en:** Login, Sidebar, vistas públicas
```tsx
interface NexoLogoProps {
  size?: "sm" | "md" | "lg";
  showSlogan?: boolean;
}
```

### InputField
**Archivo:** `components/shared/InputField.tsx`
**Se usa en:** Login, Crear Tarea, Crear Perfil, formularios en general
```tsx
interface InputFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}
```

### BackgroundGlow
**Archivo:** `components/shared/BackgroundGlow.tsx`
**Se usa en:** Login, páginas públicas
```tsx
// Sin props — componente decorativo puro
```

### Sidebar (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/Sidebar.tsx`
**Se usa en:** Todas las vistas autenticadas
**Elementos:**
- Logo NEXO (versión sm)
- Avatar + nombre + rol del usuario
- Items de navegación con estado activo
- Logout al fondo
```tsx
interface SidebarProps {
  usuario: {
    nombre: string;
    rol: "estudiante" | "profesor" | "admin" | "preceptor";
    avatarUrl?: string;
  };
  rutaActiva: string; // ej: "/comunidad"
}
```

### TopBar (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/TopBar.tsx`
**Se usa en:** Vistas autenticadas con header superior
```tsx
interface TopBarProps {
  titulo: string;
  badgeTexto?: string;
  mostrarBuscador?: boolean;
  mostrarNotificaciones?: boolean;
}
```

### BadgeRol (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/BadgeRol.tsx`
**Se usa en:** Comunidad, Chat, Perfiles
```tsx
interface BadgeRolProps {
  rol: "estudiante" | "profesor" | "admin" | "preceptor" | "centro";
}
// Colores automáticos:
// estudiante → emerald  |  profesor → blue  |  admin → violet
```

### BadgeEstado (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/BadgeEstado.tsx`
**Se usa en:** Portafolio, Objetivos, Tareas
```tsx
interface BadgeEstadoProps {
  estado: "pendiente" | "en-progreso" | "entregada" | "vencida";
}
// Colores automáticos:
// pendiente → amber  |  en-progreso → blue  |  entregada → green  |  vencida → red
```

### BadgeMateria (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/BadgeMateria.tsx`
**Se usa en:** Portafolio, Objetivos, Comunidad
```tsx
interface BadgeMateriaProps {
  materia: "matematica" | "historia" | "biologia" | "lengua" | "ingles" | "fisica";
}
```

### Avatar (PENDIENTE DE CREAR)
**Archivo futuro:** `components/shared/Avatar.tsx`
**Se usa en:** Sidebar, Comunidad, Chat, Perfiles
```tsx
interface AvatarProps {
  nombre: string;
  url?: string;
  size?: "xs" | "sm" | "md" | "lg";  // 24 | 32 | 40 | 48 px
  mostrarEstado?: boolean;
}
// Si no hay URL, muestra iniciales con fondo degradado
```

---

## Componentes por Módulo

### Módulo: Login (`components/login/`)
| Componente | Archivo | Estado |
|---|---|---|
| LoginForm | `LoginForm.tsx` | ✅ Creado |
| LoginFooter | `LoginFooter.tsx` | ✅ Creado |

### Módulo: Comunidad (`components/comunidad/`)
| Componente | Archivo | Estado |
|---|---|---|
| TarjetaPosteo | `TarjetaPosteo.tsx` | ⏳ Pendiente |
| TarjetaDebate | `TarjetaDebate.tsx` | ⏳ Pendiente |
| FormularioPosteo | `FormularioPosteo.tsx` | ⏳ Pendiente |
| SidebarTendencias | `SidebarTendencias.tsx` | ⏳ Pendiente |
| TimelineActividad | `TimelineActividad.tsx` | ⏳ Pendiente |
| CardEvento | `CardEvento.tsx` | ⏳ Pendiente |

### Módulo: Portafolio (`components/portafolio/`)
| Componente | Archivo | Estado |
|---|---|---|
| TarjetaTarea | `TarjetaTarea.tsx` | ⏳ Pendiente |
| BarraProgreso | `BarraProgreso.tsx` | ⏳ Pendiente |
| CardConsigna | `CardConsigna.tsx` | ⏳ Pendiente |
| CardEntrega | `CardEntrega.tsx` | ⏳ Pendiente |
| CardReflexion | `CardReflexion.tsx` | ⏳ Pendiente |

### Módulo: Objetivos (`components/objetivos/`)
| Componente | Archivo | Estado |
|---|---|---|
| TarjetaObjetivo | `TarjetaObjetivo.tsx` | ⏳ Pendiente |
| TarjetaHabito | `TarjetaHabito.tsx` | ⏳ Pendiente |
| CalendarioRacha | `CalendarioRacha.tsx` | ⏳ Pendiente |
| EscalaCompetencia | `EscalaCompetencia.tsx` | ⏳ Pendiente |

### Módulo: Aula Virtual (`components/aula-virtual/`)
| Componente | Archivo | Estado |
|---|---|---|
| PanelTrayectoria | `PanelTrayectoria.tsx` | ⏳ Pendiente |
| PulsoAula | `PulsoAula.tsx` | ⏳ Pendiente |
| PreguntasPendientes | `PreguntasPendientes.tsx` | ⏳ Pendiente |
| BarraControles | `BarraControles.tsx` | ⏳ Pendiente |

---

## Regla de Oro

**Antes de crear un componente nuevo, buscá en este archivo si ya existe o está planificado.** Si existe en `shared/`, usalo. Si no existe pero se va a usar en más de una vista, crealo en `shared/`.

---

## Convención de Nombres

- Archivos: `PascalCase.tsx` (ej: `TarjetaPosteo.tsx`)
- Componentes: `PascalCase` (ej: `export default function TarjetaPosteo`)
- Props: `PascalCase + Props` (ej: `interface TarjetaPosteoProps`)
- Carpetas: `kebab-case` (ej: `aula-virtual/`)
- Páginas: `PascalCase + Page` (ej: `ComunidadPage.tsx`)
