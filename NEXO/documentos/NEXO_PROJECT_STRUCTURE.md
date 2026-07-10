# 📁 NEXO — ESTRUCTURA DEL PROYECTO

## Propósito
Este documento define la estructura de carpetas y archivos del proyecto NEXO en React + TypeScript + Tailwind. **Consultá este archivo para saber dónde colocar cada archivo nuevo.**

---

## Árbol del Proyecto

```
NEXO/
├── public/
│   └── (assets estáticos: favicon, imágenes placeholder)
│
├── src/
│   ├── index.css                          ← Estilos globales + imports de fuentes
│   ├── main.tsx                           ← Entry point de React (no tocar)
│   ├── App.tsx                            ← Router principal
│   │
│   ├── pages/                             ← UNA página por vista principal
│   │   ├── LoginPage.tsx                  ✅
│   │   ├── ComunidadPage.tsx              ⏳
│   │   ├── MisTareasPage.tsx              ⏳
│   │   ├── DetalleTareaPage.tsx           ⏳
│   │   ├── ObjetivosPage.tsx              ⏳
│   │   ├── AulaVirtualPage.tsx            ⏳
│   │   ├── ResumenClasePage.tsx           ⏳
│   │   ├── BibliotecaPage.tsx             ⏳
│   │   ├── ChatPage.tsx                   ⏳
│   │   └── AsistenciaIAPage.tsx           ⏳
│   │
│   ├── components/
│   │   ├── shared/                        ← Componentes reutilizables en toda la app
│   │   │   ├── NexoLogo.tsx               ✅
│   │   │   ├── InputField.tsx             ✅
│   │   │   ├── BackgroundGlow.tsx         ✅
│   │   │   ├── Sidebar.tsx                ⏳
│   │   │   ├── TopBar.tsx                 ⏳
│   │   │   ├── Avatar.tsx                 ⏳
│   │   │   ├── BadgeRol.tsx               ⏳
│   │   │   ├── BadgeEstado.tsx            ⏳
│   │   │   └── BadgeMateria.tsx           ⏳
│   │   │
│   │   ├── login/                         ← Componentes del módulo Login
│   │   │   ├── LoginForm.tsx              ✅
│   │   │   └── LoginFooter.tsx            ✅
│   │   │
│   │   ├── comunidad/                     ← Componentes del módulo Comunidad
│   │   │   ├── TarjetaPosteo.tsx          ⏳
│   │   │   ├── TarjetaDebate.tsx          ⏳
│   │   │   └── ...
│   │   │
│   │   ├── portafolio/                    ← Componentes del módulo Portafolio
│   │   │   ├── TarjetaTarea.tsx           ⏳
│   │   │   └── ...
│   │   │
│   │   ├── objetivos/                     ← Componentes del módulo Objetivos
│   │   │   ├── TarjetaObjetivo.tsx        ⏳
│   │   │   └── ...
│   │   │
│   │   └── aula-virtual/                  ← Componentes del módulo Aula Virtual
│   │       ├── PulsoAula.tsx              ⏳
│   │       └── ...
│   │
│   └── types/                             ← Tipos compartidos de TypeScript
│       └── index.ts                       ⏳
│
├── docs/                                  ← Documentación del proyecto (estos .md)
│   ├── NEXO_CONVERSION_SKILL.md
│   ├── NEXO_COMPONENT_PATTERNS.md
│   └── NEXO_PROJECT_STRUCTURE.md
│
├── modulos/                               ← HTMLs originales de Stitch (REFERENCIA)
│   ├── moduloLogin/
│   │   └── login.html
│   ├── moduloComunidad/
│   │   └── comunidad.html
│   └── ...
│
├── tailwind.config.ts                     ← Tokens del Design System
├── index.html                             ← HTML base de Vite
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Reglas de Ubicación

| Tipo de archivo | Ubicación | Ejemplo |
|---|---|---|
| Página completa (vista) | `src/pages/` | `ComunidadPage.tsx` |
| Componente reutilizable | `src/components/shared/` | `Sidebar.tsx` |
| Componente de un módulo | `src/components/[modulo]/` | `components/comunidad/TarjetaPosteo.tsx` |
| Tipos compartidos | `src/types/` | `types/index.ts` |
| HTML de Stitch (ref.) | `modulos/[modulo]/` | `modulos/moduloComunidad/comunidad.html` |
| Documentación | `docs/` | `docs/NEXO_CONVERSION_SKILL.md` |
| Estilos globales | `src/index.css` | (uno solo para toda la app) |
| Config de Tailwind | `tailwind.config.ts` | (uno solo en la raíz) |

---

## Reglas Importantes

1. **No crear CSS por componente.** Todo se resuelve con Tailwind en el `className`.
2. **No crear archivos `.js`.** Todo es `.tsx` (componentes) o `.ts` (utilidades/tipos).
3. **Los HTML de Stitch van en `modulos/` como referencia**, nunca dentro de `src/`.
4. **Cada página importa sus componentes**, nunca lógica directa en la página.
5. **`shared/` es sagrado**: solo componentes que se usan en 2+ módulos distintos.
