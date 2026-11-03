// Paso «Flujos»: funciones nuevas creadas conectando nodos. Un flujo reacciona a
// algo que pasa en la escuela (o a una hora) y decide —con condiciones,
// cálculos y puertas de probabilidad— si avisar a alguien o dejar registro.
// Un flujo solo se puede encender si fue simulado y aprobado.

import type { Catalogo, FlujoGenoma, Genoma } from "../../../servicios/maestro";
import { claveUnica, clonar, PLANTILLAS_FLUJO } from "./genomaUtil";

export interface PedidoEditorFlujo {
  flujo: FlujoGenoma;
}

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  onCambiar: (genoma: Genoma) => void;
  onAbrirEditor: (pedido: PedidoEditorFlujo) => void;
  actividad?: { flujoId: string; disparos: number; acciones: number; ultimo: string }[];
}

export default function PasoFlujos({ genoma, catalogo, onCambiar, onAbrirEditor, actividad = [] }: Props) {
  const editar = (id: string, cambio: (f: FlujoGenoma) => void) => {
    const g = clonar(genoma);
    const f = g.flujos.find((x) => x.id === id);
    if (f) cambio(f);
    onCambiar(g);
  };

  const crear = (plantilla: (typeof PLANTILLAS_FLUJO)[number]) => {
    const base = plantilla.crear();
    const id = claveUnica(base.nombre, new Set(genoma.flujos.map((f) => f.id)), "flujo");
    const flujo: FlujoGenoma = { ...base, id, activo: false, aprobacion: null };
    const g = clonar(genoma);
    g.flujos.push(flujo);
    onCambiar(g);
    onAbrirEditor({ flujo });
  };

  const disparadores = (f: FlujoGenoma) => f.grafo.nodos
    .filter((n) => n.tipo === "disparador" || n.tipo === "reloj")
    .map((n) => n.tipo === "reloj" ? `Todos los días a las ${String(n.datos.hora ?? "")}` : catalogo.eventos.find((e) => e.id === n.datos.evento)?.nombre ?? "evento");

  return (
    <div className="flex flex-col gap-8">
      <div className="m-aparecer">
        <p className="m-eyebrow">Flujos</p>
        <h2 className="m-titulo text-3xl mt-3">Funciones nuevas, conectando nodos</h2>
        <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-3xl leading-relaxed">
          Empezá desde una plantilla o en blanco. Cada flujo se simula miles de veces antes de aprobarse: vas a ver con
          qué probabilidad actúa. Ninguno se enciende sin esa aprobación.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 m-escalonado">
        {PLANTILLAS_FLUJO.map((p) => (
          <button key={p.id} type="button" className="m-cristal p-5 text-left hover:bg-white/[0.07] transition group" onClick={() => crear(p)}>
            <span className="material-symbols-outlined text-3xl text-[color:var(--m-oro)] group-hover:scale-110 transition-transform inline-block mx-auto" aria-hidden="true">{p.icono}</span>
            <span className="block font-bold mt-3">{p.nombre}</span>
            <span className="block text-xs text-[color:var(--m-suave)] mt-1 leading-relaxed">{p.descripcion}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)]">Flujos de esta instancia ({genoma.flujos.length})</h3>
        {genoma.flujos.length === 0 && (
          <div className="m-cristal p-8 text-center text-sm text-[color:var(--m-suave)]">
            <span className="material-symbols-outlined text-5xl text-[color:var(--m-violeta)] block mx-auto mb-2" aria-hidden="true">account_tree</span>
            Todavía no hay flujos. Elegí una plantilla de arriba para empezar.
          </div>
        )}
        {genoma.flujos.map((f) => {
          const act = actividad.find((a) => a.flujoId === f.id);
          return (
            <article key={f.id} className="m-cristal p-5 flex flex-col gap-4 m-aparecer">
              <div className="flex flex-wrap items-start gap-4">
                <span className="m-modulo-icono" style={{ background: "rgba(251, 191, 36, .14)", color: "var(--m-oro)" }}>
                  <span className="material-symbols-outlined" aria-hidden="true">account_tree</span>
                </span>
                <div className="flex-1 min-w-[220px]">
                  <input
                    className="w-full bg-transparent font-headline text-lg font-bold outline-none border-b border-transparent focus:border-[color:var(--m-cian)]"
                    value={f.nombre}
                    maxLength={60}
                    onChange={(e) => editar(f.id, (x) => { x.nombre = e.target.value; })}
                    aria-label="Nombre del flujo"
                  />
                  <input
                    className="w-full bg-transparent text-sm text-[color:var(--m-suave)] outline-none mt-1"
                    value={f.descripcion}
                    maxLength={200}
                    placeholder="Para qué sirve…"
                    onChange={(e) => editar(f.id, (x) => { x.descripcion = e.target.value; })}
                    aria-label="Descripción del flujo"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {disparadores(f).map((d, i) => <span key={i} className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">bolt</span>{d}</span>)}
                    <span className="m-chip">{f.grafo.nodos.length} nodos · {f.grafo.conexiones.length} cables</span>
                    {act && <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">history</span>{act.disparos} veces en 30 días</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`m-sello ${f.aprobacion ? "aprobado" : "pendiente"}`}>
                    <span className="material-symbols-outlined text-base" aria-hidden="true">{f.aprobacion ? "verified" : "pending"}</span>
                    {f.aprobacion ? `Aprobado · actúa ${(f.aprobacion.probabilidad * 100).toFixed(1)} %` : "Sin aprobar"}
                  </span>
                  <button
                    type="button"
                    className="m-interruptor"
                    role="switch"
                    aria-checked={f.activo}
                    disabled={!f.aprobacion}
                    title={f.aprobacion ? (f.activo ? "Apagar" : "Encender") : "Primero simulalo y aprobalo"}
                    aria-label={`${f.activo ? "Apagar" : "Encender"} ${f.nombre}`}
                    onClick={() => editar(f.id, (x) => { x.activo = !x.activo; })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => onAbrirEditor({ flujo: f })}>
                  <span className="material-symbols-outlined" aria-hidden="true">account_tree</span>Editar los nodos
                </button>
                <label className="flex items-center gap-2 text-xs text-[color:var(--m-suave)]">
                  Tope por hora
                  <input
                    type="number"
                    className="m-input w-20 py-1.5"
                    min={1}
                    max={500}
                    value={f.limiteHora}
                    onChange={(e) => editar(f.id, (x) => { x.limiteHora = Math.max(1, Math.min(500, Math.round(Number(e.target.value)) || 1)); })}
                  />
                </label>
                <button
                  type="button"
                  className="m-icono-boton ml-auto"
                  title="Quitar el flujo"
                  aria-label={`Quitar ${f.nombre}`}
                  onClick={() => { const g = clonar(genoma); g.flujos = g.flujos.filter((x) => x.id !== f.id); onCambiar(g); }}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
