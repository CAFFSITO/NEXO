// El Universo: la portada del Maestro. Cada instancia es un planeta con su
// propia paleta y su genoma resumido; desde acá se entra a diseñarla o se forja
// una nueva. Solo totales: el Maestro no ve la vida interna de ninguna escuela.

import { useInstancias, type Catalogo, type InstanciaResumen } from "../../../servicios/maestro";
import AlgoritmoNacional from "./AlgoritmoNacional";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import CampoEstelar from "./CampoEstelar";
import { potenciaDeDiez } from "./genomaUtil";

interface Props {
  /** El catálogo (para el algoritmo nacional); mientras carga, esa sección espera. */
  catalogo: Catalogo | null;
  onForjar: () => void;
  onAbrir: (id: string) => void;
}

export default function Universo({ catalogo, onForjar, onAbrir }: Props) {
  const { datos, cargando, error, recargar } = useInstancias();
  const instancias = datos?.instancias ?? [];
  const totalUsuarios = instancias.reduce((s, i) => s + i.usuarios, 0);
  const totalFlujos = instancias.reduce((s, i) => s + i.genoma.flujosActivos, 0);
  const totalPerfilesPropios = instancias.reduce((s, i) => s + i.genoma.perfilesPropios, 0);

  return (
    <div className="flex flex-col gap-8 p-[clamp(16px,3vw,40px)]">
      <section className="m-universo-cabecera m-cristal m-aparecer">
        <CampoEstelar velocidad={0.5} densidad={320} />
        <div className="relative z-[1] p-[clamp(24px,4vw,56px)] flex flex-wrap items-end justify-between gap-8 min-h-[290px]">
          <div className="max-w-2xl">
            <p className="m-eyebrow">Estudio del Maestro</p>
            <h1 className="m-titulo text-[clamp(38px,5vw,68px)] mt-4">Tu universo <span className="m-degradado-texto">NEXO</span></h1>
            <p className="text-[color:var(--m-suave)] mt-4 leading-relaxed">
              Cada escuela es una instancia independiente con su propio genoma: módulos, funciones, algoritmos, colores,
              perfiles y flujos. Dos NEXOs pueden no parecerse en nada.
            </p>
          </div>
          <div className="flex gap-6">
            {[
              { n: instancias.length, t: "instancias" },
              { n: totalUsuarios, t: "personas" },
              { n: totalPerfilesPropios, t: "perfiles propios" },
              { n: totalFlujos, t: "flujos vivos" },
            ].map((x) => (
              <div key={x.t} className="text-right">
                <p className="m-titulo text-4xl tabular-nums">{x.n}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--m-tenue)]">{x.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <button type="button" className="m-cta-forja p-8 text-left flex flex-wrap items-center gap-6 group m-aparecer" onClick={onForjar}>
        <span className="material-symbols-outlined text-6xl text-[color:var(--m-oro)] group-hover:scale-110 transition-transform" style={{ textShadow: "0 0 40px rgba(251,191,36,.8)" }} aria-hidden="true">local_fire_department</span>
        <span className="flex-1 min-w-[220px]">
          <span className="block m-titulo text-3xl">Forjar una nueva instancia</span>
          <span className="block text-sm text-[color:var(--m-suave)] mt-1">Una escuela entera, con su genoma y sus cuentas, de un solo golpe. Con intro de película incluida.</span>
        </span>
        <span className="m-boton">Entrar a la Forja<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span>
      </button>

      {cargando && !datos && <Cargando que="el universo de instancias" />}
      {error && <Fallo error={error} onReintentar={recargar} />}

      {datos && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--m-tenue)] mb-4">Instancias ({instancias.length})</h2>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3 m-escalonado">
            {instancias.map((i) => <Planeta key={i.id} instancia={i} onAbrir={() => onAbrir(i.id)} />)}
          </div>
        </section>
      )}

      {catalogo && <AlgoritmoNacional catalogo={catalogo} />}
    </div>
  );
}

function Planeta({ instancia: i, onAbrir }: { instancia: InstanciaResumen; onAbrir: () => void }) {
  const t = i.genoma.tema;
  const estilo = { ["--planeta-brillo" as string]: t.acento + "66", ["--orbe-a" as string]: t.acento, ["--orbe-b" as string]: t.secundario } as React.CSSProperties;
  return (
    <article className="m-planeta m-cristal p-6 flex flex-col gap-5" style={estilo}>
      <span aria-hidden="true" className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: t.acento }} />
      <div className="relative flex items-center gap-5">
        <div className="m-orbe">
          <span className="m-orbe-anillo" style={{ animationDuration: `${12 + (Number(i.id) % 9)}s` }}>
            <span className="m-orbe-luna" style={{ ["--luna" as string]: t.terciario } as React.CSSProperties} />
          </span>
          <span className="m-orbe-nucleo" />
        </div>
        <div className="min-w-0">
          <p className="font-headline text-xl font-bold leading-tight break-words">{i.nombre}</p>
          <p className="text-xs text-[color:var(--m-suave)] italic truncate">{i.genoma.identidad.lema || `Ciclo ${i.cicloLectivo}`}</p>
          <div className="flex gap-1 mt-2">
            {(["acento", "primario", "secundario", "terciario"] as const).map((k) => <span key={k} className="w-4 h-4 rounded-full border border-white/20" style={{ background: t[k] }} />)}
          </div>
        </div>
      </div>
      <div className="relative grid grid-cols-3 gap-2 text-center">
        {[
          { n: `${i.genoma.modulosVisibles}`, t: "módulos" },
          { n: `${i.genoma.perfiles}`, t: `perfiles${i.genoma.perfilesPropios ? ` (${i.genoma.perfilesPropios} prop.)` : ""}` },
          { n: `${i.usuarios}`, t: "personas" },
        ].map((x) => (
          <div key={x.t} className="rounded-xl bg-black/25 py-2.5">
            <p className="font-headline text-xl font-extrabold">{x.n}</p>
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--m-tenue)]">{x.t}</p>
          </div>
        ))}
      </div>
      <div className="relative flex flex-wrap gap-2">
        {i.genoma.flujosActivos > 0 && <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">bolt</span>{i.genoma.flujosActivos} flujos</span>}
        {i.genoma.algoritmosPersonalizados > 0 && <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">account_tree</span>{i.genoma.algoritmosPersonalizados} por nodos</span>}
        {i.genoma.funcionesApagadas > 0 && <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">toggle_off</span>{i.genoma.funcionesApagadas} apagadas</span>}
        <span className="m-chip">{i.version ? `v${i.version}` : "genoma por defecto"}</span>
        <span className="m-chip">{potenciaDeDiez(i.genoma.combinatoria.exponente)}</span>
      </div>
      <button type="button" className="relative m-boton-fantasma w-full" onClick={onAbrir}>
        <span className="material-symbols-outlined" aria-hidden="true">tune</span>Diseñar esta instancia
      </button>
    </article>
  );
}
