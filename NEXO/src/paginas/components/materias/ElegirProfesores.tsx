// Elegir qué profesores dan una materia: arriba, los elegidos (con una × para
// sacarlos); abajo, todos los profesores de la escuela con un buscador para
// encontrarlos rápido aunque sean 60.

import { useMemo, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { normalizar, type ProfesorDeMateria } from "../../../servicios/materias";

interface Props {
  /** Todos los profesores activos de la escuela. */
  profesores: { id: string; nombre: string; email: string }[];
  /** Los que ya tenía la materia (puede haber alguno inactivo). */
  vinculados: ProfesorDeMateria[];
  elegidos: string[];
  /** Profesor → cursos donde da esta materia (no se puede sacar). */
  bloqueados: Map<string, string[]>;
  onCambiar: (ids: string[]) => void;
}

export default function ElegirProfesores({ profesores, vinculados, elegidos, bloqueados, onCambiar }: Props) {
  const { navegar } = useNavegacion();
  const [busqueda, setBusqueda] = useState("");
  const [soloElegidos, setSoloElegidos] = useState(false);

  const nombres = useMemo(() => {
    const mapa = new Map<string, { nombre: string; activo: boolean }>();
    for (const p of vinculados) mapa.set(p.id, { nombre: p.nombre, activo: p.activo });
    for (const p of profesores) mapa.set(p.id, { nombre: p.nombre, activo: true });
    return mapa;
  }, [profesores, vinculados]);
  const elegidosOrdenados = useMemo(
    () => elegidos.filter((id) => nombres.has(id)).sort((a, b) => nombres.get(a)!.nombre.localeCompare(nombres.get(b)!.nombre, "es")),
    [elegidos, nombres],
  );
  const lista = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    return profesores.filter((p) => {
      if (soloElegidos && !elegidos.includes(p.id)) return false;
      const texto = normalizar(`${p.nombre} ${p.email}`);
      return palabras.every((x) => texto.includes(x));
    });
  }, [profesores, busqueda, soloElegidos, elegidos]);

  const alternar = (id: string) => {
    if (elegidos.includes(id)) {
      if (bloqueados.has(id)) return;
      onCambiar(elegidos.filter((x) => x !== id));
    } else onCambiar([...elegidos, id]);
  };

  if (profesores.length === 0 && vinculados.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-surface-container px-4 py-4">
        <p className="text-sm text-on-surface-variant">Todavía no hay profesores cargados en la escuela. Primero dalos de alta en Perfiles académicos; después volvé y elegilos acá.</p>
        <button type="button" className="nx-btn nx-btn-secundario" onClick={() => navegar("/admin/perfiles")}>
          <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>Ir a Perfiles académicos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Elegidos */}
      <div className="rounded-xl bg-surface-container px-3 py-3">
        <p className="mb-2 text-sm font-medium text-on-surface">
          {elegidosOrdenados.length === 0 ? "Todavía no elegiste ningún profesor." : `Elegidos: ${elegidosOrdenados.length} de ${profesores.length}`}
        </p>
        {elegidosOrdenados.length > 0 && <ul className="flex flex-wrap gap-2">
          {elegidosOrdenados.map((id) => {
            const p = nombres.get(id)!;
            const cursos = bloqueados.get(id);
            return <li key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-sm font-medium text-primary">
              {p.nombre}{!p.activo && <span className="text-xs font-normal text-on-surface-variant">(inactivo)</span>}
              {cursos
                ? <span className="px-2 text-xs font-normal text-on-surface-variant" title={`La da en ${cursos.join(", ")}. Para sacarla, primero quitala o cambiale el profesor en ese curso.`}>da en {cursos.join(", ")}</span>
                : <button type="button" onClick={() => alternar(id)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-primary/20" aria-label={`Sacar a ${p.nombre}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">close</span>
                </button>}
            </li>;
          })}
        </ul>}
      </div>

      {/* Todos los profesores */}
      {profesores.length > 0 && <>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: 19 }} aria-hidden="true">search</span>
            <input className="nx-campo pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar profesor por nombre o correo" aria-label="Buscar profesor" />
          </label>
          <button type="button" onClick={() => setSoloElegidos((s) => !s)} aria-pressed={soloElegidos}
            className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${soloElegidos ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-white/5"}`}>
            Ver solo los elegidos
          </button>
        </div>
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-xl" aria-label="Profesores de la escuela">
          {lista.map((p) => {
            const marcado = elegidos.includes(p.id);
            const cursos = bloqueados.get(p.id);
            return <li key={p.id}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${marcado ? "bg-primary/10" : "bg-surface-container hover:bg-surface-container-high"} ${cursos ? "cursor-default" : ""}`}>
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-acento" checked={marcado} disabled={Boolean(cursos) && marcado} onChange={() => alternar(p.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-on-surface">{p.nombre}</span>
                  <span className="block truncate text-xs text-on-surface-variant">{cursos ? `Da esta materia en ${cursos.join(", ")}` : p.email}</span>
                </span>
              </label>
            </li>;
          })}
          {lista.length === 0 && <li className="px-3 py-4 text-sm text-on-surface-variant">{soloElegidos ? "No hay profesores elegidos con esa búsqueda." : "Ningún profesor coincide con la búsqueda."}</li>}
        </ul>
      </>}
    </div>
  );
}
