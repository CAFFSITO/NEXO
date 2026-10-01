import { useEffect, useRef, useState } from "react";
import { accesosDeRol } from "./navegacionItems";
import type { Rol } from "./roles";

export default function BuscadorNavegacion({ rol, onCerrar, onNavegar }: {
  rol: Rol; onCerrar: () => void; onNavegar: (ruta: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const items = accesosDeRol(rol).filter(i => normalizar(i.label).includes(normalizar(busqueda)));
  return <dialog ref={dialog} className="nexo-search-dialog" onCancel={onCerrar} onClose={onCerrar}
    onClick={e => { if (e.target === e.currentTarget) onCerrar(); }} aria-labelledby="buscar-titulo">
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 id="buscar-titulo" className="font-headline font-bold">Explorá tu espacio</h2>
        <button onClick={onCerrar} className="nexo-icon-button" aria-label="Cerrar buscador"><span className="material-symbols-outlined">close</span></button>
      </div>
      <label className="nexo-search-input"><span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar una sección…" aria-label="Buscar sección"
          onKeyDown={e => { if (e.key === "Enter" && items[0]) onNavegar(items[0].ruta); }} />
      </label>
    </div>
    <div className="nexo-search-results">
      {items.map(i => <button key={i.ruta} onClick={() => onNavegar(i.ruta)} className="nexo-search-result">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">{i.icono}</span><span>{i.label}</span>
        <span className="material-symbols-outlined ml-auto text-sm" aria-hidden="true">arrow_forward</span>
      </button>)}
      {!items.length && <p className="p-6 text-center text-sm text-on-surface-variant">No hay secciones con ese nombre. Probá con otra palabra.</p>}
    </div>
    <p className="px-5 py-3 text-xs text-on-surface-variant border-t border-white/10">Tab para recorrer · Enter para abrir · Esc para cerrar</p>
  </dialog>;
}
