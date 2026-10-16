// "Así lo ve": el menú lateral que tendría cada perfil con el borrador, con la
// paleta de la escuela, la pantalla por la que entra y lo que tiene oculto.
// Tocar un ítem del menú abre ese módulo en el editor.

import type { Borrador, Edicion } from "../../../servicios/edicion";
import { MenuDeMuestra } from "../maestro/VistaPreviaMenu";
import { limpiarModuloDePerfil, menuDeMuestra, moduloDeRuta, modulosResueltos, rutasDeModulo } from "./edicionUtil";
import Selector from "../shared/Selector";

interface Props {
  borrador: Borrador;
  edicion: Edicion;
  perfilClave: string;
  onPerfil: (clave: string) => void;
  elegido: string | null;
  onElegir: (moduloId: string) => void;
  onCambiar: (cambio: (b: Borrador) => void, clave?: string) => void;
}

export default function VistaPreviaEscuela({ borrador, edicion, perfilClave, onPerfil, elegido, onElegir, onCambiar }: Props) {
  const catalogo = edicion.catalogo.modulos;
  const perfil = borrador.perfiles.find((p) => p.clave === perfilClave) ?? borrador.perfiles[0];
  const grupos = menuDeMuestra(borrador, catalogo, perfil);
  const modulos = modulosResueltos(borrador, catalogo, perfil);
  const ocultos = modulos.filter((m) => !m.visible);
  const conOrdenPropio = Object.values(perfil.modulos).some((m) => m.orden !== undefined);
  const nombre = (id: string) => borrador.modulos[id]?.etiqueta || catalogo.find((m) => m.id === id)?.nombre || id;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-6" aria-label="Vista previa del menú">
      <p className="e-subtitulo">Así lo ve</p>
      <Selector className="e-input" value={perfil.clave} onChange={(e) => onPerfil(e.target.value)} aria-label="Perfil de la vista previa">
        {borrador.perfiles.map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
      </Selector>
      <MenuDeMuestra
        tema={edicion.tema}
        nombre={edicion.escuela.nombre}
        icono={edicion.escuela.icono}
        grupos={grupos}
        perfil={perfil}
        alto={420}
        resaltadas={elegido ? rutasDeModulo(grupos, catalogo, elegido) : []}
        onElegir={(ruta) => { const m = moduloDeRuta(catalogo, ruta); if (m) onElegir(m.id); }}
      />

      <label className="flex w-[228px] flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-on-surface-variant/70">Entra por</span>
        <Selector
          className="e-input !text-[13px]"
          value={perfil.inicio}
          onChange={(e) => { const v = e.target.value; onCambiar((b) => { const p = b.perfiles.find((x) => x.clave === perfil.clave); if (p) p.inicio = v; }); }}
        >
          <option value="">Su pantalla habitual</option>
          {modulos.filter((m) => !m.modulo.padre).map((m) => (
            <option key={m.modulo.id} value={m.modulo.id}>{nombre(m.modulo.id)}{m.visible ? "" : " (oculto)"}</option>
          ))}
        </Selector>
      </label>

      {conOrdenPropio && (
        <div className="w-[228px] rounded-xl bg-white/5 p-3 text-[11px] text-on-surface-variant/70">
          El Maestro le dio a este perfil un orden propio, así que no sigue tu jerarquía.
          <button
            type="button"
            className="mt-2 block font-semibold text-primary hover:underline"
            onClick={() => onCambiar((b) => {
              const p = b.perfiles.find((x) => x.clave === perfil.clave);
              if (!p) return;
              for (const id of Object.keys(p.modulos)) { delete p.modulos[id].orden; limpiarModuloDePerfil(p.modulos, id); }
            })}
          >
            Usar el orden de la escuela
          </button>
        </div>
      )}

      {ocultos.length > 0 && (
        <div className="w-[228px]">
          <p className="mb-1.5 text-[11px] font-semibold text-on-surface-variant/60">Oculto para {perfil.nombre} ({ocultos.length})</p>
          <div className="flex flex-wrap gap-1">
            {ocultos.map((m) => (
              <button key={m.modulo.id} type="button" className="e-chip e-chip-boton !text-[10.5px]" onClick={() => onElegir(m.modulo.id)} title={m.ocultoEn === "institucion" ? "Oculto para toda la escuela" : m.ocultoEn === "perfil" ? "Oculto para este perfil" : "Oculto por su módulo padre"}>
                <span className="material-symbols-outlined" aria-hidden="true">visibility_off</span>{nombre(m.modulo.id)}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
