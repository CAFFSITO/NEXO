// El menú lateral que vería un perfil, pintado con la paleta de la instancia
// (las mismas variables CSS que usa la aplicación real, aplicadas solo a esta
// cajita). Sirve para ver el efecto de cada decisión antes de forjar, y lo usa
// también el modo edición de la dirección.

import type { Catalogo, Genoma, PerfilGenoma } from "../../../servicios/maestro";
import { estiloDeTema, type Tema } from "../../../servicios/tema";
import { agruparMenu, type GrupoMenu } from "../shared/navegacionItems";
import { menuDePerfil } from "./genomaUtil";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  perfil: PerfilGenoma;
  alto?: number;
}

export default function VistaPreviaMenu({ genoma, catalogo, perfil, alto = 380 }: Props) {
  const grupos = agruparMenu(menuDePerfil(genoma, catalogo, perfil), genoma.secciones ?? []);
  return (
    <MenuDeMuestra
      tema={genoma.tema}
      nombre={genoma.identidad.nombre || "Tu instancia"}
      icono={genoma.identidad.icono}
      grupos={grupos}
      perfil={perfil}
      alto={alto}
    />
  );
}

interface PropsMuestra {
  tema: Tema;
  nombre: string;
  icono: string;
  grupos: GrupoMenu[];
  perfil: Pick<PerfilGenoma, "nombre" | "color" | "icono">;
  alto?: number;
  /** Rutas a destacar (la del módulo que se está editando). */
  resaltadas?: string[];
  onElegir?: (ruta: string) => void;
}

export function MenuDeMuestra({ tema, nombre, icono, grupos, perfil, alto = 380, resaltadas = [], onElegir }: PropsMuestra) {
  const primera = grupos[0]?.items[0]?.ruta;
  return (
    <div style={estiloDeTema(tema)} className="w-[228px] shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
      <div className="flex flex-col p-4" style={{ minHeight: alto, background: "var(--nexo-sidebar)" }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined rounded-lg p-1.5 text-lg" style={{ color: "var(--nexo-acento)", background: "color-mix(in srgb, var(--nexo-acento) 14%, transparent)" }} aria-hidden="true">
            {icono || "hub"}
          </span>
          <span className="font-headline text-xl font-extrabold tracking-tight" style={{ color: "var(--nexo-texto)" }}>
            nexo<span style={{ color: "var(--nexo-acento)" }}>.</span>
          </span>
        </div>
        <p className="mt-2 truncate text-[7.5px] font-semibold tracking-[0.18em]" style={{ color: "var(--nexo-texto-suave)", opacity: 0.6 }}>{nombre.toUpperCase()}</p>
        <div className="mt-2 flex flex-col">
          {grupos.length === 0 && <p className="mt-3 text-[11px] italic" style={{ color: "var(--nexo-texto-suave)" }}>Sin módulos visibles</p>}
          {grupos.map((grupo) => (
            <div key={grupo.id || "base"}>
              <p className="mt-3 mb-1.5 flex items-center gap-1 px-1 text-[7.5px] font-semibold tracking-[0.18em]" style={{ color: "var(--nexo-texto-suave)", opacity: 0.6 }}>
                {grupo.id && grupo.icono && <span className="material-symbols-outlined text-[10px]" style={{ color: "var(--nexo-acento)" }} aria-hidden="true">{grupo.icono}</span>}
                {grupo.nombre.toUpperCase()}
              </p>
              <div className="flex flex-col gap-1">
                {grupo.items.map((it) => {
                  const activo = it.ruta === primera;
                  const resaltado = resaltadas.includes(it.ruta);
                  const Etiqueta = onElegir ? "button" : "div";
                  return (
                    <Etiqueta
                      key={it.ruta}
                      {...(onElegir ? { type: "button" as const, onClick: () => onElegir(it.ruta) } : {})}
                      className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] font-medium transition ${resaltado ? "e-muestra-resaltada" : ""}`}
                      style={{
                        borderRadius: "calc(var(--nexo-radio) * 0.75)",
                        color: activo || resaltado ? "var(--nexo-primario)" : "var(--nexo-texto-suave)",
                        background: activo ? "color-mix(in srgb, var(--nexo-acento) 15%, transparent)" : "transparent",
                        border: `1px solid ${activo ? "color-mix(in srgb, var(--nexo-acento) 30%, transparent)" : "transparent"}`,
                      }}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">{it.icono}</span>
                      <span className="truncate">{it.label}</span>
                    </Etiqueta>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t pt-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <span className="grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold" style={{ background: perfil.color + "33", color: perfil.color, boxShadow: `0 0 0 2px ${perfil.color}` }}>
            <span className="material-symbols-outlined text-sm" aria-hidden="true">{perfil.icono || "person"}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold" style={{ color: "var(--nexo-texto)" }}>Persona de ejemplo</p>
            <p className="flex items-center gap-1 truncate text-[10px]" style={{ color: "var(--nexo-texto-suave)" }}>
              <span className="nexo-perfil-punto" style={{ background: perfil.color }} aria-hidden="true" />
              {perfil.nombre}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
