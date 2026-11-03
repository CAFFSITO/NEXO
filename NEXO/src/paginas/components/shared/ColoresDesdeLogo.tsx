// Tirar el logo de la escuela y que NEXO elija los colores de toda la app.
// Se arrastra, se pega (Ctrl+V) o se elige una imagen; se analiza en el
// navegador (servicios/paletaImagen.ts) y se muestra la paleta propuesta con una
// vista previa en modo claro y oscuro antes de aplicarla. Lo usan la Forja del
// Maestro (al crear la escuela) y el Modo edición de la dirección.

import { useEffect, useRef, useState } from "react";
import type { PaletaBase } from "../../../servicios/color";
import { paletaDesdeImagen, type ResultadoLogo } from "../../../servicios/paletaImagen";
import { NOMBRES_COLORES, TEMA_BASE, type Tema } from "../../../servicios/tema";
import MuestraTema from "./MuestraTema";

interface Props {
  onAplicar: (p: PaletaBase) => void;
  descripcion?: string;
  /** "maestro": con el lenguaje visual del Estudio del Maestro (siempre oscuro). */
  variante?: "app" | "maestro";
  /** Lo que se dice después de aplicar. */
  textoAplicado?: string;
  /** El tema actual: la vista previa conserva su redondez y su movimiento. */
  tema?: Tema;
  nombre?: string;
  icono?: string;
}

export default function ColoresDesdeLogo({ onAplicar, descripcion, variante = "app", textoAplicado = "Listo: la paleta quedó aplicada.", tema = TEMA_BASE, nombre, icono }: Props) {
  const maestro = variante === "maestro";
  const [resultado, setResultado] = useState<ResultadoLogo | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [aplicado, setAplicado] = useState(false);
  const elegir = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const analizar = async (archivo: File | Blob | undefined | null) => {
    if (!archivo) return;
    if (archivo.type && !archivo.type.startsWith("image/")) { setError("Eso no es una imagen. Probá con el logo en PNG, JPG, WebP o SVG."); return; }
    setAnalizando(true); setError(""); setAplicado(false);
    try {
      const r = await paletaDesdeImagen(archivo);
      setResultado(r);
      setVista(URL.createObjectURL(archivo));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo analizar la imagen."); setResultado(null); }
    finally { setAnalizando(false); }
  };

  return (
    <section className={`@container ${maestro ? "m-cristal p-6 m-aparecer" : "nx-tarjeta p-5"}`} aria-label="Colores desde el logo">
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-on-surface"><span className="material-symbols-outlined text-primary" aria-hidden="true">auto_awesome</span>Colores desde el logo</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{descripcion ?? "Subí el logo de la escuela y NEXO arma la paleta de toda la app con sus colores. Vas a ver cómo queda antes de aplicarla."}</p>
      </div>

      <div
        role="button" tabIndex={0} aria-label="Elegir o soltar una imagen del logo"
        onClick={() => elegir.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); void analizar(e.dataTransfer.files?.[0]); }}
        onPaste={(e) => { const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/")); if (item) { e.preventDefault(); void analizar(item.getAsFile()); } }}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors ${arrastrando ? "border-acento bg-primary/5" : "border-outline-variant hover:border-acento hover:bg-white/5"}`}
      >
        {vista
          ? <img src={vista} alt="Logo analizado" className="h-16 w-16 shrink-0 rounded-md bg-blanco object-contain p-1" />
          : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-surface-container-high text-on-surface-variant" aria-hidden="true"><span className="material-symbols-outlined" style={{ fontSize: 30 }}>{analizando ? "progress_activity" : "upload"}</span></span>}
        <span className="min-w-0">
          <span className="block font-medium text-on-surface">{analizando ? "Analizando los colores…" : vista ? "Elegir otra imagen" : "Arrastrá el logo acá"}</span>
          <span className="block text-[13px] text-on-surface-variant">o tocá para elegirlo · también podés pegarlo con Ctrl + V · PNG, JPG, WebP o SVG</span>
        </span>
        <input ref={elegir} type="file" accept="image/*" hidden onChange={(e) => { void analizar(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}

      {resultado && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Colores que encontramos en la imagen</p>
            <div className="flex flex-wrap gap-1.5">{resultado.muestras.map((c) => <span key={c} title={c} className="h-7 w-7 rounded-md border border-linea" style={{ background: c }} />)}</div>
            {resultado.monocromo && <p className="mt-2 text-[13px] text-on-surface-variant">El logo casi no tiene colores (es blanco y negro o en grises): te proponemos una paleta sobria en azul grisáceo.</p>}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Paleta propuesta</p>
            <ul className="grid grid-cols-3 gap-2 @lg:grid-cols-6">
              {NOMBRES_COLORES.map((n) => (
                <li key={n.id} className="flex flex-col items-center gap-1 text-center">
                  <span className="h-9 w-full rounded-md border border-linea" style={{ background: resultado.paleta[n.id] }} />
                  <span className="text-[11.5px] leading-tight text-on-surface-variant">{n.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Así quedaría</p>
            <div className="flex flex-col gap-2 @2xl:flex-row">
              <MuestraTema tema={{ ...tema, ...resultado.paleta }} modo="claro" nombre={nombre} icono={icono} />
              <MuestraTema tema={{ ...tema, ...resultado.paleta }} modo="oscuro" nombre={nombre} icono={icono} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={maestro ? "m-boton" : "nx-btn nx-btn-primario"} onClick={() => { onAplicar(resultado.paleta); setAplicado(true); }}>
              <span className="material-symbols-outlined" aria-hidden="true">format_paint</span>Aplicar estos colores
            </button>
            {aplicado && <span role="status" className="text-sm text-on-surface-variant">{textoAplicado}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
