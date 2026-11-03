// El buscador de secciones (Ctrl K), como la paleta de comandos de cualquier
// aplicación: se escribe, se recorre con las flechas y se abre con Enter.
import { useEffect, useMemo, useRef, useState } from "react";
import { accesosDeRol } from "./navegacionItems";
import { useInstancia } from "../../../servicios/instancia";
import type { Rol } from "./roles";

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function BuscadorNavegacion({ rol, onCerrar, onNavegar }: {
  rol: Rol; onCerrar: () => void; onNavegar: (ruta: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const { instancia } = useInstancia();
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const items = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return accesosDeRol(rol, instancia).filter(i => normalizar(i.label).includes(q));
  }, [rol, instancia, busqueda]);
  const actual = Math.min(elegido, Math.max(0, items.length - 1));
  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${actual}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actual]);

  return <dialog ref={dialog} className="nexo-search-dialog" onCancel={onCerrar} onClose={onCerrar}
    onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} aria-label="Buscar en NEXO">
    <label className="nexo-search-input"><span className="material-symbols-outlined" aria-hidden="true">search</span>
      <input autoFocus value={busqueda} onChange={e => { setBusqueda(e.target.value); setElegido(0); }} placeholder="¿A dónde querés ir?" aria-label="Buscar sección"
        role="combobox" aria-expanded="true" aria-controls="nexo-buscador-lista" aria-activedescendant={items[actual] ? `nexo-buscador-${actual}` : undefined}
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setElegido((actual + 1) % Math.max(1, items.length)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setElegido((actual - 1 + items.length) % Math.max(1, items.length)); }
          if (e.key === "Enter" && items[actual]) onNavegar(items[actual].ruta);
        }} />
      <button type="button" onClick={onCerrar} className="nexo-icon-button" aria-label="Cerrar buscador"><span className="material-symbols-outlined">close</span></button>
    </label>
    <div ref={lista} id="nexo-buscador-lista" className="nexo-search-results" role="listbox" aria-label="Secciones">
      {items.length > 0 && <p className="nexo-search-grupo">{busqueda ? "Resultados" : "Secciones"}</p>}
      {items.map((i, n) => <button key={i.ruta} id={`nexo-buscador-${n}`} data-indice={n} role="option" aria-selected={n === actual}
        onMouseEnter={() => setElegido(n)} onClick={() => onNavegar(i.ruta)} className="nexo-search-result">
        <span className="material-symbols-outlined" aria-hidden="true">{i.icono}</span><span>{i.label}</span>
        {n === actual && <span className="material-symbols-outlined ml-auto" aria-hidden="true" style={{ fontSize: 18 }}>keyboard_return</span>}
      </button>)}
      {!items.length && <p className="p-8 text-center text-sm text-on-surface-variant">No hay secciones con ese nombre. Probá con otra palabra.</p>}
    </div>
    <p className="nexo-search-pie"><span><kbd>↑</kbd><kbd>↓</kbd>recorrer</span><span><kbd>Enter</kbd>abrir</span><span><kbd>Esc</kbd>cerrar</span></p>
  </dialog>;
}
