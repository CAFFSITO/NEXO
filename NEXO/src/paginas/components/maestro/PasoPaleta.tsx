// Paso «Paleta»: los colores de la instancia, con matemática de color. La rueda
// elige el tono; la armonía (complementaria, triádica…) reparte los otros por
// ángulos; la intensidad, la saturación. Cada color se puede ajustar a mano y
// el contraste WCAG se calcula en vivo. Fondo y superficie siempre oscuros.

import { useState } from "react";
import type { Genoma } from "../../../servicios/maestro";
import { ARMONIAS, contraste, hexAHsl, luminancia, oscurecerHasta, paletaArmonica, veredictoContraste, type Armonia } from "../../../servicios/color";
import { estiloDeTema, variablesDeTema, type Movimiento, type Tema } from "../../../servicios/tema";
import type { Catalogo } from "../../../servicios/maestro";
import VistaPreviaMenu from "./VistaPreviaMenu";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  onCambiar: (genoma: Genoma) => void;
}

const COLORES: { id: keyof Pick<Tema, "acento" | "primario" | "secundario" | "terciario" | "fondo" | "superficie">; nombre: string; uso: string }[] = [
  { id: "acento", nombre: "Acento", uso: "Botones, marcas, lo que brilla" },
  { id: "primario", nombre: "Primario", uso: "Textos destacados, íconos activos" },
  { id: "secundario", nombre: "Secundario", uso: "Detalles y contenedores" },
  { id: "terciario", nombre: "Terciario", uso: "Avisos, logros, contrapunto" },
  { id: "fondo", nombre: "Fondo", uso: "La noche de la app (oscuro)" },
  { id: "superficie", nombre: "Superficie", uso: "Tarjetas y paneles (oscuro)" },
];

const RADIO_RUEDA = 110;
const RADIO_PERILLA = 93;

export default function PasoPaleta({ genoma, catalogo, onCambiar }: Props) {
  const tema = genoma.tema;
  const [tono, setTono] = useState(() => Math.round(hexAHsl(tema.acento).h));
  const [armonia, setArmonia] = useState<Armonia>("complementaria");
  const [intensidad, setIntensidad] = useState(0.85);
  const [aviso, setAviso] = useState<string | null>(null);

  const cambiarTema = (cambio: Partial<Tema>) => onCambiar({ ...genoma, tema: { ...tema, ...cambio } });
  const generar = (t = tono, a = armonia, i = intensidad) => cambiarTema(paletaArmonica(t, a, i));

  const desdePuntero = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const angulo = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const h = Math.round((angulo - 90 + 720) % 360);
    setTono(h);
    generar(h);
  };

  const posicion = (h: number) => {
    const a = ((h + 90) * Math.PI) / 180;
    return { left: RADIO_RUEDA + RADIO_PERILLA * Math.sin(a), top: RADIO_RUEDA - RADIO_PERILLA * Math.cos(a) };
  };
  const angulos = ARMONIAS.find((a) => a.id === armonia)?.angulos ?? [0, 180, 30];

  const cambiarColor = (id: (typeof COLORES)[number]["id"], hex: string) => {
    if ((id === "fondo" || id === "superficie") && luminancia(hex) > 0.08) {
      setAviso(`El ${id} tiene que ser oscuro para que todo se lea bien: lo oscurecimos hasta el límite.`);
      cambiarTema({ [id]: oscurecerHasta(hex, 0.06) } as Partial<Tema>);
      return;
    }
    setAviso(null);
    cambiarTema({ [id]: hex } as Partial<Tema>);
  };

  const vars = variablesDeTema(tema);
  const pruebas = [
    { nombre: "Texto sobre fondo", a: vars["--nexo-texto"], b: tema.fondo },
    { nombre: "Primario sobre fondo", a: tema.primario, b: tema.fondo },
    { nombre: "Acento sobre fondo", a: tema.acento, b: tema.fondo },
    { nombre: "Texto suave sobre superficie", a: vars["--nexo-texto-suave"], b: tema.superficie },
  ];
  const estudiante = genoma.perfiles.find((p) => p.clave === "estudiante") ?? genoma.perfiles[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="m-aparecer">
        <p className="m-eyebrow">Paleta</p>
        <h2 className="m-titulo text-3xl mt-3">Los colores de este universo</h2>
      </div>

      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_auto]">
        <section className="flex flex-col gap-6">
          <div className="m-cristal p-6 flex flex-wrap gap-8 items-center m-aparecer">
            <div
              className="m-rueda"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); desdePuntero(e); }}
              onPointerMove={(e) => { if (e.buttons) desdePuntero(e); }}
              role="slider"
              aria-label="Tono del acento"
              aria-valuemin={0}
              aria-valuemax={359}
              aria-valuenow={tono}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") { const h = (tono + 5) % 360; setTono(h); generar(h); }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") { const h = (tono + 355) % 360; setTono(h); generar(h); }
              }}
            >
              {angulos.slice(1).map((d, i) => (
                <span key={i} className="m-rueda-satelite" style={{ ...posicion(tono + d), background: i === 0 ? tema.secundario : tema.terciario }} />
              ))}
              <span className="m-rueda-perilla" style={{ ...posicion(tono), background: tema.acento, color: tema.acento }} />
              <span className="absolute inset-0 z-[1] grid place-items-center pointer-events-none">
                <span className="text-center">
                  <span className="block text-3xl font-headline font-extrabold">{tono}°</span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-[color:var(--m-tenue)]">tono</span>
                </span>
              </span>
            </div>
            <div className="flex-1 min-w-[240px] flex flex-col gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-2">Armonía</p>
                <div className="flex flex-wrap gap-2">
                  {ARMONIAS.map((a) => (
                    <button key={a.id} type="button" className={`m-chip ${armonia === a.id ? "is-activo" : ""}`} onClick={() => { setArmonia(a.id); generar(tono, a.id); }}>
                      {a.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <label className="m-campo">
                <span>Intensidad · {Math.round(intensidad * 100)} %</span>
                <input type="range" className="m-deslizador" min={0} max={1} step={0.01} value={intensidad} onChange={(e) => { const i = Number(e.target.value); setIntensidad(i); generar(tono, armonia, i); }} />
              </label>
              <button type="button" className="m-boton-fantasma w-fit" onClick={() => { const h = Math.floor(Math.random() * 360); const a = ARMONIAS[Math.floor(Math.random() * ARMONIAS.length)].id; setTono(h); setArmonia(a); generar(h, a); }}>
                <span className="material-symbols-outlined" aria-hidden="true">casino</span>Sorprendeme
              </button>
            </div>
          </div>

          {aviso && <div className="m-aviso info" role="status"><span className="material-symbols-outlined" aria-hidden="true">contrast</span>{aviso}</div>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 m-escalonado">
            {COLORES.map((c) => (
              <label key={c.id} className="m-muestra" style={{ background: tema[c.id] }}>
                <input type="color" value={tema[c.id]} onChange={(e) => cambiarColor(c.id, e.target.value)} aria-label={`Color ${c.nombre}`} />
                <span className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                  <span className="block text-sm font-bold text-white">{c.nombre}</span>
                  <span className="block text-[11px] text-white/70">{c.uso}</span>
                  <span className="block text-[11px] font-mono text-white/85 mt-0.5">{tema[c.id]}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="m-cristal p-5 m-aparecer">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-3">Contraste (WCAG)</p>
              <div className="flex flex-col gap-2.5">
                {pruebas.map((p) => {
                  const ratio = contraste(p.a, p.b);
                  const v = veredictoContraste(ratio);
                  return (
                    <div key={p.nombre} className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold border border-white/10" style={{ background: p.b, color: p.a }}>Aa</span>
                      <span className="flex-1 text-[color:var(--m-suave)]">{p.nombre}</span>
                      <span className="tabular-nums font-semibold">{ratio.toFixed(1)}:1</span>
                      <span className={`m-chip ${v === "Insuficiente" ? "text-rose-300" : v === "Grande" ? "text-amber-300" : "text-emerald-300"}`}>{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="m-cristal p-5 flex flex-col gap-5 m-aparecer">
              <label className="m-campo">
                <span>Redondez de las esquinas · {tema.radio}px</span>
                <input type="range" className="m-deslizador" min={4} max={28} step={1} value={tema.radio} onChange={(e) => cambiarTema({ radio: Number(e.target.value) })} />
              </label>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-2">Movimiento</p>
                <div className="flex gap-2">
                  {(["sereno", "normal", "vibrante"] as Movimiento[]).map((m) => (
                    <button key={m} type="button" className={`m-chip ${tema.movimiento === m ? "is-activo" : ""}`} onClick={() => cambiarTema({ movimiento: m })}>
                      {m === "sereno" ? "Sereno" : m === "normal" ? "Normal" : "Vibrante"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[color:var(--m-tenue)] mt-2">Sereno quita los desplazamientos; vibrante suma brillos al menú y a las tarjetas.</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-wrap gap-5 items-start m-aparecer">
          {estudiante && <VistaPreviaMenu genoma={genoma} catalogo={catalogo} perfil={estudiante} alto={430} />}
          <div style={estiloDeTema(tema)} className="w-[300px] rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 flex flex-col gap-4" style={{ background: "var(--nexo-fondo-pagina)", minHeight: 430 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--nexo-primario)" }}>Vista previa</p>
              <p className="font-headline text-xl font-bold" style={{ color: "var(--nexo-texto)" }}>Hola, {genoma.identidad.nombre || "comunidad"} 👋</p>
              <div className="p-4 flex flex-col gap-2" style={{ background: "var(--nexo-lienzo)", borderRadius: "calc(var(--nexo-radio) * 1.33)" }}>
                <span className="text-xs font-bold w-fit px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--nexo-terciario) 18%, transparent)", color: "var(--nexo-terciario)" }}>Nuevo</span>
                <p className="text-sm font-semibold" style={{ color: "var(--nexo-texto)" }}>Feria de ciencias el viernes</p>
                <p className="text-xs" style={{ color: "var(--nexo-texto-suave)" }}>Traé tu proyecto al laboratorio a las 10.</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-bold px-3 py-1.5" style={{ background: "var(--nexo-acento)", color: "#fff", borderRadius: "var(--nexo-radio)" }}>Me sumo</span>
                  <span className="text-xs font-bold px-3 py-1.5" style={{ border: "1px solid var(--nexo-primario)", color: "var(--nexo-primario)", borderRadius: "var(--nexo-radio)" }}>Ver más</span>
                </div>
              </div>
              <div className="p-4" style={{ background: "var(--nexo-sup-2)", borderRadius: "calc(var(--nexo-radio) * 1.33)" }}>
                <p className="text-xs" style={{ color: "var(--nexo-texto-suave)" }}>Racha de lectura</p>
                <p className="font-headline text-3xl font-extrabold" style={{ color: "var(--nexo-secundario)" }}>12 días</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
