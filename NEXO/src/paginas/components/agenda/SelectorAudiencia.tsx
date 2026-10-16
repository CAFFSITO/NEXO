// "¿Quién lo ve?": la jerarquía de la escuela de arriba hacia abajo, con un
// candado en lo que está por encima de tu nivel. Se elige toda la escuela, un
// nivel entero, perfiles, grupos de un curso (estudiantes, familias, profesores,
// preceptor), personas puntuales o la familia de un estudiante. El servidor
// vuelve a validar todo: esto solo no ofrece lo imposible.

import { useMemo, useState } from "react";
import type { Destino, DestinosCalendario } from "../../../servicios/calendario";

interface Props {
  destinos: DestinosCalendario;
  valor: Destino[];
  onCambiar: (lista: Destino[]) => void;
}

const ROL = { estudiante: "Estudiantes", familia: "Familias", profesor: "Profesores", preceptor: "Preceptor" } as const;
const POLITICA = {
  "nivel-y-abajo": "podés mostrarle eventos a tu nivel y a los de abajo",
  abajo: "podés mostrarle eventos a los niveles de abajo",
  personal: "tus eventos son personales: solo los ves vos",
} as const;

const igual = (a: Destino, b: Destino) =>
  a.tipo === b.tipo && (a.valor ?? null) === (b.valor ?? null) && (a.cursoId ?? null) === (b.cursoId ?? null) &&
  (a.rol ?? null) === (b.rol ?? null) && (a.usuarioId ?? null) === (b.usuarioId ?? null);
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function etiquetaLocal(d: Destino, destinos: DestinosCalendario): string {
  switch (d.tipo) {
    case "todos": return "Toda la escuela";
    case "nivel": return `Todo «${destinos.niveles.find((n) => n.id === d.valor)?.nombre ?? d.valor}»`;
    case "perfil": return destinos.perfiles.find((p) => p.clave === d.valor)?.nombre ?? String(d.valor);
    case "curso": return `${destinos.cursos.find((c) => c.id === d.cursoId)?.nombre ?? "Curso"} · ${ROL[d.rol!] ?? d.rol}`;
    case "persona": return destinos.personas.find((p) => p.id === d.usuarioId)?.nombre ?? "Persona";
    case "familia-de": return `Familia de ${destinos.familiasDe.find((p) => p.id === d.usuarioId)?.nombre ?? "un estudiante"}`;
  }
}

export default function SelectorAudiencia({ destinos, valor, onCambiar }: Props) {
  const [buscar, setBuscar] = useState("");
  const tiene = (d: Destino) => valor.some((x) => igual(x, d));
  const alternar = (d: Destino) => onCambiar(tiene(d) ? valor.filter((x) => !igual(x, d)) : [...valor, d]);
  const todos = valor.some((d) => d.tipo === "todos");

  const resultados = useMemo(() => {
    const q = sinAcentos(buscar.trim());
    if (q.length < 2) return [];
    return destinos.personas.filter((p) => sinAcentos(`${p.nombre} ${p.detalle} ${p.perfil ?? ""}`).includes(q)).slice(0, 8);
  }, [buscar, destinos.personas]);

  if (!destinos.comparte) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">lock</span>
        <p><b className="text-white">Solo lo ves vos.</b> En tu nivel («{destinos.nivel.nombre}») los eventos son personales.</p>
      </div>
    );
  }

  const personasElegidas = valor.filter((d) => d.tipo === "persona" || d.tipo === "familia-de");

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-[12.5px] text-on-surface-variant/75">
        <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">account_tree</span>
        <span>Estás en <b className="text-white">«{destinos.nivel.nombre}»</b>: {POLITICA[destinos.nivel.politica]}.</span>
      </p>

      {destinos.todos && (
        <button type="button" className="a-chip a-chip-boton self-start !py-2 !px-4 !text-sm" aria-pressed={todos} onClick={() => alternar({ tipo: "todos" })}>
          <span className="material-symbols-outlined" aria-hidden="true">public</span>Toda la escuela
        </button>
      )}

      {/* La jerarquía, nivel por nivel */}
      <div className="flex flex-col gap-2" aria-label="Niveles de la jerarquía">
        {destinos.niveles.map((n, i) => {
          const perfiles = destinos.perfiles.filter((p) => p.nivel === n.id);
          const nivelElegido = tiene({ tipo: "nivel", valor: n.id });
          return (
            <div key={n.id} className={`a-nivel ${n.permitido ? "" : "is-bloqueado"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="a-escalon" aria-hidden="true">{i + 1}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-white">{n.nombre}</span>
                {n.permitido ? (
                  <button type="button" className="a-chip a-chip-boton" aria-pressed={nivelElegido || todos} disabled={todos} onClick={() => alternar({ tipo: "nivel", valor: n.id })}>
                    <span className="material-symbols-outlined" aria-hidden="true">select_all</span>Todo el nivel
                  </button>
                ) : (
                  <span className="a-chip" title="Está por encima de tu nivel"><span className="material-symbols-outlined" aria-hidden="true">lock</span>Por encima de tu nivel</span>
                )}
              </div>
              {perfiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                  {perfiles.map((p) => (
                    <button
                      key={p.clave}
                      type="button"
                      className="a-chip a-chip-boton"
                      style={{ ["--chip" as string]: p.color }}
                      aria-pressed={tiene({ tipo: "perfil", valor: p.clave }) || nivelElegido || todos}
                      disabled={!p.permitido || nivelElegido || todos}
                      onClick={() => alternar({ tipo: "perfil", valor: p.clave })}
                    >
                      <span className="nexo-perfil-punto" style={{ background: p.color }} aria-hidden="true" />{p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cursos */}
      {destinos.cursos.length > 0 && destinos.cursos[0].roles.length > 0 && (
        <div>
          <p className="a-subtitulo mb-2">Por curso</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {destinos.cursos.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="w-12 shrink-0 font-headline font-bold text-white">{c.nombre}</span>
                {c.roles.map((r) => (
                  <button key={r} type="button" className="a-chip a-chip-boton !text-[11px]" aria-pressed={tiene({ tipo: "curso", cursoId: c.id, rol: r }) || todos} disabled={todos}
                    onClick={() => alternar({ tipo: "curso", cursoId: c.id, rol: r })}>
                    {ROL[r]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personas */}
      <div>
        <p className="a-subtitulo mb-2">Personas puntuales</p>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" aria-hidden="true">person_search</span>
          <input className="a-input !pl-10" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o curso…" aria-label="Buscar personas" />
        </div>
        {resultados.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-1.5">
            {resultados.map((p) => {
              const familia = destinos.familiasDe.some((f) => f.id === p.id);
              return (
                <li key={p.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{p.nombre}</span>
                    <span className="block truncate text-[11px] text-on-surface-variant/55">{p.detalle || p.perfil}</span>
                  </span>
                  <button type="button" className="a-chip a-chip-boton !text-[11px]" aria-pressed={tiene({ tipo: "persona", usuarioId: p.id })} onClick={() => alternar({ tipo: "persona", usuarioId: p.id })}>
                    <span className="material-symbols-outlined" aria-hidden="true">person_add</span>Invitar
                  </button>
                  {familia && (
                    <button type="button" className="a-chip a-chip-boton !text-[11px]" aria-pressed={tiene({ tipo: "familia-de", usuarioId: p.id })} onClick={() => alternar({ tipo: "familia-de", usuarioId: p.id })}>
                      <span className="material-symbols-outlined" aria-hidden="true">family_restroom</span>Su familia
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {personasElegidas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {personasElegidas.map((d, i) => (
              <span key={i} className="a-chip !text-white">
                {etiquetaLocal(d, destinos)}
                <button type="button" className="-mr-1 grid place-items-center rounded-full hover:bg-white/10" onClick={() => alternar(d)} aria-label={`Quitar ${etiquetaLocal(d, destinos)}`}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
