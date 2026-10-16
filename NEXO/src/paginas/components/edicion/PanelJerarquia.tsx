// La JERARQUÍA de perfiles de la escuela: los niveles de arriba hacia abajo,
// qué perfiles hay en cada uno y a quién le muestra cosas cada nivel (hoy, los
// eventos del calendario). Se renombran, agregan, ordenan y quitan niveles, y
// los perfiles se arrastran de uno a otro. La dirección queda siempre arriba.

import { useState } from "react";
import type { Borrador, PoliticaNivel } from "../../../servicios/edicion";
import { claveUnica } from "../maestro/genomaUtil";
import Selector from "../shared/Selector";

interface Props {
  borrador: Borrador;
  onCambiar: (cambio: (b: Borrador) => void, clave?: string) => void;
}

const POLITICAS: { id: PoliticaNivel; nombre: string; detalle: string }[] = [
  { id: "nivel-y-abajo", nombre: "Su nivel y los de abajo", detalle: "Comparte con los de su mismo nivel y con todos los de abajo." },
  { id: "abajo", nombre: "Solo los de abajo", detalle: "Comparte con los niveles de abajo, no con su propio nivel." },
  { id: "personal", nombre: "Solo eventos personales", detalle: "Crea eventos que solo ve quien los crea." },
];
const MAX_NIVELES = 6;
const DIRECCION = "admin-academico";

/** ¿El nivel `de` le puede mostrar eventos al nivel `a`? (la misma regla que el servidor) */
function puede(politica: PoliticaNivel, de: number, a: number) {
  return politica === "personal" ? false : politica === "abajo" ? a > de : a >= de;
}

export default function PanelJerarquia({ borrador, onCambiar }: Props) {
  const { niveles, perfiles: asignacion } = borrador.jerarquia;
  const [arrastrado, setArrastrado] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);

  const moverPerfil = (clave: string, nivel: string) => {
    if (clave === DIRECCION) return;
    onCambiar((b) => { b.jerarquia.perfiles[clave] = nivel; });
  };
  const moverNivel = (i: number, j: number) => onCambiar((b) => {
    const [n] = b.jerarquia.niveles.splice(i, 1);
    b.jerarquia.niveles.splice(j, 0, n);
  });
  const quitarNivel = (i: number) => onCambiar((b) => {
    const id = b.jerarquia.niveles[i].id;
    const vecino = b.jerarquia.niveles[i + 1]?.id ?? b.jerarquia.niveles[i - 1].id;
    b.jerarquia.niveles.splice(i, 1);
    for (const clave of Object.keys(b.jerarquia.perfiles)) if (b.jerarquia.perfiles[clave] === id) b.jerarquia.perfiles[clave] = vecino;
  });
  const agregarNivel = () => onCambiar((b) => {
    const id = claveUnica("nivel", new Set(b.jerarquia.niveles.map((n) => n.id)), "nivel");
    b.jerarquia.niveles.push({ id, nombre: "Nuevo nivel", politica: "nivel-y-abajo" });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm leading-relaxed text-on-surface-variant/70">
          Ordená los perfiles de tu escuela en niveles, de arriba hacia abajo. Cada nivel elige a quién le muestra cosas: por
          ejemplo, un profesor le puede mostrar un evento a sus alumnos y a su preceptor, pero no a la dirección. Arrastrá los
          perfiles de un nivel a otro. La dirección queda siempre en el nivel de arriba.
        </p>

        {niveles.map((n, i) => {
          const perfiles = borrador.perfiles.filter((p) => asignacion[p.clave] === n.id);
          return (
            <section
              key={n.id}
              className={`e-panel p-4 transition ${destino === n.id ? "!border-[color:var(--nexo-acento)] bg-acento/10" : ""}`}
              aria-label={`Nivel ${i + 1}: ${n.nombre}`}
              onDragOver={(e) => { if (arrastrado) { e.preventDefault(); setDestino(n.id); } }}
              onDragLeave={() => setDestino((d) => (d === n.id ? null : d))}
              onDrop={(e) => { e.preventDefault(); if (arrastrado) moverPerfil(arrastrado, n.id); setArrastrado(null); setDestino(null); }}
            >
              <header className="flex flex-wrap items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary font-headline text-lg font-bold text-on-primary" aria-hidden="true">{i + 1}</span>
                <input
                  className="e-input !bg-transparent !border-transparent hover:!border-white/10 font-headline font-bold !text-base !px-2 !py-1.5 min-w-[180px] flex-1"
                  value={n.nombre}
                  maxLength={40}
                  aria-label={`Nombre del nivel ${i + 1}`}
                  onChange={(e) => { const v = e.target.value; onCambiar((b) => { b.jerarquia.niveles[i].nombre = v; }, `nivel-nombre:${n.id}`); }}
                  onBlur={(e) => { if (!e.target.value.trim()) onCambiar((b) => { b.jerarquia.niveles[i].nombre = `Nivel ${i + 1}`; }); }}
                />
                {i === 0 ? (
                  <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">lock</span>Arriba: comparte con todos</span>
                ) : (
                  <Selector className="e-input !w-auto !py-1.5 !text-[13px]" value={n.politica} aria-label={`A quién le muestra eventos «${n.nombre}»`}
                    onChange={(e) => { const v = e.target.value as PoliticaNivel; onCambiar((b) => { b.jerarquia.niveles[i].politica = v; }); }}>
                    {POLITICAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Selector>
                )}
                {i > 0 && (
                  <span className="flex">
                    <button type="button" className="e-icono-boton" onClick={() => moverNivel(i, i - 1)} disabled={i <= 1} aria-label={`Subir el nivel ${n.nombre}`} title="Subir"><span className="material-symbols-outlined">arrow_upward</span></button>
                    <button type="button" className="e-icono-boton" onClick={() => moverNivel(i, i + 1)} disabled={i === niveles.length - 1} aria-label={`Bajar el nivel ${n.nombre}`} title="Bajar"><span className="material-symbols-outlined">arrow_downward</span></button>
                    <button type="button" className="e-icono-boton hover:!text-rose-300" onClick={() => quitarNivel(i)} disabled={niveles.length <= 2} aria-label={`Quitar el nivel ${n.nombre}`} title="Quitar (sus perfiles pasan al nivel de abajo)"><span className="material-symbols-outlined">remove_circle</span></button>
                  </span>
                )}
              </header>
              {i > 0 && <p className="mt-1 pl-11 text-[11.5px] text-on-surface-variant/55">{POLITICAS.find((p) => p.id === n.politica)?.detalle}</p>}
              <div className="mt-3 flex min-h-[44px] flex-wrap gap-2 pl-11">
                {perfiles.length === 0 && <span className="self-center text-[12px] text-on-surface-variant/45">Arrastrá perfiles hasta acá.</span>}
                {perfiles.map((p) => {
                  const fija = p.clave === DIRECCION;
                  return (
                    <span
                      key={p.clave}
                      draggable={!fija}
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.clave); setArrastrado(p.clave); }}
                      onDragEnd={() => { setArrastrado(null); setDestino(null); }}
                      className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-[12.5px] font-semibold text-white ${fija ? "border-white/15" : "cursor-grab border-white/10 hover:border-white/25"} ${arrastrado === p.clave ? "opacity-40" : ""}`}
                      style={{ background: p.color + "22" }}
                    >
                      <span className="nexo-perfil-punto" style={{ background: p.color }} aria-hidden="true" />
                      {p.nombre}
                      {fija ? (
                        <span className="material-symbols-outlined px-1 text-base text-on-surface-variant/60" title="La dirección queda siempre arriba" aria-label="Fijo arriba">lock</span>
                      ) : (
                        <span className="flex">
                          <button type="button" className="e-icono-boton !h-6 !w-6" disabled={i === 0} onClick={() => moverPerfil(p.clave, niveles[i - 1].id)} aria-label={`Subir ${p.nombre} de nivel`}><span className="material-symbols-outlined !text-[16px]">keyboard_arrow_up</span></button>
                          <button type="button" className="e-icono-boton !h-6 !w-6" disabled={i === niveles.length - 1} onClick={() => moverPerfil(p.clave, niveles[i + 1].id)} aria-label={`Bajar ${p.nombre} de nivel`}><span className="material-symbols-outlined !text-[16px]">keyboard_arrow_down</span></button>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}

        <button type="button" className="e-boton-fantasma self-start" onClick={agregarNivel} disabled={niveles.length >= MAX_NIVELES}>
          <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
          {niveles.length >= MAX_NIVELES ? `Máximo ${MAX_NIVELES} niveles` : "Agregar un nivel"}
        </button>
      </div>

      {/* Quién le muestra eventos a quién */}
      <aside className="e-panel p-5 xl:sticky xl:top-6" aria-label="Quién le muestra eventos a quién">
        <p className="e-subtitulo mb-1">Quién le muestra eventos a quién</p>
        <p className="mb-4 text-[11.5px] text-on-surface-variant/55">Cada fila crea; cada columna recibe.</p>
        <table className="w-full border-separate border-spacing-1 text-center text-[11px]">
          <thead>
            <tr>
              <th className="w-8" />
              {niveles.map((n, j) => <th key={n.id} scope="col" title={n.nombre} className="font-bold text-on-surface-variant/60">{j + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {niveles.map((n, i) => (
              <tr key={n.id}>
                <th scope="row" title={n.nombre} className="font-bold text-on-surface-variant/60">{i + 1}</th>
                {niveles.map((m, j) => {
                  const si = puede(i === 0 ? "nivel-y-abajo" : n.politica, i, j);
                  return (
                    <td key={m.id} className={`h-9 rounded-lg ${si ? "bg-acento/25 text-primary" : "bg-white/[0.03] text-on-surface-variant/25"}`} aria-label={`${n.nombre} ${si ? "puede" : "no puede"} mostrarle eventos a ${m.nombre}`}>
                      <span className="material-symbols-outlined !text-[16px]" aria-hidden="true">{si ? "check" : "close"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <ol className="mt-4 flex flex-col gap-1 text-[12px] text-on-surface-variant/70">
          {niveles.map((n, i) => <li key={n.id}><b className="text-white">{i + 1}.</b> {n.nombre}</li>)}
        </ol>
        <p className="mt-4 text-[11.5px] leading-relaxed text-on-surface-variant/55">
          Además, quien dicta o tiene a cargo cursos llega a los estudiantes y familias de sus cursos. Lo personal no lo ve nadie más,
          ni siquiera la dirección.
        </p>
      </aside>
    </div>
  );
}
