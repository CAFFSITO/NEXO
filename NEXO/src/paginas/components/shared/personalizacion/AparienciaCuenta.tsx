// La apariencia de NEXO en este dispositivo: claro, oscuro o automático (sigue
// la configuración del sistema). Como en cualquier aplicación, se guarda en el
// dispositivo y se aplica al instante.
import { guardarPreferenciaModo, type PreferenciaModo } from "../../../../servicios/tema";
import { usePreferenciaModo } from "../../../../servicios/useModo";

const MODOS: { id: PreferenciaModo; nombre: string; detalle: string; icono: string }[] = [
  { id: "claro", nombre: "Claro", detalle: "Fondo blanco", icono: "light_mode" },
  { id: "oscuro", nombre: "Oscuro", detalle: "Descansa la vista de noche", icono: "dark_mode" },
  { id: "sistema", nombre: "Automático", detalle: "Igual que el dispositivo", icono: "contrast" },
];

export default function AparienciaCuenta() {
  const modo = usePreferenciaModo();
  return (
    <section className="nx-tarjeta p-6 space-y-4" aria-labelledby="apariencia-titulo">
      <div>
        <h2 id="apariencia-titulo" className="text-lg font-semibold text-on-surface">Apariencia</h2>
        <p className="text-sm text-on-surface-variant">Elegí cómo se ve NEXO en este dispositivo. Los colores de tu escuela se mantienen.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Apariencia">
        {MODOS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={modo === m.id} onClick={() => guardarPreferenciaModo(m.id)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${modo === m.id ? "border-acento bg-primary/5 ring-1 ring-acento" : "border-outline-variant hover:bg-surface-container-high"}`}>
            <span className={`material-symbols-outlined grid h-10 w-10 shrink-0 place-items-center rounded-lg ${modo === m.id ? "bg-acento text-white" : "bg-surface-container-high text-on-surface-variant"}`} aria-hidden="true">{m.icono}</span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-on-surface">{m.nombre}</span><span className="block text-xs text-on-surface-variant">{m.detalle}</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
