// Armar un debate combinando bloques: postura, encuesta, escala, ranking,
// argumentos, propuestas y pregunta abierta (con plantillas de un toque), y
// elegir cuándo se ven los resultados, si los aportes son anónimos y hasta
// cuándo está abierto.

import { useState } from "react";
import { createPortal } from "react-dom";
import { crearDebate, type TipoBloque, type VisibilidadResultados } from "../../../servicios/comunidad";
import { subirArchivo, type ArchivoSubido } from "../../../servicios/archivos";
import { useCapacidad } from "../../../servicios/instancia";
import { useDialogo } from "../../../servicios/useDialogo";
import { bloqueParaServidor, bloqueVacio, PLANTILLAS, TIPOS_BLOQUE, VISIBILIDAD, type BloqueBorrador } from "./debateUtil";
import Selector from "../shared/Selector";

interface Props {
  onCerrar: () => void;
  onCreado: (id: string) => void;
}

export default function CreadorDebate({ onCerrar, onCreado }: Props) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const multimedia = useCapacidad("comunidad.multimedia");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cierraEn, setCierraEn] = useState("");
  const [resultados, setResultados] = useState<VisibilidadResultados>("siempre");
  const [anonimo, setAnonimo] = useState(false);
  const [bloques, setBloques] = useState<BloqueBorrador[]>(() => PLANTILLAS[0].bloques());
  const [adjuntos, setAdjuntos] = useState<ArchivoSubido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cambiar = (clave: string, cambio: Partial<BloqueBorrador>) => setBloques((bs) => bs.map((b) => (b.clave === clave ? { ...b, ...cambio } : b)));
  const mover = (i: number, j: number) => setBloques((bs) => { const n = [...bs]; const [x] = n.splice(i, 1); n.splice(j, 0, x); return n; });

  const crear = async () => {
    setError(null);
    if (!titulo.trim()) { setError("Escribí la pregunta del debate."); return; }
    if (!bloques.length) { setError("Sumá al menos un bloque."); return; }
    setCreando(true);
    try {
      const r = await crearDebate({ titulo: titulo.trim(), descripcion: descripcion.trim(), cierraEn: cierraEn || null, resultados, anonimo, bloques: bloques.map(bloqueParaServidor), adjuntos: adjuntos.map((a) => Number(a.id)) });
      onCreado(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el debate.");
      setCreando(false);
    }
  };

  const listaOpciones = (b: BloqueBorrador, minimo: number, maximo: number) => (
    <div className="mt-2 flex flex-col gap-1.5">
      {(b.opciones ?? []).map((o, k) => (
        <div key={k} className="flex gap-2">
          <input className="c-input" value={o} maxLength={80} placeholder={`Opción ${k + 1}`} aria-label={`Opción ${k + 1}`} onChange={(e) => cambiar(b.clave, { opciones: b.opciones!.map((x, j) => (j === k ? e.target.value : x)) })} />
          {(b.opciones ?? []).length > minimo && <button type="button" className="c-herramienta" onClick={() => cambiar(b.clave, { opciones: b.opciones!.filter((_, j) => j !== k) })} aria-label={`Quitar opción ${k + 1}`}><span className="material-symbols-outlined">remove</span></button>}
        </div>
      ))}
      {(b.opciones ?? []).length < maximo && <button type="button" className="c-boton-fantasma c-chico self-start" onClick={() => cambiar(b.clave, { opciones: [...(b.opciones ?? []), ""] })}><span className="material-symbols-outlined" aria-hidden="true">add</span>Opción</button>}
    </div>
  );

  return createPortal(
    <div className="c-velo" onClick={() => { if (!creando) onCerrar(); }}>
      <div ref={dialogo} className="c-dialogo ancho" role="dialog" aria-modal="true" aria-labelledby="c-creador-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-acento/20 text-primary" aria-hidden="true"><span className="material-symbols-outlined">forum</span></span>
          <h2 id="c-creador-titulo" className="flex-1 font-headline text-lg font-bold text-white">Nuevo debate</h2>
          <button type="button" className="c-accion !p-1.5" onClick={onCerrar} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-4">
            <input className="c-input !border-0 !border-b-2 !rounded-none !bg-transparent !px-0 font-headline !text-2xl font-bold" value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} placeholder="La pregunta del debate" aria-label="Pregunta del debate" autoFocus />
            <textarea className="c-input min-h-[80px]" value={descripcion} maxLength={4000} onChange={(e) => setDescripcion(e.target.value)} placeholder="Contexto: de qué se trata, qué se busca decidir…" aria-label="Descripción" />
            {multimedia && (
              <div className="flex flex-wrap items-center gap-2">
                <label className={`c-boton-fantasma c-chico inline-flex cursor-pointer items-center gap-1.5 ${subiendo || adjuntos.length >= 6 ? "pointer-events-none opacity-50" : ""}`}>
                  <span className={`material-symbols-outlined !text-[18px] text-primary ${subiendo ? "animate-spin" : ""}`} aria-hidden="true">{subiendo ? "progress_activity" : "perm_media"}</span>
                  {subiendo ? "Subiendo…" : "Fotos, videos y archivos"}
                  <input type="file" multiple className="sr-only" disabled={subiendo || adjuntos.length >= 6} onChange={async (e) => {
                    const lista = e.target.files;
                    e.target.value = "";
                    if (!lista) return;
                    setSubiendo(true);
                    try { const n: ArchivoSubido[] = []; for (const f of Array.from(lista).slice(0, 6 - adjuntos.length)) n.push(await subirArchivo(f)); setAdjuntos([...adjuntos, ...n]); } catch (x) { setError(x instanceof Error ? x.message : "No se pudo subir."); } finally { setSubiendo(false); }
                  }} />
                </label>
                {adjuntos.map((a) => (
                  <span key={a.id} className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3 pr-1 text-[12px] text-white">
                    <span className="truncate">{a.nombre}</span>
                    <button type="button" className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-white/10" onClick={() => setAdjuntos(adjuntos.filter((x) => x.id !== a.id))} aria-label={`Quitar ${a.nombre}`}>
                      <span className="material-symbols-outlined !text-[14px]" aria-hidden="true">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="c-subtitulo mb-2">Bloques del debate (se combinan como quieras)</p>
              <div className="flex flex-col gap-3">
                {bloques.map((b, i) => {
                  const meta = TIPOS_BLOQUE[b.tipo];
                  return (
                    <div key={b.clave} className="c-bloque !p-4">
                      <div className="flex items-center gap-2">
                        <span className="c-bloque-tipo flex-1" style={{ color: meta.color }}><span className="material-symbols-outlined !text-[16px]" aria-hidden="true">{meta.icono}</span>{i + 1}. {meta.nombre}</span>
                        <button type="button" className="c-accion !p-1" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label="Subir bloque"><span className="material-symbols-outlined">arrow_upward</span></button>
                        <button type="button" className="c-accion !p-1" disabled={i === bloques.length - 1} onClick={() => mover(i, i + 1)} aria-label="Bajar bloque"><span className="material-symbols-outlined">arrow_downward</span></button>
                        <button type="button" className="c-accion !p-1 hover:!text-rose-300" onClick={() => setBloques(bloques.filter((x) => x.clave !== b.clave))} aria-label="Quitar bloque"><span className="material-symbols-outlined">close</span></button>
                      </div>
                      <input className="c-input mt-2" value={b.titulo} maxLength={160} onChange={(e) => cambiar(b.clave, { titulo: e.target.value })}
                        placeholder={b.tipo === "abierta" ? "La pregunta (obligatoria)" : `Título (si no, «${({ postura: "¿Cuál es tu postura?", opciones: "Elegí una opción", escala: "¿Cuánto estás de acuerdo?", ranking: "Ordená de más a menos importante", argumentos: "Argumentos", propuestas: "Propuestas", abierta: "" } as Record<TipoBloque, string>)[b.tipo]}»)`} aria-label={`Título del bloque ${i + 1}`} />
                      <p className="mt-1 text-[11.5px] text-on-surface-variant/55">{meta.ayuda}</p>
                      {b.tipo === "postura" && (
                        <label className="mt-2 flex items-center gap-2 text-[13px] text-on-surface-variant"><input type="checkbox" checked={Boolean(b.neutral)} onChange={(e) => cambiar(b.clave, { neutral: e.target.checked })} />Permitir «Indeciso»</label>
                      )}
                      {b.tipo === "opciones" && (
                        <>
                          {listaOpciones(b, 2, 10)}
                          <label className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-on-surface-variant">
                            <input type="checkbox" checked={Boolean(b.multiple)} onChange={(e) => cambiar(b.clave, { multiple: e.target.checked })} />Se pueden elegir varias
                            {b.multiple && <>· hasta <input type="number" className="c-input !w-16 !py-1" min={1} max={(b.opciones ?? []).length} value={b.maximo ?? 2} onChange={(e) => cambiar(b.clave, { maximo: Number(e.target.value) })} /></>}
                          </label>
                        </>
                      )}
                      {b.tipo === "escala" && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-[13px] text-on-surface-variant">Escala
                            <Selector className="c-input !w-auto !py-1" value={`${b.minimo}-${b.maximoEscala}`} onChange={(e) => { const [mi, ma] = e.target.value.split("-").map(Number); cambiar(b.clave, { minimo: mi, maximoEscala: ma }); }}>
                              {["1-5", "1-7", "1-10", "0-10"].map((v) => <option key={v} value={v}>{v.replace("-", " a ")}</option>)}
                            </Selector>
                          </label>
                          <div className="flex gap-2">
                            <input className="c-input !py-1" value={b.etiquetaMin} maxLength={30} onChange={(e) => cambiar(b.clave, { etiquetaMin: e.target.value })} aria-label="Etiqueta del mínimo" />
                            <input className="c-input !py-1" value={b.etiquetaMax} maxLength={30} onChange={(e) => cambiar(b.clave, { etiquetaMax: e.target.value })} aria-label="Etiqueta del máximo" />
                          </div>
                        </div>
                      )}
                      {b.tipo === "ranking" && listaOpciones(b, 3, 8)}
                      {b.tipo === "propuestas" && (
                        <label className="mt-2 flex items-center gap-2 text-[13px] text-on-surface-variant">Cada persona suma hasta
                          <input type="number" className="c-input !w-16 !py-1" min={1} max={10} value={b.maximoPorPersona ?? 3} onChange={(e) => cambiar(b.clave, { maximoPorPersona: Number(e.target.value) })} />propuestas
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div>
              <p className="c-subtitulo mb-2">Plantillas</p>
              <div className="flex flex-col gap-1.5">
                {PLANTILLAS.map((p) => (
                  <button key={p.nombre} type="button" className="c-paleta-bloque" onClick={() => setBloques(p.bloques())}>
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">{p.icono}</span>
                    <span><b className="block text-[13px] text-white">{p.nombre}</b><span className="text-[11.5px] text-on-surface-variant/60">{p.descripcion}</span></span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="c-subtitulo mb-2">Sumar un bloque</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(TIPOS_BLOQUE) as TipoBloque[]).map((t) => (
                  <button key={t} type="button" className="c-paleta-bloque !p-2" disabled={bloques.length >= 8} onClick={() => setBloques([...bloques, bloqueVacio(t)])} title={TIPOS_BLOQUE[t].ayuda}>
                    <span className="material-symbols-outlined !text-[18px]" style={{ color: TIPOS_BLOQUE[t].color }} aria-hidden="true">{TIPOS_BLOQUE[t].icono}</span>
                    <span className="text-[12px] font-semibold text-white">{TIPOS_BLOQUE[t].nombre}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-[12px] text-on-surface-variant">
              Cierra el (opcional)
              <input type="date" className="c-input" value={cierraEn} onChange={(e) => setCierraEn(e.target.value)} />
            </label>
            <div>
              <p className="mb-1.5 text-[12px] text-on-surface-variant">Cuándo se ven los resultados</p>
              <div className="flex flex-col gap-1">
                {(Object.keys(VISIBILIDAD) as VisibilidadResultados[]).map((v) => (
                  <label key={v} className="flex items-center gap-2 text-[13px] text-white"><input type="radio" name="resultados" checked={resultados === v} onChange={() => setResultados(v)} />{VISIBILIDAD[v]}</label>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 text-[13px] text-white">
              <input type="checkbox" className="mt-1" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} />
              <span>Aportes anónimos<span className="block text-[11.5px] text-on-surface-variant/60">Nadie ve quién escribió cada aporte (la dirección sí, para moderar).</span></span>
            </label>
          </aside>
        </div>

        {error && <p className="mx-5 mb-2 rounded-xl bg-rose-500/10 px-4 py-2 text-sm text-rose-200" role="alert">{error}</p>}
        <footer className="flex justify-end gap-2 border-t border-white/5 px-5 py-4">
          <button type="button" className="c-boton-fantasma" onClick={onCerrar} disabled={creando}>Cancelar</button>
          <button type="button" className="c-boton" onClick={() => void crear()} disabled={creando}>{creando ? "Creando…" : "Abrir el debate"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
