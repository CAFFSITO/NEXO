// Paso «Módulos»: el esqueleto de la instancia. Cada módulo se puede ocultar
// (nunca eliminar: la dirección puede volver a mostrarlo), reordenar arrastrando
// o con las flechas, renombrar, cambiarle el ícono y apagarle funciones con el
// checklist. Lo que se apaga acá vale para toda la escuela; en «Perfiles» se
// esculpe cada perfil por separado.

import { useState } from "react";
import type { Catalogo, Genoma } from "../../../servicios/maestro";
import { ROL_LABELS, type Rol } from "../shared/roles";
import { clonar, idsPorOrden, mover, ordenarInstancia } from "./genomaUtil";
import SelectorIcono from "./SelectorIcono";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  onCambiar: (genoma: Genoma) => void;
}

export default function PasoModulos({ genoma, catalogo, onCambiar }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const ids = idsPorOrden(genoma, catalogo);
  const visibles = ids.filter((id) => !genoma.modulos[id].oculto).length;

  const editar = (id: string, cambio: (m: Genoma["modulos"][string]) => void) => {
    const g = clonar(genoma);
    cambio(g.modulos[id]);
    onCambiar(g);
  };

  const reordenar = (desde: number, hasta: number) => onCambiar(ordenarInstancia(genoma, mover(ids, desde, hasta)));

  const todos = (oculto: boolean) => {
    const g = clonar(genoma);
    for (const id of ids) g.modulos[id].oculto = oculto;
    onCambiar(g);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 m-aparecer">
        <div>
          <p className="m-eyebrow">Módulos</p>
          <h2 className="m-titulo text-3xl mt-3">El esqueleto de la instancia</h2>
          <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-2xl leading-relaxed">
            {visibles} de {ids.length} módulos a la vista. Arrastrá para cambiar el orden del menú. Los módulos no se eliminan:
            se ocultan, y la dirección de la escuela puede volver a mostrarlos.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => todos(false)}><span className="material-symbols-outlined" aria-hidden="true">visibility</span>Mostrar todos</button>
          <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => onCambiar(ordenarInstancia(genoma, catalogo.modulos.map((m) => m.id)))}><span className="material-symbols-outlined" aria-hidden="true">restart_alt</span>Orden original</button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {ids.map((id, indice) => {
          const m = catalogo.modulos.find((x) => x.id === id)!;
          const g = genoma.modulos[id];
          const padreOculto = m.padre ? genoma.modulos[m.padre]?.oculto : false;
          const apagadas = Object.keys(g.funciones).length;
          return (
            <div
              key={id}
              className={`m-modulo m-cristal ${g.oculto || padreOculto ? "is-oculto" : ""} ${arrastrando === id ? "is-arrastrando" : ""} ${destino === id && arrastrando !== id ? "is-destino" : ""}`}
              draggable
              onDragStart={(e) => { setArrastrando(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }}
              onDragOver={(e) => { e.preventDefault(); if (destino !== id) setDestino(id); }}
              onDragLeave={() => setDestino((d) => (d === id ? null : d))}
              onDrop={(e) => { e.preventDefault(); if (arrastrando) reordenar(ids.indexOf(arrastrando), indice); setArrastrando(null); setDestino(null); }}
              onDragEnd={() => { setArrastrando(null); setDestino(null); }}
            >
              <div className="flex flex-wrap items-center gap-3 p-3 pr-4">
                <span className="material-symbols-outlined m-asa" aria-hidden="true">drag_indicator</span>
                <span className="text-xs tabular-nums text-[color:var(--m-tenue)] w-5 text-right">{indice + 1}</span>
                <span className="m-modulo-icono" style={{ background: m.color + "26", color: m.color, boxShadow: g.oculto ? "none" : `0 0 24px ${m.color}40` }}>
                  <span className="material-symbols-outlined" aria-hidden="true">{g.icono || m.icono}</span>
                </span>
                <div className="min-w-[180px] flex-1">
                  <input
                    className="m-nombre-editable w-full bg-transparent font-headline font-bold text-[15px] outline-none border-b border-transparent focus:border-[color:var(--m-cian)]"
                    value={g.etiqueta}
                    placeholder={m.nombre}
                    maxLength={40}
                    onChange={(e) => editar(id, (x) => { x.etiqueta = e.target.value; })}
                    aria-label={`Nombre del módulo ${m.nombre}`}
                  />
                  <p className="text-[11px] text-[color:var(--m-tenue)] mt-0.5 truncate">
                    {m.padre ? `Dentro de ${catalogo.modulos.find((x) => x.id === m.padre)?.nombre} · ` : ""}{m.descripcion}
                  </p>
                </div>
                <div className="hidden lg:flex gap-1">
                  {m.arquetipos.map((a) => {
                    const arq = catalogo.arquetipos.find((x) => x.id === a);
                    return <span key={a} className="nexo-perfil-punto" style={{ background: arq?.color }} title={ROL_LABELS[a as Rol] ?? a} />;
                  })}
                </div>
                {m.funciones.length > 0 && (
                  <button type="button" className="m-chip" onClick={() => setAbierto(abierto === id ? null : id)} aria-expanded={abierto === id}>
                    <span className="material-symbols-outlined" aria-hidden="true">checklist</span>
                    {m.funciones.length - apagadas}/{m.funciones.length}
                  </button>
                )}
                <SelectorIcono valor={g.icono} porDefecto={m.icono} onCambiar={(icono) => editar(id, (x) => { x.icono = icono; })} etiqueta={`Ícono de ${m.nombre}`} />
                <div className="flex flex-col">
                  <button type="button" className="m-icono-boton h-5" onClick={() => reordenar(indice, indice - 1)} disabled={indice === 0} aria-label={`Subir ${m.nombre}`}><span className="material-symbols-outlined">expand_less</span></button>
                  <button type="button" className="m-icono-boton h-5" onClick={() => reordenar(indice, indice + 1)} disabled={indice === ids.length - 1} aria-label={`Bajar ${m.nombre}`}><span className="material-symbols-outlined">expand_more</span></button>
                </div>
                <button
                  type="button"
                  className="m-interruptor"
                  role="switch"
                  aria-checked={!g.oculto}
                  aria-label={`${g.oculto ? "Mostrar" : "Ocultar"} ${m.nombre}`}
                  title={g.oculto ? "Oculto (la dirección puede mostrarlo)" : "Visible"}
                  onClick={() => editar(id, (x) => { x.oculto = !x.oculto; })}
                />
              </div>
              {padreOculto && !g.oculto && (
                <p className="px-14 pb-3 text-[11px] text-[color:var(--m-oro)]">No se ve porque su módulo padre está oculto.</p>
              )}
              {abierto === id && (
                <div className="border-t border-white/10 p-4 pl-14 grid gap-2 md:grid-cols-2 m-aparecer">
                  {m.funciones.map((f) => {
                    const activa = g.funciones[f.id] !== false;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5 transition"
                        onClick={() => editar(id, (x) => { if (activa) x.funciones[f.id] = false; else delete x.funciones[f.id]; })}
                        role="checkbox"
                        aria-checked={activa}
                      >
                        <span className="m-casilla" aria-checked={activa} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{f.nombre}</span>
                          <span className="block text-[11px] text-[color:var(--m-tenue)] truncate">{f.arquetipos.map((a) => ROL_LABELS[a as Rol] ?? a).join(" · ")}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
