En NEXOLas pantallas se diseñaron en Stitch (Google) como HTML estático y ahora se están migrando a un proyecto real.
1. Validación de stack tecnológico
Se confirmó que React + TypeScript + Tailwind CSS es la combinación correcta para migrar los HTMLs de Stitch. Se recomendó Vite como build tool y transform.tools/html-to-jsx como herramienta auxiliar gratuita.
2. Primera conversión: Login
Se tomó el HTML de Stitch del login y se dividió en componentes React tipados:

NexoLogo.tsx — Logo reutilizable con props de tamaño y slogan
InputField.tsx — Input genérico con toggle password
BackgroundGlow.tsx — Fondo decorativo con blur circles
LoginForm.tsx — Formulario con email, contraseña y CTA
LoginFooter.tsx — Footer con links legales
LoginPage.tsx — Página que ensambla todo
tailwind.config.ts — Todos los tokens del Design System de NEXO
index.css — Imports de fuentes y estilos base

3. Setup del proyecto en Antigravity (VS Code + agente Google)
Se creó el proyecto con yarn create vite NEXO --template react-ts. Se resolvieron dos errores iniciales: App.tsx tenía código duplicado (la función vieja de Vite + la nueva), y faltaban los types de React (@types/react).
4. Documentación para Antigravity
Se crearon 5 archivos .md para que Antigravity pueda convertir HTMLs automáticamente:

NEXO_CONVERSION_SKILL.md — Reglas de conversión HTML→React (class→className, tokens, tipado, limpieza de CDN, reemplazo de imágenes)
NEXO_COMPONENT_PATTERNS.md — Catálogo de componentes existentes y planificados con sus props
NEXO_PROJECT_STRUCTURE.md — Reglas de ubicación de archivos (pages/, components/shared/, components/[modulo]/)
NEXO_PROMPT_TEMPLATE.md — Plantillas de prompt listas para copiar y pegar en Antigravity
NEXO_ARCHITECTURE_SKILL.md — ASCII completo del proyecto con estados (✅/⏳), mapa módulos→perfiles, convenciones de nombres y flujo de trabajo

5. Sidebar: Núcleo de navegación
Se extrajo el sidebar del HTML de Comunidad como componente central. Errores corregidos vs el Stitch original:

Avatar movido de abajo hacia arriba (debajo del logo, como dice el Design System)
Agregado "Cerrar Sesión" al fondo (faltaba en Stitch)
Íconos corregidos según Design System (target en vez de emoji_events, auto_awesome en vez de smart_toy)
Ícono activo con relleno automático (FILL 1)
Height cambiado de hardcodeado 1024px a h-screen
Se creó NEXO_SIDEBAR_SKILL.md con los items de navegación para cada uno de los 6 perfiles, specs técnicas y reglas de uso.

6. Errores resueltos

@types/react faltante → yarn add -D @types/react @types/react-dom
Script dev faltante en package.json → agregar "dev": "vite" o usar yarn vite

Estado actual: Login convertido y funcionando. Sidebar componentizado con soporte multi-rol. Documentación completa para que Antigravity convierta las próximas vistas. Pendiente: elegir y convertir las pantallas restantes (Comunidad, Portafolio, Objetivos, Aula Virtual, etc.).