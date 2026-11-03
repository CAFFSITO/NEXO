// Pestaña «Colores» del Modo edición: la paleta de toda la escuela. Se puede
// sacar del logo (ColoresDesdeLogo) o ajustar color por color, y se ve en vivo
// en modo claro y oscuro. Como el resto del modo edición, va al borrador y se
// aplica a todos recién al guardar.

import { useState } from "react";
import { luminancia, oscurecerHasta, type PaletaBase } from "../../../servicios/color";
import { NOMBRES_COLORES, TEMA_BASE, type ColorDeTema, type Tema } from "../../../servicios/tema";
import ColoresDesdeLogo from "../shared/ColoresDesdeLogo";
import MuestraTema from "../shared/MuestraTema";

interface Props {
  tema: Tema;
  guardado: Tema;
  escuela: { nombre: string; icono: string };
  onCambiar: (cambio: Partial<PaletaBase>, clave?: string) => void;
}

const COLORES = NOMBRES_COLORES.map((c) => c.id);
const igualA = (a: Tema, b: Partial<Tema>) => COLORES.every((k) => a[k].toLowerCase() === String(b[k]).toLowerCase());
const soloColores = (t: Tema): PaletaBase => Object.fromEntries(COLORES.map((k) => [k, t[k]])) as unknown as PaletaBase;

export default function PanelColores({ tema, guardado, escuela, onCambiar }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  const deFabrica = igualA(tema, TEMA_BASE);
  const sinCambios = igualA(tema, guardado);

  const cambiarColor = (id: ColorDeTema, hex: string) => {
    if ((id === "fondo" || id === "superficie") && luminancia(hex) > 0.08) {
      setAviso(`«${NOMBRES_COLORES.find((c) => c.id === id)?.nombre}» tiene que ser oscuro para que los textos se lean: lo oscurecimos hasta el límite.`);
      onCambiar({ [id]: oscurecerHasta(hex, 0.06) }, `color-${id}`);
      return;
    }
    setAviso(null);
    onCambiar({ [id]: hex }, `color-${id}`);
  };

  return (
    <div className="@container"><div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <p className="max-w-3xl text-sm leading-relaxed text-on-surface-variant">
          Son los colores de toda la app, para todas las personas de la escuela. En modo claro NEXO ajusta cada tono para que se lea sobre
          blanco; el fondo y las tarjetas oscuras se usan en modo oscuro. Los cambios se aplican cuando guardás.
        </p>

        <ColoresDesdeLogo
          tema={tema}
          nombre={escuela.nombre}
          icono={escuela.icono}
          textoAplicado="Listo: la paleta quedó en el borrador. Guardá para aplicarla a toda la escuela."
          onAplicar={(p) => { setAviso(null); onCambiar(p); }}
        />

        <section className="e-panel @container p-5" aria-label="Ajustar los colores a mano">
          <h3 className="text-base font-semibold text-on-surface">Ajustar a mano</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Tocá un color para cambiarlo.</p>
          <ul className="mt-4 grid grid-cols-1 gap-2 @lg:grid-cols-2">
            {NOMBRES_COLORES.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-linea p-2.5 transition-colors hover:bg-white/5">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-linea" style={{ background: tema[c.id] }}>
                    <input type="color" value={tema[c.id]} onChange={(e) => cambiarColor(c.id, e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Color ${c.nombre}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-on-surface">{c.nombre}</span>
                    <span className="block text-[12.5px] leading-snug text-on-surface-variant">{c.uso}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-on-surface-variant">{tema[c.id]}</span>
                </label>
              </li>
            ))}
          </ul>
          {aviso && <p role="status" className="mt-3 text-[13px] text-on-surface-variant">{aviso}</p>}
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-3 @4xl:sticky @4xl:top-6" aria-label="Vista previa de los colores">
        <p className="e-subtitulo">Así se ve</p>
        <MuestraTema tema={tema} modo="claro" nombre={escuela.nombre} icono={escuela.icono} />
        <MuestraTema tema={tema} modo="oscuro" nombre={escuela.nombre} icono={escuela.icono} />
        <div className="flex flex-wrap gap-2">
          {!sinCambios && (
            <button type="button" className="nx-btn nx-btn-secundario" onClick={() => { setAviso(null); onCambiar(soloColores(guardado)); }}>
              <span className="material-symbols-outlined" aria-hidden="true">undo</span>Volver a los colores guardados
            </button>
          )}
          {!deFabrica && (
            <button type="button" className="nx-btn nx-btn-fantasma" onClick={() => { setAviso(null); onCambiar(soloColores(TEMA_BASE)); }}>
              <span className="material-symbols-outlined" aria-hidden="true">restart_alt</span>Usar los colores de NEXO
            </button>
          )}
        </div>
      </aside>
    </div></div>
  );
}
