// Lo que devolvió una simulación Monte Carlo, dibujado para decidir: con qué
// probabilidad dispara, qué valores produce, qué variable "mueve" el resultado y
// cuán seguido actúa cada acción. Es la base para APROBAR por probabilidad.

import type { Grafo, ModoGrafo, Simulacion } from "../../../servicios/maestro";
import { numeroCorto } from "./genomaUtil";

interface Props {
  simulacion: Simulacion;
  modo: ModoGrafo;
  grafo: Grafo;
  nombresVariables?: Record<string, string>;
}

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;

export default function PanelSimulacion({ simulacion: s, modo, grafo, nombresVariables = {} }: Props) {
  const maximo = Math.max(1, ...s.histograma.map((h) => h.cuenta));
  const nombreAccion = (id: string) => {
    const nodo = grafo.nodos.find((n) => n.id === id);
    const titulo = nodo ? String(nodo.datos.titulo ?? nodo.datos.etiqueta ?? "") : "";
    return titulo || (nodo?.tipo === "registrar" ? "Registrar" : "Avisar");
  };

  return (
    <div className="flex flex-col gap-5 m-aparecer">
      <div className="m-cristal p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--m-tenue)]">
          {modo === "flujo" ? "Probabilidad de que actúe" : "Probabilidad de salida ≥ 0,5"}
        </p>
        <p className="m-titulo text-5xl mt-2 m-degradado-texto">{pct(s.probabilidad)}</p>
        <p className="text-xs text-[color:var(--m-suave)] mt-2">
          Intervalo de confianza 95 %: {pct(s.intervalo[0])} – {pct(s.intervalo[1])}
        </p>
        <p className="text-[11px] text-[color:var(--m-tenue)] mt-1">{s.iteraciones.toLocaleString("es-AR")} universos simulados · semilla {s.semilla}</p>
      </div>

      {modo === "algoritmo" && (
        <div>
          <div className="flex items-end justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)]">Distribución de la salida</p>
            <p className="text-[11px] text-[color:var(--m-suave)]">media {numeroCorto(s.media)} ± {numeroCorto(s.desvio)}</p>
          </div>
          <div className="m-histograma" role="img" aria-label="Histograma de la salida">
            {s.histograma.map((h, i) => (
              <span key={i} style={{ height: `${(h.cuenta / maximo) * 100}%`, animationDelay: `${i * 18}ms` }} title={`${numeroCorto(h.desde)} – ${numeroCorto(h.hasta)}: ${h.cuenta}`} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[color:var(--m-tenue)] mt-1">
            <span>{numeroCorto(s.min)}</span><span>{numeroCorto(s.max)}</span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="m-chip">p5 {numeroCorto(s.p5)}</span>
            <span className="m-chip">mediana {numeroCorto(s.p50)}</span>
            <span className="m-chip">p95 {numeroCorto(s.p95)}</span>
          </div>
        </div>
      )}

      {s.influencias.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-2">Qué mueve el resultado</p>
          <div className="flex flex-col gap-2">
            {[...s.influencias].sort((a, b) => Math.abs(b.correlacion) - Math.abs(a.correlacion)).map((inf) => (
              <div key={inf.variable}>
                <div className="flex justify-between text-[11px] text-[color:var(--m-suave)]">
                  <span className="truncate">{nombresVariables[inf.variable] ?? inf.variable}</span>
                  <span className={inf.correlacion >= 0 ? "text-emerald-300" : "text-rose-300"}>{inf.correlacion >= 0 ? "+" : ""}{inf.correlacion.toFixed(2)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <span className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                  <span
                    className="absolute top-0 bottom-0 rounded-full"
                    style={{
                      left: inf.correlacion >= 0 ? "50%" : `${50 + inf.correlacion * 50}%`,
                      width: `${Math.abs(inf.correlacion) * 50}%`,
                      background: inf.correlacion >= 0 ? "linear-gradient(90deg,#22d3ee,#34d399)" : "linear-gradient(90deg,#fb7185,#f472b6)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modo === "flujo" && s.acciones.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-2">Cada acción</p>
          <div className="flex flex-col gap-3">
            {s.acciones.map((a) => (
              <div key={a.nodoId}>
                <div className="flex justify-between text-xs text-[color:var(--m-suave)] mb-1">
                  <span className="truncate">{nombreAccion(a.nodoId)}</span>
                  <span>{pct(a.probabilidad)}</span>
                </div>
                <div className="m-barra"><span style={{ width: `${a.probabilidad * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
