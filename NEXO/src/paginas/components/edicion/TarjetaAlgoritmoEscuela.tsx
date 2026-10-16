// Un algoritmo de la escuela en el modo edición: encenderlo o apagarlo, mover
// sus perillas o elegir el diseño de nodos que dejó aprobado el Maestro. Cada
// cambio se prueba al instante sobre los datos REALES de la escuela (el feed,
// las tendencias, la biblioteca, la papelera…): se ve qué sube, qué baja y qué
// cambia antes de guardar.

import { useEffect, useState } from "react";
import {
  vistaPreviaAlgoritmo,
  type AlgoritmoEdicion,
  type Distribucion,
  type ItemRanking,
  type VistaPrevia,
} from "../../../servicios/edicion";
import type { AlgoritmoCatalogo, ModuloCatalogo } from "../../../servicios/maestro";
import { Interruptor } from "./controles";

interface Props {
  slot: AlgoritmoCatalogo;
  modulo: ModuloCatalogo | undefined;
  config: AlgoritmoEdicion;
  guardado: AlgoritmoEdicion;
  moduloOculto: boolean;
  onCambiar: (cambio: (a: AlgoritmoEdicion) => void, clave?: string) => void;
}

const formato = (n: number) => (Math.round(n * 100) / 100).toLocaleString("es-AR");

export default function TarjetaAlgoritmoEscuela({ slot, modulo, config, guardado, moduloOculto, onCambiar }: Props) {
  const personalizado = config.variante === "personalizado";
  const clave = JSON.stringify({ a: config.activo, v: config.variante, p: config.parametros });
  const [vista, setVista] = useState<{ clave: string; datos: VistaPrevia | null; error: string | null } | null>(null);
  const cambiado = clave !== JSON.stringify({ a: guardado.activo, v: guardado.variante, p: guardado.parametros });

  // Vista previa con una pausa: no se pide una por cada milímetro de la perilla.
  useEffect(() => {
    let vigente = true;
    const t = window.setTimeout(async () => {
      try {
        const c = JSON.parse(clave) as { a: boolean; v: AlgoritmoEdicion["variante"]; p: Record<string, number> };
        const datos = await vistaPreviaAlgoritmo(slot.id, { activo: c.a, variante: c.v, parametros: c.p });
        if (vigente) setVista({ clave, datos, error: null });
      } catch (e) {
        if (vigente) setVista({ clave, datos: null, error: e instanceof Error ? e.message : "No se pudo previsualizar." });
      }
    }, 380);
    return () => { vigente = false; window.clearTimeout(t); };
  }, [slot.id, clave]);

  const parametros = personalizado ? slot.parametros.filter((p) => p.fueraDelGrafo) : slot.parametros;
  const previa = vista?.clave === clave ? vista : null;

  return (
    <article id={`algoritmo-${slot.id}`} className={`e-panel p-5 flex flex-col gap-4 e-aparecer transition ${config.activo ? "" : "opacity-75"}`}>
      <header className="flex items-start gap-3">
        <span className="e-modulo-icono !w-11 !h-11" style={{ background: (modulo?.color ?? "#ffffff") + "26", color: modulo?.color }} aria-hidden="true">
          <span className="material-symbols-outlined">{personalizado ? "account_tree" : "function"}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: modulo?.color }}>{modulo?.nombre ?? slot.modulo}</p>
          <h3 className="font-headline text-lg font-bold text-white leading-tight">{slot.nombre}</h3>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/70">{slot.descripcion}</p>
        </div>
        <Interruptor activo={config.activo} etiqueta={`${config.activo ? "Apagar" : "Encender"} ${slot.nombre}`} onCambiar={() => onCambiar((a) => { a.activo = !a.activo; })} />
      </header>

      {moduloOculto && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          <span className="material-symbols-outlined text-base" aria-hidden="true">visibility_off</span>
          Su módulo está oculto: este algoritmo no se nota hasta que lo vuelvas a mostrar.
        </p>
      )}

      {!config.activo ? (
        <p className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-on-surface-variant">
          <span className="material-symbols-outlined text-base" aria-hidden="true">power_settings_new</span>
          <span><b className="text-white">Apagado.</b> {slot.alDesactivar}</span>
        </p>
      ) : (
        <>
          {config.disenoMaestro && (
            <div className="flex w-fit gap-1 rounded-full bg-white/5 p-1" role="radiogroup" aria-label="Versión del algoritmo">
              {(["nativo", "personalizado"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={config.variante === v}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${config.variante === v ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
                  onClick={() => onCambiar((a) => { a.variante = v; })}
                >
                  {v === "nativo" ? "Nativo" : "Diseño del Maestro"}
                </button>
              ))}
            </div>
          )}

          {parametros.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {parametros.map((p) => {
                const valor = config.parametros[p.id] ?? p.defecto;
                const lleno = ((valor - p.min) / (p.max - p.min || 1)) * 100;
                const tocado = valor !== guardado.parametros[p.id];
                return (
                  <label key={p.id} className="flex flex-col gap-2">
                    <span className="flex items-center justify-between gap-2 text-[12px] font-semibold text-on-surface-variant">
                      <span className="flex items-center gap-1.5 min-w-0">
                        {tocado && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-acento shadow-[0_0_8px_var(--nexo-acento)]" aria-hidden="true" />}
                        <span className="truncate">{p.nombre}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        {valor !== p.defecto && (
                          <button type="button" className="e-icono-boton !w-6 !h-6" title={`Volver al valor de fábrica (${formato(p.defecto)})`} aria-label={`Volver ${p.nombre} al valor de fábrica`} onClick={(e) => { e.preventDefault(); onCambiar((a) => { a.parametros[p.id] = p.defecto; }); }}>
                            <span className="material-symbols-outlined !text-[15px]">restart_alt</span>
                          </button>
                        )}
                        <b className="tabular-nums text-white">{formato(valor)}</b>
                      </span>
                    </span>
                    <input
                      type="range"
                      className="e-deslizador"
                      style={{ ["--lleno" as string]: `${lleno}%` }}
                      min={p.min}
                      max={p.max}
                      step={p.paso}
                      value={valor}
                      onChange={(e) => { const v = Number(e.target.value); onCambiar((a) => { a.parametros[p.id] = v; }, `${slot.id}:${p.id}`); }}
                    />
                  </label>
                );
              })}
            </div>
          )}
          {personalizado && slot.parametros.some((p) => !p.fueraDelGrafo) && (
            <p className="text-[11px] text-on-surface-variant/55">Los pesos viven dentro del diseño de nodos del Maestro.</p>
          )}
        </>
      )}

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
        {!previa ? (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
            <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
            Probando con los datos de tu escuela…
          </div>
        ) : previa.error ? (
          <p className="text-xs text-rose-200">{previa.error}</p>
        ) : previa.datos ? (
          <Vista datos={previa.datos} />
        ) : null}
      </div>

      {cambiado && (
        <button type="button" className="e-boton-fantasma e-boton-chico self-start" onClick={() => onCambiar((a) => { a.activo = guardado.activo; a.variante = guardado.variante; a.parametros = { ...guardado.parametros }; })}>
          <span className="material-symbols-outlined" aria-hidden="true">undo</span>
          Volver a lo guardado
        </button>
      )}
    </article>
  );
}

function Vista({ datos }: { datos: VistaPrevia }) {
  if (datos.tipo === "vacio") {
    return <p className="flex items-center gap-2 text-xs text-on-surface-variant/70"><span className="material-symbols-outlined text-base" aria-hidden="true">info</span>{datos.texto}</p>;
  }
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div>
        <p className="e-subtitulo">{datos.titulo}</p>
        <p className="mt-1 text-xs text-on-surface-variant/70">{datos.texto}</p>
      </div>
      {datos.tipo === "ranking" && <Ranking items={datos.items} entran={datos.entran} salen={datos.salen} />}
      {datos.tipo === "impacto" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {datos.cifras.map((c) => (
            <div key={c.etiqueta} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-on-surface-variant/50 line-through decoration-white/20 tabular-nums">{formato(c.antes)}</span>
                <span className="material-symbols-outlined text-base text-on-surface-variant/40" aria-hidden="true">arrow_forward</span>
                <span className={`e-cifra tabular-nums ${c.despues > c.antes ? "text-primary" : c.despues < c.antes ? "text-emerald-300" : "text-white"}`}>{formato(c.despues)}</span>
              </div>
              <p className="mt-1 text-[11px] text-on-surface-variant/65">{c.etiqueta}</p>
            </div>
          ))}
        </div>
      )}
      {datos.tipo === "distribucion" && <Distribuciones antes={datos.antes} despues={datos.despues} />}
    </div>
  );
}

function Movimiento({ item }: { item: ItemRanking }) {
  if (item.antes === null) return <span className="e-mov nuevo">Nuevo</span>;
  const d = item.antes - item.despues;
  if (d > 0) return <span className="e-mov sube"><span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>{d}<span className="sr-only"> puestos arriba</span></span>;
  if (d < 0) return <span className="e-mov baja"><span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>{-d}<span className="sr-only"> puestos abajo</span></span>;
  return <span className="e-mov igual">=</span>;
}

function Ranking({ items, entran, salen }: { items: ItemRanking[]; entran?: number; salen?: number }) {
  if (items.length === 0) return <p className="text-xs text-on-surface-variant/60">Nada para mostrar con estos valores.</p>;
  return (
    <>
      <ol className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={it.clave} className="e-ranking-item" style={{ animationDelay: `${i * 35}ms` }}>
            <span className="e-puesto">{it.despues}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">{it.titulo}</span>
              <span className="flex items-center gap-2 truncate text-[11px] text-on-surface-variant/60">
                {it.detalle}
                {it.nacional && <span className="inline-flex items-center gap-0.5 text-amber-200"><span className="material-symbols-outlined !text-[13px]" aria-hidden="true">public</span>a lo nacional</span>}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Movimiento item={it} />
              {it.puntaje !== null && <span className="text-[10px] tabular-nums text-on-surface-variant/50">{formato(it.puntaje)} pts</span>}
            </span>
          </li>
        ))}
      </ol>
      {(Boolean(entran) || Boolean(salen)) && (
        <p className="text-[11px] text-on-surface-variant/60">
          {entran ? `${entran} ${entran === 1 ? "entra" : "entran"} a la lista` : ""}{entran && salen ? " · " : ""}{salen ? `${salen} ${salen === 1 ? "sale" : "salen"} de la lista` : ""}
        </p>
      )}
    </>
  );
}

function Distribuciones({ antes, despues }: { antes: Distribucion | null; despues: Distribucion | null }) {
  const maximo = Math.max(1, ...(despues?.histograma ?? []), ...(antes?.histograma ?? []));
  const pct = (d: Distribucion | null) => (d ? `${(d.probabilidad * 100).toFixed(0)} %` : "0 %");
  return (
    <div>
      <div className="relative">
        <div className="e-histograma" role="img" aria-label="Distribución con los valores nuevos">
          {(despues?.histograma ?? Array.from({ length: 24 }, () => 0)).map((n, i) => <span key={i} style={{ height: `${(n / maximo) * 100}%` }} />)}
        </div>
        {antes && (
          <div className="e-histograma fantasma" aria-hidden="true">
            {antes.histograma.map((n, i) => <span key={i} style={{ height: `${(n / maximo) * 100}%` }} />)}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="e-chip">Se activaría: <b className="text-white">{pct(despues)}</b> de las veces</span>
        <span className="e-chip">Antes: {pct(antes)}</span>
        <span className="e-chip"><span className="inline-block h-2.5 w-3 border border-dashed border-white/40" aria-hidden="true" />lo guardado</span>
      </div>
    </div>
  );
}
