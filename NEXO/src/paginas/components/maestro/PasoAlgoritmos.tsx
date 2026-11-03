// Paso «Algoritmos»: cada punto del servidor donde se toma una decisión (el
// orden del feed, qué es tendencia, cuándo alertar al docente, cuánto dura la
// papelera…). Se puede apagar, calibrar con sus parámetros —y ver al instante
// cómo cambia su distribución— o reemplazar por un grafo de nodos propio. El
// algoritmo nativo ES un grafo: abrirlo en el editor muestra lo que corre.

import { useEffect, useState } from "react";
import {
  pedirGrafoNativo,
  simularGrafo,
  type AlgoritmoCatalogo,
  type AlgoritmoGenoma,
  type Aprobacion,
  type Catalogo,
  type Genoma,
  type Grafo,
  type Simulacion,
} from "../../../servicios/maestro";
import { clonar, numeroCorto } from "./genomaUtil";

export interface PedidoEditorAlgoritmo {
  slot: AlgoritmoCatalogo;
  grafo: Grafo;
  aprobacion: Aprobacion | null;
}

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  onCambiar: (genoma: Genoma) => void;
  onAbrirEditor: (pedido: PedidoEditorAlgoritmo) => void;
}

export default function PasoAlgoritmos({ genoma, catalogo, onCambiar, onAbrirEditor }: Props) {
  const editar = (id: string, cambio: (a: AlgoritmoGenoma) => void) => {
    const g = clonar(genoma);
    cambio(g.algoritmos[id]);
    onCambiar(g);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="m-aparecer">
        <p className="m-eyebrow">Algoritmos</p>
        <h2 className="m-titulo text-3xl mt-3">Cómo piensa esta instancia</h2>
        <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-3xl leading-relaxed">
          Sin IA: cada algoritmo es matemática que el servidor ejecuta. Calibralo con sus perillas, apagalo, o abrilo en el
          editor de nodos para reescribirlo. Un algoritmo personalizado solo corre si fue simulado y aprobado.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2 m-escalonado">
        {catalogo.algoritmos.map((slot) => (
          <TarjetaAlgoritmo
            key={slot.id}
            slot={slot}
            config={genoma.algoritmos[slot.id]}
            catalogo={catalogo}
            onEditar={(cambio) => editar(slot.id, cambio)}
            onAbrirEditor={onAbrirEditor}
          />
        ))}
      </div>
    </div>
  );
}

export function TarjetaAlgoritmo({
  slot, config, catalogo, onEditar, onAbrirEditor,
}: {
  slot: AlgoritmoCatalogo;
  config: AlgoritmoGenoma;
  catalogo: Catalogo;
  onEditar: (cambio: (a: AlgoritmoGenoma) => void) => void;
  onAbrirEditor: (pedido: PedidoEditorAlgoritmo) => void;
}) {
  const modulo = catalogo.modulos.find((m) => m.id === slot.modulo);
  const [simulacion, setSimulacion] = useState<{ clave: string; datos: Simulacion } | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const personalizado = config.variante === "personalizado";
  const clave = JSON.stringify(config.parametros);

  // Simulación en vivo del nativo con los parámetros actuales (con una pausa
  // para no pedir una por cada milímetro de la perilla).
  useEffect(() => {
    if (!slot.admiteGrafo || personalizado || !config.activo) return;
    let vigente = true;
    const t = window.setTimeout(async () => {
      try {
        const { grafo } = await pedirGrafoNativo(slot.id, JSON.parse(clave));
        const datos = await simularGrafo("algoritmo", grafo, { slot: slot.id, iteraciones: 1500, semilla: 11 });
        if (vigente) setSimulacion({ clave, datos });
      } catch {
        // La vista previa es un extra: si falla, la tarjeta sigue funcionando.
      }
    }, 450);
    return () => { vigente = false; window.clearTimeout(t); };
  }, [slot.id, slot.admiteGrafo, personalizado, config.activo, clave]);

  const abrir = async () => {
    setAbriendo(true);
    try {
      const grafo = config.grafo ?? (await pedirGrafoNativo(slot.id, config.parametros)).grafo;
      onAbrirEditor({ slot, grafo, aprobacion: config.grafo ? config.aprobacion : null });
    } finally {
      setAbriendo(false);
    }
  };

  const sim = simulacion?.clave === clave ? simulacion.datos : null;
  const maximo = sim ? Math.max(1, ...sim.histograma.map((h) => h.cuenta)) : 1;
  const influencia = sim ? [...sim.influencias].sort((a, b) => Math.abs(b.correlacion) - Math.abs(a.correlacion))[0] : null;
  const parametrosVisibles = personalizado ? slot.parametros.filter((p) => p.fueraDelGrafo) : slot.parametros;

  return (
    <article className={`m-cristal p-6 flex flex-col gap-5 transition ${config.activo ? "" : "opacity-60"}`}>
      <header className="flex items-start gap-4">
        <span className="m-modulo-icono" style={{ background: (modulo?.color ?? "#fff") + "26", color: modulo?.color }}>
          <span className="material-symbols-outlined" aria-hidden="true">{personalizado ? "account_tree" : "function"}</span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: modulo?.color }}>{modulo?.nombre}</p>
          <h3 className="font-headline text-lg font-bold">{slot.nombre}</h3>
          <p className="text-xs text-[color:var(--m-suave)] mt-1 leading-relaxed">{slot.descripcion}</p>
        </div>
        <button
          type="button"
          className="m-interruptor"
          role="switch"
          aria-checked={config.activo}
          aria-label={`${config.activo ? "Apagar" : "Encender"} ${slot.nombre}`}
          onClick={() => onEditar((a) => { a.activo = !a.activo; })}
        />
      </header>

      {!config.activo ? (
        <div className="m-aviso info"><span className="material-symbols-outlined" aria-hidden="true">power_settings_new</span>Apagado. {slot.alDesactivar}</div>
      ) : (
        <>
          {slot.admiteGrafo && (
            <div className="flex gap-1 p-1 rounded-full bg-white/5 w-fit">
              <button type="button" className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${!personalizado ? "bg-blanco text-[#0b0619]" : "text-[color:var(--m-suave)]"}`} onClick={() => onEditar((a) => { a.variante = "nativo"; })}>Nativo</button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${personalizado ? "bg-blanco text-[#0b0619]" : "text-[color:var(--m-suave)]"} disabled:opacity-40`}
                disabled={!config.grafo || !config.aprobacion}
                title={!config.grafo ? "Primero armalo en el editor de nodos" : !config.aprobacion ? "El grafo todavía no está aprobado" : undefined}
                onClick={() => onEditar((a) => { a.variante = "personalizado"; })}
              >
                Personalizado (nodos)
              </button>
            </div>
          )}

          {parametrosVisibles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {parametrosVisibles.map((p) => (
                <label key={p.id} className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold text-[color:var(--m-suave)] flex justify-between">
                    {p.nombre}<b className="text-white tabular-nums">{config.parametros[p.id]}</b>
                  </span>
                  <input
                    type="range"
                    className="m-deslizador"
                    min={p.min}
                    max={p.max}
                    step={p.paso}
                    value={config.parametros[p.id] ?? p.defecto}
                    onChange={(e) => onEditar((a) => { a.parametros[p.id] = Number(e.target.value); })}
                  />
                </label>
              ))}
            </div>
          )}
          {personalizado && slot.parametros.some((p) => !p.fueraDelGrafo) && (
            <p className="text-[11px] text-[color:var(--m-tenue)]">Los pesos viven ahora dentro del grafo personalizado.</p>
          )}

          {slot.admiteGrafo && !personalizado && (
            <div className="rounded-2xl bg-black/25 border border-white/5 p-4">
              <div className="flex items-center justify-between text-[11px] text-[color:var(--m-tenue)] mb-2">
                <span>Distribución con estos parámetros</span>
                {sim && <span>media {numeroCorto(sim.media)} · P(≥0,5) {(sim.probabilidad * 100).toFixed(0)} %</span>}
              </div>
              <div className="m-histograma" style={{ height: 64 }}>
                {sim
                  ? sim.histograma.map((h, i) => <span key={i} style={{ height: `${(h.cuenta / maximo) * 100}%`, animationDelay: `${i * 12}ms` }} />)
                  : Array.from({ length: 24 }, (_, i) => <span key={i} style={{ height: "6%", opacity: 0.3 }} />)}
              </div>
              {influencia && (
                <p className="text-[11px] text-[color:var(--m-suave)] mt-2">
                  Lo que más pesa: <b>{slot.entradas.find((e) => e.id === influencia.variable)?.nombre ?? influencia.variable}</b> ({influencia.correlacion >= 0 ? "+" : ""}{influencia.correlacion.toFixed(2)})
                </p>
              )}
            </div>
          )}

          {slot.admiteGrafo && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => void abrir()} disabled={abriendo}>
                <span className="material-symbols-outlined" aria-hidden="true">{abriendo ? "progress_activity" : "account_tree"}</span>
                {config.grafo ? "Editar el grafo" : "Abrir en el editor de nodos"}
              </button>
              {config.grafo && (
                <span className={`m-sello ${config.aprobacion ? "aprobado" : "pendiente"}`}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">{config.aprobacion ? "verified" : "pending"}</span>
                  {config.aprobacion ? "Grafo aprobado" : "Borrador sin aprobar"}
                </span>
              )}
              {config.grafo && (
                <button type="button" className="m-icono-boton" title="Descartar el grafo personalizado" aria-label="Descartar grafo" onClick={() => onEditar((a) => { a.grafo = null; a.aprobacion = null; a.variante = "nativo"; })}>
                  <span className="material-symbols-outlined">delete</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
