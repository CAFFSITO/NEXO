// El programa y el temario que la dirección cargó en Materias, como referencia
// para el profesor al entrar a su materia. Arranca cerrado para no tapar lo de
// todos los días (horarios, avisos); se abre con un toque.

import { useState } from "react";
import type { ReferenciaMateria as Referencia } from "../../../servicios/materia";

const PARTES = [
  { clave: "descripcion", titulo: "Descripción" },
  { clave: "objetivos", titulo: "Objetivos" },
  { clave: "evaluacion", titulo: "Criterios de evaluación" },
  { clave: "bibliografia", titulo: "Bibliografía y materiales" },
] as const;

export default function ReferenciaMateria({ referencia: r }: { referencia: Referencia }) {
  const [abierta, setAbierta] = useState(false);
  const partes = PARTES.filter((p) => r[p.clave].trim() !== "");
  const datos = [r.anio ? `${r.anio}° año` : null, r.area, r.horasSemanales ? `${r.horasSemanales} h por semana` : null].filter(Boolean);
  if (partes.length === 0 && r.temario.length === 0) return null;
  const resumen = [r.temario.length ? (r.temario.length === 1 ? "1 unidad" : `${r.temario.length} unidades`) : null, partes.length ? "programa" : null].filter(Boolean).join(" y ");

  return (
    <section className="mb-10 rounded-[14px] bg-lienzo p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-white">
            <span className="material-symbols-outlined text-acento" aria-hidden="true">menu_book</span>
            Programa y temario de referencia
          </h2>
          <p className="mt-1 text-sm text-slate-400">Lo cargó la dirección: {resumen}.{datos.length ? ` ${datos.join(" · ")}.` : ""}</p>
        </div>
        <button type="button" onClick={() => setAbierta((a) => !a)} aria-expanded={abierta} className="nx-btn nx-btn-secundario">
          <span className="material-symbols-outlined" aria-hidden="true">{abierta ? "expand_less" : "expand_more"}</span>
          {abierta ? "Ocultar" : "Ver"}
        </button>
      </div>

      {abierta && <div className="mt-5 flex flex-col gap-6">
        {r.temario.length > 0 && <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Temario</h3>
          <ol className="flex flex-col gap-3">
            {r.temario.map((u) => (
              <li key={u.numero} className="rounded-xl bg-fondo p-4">
                <p className="font-semibold text-white">Unidad {u.numero} · {u.titulo}</p>
                {u.contenidos && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-300">{u.contenidos}</p>}
              </li>
            ))}
          </ol>
        </div>}
        {partes.map((p) => (
          <div key={p.clave}>
            <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">{p.titulo}</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{r[p.clave]}</p>
          </div>
        ))}
      </div>}
    </section>
  );
}
