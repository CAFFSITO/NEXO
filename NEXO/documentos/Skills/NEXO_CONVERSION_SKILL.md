# ⚡ NEXO — SKILL DE CONVERSIÓN: Stitch HTML → React + TypeScript + Tailwind

## Propósito
Este documento es la guía principal para convertir vistas HTML generadas en Stitch (Google) a componentes React + TypeScript + Tailwind CSS dentro del proyecto NEXO.

**Leé este archivo SIEMPRE antes de transformar cualquier código HTML de Stitch.**

---

## Stack del Proyecto

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18+ | UI components |
| TypeScript | 5+ | Tipado estricto |
| Tailwind CSS | 4+ | Estilos utilitarios |
| Vite | 6+ | Build tool |
| Material Symbols | — | Iconografía |
| Plus Jakarta Sans | — | Font headings |
| Inter | — | Font body |

---

## Reglas de Conversión

### 1. ESTRUCTURA: Un HTML → Múltiples archivos .tsx

Cada HTML de Stitch es una vista completa. Al convertir, dividir en:

```
PaginaX.tsx                    ← Página (ensambla componentes)
  └── usa →
      ComponenteA.tsx          ← Componente específico de esta vista
      ComponenteB.tsx          ← Componente específico de esta vista
      ComponenteShared.tsx     ← Componente reutilizable (ya existente)
```

**Criterio para separar componentes:**
- ¿Se repite en otras vistas? → `components/shared/`
- ¿Es específico de esta vista? → `components/[modulo]/`
- ¿Es la vista completa? → `pages/`

### 2. HTML → JSX: Cambios obligatorios

| HTML | JSX (React) |
|---|---|
| `class="..."` | `className="..."` |
| `for="..."` | `htmlFor="..."` |
| `style="color: red"` | `style={{ color: 'red' }}` |
| `onclick="..."` | `onClick={...}` |
| `tabindex="0"` | `tabIndex={0}` |
| `<img>` sin cerrar | `<img />` (self-closing) |
| `<input>` sin cerrar | `<input />` (self-closing) |
| `<br>` | `<br />` |
| `<!-- comentario -->` | `{/* comentario */}` |
| `data-icon="search"` | Mantener como está |

### 3. TAILWIND: Mantener clases, limpiar inline styles

- Las clases de Tailwind del HTML de Stitch se copian **tal cual** a `className`
- Si hay estilos inline CSS (`style="..."`), convertir a Tailwind cuando sea posible
- Si Stitch usó colores hex directos (ej: `bg-[#2D1B4E]`), reemplazar por tokens del design system cuando exista equivalente:
  - `bg-[#190d2d]` → `bg-background`
  - `bg-[#25193a]` → `bg-surface-container`
  - `bg-[#302445]` → `bg-surface-container-high`
  - `bg-[#3b2f50]` → `bg-surface-container-highest`
  - `bg-[#130727]` → `bg-surface-container-lowest`
  - `bg-[#211535]` → `bg-surface-container-low`
  - `text-[#ecdcff]` → `text-on-surface`
  - `text-[#d4c1d5]` → `text-on-surface-variant`
  - `border-[#504253]` → `border-outline-variant`
- Si NO existe token, dejar el hex con bracket notation: `bg-[#C548F5]`

### 4. TYPESCRIPT: Tipar todo

```tsx
// Props siempre con interface
interface TarjetaPosteoProps {
  autor: string;
  contenido: string;
  fecha: string;
  rol: "estudiante" | "profesor" | "admin";
}

// Eventos tipados
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... }
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { ... }

// Estados tipados
const [valor, setValor] = useState<string>("");
const [items, setItems] = useState<Tarea[]>([]);
```

### 5. MATERIAL SYMBOLS: No cambiar

Los íconos de Material Symbols se mantienen como `<span>`:
```tsx
<span className="material-symbols-outlined">hub</span>
```
NO convertir a componente de librería de íconos. El proyecto usa la CDN de Google Fonts.

### 6. IMÁGENES de Stitch: Reemplazar

Stitch genera URLs de `lh3.googleusercontent.com` para imágenes placeholder. Al convertir:
- Imágenes de avatar → usar placeholder local o servicio como `ui-avatars.com`
- Imágenes decorativas → reemplazar con div placeholder o SVG
- Imágenes de contenido → usar placeholder descriptivo

```tsx
// En vez de URL de Google:
<img src="https://lh3.googleusercontent.com/..." />

// Usar:
<img src="/placeholder-avatar.jpg" alt="Julieta Rossi" />
// O un componente Avatar:
<Avatar nombre="Julieta Rossi" />
```

### 7. SCRIPTS de Tailwind CDN: Eliminar

Stitch incluye `<script src="https://cdn.tailwindcss.com">` y bloques `<script id="tailwind-config">`. **Eliminar todo esto.** La configuración de Tailwind está en `tailwind.config.ts` del proyecto.

### 8. ESTILOS en `<style>`: Migrar o eliminar

- Si son estilos de Material Symbols → ya están en `index.css`, eliminar
- Si son estilos custom necesarios → mover a un archivo CSS del componente o convertir a Tailwind
- Si son resets del body → ya están en `index.css`, eliminar

---

## Proceso de Conversión Paso a Paso

```
PASO 1: Leer el HTML de Stitch completo
PASO 2: Identificar las secciones lógicas (sidebar, header, cards, modals, etc.)
PASO 3: Decidir qué es componente shared vs. específico (consultar NEXO_COMPONENT_PATTERNS.md)
PASO 4: Crear los archivos .tsx empezando por los componentes hoja (sin dependencias)
PASO 5: Crear la página que los ensambla
PASO 6: Verificar que los imports estén correctos
PASO 7: Limpiar: eliminar scripts de CDN, estilos duplicados, URLs de Google
```

---

## Checklist Post-Conversión

- [ ] ¿Todos los `class` fueron cambiados a `className`?
- [ ] ¿Los colores hex tienen su token de Tailwind si existe?
- [ ] ¿Cada componente tiene su interface de Props con tipos correctos?
- [ ] ¿Se eliminaron los scripts de CDN y bloques `<style>` innecesarios?
- [ ] ¿Las imágenes de Google fueron reemplazadas?
- [ ] ¿Los componentes reutilizables están en `shared/`?
- [ ] ¿La página ensambla todo desde `pages/`?
- [ ] ¿Los datos de ejemplo están en español rioplatense?
- [ ] ¿Se exporta con `export default`?
