// Paso «Génesis»: el Maestro declara qué necesita la escuela (seis perillas) y
// una semilla. El servidor tira dados cargados por esas necesidades —curvas
// logísticas, sin IA— y propone un genoma completo. Cada decisión viene con su
// probabilidad, y el Maestro puede aprobarla o invertirla antes de aplicarla.

import { useMemo, useState } from "react";
import { proponerGenoma, type Catalogo, type Decision, type Genoma, type Propuesta } from "../../../servicios/maestro";
import { clonar, potenciaDeDiez } from "./genomaUtil";

interface Props {
  catalogo: Catalogo;
  genoma: Genoma;
  onAplicar: (genoma: Genoma) => void;
}

export default function PasoGenesis({ catalogo, genoma, onAplicar }: Props) {
  const [necesidades, setNecesidades] = useState<Record<string, number>>(() => Object.fromEntries(catalogo.necesidades.map((n) => [n.id, 0.5])));
  const [semilla, setSemilla] = useState(() => genoma.identidad.semilla || 2026);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [invertidas, setInvertidas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aplicada, setAplicada] = useState(false);

  const proponer = async (semillaUsada = semilla) => {
    setCargando(true);
    setError(null);
    setAplicada(false);
    try {
      setPropuesta(await proponerGenoma(necesidades, semillaUsada, genoma));
      setInvertidas(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la propuesta.");
    } finally {
      setCargando(false);
    }
  };

  const tirarDados = () => {
    const nueva = Math.floor(Math.random() * 2_000_000_000) + 1;
    setSemilla(nueva);
    void proponer(nueva);
  };

  const claveDe = (d: Decision) => d.tipo + ":" + d.id;
  const resultado = (d: Decision) => (invertidas.has(claveDe(d)) ? !d.resultado : d.resultado);
  const invertir = (d: Decision) => {
    const s = new Set(invertidas);
    const k = claveDe(d);
    if (s.has(k)) s.delete(k); else s.add(k);
    setInvertidas(s);
    setAplicada(false);
  };

  const aplicar = () => {
    if (!propuesta) return;
    const g = clonar(propuesta.genoma);
    // La identidad (nombre, lema, dominio) es del Maestro, no de los dados.
    g.identidad = { ...genoma.identidad, semilla: g.identidad.semilla };
    for (const d of propuesta.decisiones) {
      if (!invertidas.has(claveDe(d))) continue;
      if (d.tipo === "modulo") g.modulos[d.id].oculto = !g.modulos[d.id].oculto;
      if (d.tipo === "funcion") {
        const modulo = catalogo.modulos.find((m) => m.funciones.some((f) => f.id === d.id));
        if (!modulo) continue;
        const fs = g.modulos[modulo.id].funciones;
        if (fs[d.id] === false) delete fs[d.id]; else fs[d.id] = false;
      }
      if (d.tipo === "perfil" && d.id === "familia.chat") {
        const familia = g.perfiles.find((p) => p.clave === "familia");
        if (familia) {
          const chat = { ...(familia.modulos.chat ?? {}) };
          if (chat.oculto) delete chat.oculto; else chat.oculto = true;
          familia.modulos.chat = chat;
        }
      }
    }
    onAplicar(g);
    setAplicada(true);
  };

  const grupos = useMemo(() => {
    const ds = propuesta?.decisiones ?? [];
    return {
      modulos: ds.filter((d) => d.tipo === "modulo"),
      funciones: ds.filter((d) => d.tipo === "funcion"),
      parametros: ds.filter((d) => d.tipo === "parametros"),
      otras: ds.filter((d) => d.tipo === "paleta" || d.tipo === "perfil"),
    };
  }, [propuesta]);

  const funcionesApagadas = grupos.funciones.filter((d) => !resultado(d));

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="m-cristal p-6 h-fit xl:sticky xl:top-0 m-aparecer">
        <p className="m-eyebrow">Génesis</p>
        <h2 className="m-titulo text-3xl mt-3">¿Qué necesita esta escuela?</h2>
        <p className="text-sm text-[color:var(--m-suave)] mt-2 leading-relaxed">
          Mové las perillas. Cada módulo y cada función tiene una afinidad con estas necesidades: la probabilidad de que
          quede activo sale de una curva logística, y la semilla decide la tirada. Misma semilla, mismo universo.
        </p>
        <div className="flex flex-col gap-5 mt-6">
          {catalogo.necesidades.map((n) => (
            <label key={n.id} className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="material-symbols-outlined text-[color:var(--m-cian)]" aria-hidden="true">{n.icono}</span>
                {n.nombre}
                <span className="ml-auto text-xs text-[color:var(--m-suave)] tabular-nums">{Math.round((necesidades[n.id] ?? 0.5) * 100)} %</span>
              </span>
              <input
                type="range"
                className="m-deslizador"
                min={0}
                max={1}
                step={0.01}
                value={necesidades[n.id] ?? 0.5}
                onChange={(e) => setNecesidades({ ...necesidades, [n.id]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-6 items-end">
          <label className="m-campo flex-1">
            <span>Semilla</span>
            <input type="number" className="m-input" value={semilla} onChange={(e) => setSemilla(Math.max(1, Math.round(Number(e.target.value)) || 1))} />
          </label>
          <button type="button" className="m-icono-boton border border-white/10 h-[46px] w-[46px]" onClick={tirarDados} title="Tirar los dados (semilla nueva)" aria-label="Tirar los dados">
            <span className="material-symbols-outlined">casino</span>
          </button>
        </div>
        <button className="m-boton w-full mt-4" onClick={() => void proponer()} disabled={cargando}>
          <span className={`material-symbols-outlined ${cargando ? "animate-spin" : ""}`} aria-hidden="true">{cargando ? "progress_activity" : "auto_awesome"}</span>
          {cargando ? "Calculando probabilidades…" : "Proponer un genoma"}
        </button>
        {error && <div className="m-aviso error mt-4" role="alert"><span className="material-symbols-outlined" aria-hidden="true">error</span>{error}</div>}
      </section>

      <section className="min-w-0">
        {!propuesta ? (
          <div className="m-cristal p-10 text-center m-aparecer">
            <span className="material-symbols-outlined text-6xl text-[color:var(--m-violeta)]" aria-hidden="true">casino</span>
            <h3 className="m-titulo text-2xl mt-4">Todavía no tiraste los dados</h3>
            <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-md mx-auto leading-relaxed">
              Podés saltear este paso y diseñar todo a mano, o pedir una propuesta y aprobar (o invertir) cada decisión según su probabilidad.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6" key={propuesta.genoma.identidad.semilla}>
            <div className="m-cristal p-6 flex flex-wrap items-center gap-6 m-aparecer">
              <div className="flex-1 min-w-[220px]">
                <p className="m-eyebrow">Propuesta lista</p>
                <p className="m-titulo text-2xl mt-2">Este genoma es uno entre <span className="m-degradado-texto">{potenciaDeDiez(propuesta.combinatoria.exponente)}</span></p>
                <p className="text-xs text-[color:var(--m-suave)] mt-1">combinaciones discretas posibles (sin contar parámetros continuos ni grafos, que la vuelven infinita).</p>
              </div>
              <div className="flex gap-1.5">
                {(["acento", "primario", "secundario", "terciario", "fondo", "superficie"] as const).map((k) => (
                  <span key={k} className="w-9 h-9 rounded-xl border border-white/15" style={{ background: propuesta.genoma.tema[k] }} title={k} />
                ))}
              </div>
              <button className="m-boton" onClick={aplicar}>
                <span className="material-symbols-outlined" aria-hidden="true">{aplicada ? "check_circle" : "download_done"}</span>
                {aplicada ? "Aplicada al genoma" : "Aplicar al genoma"}
              </button>
            </div>

            <div className="m-cristal p-6 m-aparecer">
              <h3 className="font-headline font-bold text-lg mb-1">Módulos</h3>
              <p className="text-xs text-[color:var(--m-suave)] mb-4">Tocá el ícono de invertir para contradecir a los dados. Los módulos nunca se eliminan: los que quedan fuera se ocultan.</p>
              <div className="grid gap-2 md:grid-cols-2 m-escalonado">
                {grupos.modulos.map((d) => {
                  const m = catalogo.modulos.find((x) => x.id === d.id);
                  const si = resultado(d);
                  return (
                    <div key={d.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${si ? "border-white/10 bg-white/[0.03]" : "border-white/5 opacity-60"}`}>
                      <span className="material-symbols-outlined" style={{ color: m?.color }} aria-hidden="true">{m?.icono}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" title={d.nombre}>{d.nombre}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="m-barra flex-1"><span style={{ width: `${d.probabilidad * 100}%` }} /></div>
                          <span className="text-[11px] tabular-nums whitespace-nowrap text-[color:var(--m-suave)]">{Math.round(d.probabilidad * 100)} %</span>
                        </div>
                      </div>
                      <span className={`m-chip ${si ? "is-activo" : ""}`}>{si ? "Visible" : "Oculto"}</span>
                      <button type="button" className={`m-icono-boton ${invertidas.has(claveDe(d)) ? "text-[color:var(--m-oro)]" : ""}`} onClick={() => invertir(d)} title="Invertir la decisión" aria-label={`Invertir decisión sobre ${d.nombre}`}>
                        <span className="material-symbols-outlined">swap_horiz</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="m-cristal p-6 m-aparecer">
              <h3 className="font-headline font-bold text-lg mb-1">Funciones apagadas por los dados ({funcionesApagadas.length})</h3>
              <p className="text-xs text-[color:var(--m-suave)] mb-4">De {grupos.funciones.length} funciones, estas quedaron apagadas. La autonomía las enciende; la supervisión, las de control.</p>
              {funcionesApagadas.length === 0 ? (
                <p className="text-sm text-[color:var(--m-suave)]">Todas las funciones quedaron encendidas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {funcionesApagadas.map((d) => (
                    <button key={d.id} type="button" className="m-chip" onClick={() => invertir(d)} title={`Probabilidad de quedar activa: ${Math.round(d.probabilidad * 100)} %. Tocá para encenderla.`}>
                      <span className="material-symbols-outlined" aria-hidden="true">toggle_off</span>{d.nombre} · {Math.round(d.probabilidad * 100)} %
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="m-cristal p-6 m-aparecer">
                <h3 className="font-headline font-bold text-lg mb-3">Algoritmos calibrados</h3>
                <div className="flex flex-col gap-3">
                  {grupos.parametros.map((d) => (
                    <div key={d.id}>
                      <p className="text-sm font-semibold">{d.nombre}</p>
                      <p className="text-xs text-[color:var(--m-suave)] mt-0.5">
                        {Object.entries(d.valores ?? {}).map(([k, v]) => {
                          const p = catalogo.algoritmos.find((a) => a.id === d.id)?.parametros.find((x) => x.id === k);
                          return `${p?.nombre ?? k}: ${v}`;
                        }).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="m-cristal p-6 m-aparecer">
                <h3 className="font-headline font-bold text-lg mb-3">Otras decisiones</h3>
                <div className="flex flex-col gap-3">
                  {grupos.otras.map((d) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[color:var(--m-magenta)]" aria-hidden="true">{d.tipo === "paleta" ? "palette" : "family_restroom"}</span>
                      <span className="text-sm flex-1">{d.nombre}</span>
                      {d.tipo === "perfil" && (
                        <>
                          <span className={`m-chip ${resultado(d) ? "is-activo" : ""}`}>{resultado(d) ? "Visible" : "Oculto"} · {Math.round(d.probabilidad * 100)} %</span>
                          <button type="button" className="m-icono-boton" onClick={() => invertir(d)} aria-label="Invertir"><span className="material-symbols-outlined">swap_horiz</span></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
