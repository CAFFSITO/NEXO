// Antes de guardar: el servidor lista exactamente qué cambia y qué conviene
// mirar (un perfil que se queda sin módulos, algo que la propia dirección deja
// de ver…). Se puede dejar una nota para el historial. Si alguien guardó en el
// medio, se elige entre traer su versión o guardar estos cambios encima.

import { useEffect, useState } from "react";
import { ErrorDeApi, pedir } from "../../../servicios/api";
import { guardarEdicion, revisarEdicion, type Borrador, type Cambio, type Edicion } from "../../../servicios/edicion";

interface Props {
  borrador: Borrador;
  version: number;
  onCerrar: () => void;
  onGuardado: (respuesta: { version: number; cambios: Cambio[]; edicion: Edicion }) => void;
  onTraerNueva: () => void;
}

export default function DialogoGuardar({ borrador, version, onCerrar, onGuardado, onTraerNueva }: Props) {
  const [revision, setRevision] = useState<{ cambios: Cambio[]; advertencias: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    revisarEdicion(borrador)
      .then((r) => { if (vigente) setRevision(r); })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : "No se pudo revisar el borrador."); });
    return () => { vigente = false; };
  }, [borrador]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [guardando, onCerrar]);

  const guardar = async (sobre: number) => {
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await guardarEdicion(sobre, nota.trim(), borrador));
    } catch (e) {
      if (e instanceof ErrorDeApi && e.estado === 409) setConflicto(true);
      else setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  const guardarEncima = async () => {
    setGuardando(true);
    try {
      const actual = await pedir<Edicion>("/api/instancia/edicion");
      setConflicto(false);
      await guardar(actual.version);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  return (
    <div className="e-velo" onClick={() => { if (!guardando) onCerrar(); }}>
      <div className="e-dialogo" role="dialog" aria-modal="true" aria-labelledby="e-guardar-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start gap-4 border-b border-white/5 p-6">
          <span className="e-modulo-icono !h-12 !w-12 !rounded-2xl bg-acento/20 text-primary" aria-hidden="true"><span className="material-symbols-outlined">fact_check</span></span>
          <div className="min-w-0 flex-1">
            <h2 id="e-guardar-titulo" className="font-headline text-xl font-bold text-white">Revisá antes de guardar</h2>
            <p className="mt-1 text-xs text-on-surface-variant/65">Se guarda como la versión {version + 1} de tu instancia, firmada por la dirección. Todo el mundo lo ve al instante.</p>
          </div>
          <button type="button" className="e-icono-boton" onClick={onCerrar} disabled={guardando} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="flex flex-col gap-5 p-6">
          {!revision && !error && (
            <p className="flex items-center gap-2 text-sm text-on-surface-variant/70">
              <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">progress_activity</span>
              Revisando los cambios…
            </p>
          )}

          {revision && (
            <>
              <section>
                <p className="e-subtitulo mb-2">{revision.cambios.length} {revision.cambios.length === 1 ? "cambio" : "cambios"}</p>
                <ul className="flex flex-col gap-1.5">
                  {revision.cambios.map((c, i) => (
                    <li key={i} className="e-ranking-item !grid-cols-[28px_minmax(0,1fr)]" style={{ animationDelay: `${i * 30}ms` }}>
                      <span className="material-symbols-outlined text-lg text-acento" aria-hidden="true">{c.icono}</span>
                      <span className="text-[13px] text-white">{c.texto}</span>
                    </li>
                  ))}
                </ul>
              </section>
              {revision.advertencias.length > 0 && (
                <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">warning</span>Para tener en cuenta
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-[12.5px] text-amber-100/85">
                    {revision.advertencias.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </section>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-on-surface-variant/70">Nota para el historial (opcional)</span>
                <input className="e-input" value={nota} maxLength={120} placeholder="Por ejemplo: menú más simple para primer año" onChange={(e) => setNota(e.target.value)} />
              </label>
            </>
          )}

          {conflicto && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
              <p className="font-semibold">Alguien guardó cambios mientras editabas.</p>
              <p className="mt-1 text-[12.5px] text-rose-100/80">Podés traer su versión (y descartar la tuya) o guardar tus cambios encima de la suya.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="e-boton-fantasma e-boton-chico" onClick={onTraerNueva} disabled={guardando}>
                  <span className="material-symbols-outlined" aria-hidden="true">sync</span>Traer la versión nueva
                </button>
                <button type="button" className="e-boton-fantasma e-boton-chico" onClick={() => void guardarEncima()} disabled={guardando}>
                  <span className="material-symbols-outlined" aria-hidden="true">publish</span>Guardar mis cambios encima
                </button>
              </div>
            </div>
          )}
          {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p>}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-white/5 p-5">
          <button type="button" className="e-boton-fantasma" onClick={onCerrar} disabled={guardando}>Seguir editando</button>
          <button type="button" className="e-boton" onClick={() => void guardar(version)} disabled={!revision || guardando || conflicto || revision.cambios.length === 0}>
            <span className={`material-symbols-outlined ${guardando ? "animate-spin" : ""}`} aria-hidden="true">{guardando ? "progress_activity" : "rocket_launch"}</span>
            {guardando ? "Guardando…" : "Guardar y aplicar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
