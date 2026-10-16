// La Ignición: el momento en que una instancia nace. Se mantiene presionado el
// núcleo para encenderlo, corre la cuenta regresiva mientras el servidor forja
// la escuela de verdad, estalla, pasan los créditos (módulos, perfiles,
// algoritmos, flujos) y al final aparecen las credenciales, una sola vez.

import { useEffect, useRef, useState } from "react";
import type { Catalogo, Genoma, ResultadoForja } from "../../../servicios/maestro";
import CampoEstelar from "./CampoEstelar";
import { potenciaDeDiez } from "./genomaUtil";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  direccion: string;
  forjar: () => Promise<ResultadoForja>;
  onVolver: () => void;
  onAbrirInstancia: (id: string) => void;
  onIrAlUniverso: () => void;
}

const DURACION_CARGA = 1300;

export default function Ignicion({ genoma, catalogo, direccion, forjar, onVolver, onAbrirInstancia, onIrAlUniverso }: Props) {
  const [carga, setCarga] = useState(0);
  const [manteniendo, setManteniendo] = useState(false);
  const [iniciada, setIniciada] = useState(false);
  const [cuenta, setCuenta] = useState(3);
  const [cuentaTerminada, setCuentaTerminada] = useState(false);
  const [resultado, setResultado] = useState<ResultadoForja | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [estallidoTerminado, setEstallidoTerminado] = useState(false);
  const [creditosTerminados, setCreditosTerminados] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const promesa = useRef<Promise<ResultadoForja> | null>(null);
  const cargaActual = useRef(0);

  // Mantener presionado: la carga sube mientras se sostiene; al soltar vuelve a
  // cero (el anillo baja con una transición).
  useEffect(() => {
    if (iniciada || !manteniendo) return;
    let cuadro = 0;
    let ultimo = performance.now();
    const paso = (ahora: number) => {
      cargaActual.current = Math.min(1, cargaActual.current + (ahora - ultimo) / DURACION_CARGA);
      ultimo = ahora;
      setCarga(cargaActual.current);
      if (cargaActual.current >= 1) {
        setIniciada(true);
        return;
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [manteniendo, iniciada]);

  const soltar = () => {
    setManteniendo(false);
    if (!iniciada) {
      cargaActual.current = 0;
      setCarga(0);
    }
  };

  // La cuenta regresiva y, en paralelo, la forja real en el servidor.
  useEffect(() => {
    if (!iniciada) return;
    let vigente = true;
    if (!promesa.current) promesa.current = forjar();
    promesa.current
      .then((r) => { if (vigente) setResultado(r); })
      .catch((e: unknown) => { if (vigente) setFallo(e instanceof Error ? e.message : "No se pudo forjar la instancia."); });
    const tiempos = [
      window.setTimeout(() => setCuenta(2), 900),
      window.setTimeout(() => setCuenta(1), 1800),
      window.setTimeout(() => setCuentaTerminada(true), 2700),
    ];
    return () => { vigente = false; tiempos.forEach((t) => window.clearTimeout(t)); };
  }, [iniciada, forjar]);

  const estallando = cuentaTerminada && !!resultado && !estallidoTerminado;
  useEffect(() => {
    if (!estallando) return;
    const t = window.setTimeout(() => setEstallidoTerminado(true), 1700);
    return () => window.clearTimeout(t);
  }, [estallando]);

  const enCreditos = estallidoTerminado && !creditosTerminados;
  useEffect(() => {
    if (!enCreditos) return;
    const t = window.setTimeout(() => setCreditosTerminados(true), 17000);
    return () => window.clearTimeout(t);
  }, [enCreditos]);

  const fase = !iniciada ? "listo"
    : !cuentaTerminada ? "cuenta"
    : fallo ? "error"
    : !resultado ? "esperando"
    : !estallidoTerminado ? "estallido"
    : !creditosTerminados ? "creditos" : "final";

  const velocidad = fase === "listo" ? 0.5 + carga * 12
    : fase === "cuenta" ? 8 + (3 - cuenta) * 9
    : fase === "esperando" ? 32
    : fase === "estallido" ? 2
    : fase === "creditos" ? 1.1 : 0.5;
  const colores = [genoma.tema.acento, genoma.tema.primario, genoma.tema.secundario, genoma.tema.terciario, "#ffffff"];
  const estilo = { ["--ign-a" as string]: genoma.tema.acento, ["--ign-b" as string]: genoma.tema.secundario } as React.CSSProperties;

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      window.setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1600);
    } catch {
      setCopiado(null);
    }
  };

  const modulosVisibles = catalogo.modulos.filter((m) => !genoma.modulos[m.id]?.oculto);
  const algoritmosActivos = catalogo.algoritmos.filter((a) => genoma.algoritmos[a.id]?.activo);
  const flujosActivos = genoma.flujos.filter((f) => f.activo);

  return (
    <div className="m-ignicion maestro" style={estilo} role="dialog" aria-label="Ignición de la instancia">
      <CampoEstelar velocidad={velocidad} densidad={700} colores={colores} convergencia={fase === "esperando" ? 0.35 : 0} />

      {fase === "listo" && (
        <div className="relative z-[3] flex flex-col items-center gap-8 px-6 text-center m-aparecer">
          <p className="m-eyebrow">Ignición</p>
          <h2 className="m-titulo text-4xl md:text-6xl max-w-3xl">{genoma.identidad.nombre}</h2>
          <div
            className={`m-mantener ${manteniendo ? "is-cargando" : ""}`}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setManteniendo(true); }}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setManteniendo(true); } }}
            onKeyUp={soltar}
            role="button"
            tabIndex={0}
            aria-label="Mantené presionado para forjar la instancia"
          >
            <svg viewBox="0 0 168 168" aria-hidden="true">
              <circle cx="84" cy="84" r="78" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
              <circle cx="84" cy="84" r="78" fill="none" stroke="url(#m-ign-grad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 78} strokeDashoffset={(1 - carga) * 2 * Math.PI * 78} style={{ transition: manteniendo ? "none" : "stroke-dashoffset .45s ease" }} />
              <defs>
                <linearGradient id="m-ign-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" /><stop offset="50%" stopColor="#ff4fd8" /><stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
            <span className="m-mantener-nucleo">MANTENÉ<br />PARA<br />FORJAR</span>
          </div>
          <button type="button" className="m-boton-fantasma m-boton-chico" onClick={onVolver}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Volver a la Forja
          </button>
        </div>
      )}

      {fase === "cuenta" && <div key={cuenta} className="m-cuenta" aria-live="assertive">{cuenta}</div>}

      {fase === "esperando" && (
        <div className="relative z-[3] text-center m-aparecer" aria-live="polite">
          <div className="m-orbe mx-auto" style={{ ["--orbe-a" as string]: genoma.tema.acento, ["--orbe-b" as string]: genoma.tema.secundario, width: 140, height: 140 } as React.CSSProperties}>
            <span className="m-orbe-anillo" /><span className="m-orbe-nucleo" />
          </div>
          <p className="mt-6 text-sm tracking-[0.3em] uppercase text-white/70">Forjando el genoma…</p>
        </div>
      )}

      {fase === "estallido" && (
        <>
          <div className="m-flash" />
          <div className="m-onda" />
          <div className="m-onda" style={{ animationDelay: ".25s" }} />
          <div className="relative z-[3] text-center px-6 m-aparecer" style={{ animationDelay: ".5s" }}>
            <p className="m-eyebrow justify-center">Instancia forjada</p>
            <h2 className="m-titulo text-5xl md:text-7xl mt-4" style={{ textShadow: `0 0 60px ${genoma.tema.acento}` }}>{genoma.identidad.nombre}</h2>
          </div>
        </>
      )}

      {fase === "creditos" && (
        <>
          <div className="m-creditos-ventana">
            <div className="m-creditos" style={{ ["--duracion" as string]: "17s" } as React.CSSProperties}>
              <h3>Una instancia de NEXO</h3>
              <p className="m-creditos-titulo m-degradado-texto">{genoma.identidad.nombre}</p>
              {genoma.identidad.lema && <p className="italic opacity-80">{genoma.identidad.lema}</p>}
              <h3>Dirigida por</h3>
              <p>{direccion}</p>
              <h3>Módulos</h3>
              {modulosVisibles.map((m) => <p key={m.id}>{genoma.modulos[m.id]?.etiqueta || m.nombre}</p>)}
              <h3>Perfiles</h3>
              {genoma.perfiles.map((p) => <p key={p.clave} style={{ color: p.color }}>{p.nombre}</p>)}
              <h3>Algoritmos</h3>
              {algoritmosActivos.map((a) => <p key={a.id}>{a.nombre}{genoma.algoritmos[a.id].variante === "personalizado" ? " · por nodos" : ""}</p>)}
              <h3>Flujos</h3>
              {flujosActivos.length ? flujosActivos.map((f) => <p key={f.id}>{f.nombre}</p>) : <p className="opacity-60">Ninguno todavía</p>}
              <h3>Paleta</h3>
              <div className="flex justify-center gap-3 mt-3">
                {(["acento", "primario", "secundario", "terciario"] as const).map((k) => (
                  <span key={k} className="w-10 h-10 rounded-full" style={{ background: genoma.tema[k], boxShadow: `0 0 24px ${genoma.tema[k]}` }} />
                ))}
              </div>
              <h3>Diseñada por</h3>
              <p>El Maestro</p>
              <p className="opacity-70 text-base">sin escribir una sola línea de código</p>
              <h3>Un universo entre</h3>
              <p className="m-creditos-titulo">{potenciaDeDiez(resultado?.resumen.combinatoria.exponente ?? 0)}</p>
            </div>
          </div>
          <button type="button" className="m-boton-fantasma m-boton-chico absolute z-[5] right-6 bottom-6" onClick={() => setCreditosTerminados(true)}>
            Saltar créditos<span className="material-symbols-outlined" aria-hidden="true">skip_next</span>
          </button>
        </>
      )}

      {fase === "final" && resultado && (
        <div className="relative z-[3] w-[min(720px,92vw)] max-h-[88vh] overflow-y-auto m-scroll m-cristal m-cristal-fuerte p-8 m-aparecer">
          <p className="m-eyebrow">Ya existe</p>
          <h2 className="m-titulo text-4xl mt-3">{genoma.identidad.nombre}</h2>
          <p className="text-sm text-[color:var(--m-suave)] mt-2">{resultado.mensaje}</p>
          <div className="flex flex-col gap-2 mt-6">
            {resultado.credenciales.map((c) => (
              <div key={c.email} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <span className="nexo-perfil-punto" style={{ background: c.color, width: 10, height: 10 }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{c.perfil}</p>
                  <p className="text-xs text-[color:var(--m-suave)] font-mono truncate">{c.email}</p>
                </div>
                <code className="text-sm font-mono bg-white/10 rounded-lg px-2.5 py-1">{c.contrasena}</code>
                <button type="button" className="m-icono-boton" onClick={() => void copiar(`${c.email}\t${c.contrasena}`, c.email)} aria-label={`Copiar credenciales de ${c.perfil}`}>
                  <span className="material-symbols-outlined">{copiado === c.email ? "check" : "content_copy"}</span>
                </button>
              </div>
            ))}
          </div>
          <div className="m-aviso info mt-5"><span className="material-symbols-outlined" aria-hidden="true">key</span>Guardalas ahora: no se pueden volver a ver. La primera vez que cada cuenta entre, NEXO le ofrece cambiar su contraseña. Si alguien la pierde, usa "Olvidé mi contraseña".</div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button type="button" className="m-boton-fantasma" onClick={() => void copiar(resultado.credenciales.map((c) => `${c.perfil}\t${c.email}\t${c.contrasena}`).join("\n"), "todas")}>
              <span className="material-symbols-outlined" aria-hidden="true">{copiado === "todas" ? "check" : "content_copy"}</span>Copiar todas
            </button>
            <button type="button" className="m-boton-fantasma" onClick={onIrAlUniverso}>
              <span className="material-symbols-outlined" aria-hidden="true">public</span>Volver al universo
            </button>
            <button type="button" className="m-boton" onClick={() => onAbrirInstancia(resultado.id)}>
              <span className="material-symbols-outlined" aria-hidden="true">tune</span>Seguir diseñándola
            </button>
          </div>
        </div>
      )}

      {fase === "error" && (
        <div className="relative z-[3] w-[min(560px,92vw)] m-cristal m-cristal-fuerte p-8 text-center m-aparecer" role="alert">
          <span className="material-symbols-outlined text-5xl text-rose-300" aria-hidden="true">heart_broken</span>
          <h2 className="m-titulo text-3xl mt-3">La ignición se detuvo</h2>
          <p className="text-sm text-[color:var(--m-suave)] mt-3">{fallo}</p>
          <button type="button" className="m-boton mt-6" onClick={onVolver}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Volver a la Forja
          </button>
        </div>
      )}
    </div>
  );
}
