// El temario de una materia: una lista de unidades (título + contenidos) que se
// pueden agregar, quitar y ordenar con flechas. Es opcional.

import { useEffect, useRef, useState } from "react";
import { nuevaClave, type UnidadEditable } from "./temario";

interface Props {
  unidades: UnidadEditable[];
  onCambiar: (unidades: UnidadEditable[]) => void;
  soloLectura: boolean;
}

export default function EditorTemario({ unidades, onCambiar, soloLectura }: Props) {
  // Al agregar una unidad, el cursor va directo a su título.
  const [enfocar, setEnfocar] = useState<string | null>(null);
  const titulos = useRef(new Map<string, HTMLInputElement>());
  useEffect(() => {
    if (!enfocar) return;
    titulos.current.get(enfocar)?.focus();
  }, [enfocar]);

  const cambiar = (clave: string, campo: "titulo" | "contenidos", valor: string) =>
    onCambiar(unidades.map((u) => (u.clave === clave ? { ...u, [campo]: valor } : u)));
  const mover = (indice: number, paso: -1 | 1) => {
    const destino = indice + paso;
    if (destino < 0 || destino >= unidades.length) return;
    const copia = [...unidades];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onCambiar(copia);
  };
  const agregar = () => {
    const clave = nuevaClave();
    onCambiar([...unidades, { clave, titulo: "", contenidos: "" }]);
    setEnfocar(clave);
  };

  if (unidades.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-surface-container px-4 py-4">
        <p className="text-sm text-on-surface-variant">Esta materia todavía no tiene temario.</p>
        {!soloLectura && <button type="button" onClick={agregar} className="nx-btn nx-btn-secundario">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>Agregar la primera unidad
        </button>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {unidades.map((u, i) => (
          <li key={u.clave} className="rounded-xl bg-surface-container p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-on-surface">Unidad {i + 1}</span>
              {!soloLectura && <span className="flex items-center gap-1">
                <button type="button" className="nexo-icon-button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir la unidad ${i + 1}`} title="Subir">
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <button type="button" className="nexo-icon-button" onClick={() => mover(i, 1)} disabled={i === unidades.length - 1} aria-label={`Bajar la unidad ${i + 1}`} title="Bajar">
                  <span className="material-symbols-outlined">arrow_downward</span>
                </button>
                <button type="button" className="nexo-icon-button text-rose-300" onClick={() => onCambiar(unidades.filter((x) => x.clave !== u.clave))} aria-label={`Quitar la unidad ${i + 1}`} title="Quitar unidad">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </span>}
            </div>
            <label className="block text-sm font-medium text-on-surface">Título
              <input ref={(el) => { if (el) titulos.current.set(u.clave, el); else titulos.current.delete(u.clave); }}
                maxLength={150} value={u.titulo} onChange={(e) => cambiar(u.clave, "titulo", e.target.value)} className="nx-campo mt-1.5" placeholder="Ej.: Funciones lineales" />
            </label>
            <label className="mt-3 block text-sm font-medium text-on-surface">Contenidos <span className="font-normal text-on-surface-variant">(opcional)</span>
              <textarea rows={3} maxLength={4000} value={u.contenidos} onChange={(e) => cambiar(u.clave, "contenidos", e.target.value)}
                className="nx-campo mt-1.5 h-auto py-2.5 leading-relaxed" placeholder="Temas, subtemas, actividades…" />
            </label>
          </li>
        ))}
      </ol>
      {!soloLectura && <button type="button" onClick={agregar} className="nx-btn nx-btn-secundario self-start">
        <span className="material-symbols-outlined" aria-hidden="true">add</span>Agregar otra unidad
      </button>}
    </div>
  );
}
