// Escribir una publicación, estilo X: emojis, @menciones, #temas, fotos,
// videos y archivos (si tu perfil tiene la capacidad), encuesta, hilo de varias
// publicaciones, programarla, elegir quién responde y citar otra publicación.

import { useRef, useState } from "react";
import { crearPublicacion, type CitaResumen, type Responden } from "../../../servicios/comunidad";
import { subirArchivo, tamanoLegible, urlPreview, type ArchivoSubido } from "../../../servicios/archivos";
import { useCapacidad, useFuncion } from "../../../servicios/instancia";
import AreaTexto from "./AreaTexto";
import SelectorEmoji from "./SelectorEmoji";
import { Avatar, TextoComunidad } from "./piezas";
import { insertarEnCursor } from "./comunidadUtil";
import Selector from "../shared/Selector";

const MAXIMO = 1000;
const DURACIONES = [{ h: 1, t: "1 hora" }, { h: 6, t: "6 horas" }, { h: 24, t: "1 día" }, { h: 72, t: "3 días" }, { h: 168, t: "1 semana" }];
const RESPONDEN: { id: Responden; texto: string; icono: string }[] = [
  { id: "todos", texto: "Todos pueden responder", icono: "public" },
  { id: "seguidos", texto: "Solo a quienes sigo", icono: "group" },
  { id: "mencionados", texto: "Solo a quienes menciono", icono: "alternate_email" },
];

interface Parte { texto: string; adjuntos: ArchivoSubido[] }

interface Props {
  usuario: { nombre: string; avatarUrl?: string };
  citando?: CitaResumen | null;
  onPublicado: (mensaje: string) => void;
  onCancelar?: () => void;
  autoFocus?: boolean;
}

export function Anillo({ usados, maximo }: { usados: number; maximo: number }) {
  const r = 10;
  const largo = 2 * Math.PI * r;
  const pct = Math.min(1, usados / maximo);
  const color = usados > maximo ? "#f43f5e" : pct > 0.9 ? "#facc15" : "var(--nexo-acento)";
  return (
    <span className="relative inline-grid place-items-center" title={`${usados} de ${maximo} caracteres`}>
      <svg className="c-anillo" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
        <circle cx="13" cy="13" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={largo} strokeDashoffset={largo * (1 - pct)} strokeLinecap="round" />
      </svg>
      {pct > 0.8 && <span className="absolute text-[9px] font-bold tabular-nums" style={{ color }}>{maximo - usados}</span>}
    </span>
  );
}

export default function Compositor({ usuario, citando, onPublicado, onCancelar, autoFocus }: Props) {
  const multimedia = useCapacidad("comunidad.multimedia");
  const hilos = useFuncion("comunidad.hilos");
  const encuestas = useFuncion("comunidad.encuestas");
  const programar = useFuncion("comunidad.programar");
  const [partes, setPartes] = useState<Parte[]>([{ texto: "", adjuntos: [] }]);
  const [enfocada, setEnfocada] = useState(0);
  const [emojiDe, setEmojiDe] = useState<number | null>(null);
  const [encuesta, setEncuesta] = useState<{ opciones: string[]; horas: number } | null>(null);
  const [programarEn, setProgramarEn] = useState<string | null>(null);
  const [responden, setResponden] = useState<Responden>("todos");
  const [menuResponden, setMenuResponden] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areas = useRef<(HTMLTextAreaElement | null)[]>([]);
  const archivo = useRef<HTMLInputElement>(null);
  const refDe = (i: number) => ({ get current() { return areas.current[i] ?? null; }, set current(el: HTMLTextAreaElement | null) { areas.current[i] = el; } });

  const cambiarParte = (i: number, cambio: Partial<Parte>) => setPartes((ps) => ps.map((p, k) => (k === i ? { ...p, ...cambio } : p)));
  const ponerEmoji = (i: number, emoji: string) => {
    const { valor, cursor } = insertarEnCursor(areas.current[i], partes[i].texto, emoji);
    cambiarParte(i, { texto: valor });
    window.requestAnimationFrame(() => { areas.current[i]?.focus(); areas.current[i]?.setSelectionRange(cursor, cursor); });
  };

  const subir = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setSubiendo(true);
    setError(null);
    const i = enfocada;
    try {
      const subidos: ArchivoSubido[] = [];
      for (const f of Array.from(lista).slice(0, 6 - partes[i].adjuntos.length)) subidos.push(await subirArchivo(f));
      cambiarParte(i, { adjuntos: [...partes[i].adjuntos, ...subidos] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = "";
    }
  };

  const vacia = (p: Parte) => !p.texto.trim() && !p.adjuntos.length;
  const pasada = partes.some((p) => p.texto.length > MAXIMO);
  const encuestaInvalida = encuesta !== null && encuesta.opciones.filter((o) => o.trim()).length < 2;
  const puedePublicar = !vacia(partes[0]) && !pasada && !encuestaInvalida && !partes.slice(1).some(vacia) && !subiendo && !publicando;

  const publicar = async () => {
    if (!puedePublicar) return;
    setPublicando(true);
    setError(null);
    try {
      await crearPublicacion({
        contenido: partes[0].texto.trim(),
        adjuntos: partes[0].adjuntos.map((a) => Number(a.id)),
        encuesta: encuesta ? { opciones: encuesta.opciones.map((o) => o.trim()).filter(Boolean), duracionHoras: encuesta.horas } : null,
        citaId: citando ? Number(citando.id) : null,
        responden,
        publicarEn: programarEn ? new Date(programarEn).toISOString() : null,
        hilo: partes.slice(1).map((p) => ({ contenido: p.texto.trim(), adjuntos: p.adjuntos.map((a) => Number(a.id)) })),
      });
      setPartes([{ texto: "", adjuntos: [] }]);
      setEncuesta(null);
      setProgramarEn(null);
      setResponden("todos");
      onPublicado(programarEn ? "Quedó programada." : partes.length > 1 ? `Publicaste un hilo de ${partes.length}.` : citando ? "Citaste la publicación." : "¡Publicado!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublicando(false);
    }
  };

  const respondenActual = RESPONDEN.find((r) => r.id === responden)!;

  return (
    <div className="c-compositor">
      {partes.map((p, i) => (
        <div key={i} className={i < partes.length - 1 ? "c-cadena" : "c-cadena ultima"}>
          <div className="c-cadena-rail"><Avatar nombre={usuario.nombre} url={usuario.avatarUrl} /></div>
          <div className={`min-w-0 ${i > 0 ? "pt-1" : ""}`} onFocus={() => setEnfocada(i)}>
            <AreaTexto
              valor={p.texto}
              onCambiar={(texto) => cambiarParte(i, { texto })}
              placeholder={i === 0 ? (citando ? "Agregá tu comentario…" : "¿Qué está pasando en la escuela?") : "Seguí el hilo…"}
              etiqueta={i === 0 ? "Nueva publicación" : `Parte ${i + 1} del hilo`}
              autoFocus={autoFocus || i > 0}
              onEnviar={() => void publicar()}
              refArea={refDe(i)}
              maximo={MAXIMO}
            />
            {p.adjuntos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {p.adjuntos.map((a) => (
                  <div key={a.id} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {a.tipoMime.startsWith("image/") ? <img src={urlPreview(a.id)} alt={a.nombre} className="h-24 w-full object-cover" />
                      : a.tipoMime.startsWith("video/") ? <video src={urlPreview(a.id)} className="h-24 w-full object-cover" muted />
                      : <div className="flex h-24 flex-col items-center justify-center gap-1 p-2 text-center"><span className="material-symbols-outlined text-primary" aria-hidden="true">description</span><span className="line-clamp-2 text-[10.5px] text-white">{a.nombre}</span><span className="text-[10px] text-on-surface-variant/50">{tamanoLegible(a.tamanoBytes)}</span></div>}
                    <button type="button" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white" onClick={() => cambiarParte(i, { adjuntos: p.adjuntos.filter((x) => x.id !== a.id) })} aria-label={`Quitar ${a.nombre}`}>
                      <span className="material-symbols-outlined !text-[15px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {i === 0 && encuesta && (
              <div className="mt-3 rounded-2xl border border-white/10 p-3">
                {encuesta.opciones.map((o, k) => (
                  <div key={k} className="mb-2 flex items-center gap-2">
                    <input className="c-input" value={o} maxLength={80} placeholder={`Opción ${k + 1}`} aria-label={`Opción ${k + 1}`} onChange={(e) => setEncuesta({ ...encuesta, opciones: encuesta.opciones.map((x, j) => (j === k ? e.target.value : x)) })} />
                    {encuesta.opciones.length > 2 && <button type="button" className="c-herramienta" onClick={() => setEncuesta({ ...encuesta, opciones: encuesta.opciones.filter((_, j) => j !== k) })} aria-label={`Quitar la opción ${k + 1}`}><span className="material-symbols-outlined">remove</span></button>}
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {encuesta.opciones.length < 6 ? <button type="button" className="c-boton-fantasma c-chico" onClick={() => setEncuesta({ ...encuesta, opciones: [...encuesta.opciones, ""] })}><span className="material-symbols-outlined" aria-hidden="true">add</span>Opción</button> : <span />}
                  <label className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                    Dura
                    <Selector className="c-input !w-auto !py-1 !text-[12px]" value={encuesta.horas} onChange={(e) => setEncuesta({ ...encuesta, horas: Number(e.target.value) })}>
                      {DURACIONES.map((d) => <option key={d.h} value={d.h}>{d.t}</option>)}
                    </Selector>
                    <button type="button" className="text-rose-300 hover:underline" onClick={() => setEncuesta(null)}>Quitar encuesta</button>
                  </label>
                </div>
              </div>
            )}
            {i === 0 && citando && (
              <div className="c-cita !cursor-default">
                {citando.eliminada ? <p className="text-sm text-on-surface-variant/60">Esta publicación ya no está disponible.</p> : <>
                  <p className="text-[13px]"><b className="text-white">{citando.autor}</b> <span className="c-handle">@{citando.handle}</span></p>
                  <TextoComunidad texto={citando.contenido ?? ""} className="mt-1 line-clamp-3 text-[13.5px]" />
                </>}
              </div>
            )}
            {i > 0 && (
              <button type="button" className="mt-1 text-[11.5px] text-rose-300 hover:underline" onClick={() => setPartes(partes.filter((_, k) => k !== i))}>Quitar esta parte</button>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
              {p.texto.length > 0 && <Anillo usados={p.texto.length} maximo={MAXIMO} />}
            </div>
          </div>
        </div>
      ))}

      {programarEn !== null && (
        <label className="mt-2 flex flex-wrap items-center gap-2 pl-[54px] text-[12.5px] text-on-surface-variant">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">schedule</span>
          Publicar el
          <input type="datetime-local" className="c-input !w-auto !py-1" value={programarEn} onChange={(e) => setProgramarEn(e.target.value)} />
          <button type="button" className="text-rose-300 hover:underline" onClick={() => setProgramarEn(null)}>Publicar ahora</button>
        </label>
      )}

      {error && <p className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200" role="alert">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 pl-[46px]">
        <div className="flex flex-wrap items-center gap-0.5">
          <input ref={archivo} type="file" multiple hidden onChange={(e) => void subir(e.target.files)} />
          <button type="button" className="c-herramienta" disabled={!multimedia || subiendo || partes[enfocada].adjuntos.length >= 6} onClick={() => archivo.current?.click()}
            title={multimedia ? "Fotos, videos y archivos" : "Tu perfil no puede subir fotos, videos ni archivos (lo decide la dirección)"} aria-label="Adjuntar fotos, videos o archivos">
            <span className={`material-symbols-outlined ${subiendo ? "animate-spin" : ""}`} aria-hidden="true">{subiendo ? "progress_activity" : "perm_media"}</span>
          </button>
          <span className="relative">
            <button type="button" className="c-herramienta" onClick={() => setEmojiDe(emojiDe === null ? enfocada : null)} aria-label="Emojis" title="Emojis" aria-expanded={emojiDe !== null}>
              <span className="material-symbols-outlined" aria-hidden="true">mood</span>
            </button>
            {emojiDe !== null && <SelectorEmoji onCerrar={() => setEmojiDe(null)} onElegir={(e) => ponerEmoji(emojiDe, e)} />}
          </span>
          {encuestas && !citando && (
            <button type="button" className="c-herramienta" aria-pressed={encuesta !== null} disabled={partes[0].adjuntos.length > 0} onClick={() => setEncuesta(encuesta ? null : { opciones: ["", ""], horas: 24 })} title="Encuesta" aria-label="Encuesta">
              <span className="material-symbols-outlined" aria-hidden="true">ballot</span>
            </button>
          )}
          {programar && (
            <button type="button" className="c-herramienta" aria-pressed={programarEn !== null} onClick={() => setProgramarEn(programarEn === null ? "" : null)} title="Programar" aria-label="Programar">
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
            </button>
          )}
          <span className="relative">
            <button type="button" className="c-herramienta" onClick={() => setMenuResponden(!menuResponden)} title={respondenActual.texto} aria-label={`Quién puede responder: ${respondenActual.texto}`} aria-expanded={menuResponden}>
              <span className="material-symbols-outlined" aria-hidden="true">{respondenActual.icono}</span>
            </button>
            {menuResponden && (
              <div className="c-menu !left-0 !right-auto" role="menu">
                {RESPONDEN.map((r) => (
                  <button key={r.id} type="button" role="menuitemradio" aria-checked={responden === r.id} onClick={() => { setResponden(r.id); setMenuResponden(false); }}>
                    <span className="material-symbols-outlined" aria-hidden="true">{r.icono}</span>{r.texto}{responden === r.id && <span className="material-symbols-outlined ml-auto text-primary" aria-hidden="true">check</span>}
                  </button>
                ))}
              </div>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hilos && !citando && (
            <button type="button" className="c-herramienta border border-white/10" disabled={partes.length > 15 || vacia(partes[partes.length - 1])} onClick={() => { setPartes([...partes, { texto: "", adjuntos: [] }]); setEnfocada(partes.length); }} title="Sumar otra publicación al hilo" aria-label="Sumar otra publicación al hilo">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
            </button>
          )}
          {onCancelar && <button type="button" className="c-boton-fantasma" onClick={onCancelar}>Cancelar</button>}
          <button type="button" className="c-boton" disabled={!puedePublicar} onClick={() => void publicar()}>
            {publicando ? "Publicando…" : programarEn ? "Programar" : partes.length > 1 ? "Publicar el hilo" : citando ? "Citar" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
