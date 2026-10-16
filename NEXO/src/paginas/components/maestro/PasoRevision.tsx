// Paso «Revisión»: todo lo que va a quedar, antes del botón final. El servidor
// calcula los totales y la combinatoria y avisa si algo impediría guardar; acá
// se suma una vista previa del menú de cada perfil.

import { useEffect, useState } from "react";
import { resumirGenoma, type Catalogo, type Genoma, type ResumenGenoma } from "../../../servicios/maestro";
import { advertencias, potenciaDeDiez } from "./genomaUtil";
import VistaPreviaMenu from "./VistaPreviaMenu";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  modo: "crear" | "editar";
  /** Lo que falta completar para poder forjar (vacío = listo). */
  faltantes: string[];
  nota: string;
  onNota: (nota: string) => void;
  onFinal: () => void;
  ocupado: boolean;
}

export default function PasoRevision({ genoma, catalogo, modo, faltantes, nota, onNota, onFinal, ocupado }: Props) {
  const [resumen, setResumen] = useState<{ clave: string; datos: ResumenGenoma; error: string | null } | null>(null);
  const clave = JSON.stringify(genoma);

  useEffect(() => {
    let vigente = true;
    const t = window.setTimeout(() => {
      resumirGenoma(JSON.parse(clave))
        .then((r) => { if (vigente) setResumen({ clave, datos: r.resumen, error: r.error }); })
        .catch(() => {});
    }, 250);
    return () => { vigente = false; window.clearTimeout(t); };
  }, [clave]);

  const r = resumen?.clave === clave ? resumen : null;
  const avisos = advertencias(genoma, catalogo);
  const bloqueos = [...faltantes, ...(r?.error ? [r.error] : [])];
  const cifras = r ? [
    { n: r.datos.modulosVisibles, de: catalogo.modulos.length, texto: "módulos visibles", icono: "widgets" },
    { n: r.datos.funcionesApagadas, texto: "funciones apagadas", icono: "toggle_off" },
    { n: r.datos.perfiles, texto: `perfiles (${r.datos.perfilesPropios} propios)`, icono: "groups" },
    { n: r.datos.algoritmosPersonalizados, texto: "algoritmos personalizados", icono: "account_tree" },
    { n: r.datos.algoritmosApagados, texto: "algoritmos apagados", icono: "power_settings_new" },
    { n: r.datos.flujosActivos, de: r.datos.flujos, texto: "flujos activos", icono: "bolt" },
  ] : [];

  return (
    <div className="flex flex-col gap-8">
      <section className="m-cristal p-8 relative overflow-hidden m-aparecer" style={{ boxShadow: `0 50px 140px -60px ${genoma.tema.acento}` }}>
        <span aria-hidden="true" className="absolute -top-32 -right-20 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: genoma.tema.acento }} />
        <div className="relative flex flex-wrap items-center gap-8">
          <span className="material-symbols-outlined text-7xl" style={{ color: genoma.tema.acento, textShadow: `0 0 50px ${genoma.tema.acento}` }} aria-hidden="true">{genoma.identidad.icono}</span>
          <div className="flex-1 min-w-[260px]">
            <p className="m-eyebrow">Revisión final</p>
            <h2 className="m-titulo text-4xl mt-2 break-words">{genoma.identidad.nombre || "Sin nombre todavía"}</h2>
            {genoma.identidad.lema && <p className="text-[color:var(--m-suave)] mt-1 italic">{genoma.identidad.lema}</p>}
            {r && (
              <p className="mt-4 text-sm text-[color:var(--m-suave)]">
                Este NEXO es uno entre <span className="m-titulo text-2xl m-degradado-texto">{potenciaDeDiez(r.datos.combinatoria.exponente)}</span> combinaciones discretas posibles.
              </p>
            )}
          </div>
        </div>
      </section>

      {r && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 m-escalonado">
          {cifras.map((c) => (
            <div key={c.texto} className="m-cristal p-5 flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl text-[color:var(--m-cian)]" aria-hidden="true">{c.icono}</span>
              <div>
                <p className="m-titulo text-3xl tabular-nums">{c.n}{c.de !== undefined && <span className="text-lg text-[color:var(--m-tenue)]"> / {c.de}</span>}</p>
                <p className="text-xs text-[color:var(--m-suave)]">{c.texto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {bloqueos.length > 0 && (
        <div className="flex flex-col gap-2">
          {bloqueos.map((b) => (
            <div key={b} className="m-aviso error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">block</span>{b}</div>
          ))}
        </div>
      )}
      {avisos.length > 0 && (
        <div className="flex flex-col gap-2">
          {avisos.map((a) => (
            <div key={a} className="m-aviso info"><span className="material-symbols-outlined" aria-hidden="true">info</span>{a}</div>
          ))}
        </div>
      )}

      <section className="m-aparecer">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-3">Cómo lo ve cada perfil</p>
        <div className="flex gap-4 overflow-x-auto pb-4 m-scroll">
          {genoma.perfiles.map((p) => <VistaPreviaMenu key={p.clave} genoma={genoma} catalogo={catalogo} perfil={p} alto={360} />)}
        </div>
      </section>

      <section className="m-cristal p-6 flex flex-wrap items-end gap-4 m-aparecer">
        {modo === "editar" && (
          <label className="m-campo flex-1 min-w-[240px]">
            <span>Nota de esta versión</span>
            <input className="m-input" value={nota} maxLength={200} placeholder="Qué cambió y por qué" onChange={(e) => onNota(e.target.value)} />
          </label>
        )}
        {modo === "crear" && (
          <p className="flex-1 min-w-[240px] text-sm text-[color:var(--m-suave)] leading-relaxed">
            Al forjar se crea la escuela, su genoma, la cuenta de la dirección y —si lo pediste— una cuenta semilla por
            perfil. Las contraseñas aparecen una sola vez, al final de la película.
          </p>
        )}
        <button type="button" className="m-boton text-base px-8 py-4" onClick={onFinal} disabled={ocupado || bloqueos.length > 0}>
          <span className={`material-symbols-outlined ${ocupado ? "animate-spin" : ""}`} aria-hidden="true">{ocupado ? "progress_activity" : modo === "crear" ? "local_fire_department" : "save"}</span>
          {modo === "crear" ? "Forjar la instancia" : ocupado ? "Guardando…" : "Guardar nueva versión"}
        </button>
      </section>
    </div>
  );
}
