// La JERARQUÍA de la instancia: secciones del menú → módulos → submódulos.
// Se arrastra un módulo a otra sección o a otro lugar (o se usan las flechas),
// se crean, renombran, ordenan y quitan secciones, y con el ojo se oculta o se
// vuelve a mostrar un módulo para toda la escuela. Nada se borra: un módulo
// oculto sigue acá, tachado, esperando que lo vuelvan a mostrar.

import { useState, type DragEvent, type ReactNode } from "react";
import type { Borrador } from "../../../servicios/edicion";
import type { ModuloCatalogo } from "../../../servicios/maestro";
import { aplicarJerarquia, idDeSeccion, jerarquia, moverModulo, type GrupoJerarquia } from "./edicionUtil";
import { SelectorIcono } from "./controles";

const MAX_SECCIONES = 12;

interface Props {
  borrador: Borrador;
  catalogo: ModuloCatalogo[];
  elegido: string | null;
  onElegir: (id: string) => void;
  onCambiar: (cambio: (b: Borrador) => void, clave?: string) => void;
}

export default function ArbolJerarquia({ borrador, catalogo, elegido, onElegir, onCambiar }: Props) {
  const grupos = jerarquia(borrador, catalogo);
  const porId = new Map(catalogo.map((m) => [m.id, m]));
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [destino, setDestino] = useState<{ grupo: string; indice: number } | null>(null);
  const [recienCreada, setRecienCreada] = useState<string | null>(null);

  const mover = (id: string, grupo: string, indice: number) => {
    onCambiar((b) => aplicarJerarquia(b, moverModulo(jerarquia(b, catalogo), id, grupo, indice), catalogo));
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = arrastrando ?? e.dataTransfer.getData("text/plain");
    if (id && destino && porId.has(id)) mover(id, destino.grupo, destino.indice);
    setArrastrando(null);
    setDestino(null);
  };

  const agregarSeccion = () => {
    const id = idDeSeccion("nueva-seccion", borrador.secciones);
    onCambiar((b) => { b.secciones.push({ id, nombre: "Nueva sección", icono: "folder" }); });
    setRecienCreada(id);
  };

  const moverSeccion = (indice: number, hacia: number) => {
    onCambiar((b) => {
      const [s] = b.secciones.splice(indice, 1);
      b.secciones.splice(hacia, 0, s);
    });
  };

  const quitarSeccion = (id: string) => {
    onCambiar((b) => {
      b.secciones = b.secciones.filter((s) => s.id !== id);
      for (const m of Object.values(b.modulos)) if (m.seccion === id) m.seccion = "";
    });
  };

  return (
    <div className="flex flex-col gap-3" onDragEnd={() => { setArrastrando(null); setDestino(null); }}>
      {grupos.map((g, gi) => (
        <Grupo
          key={g.seccion.id || "base"}
          grupo={g}
          indice={gi - 1}
          totalSecciones={borrador.secciones.length}
          autoFoco={recienCreada === g.seccion.id}
          destino={destino?.grupo === g.seccion.id ? destino.indice : null}
          onArrastrarSobre={(indice) => setDestino({ grupo: g.seccion.id, indice })}
          onSoltar={soltar}
          onRenombrar={(nombre) => onCambiar((b) => { const s = b.secciones.find((x) => x.id === g.seccion.id); if (s) s.nombre = nombre; }, "seccion-nombre:" + g.seccion.id)}
          onIcono={(icono) => onCambiar((b) => { const s = b.secciones.find((x) => x.id === g.seccion.id); if (s) s.icono = icono; })}
          onSubir={() => moverSeccion(gi - 1, gi - 2)}
          onBajar={() => moverSeccion(gi - 1, gi)}
          onQuitar={() => quitarSeccion(g.seccion.id)}
        >
          {g.ids.map((id, i) => {
            const m = porId.get(id)!;
            const hijos = catalogo.filter((h) => h.padre === id);
            return (
              <div key={id}>
                <FilaModulo
                  modulo={m}
                  borrador={borrador}
                  elegido={elegido === id}
                  arrastrada={arrastrando === id}
                  soltarAntes={destino?.grupo === g.seccion.id && destino.indice === i && arrastrando !== id}
                  onElegir={() => onElegir(id)}
                  onOcultar={() => onCambiar((b) => { b.modulos[id].oculto = !b.modulos[id].oculto; })}
                  onSubir={i > 0 ? () => mover(id, g.seccion.id, i - 1) : gi > 0 ? () => mover(id, grupos[gi - 1].seccion.id, grupos[gi - 1].ids.length) : undefined}
                  onBajar={i < g.ids.length - 1 ? () => mover(id, g.seccion.id, i + 2) : gi < grupos.length - 1 ? () => mover(id, grupos[gi + 1].seccion.id, 0) : undefined}
                  arrastre={{
                    draggable: true,
                    onDragStart: (e) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; setArrastrando(id); },
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const caja = e.currentTarget.getBoundingClientRect();
                      setDestino({ grupo: g.seccion.id, indice: e.clientY < caja.top + caja.height / 2 ? i : i + 1 });
                    },
                    onDrop: soltar,
                  }}
                />
                {hijos.map((h) => (
                  <FilaModulo
                    key={h.id}
                    modulo={h}
                    borrador={borrador}
                    hija
                    elegido={elegido === h.id}
                    padreOculto={borrador.modulos[id].oculto}
                    onElegir={() => onElegir(h.id)}
                    onOcultar={() => onCambiar((b) => { b.modulos[h.id].oculto = !b.modulos[h.id].oculto; })}
                  />
                ))}
              </div>
            );
          })}
        </Grupo>
      ))}
      <button type="button" className="e-boton-fantasma self-start" onClick={agregarSeccion} disabled={borrador.secciones.length >= MAX_SECCIONES}>
        <span className="material-symbols-outlined" aria-hidden="true">create_new_folder</span>
        {borrador.secciones.length >= MAX_SECCIONES ? `Máximo ${MAX_SECCIONES} secciones` : "Nueva sección"}
      </button>
    </div>
  );
}

interface PropsGrupo {
  grupo: GrupoJerarquia;
  /** Posición entre las secciones (-1 = "Mi espacio"). */
  indice: number;
  totalSecciones: number;
  autoFoco: boolean;
  destino: number | null;
  onArrastrarSobre: (indice: number) => void;
  onSoltar: (e: DragEvent) => void;
  onRenombrar: (nombre: string) => void;
  onIcono: (icono: string) => void;
  onSubir: () => void;
  onBajar: () => void;
  onQuitar: () => void;
  children: ReactNode;
}

function Grupo({ grupo, indice, totalSecciones, autoFoco, destino, onArrastrarSobre, onSoltar, onRenombrar, onIcono, onSubir, onBajar, onQuitar, children }: PropsGrupo) {
  const { seccion, base, ids } = grupo;
  return (
    <section
      className={`e-grupo p-2 ${destino !== null ? "is-destino" : ""}`}
      aria-label={`Sección ${seccion.nombre}`}
      onDragOver={(e) => { e.preventDefault(); onArrastrarSobre(ids.length); }}
      onDrop={onSoltar}
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        {base ? (
          <>
            <span className="e-icono-boton !w-[42px] !h-[42px] border border-white/10" aria-hidden="true"><span className="material-symbols-outlined">home</span></span>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-bold text-white">Mi espacio</p>
              <p className="text-[11px] text-on-surface-variant/55">La primera sección del menú: lo que no pongas en otra va acá.</p>
            </div>
          </>
        ) : (
          <>
            <SelectorIcono valor={seccion.icono} porDefecto="folder" etiqueta={`Ícono de la sección ${seccion.nombre}`} onCambiar={onIcono} />
            <input
              className="e-input !bg-transparent !border-transparent hover:!border-white/10 focus:!border-[color:var(--nexo-acento)] font-headline font-bold !text-base !px-2 !py-1.5 min-w-0 flex-1"
              value={seccion.nombre}
              maxLength={30}
              autoFocus={autoFoco}
              onFocus={(e) => { if (autoFoco) e.currentTarget.select(); }}
              aria-label="Nombre de la sección"
              onChange={(e) => onRenombrar(e.target.value)}
              onBlur={(e) => { if (!e.target.value.trim()) onRenombrar("Sección"); }}
            />
            <button type="button" className="e-icono-boton" onClick={onSubir} disabled={indice === 0} aria-label={`Subir la sección ${seccion.nombre}`} title="Subir sección"><span className="material-symbols-outlined">arrow_upward</span></button>
            <button type="button" className="e-icono-boton" onClick={onBajar} disabled={indice === totalSecciones - 1} aria-label={`Bajar la sección ${seccion.nombre}`} title="Bajar sección"><span className="material-symbols-outlined">arrow_downward</span></button>
            <button type="button" className="e-icono-boton hover:!text-rose-300" onClick={onQuitar} aria-label={`Quitar la sección ${seccion.nombre}`} title="Quitar la sección (sus módulos vuelven a Mi espacio)"><span className="material-symbols-outlined">folder_off</span></button>
          </>
        )}
      </header>
      <div className="flex flex-col gap-0.5">
        {children}
        {ids.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-on-surface-variant/55">
            Arrastrá módulos hasta acá (o usá las flechas de cada módulo).
          </p>
        )}
        {destino === ids.length && ids.length > 0 && <span className="mx-3 h-[3px] rounded bg-acento shadow-[0_0_10px_var(--nexo-acento)]" aria-hidden="true" />}
      </div>
    </section>
  );
}

interface PropsFila {
  modulo: ModuloCatalogo;
  borrador: Borrador;
  elegido: boolean;
  hija?: boolean;
  padreOculto?: boolean;
  arrastrada?: boolean;
  soltarAntes?: boolean;
  onElegir: () => void;
  onOcultar: () => void;
  onSubir?: () => void;
  onBajar?: () => void;
  arrastre?: {
    draggable: boolean;
    onDragStart: (e: DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
  };
}

function FilaModulo({ modulo, borrador, elegido, hija, padreOculto, arrastrada, soltarAntes, onElegir, onOcultar, onSubir, onBajar, arrastre }: PropsFila) {
  const estado = borrador.modulos[modulo.id];
  const nombre = estado.etiqueta || modulo.nombre;
  const ocultoEnPerfiles = borrador.perfiles.filter((p) => modulo.arquetipos.includes(p.arquetipo) && p.modulos[modulo.id]?.oculto).length;
  const oculto = estado.oculto || Boolean(padreOculto);
  return (
    <div
      className={`e-fila ${hija ? "e-fila-hija" : ""} ${elegido ? "is-elegida" : ""} ${oculto ? "is-oculta" : ""} ${arrastrada ? "is-arrastrada" : ""} ${soltarAntes ? "is-soltar-antes" : ""}`}
      onClick={onElegir}
      {...arrastre}
    >
      {arrastre ? <span className="material-symbols-outlined e-asa text-lg" aria-hidden="true">drag_indicator</span> : <span className="w-[18px]" aria-hidden="true" />}
      <span className="e-modulo-icono" style={{ background: modulo.color + "26", color: modulo.color }} aria-hidden="true">
        <span className="material-symbols-outlined">{estado.icono || modulo.icono}</span>
      </span>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={(e) => { e.stopPropagation(); onElegir(); }} aria-pressed={elegido} aria-label={`Editar ${nombre}`}>
        <span className="e-fila-nombre block truncate text-sm font-semibold text-white">{nombre}</span>
        <span className="block truncate text-[11px] text-on-surface-variant/55">
          {estado.etiqueta ? `Módulo «${modulo.nombre}»` : hija ? "Dentro de su módulo padre" : modulo.descripcion}
        </span>
      </button>
      {estado.oculto ? (
        <span className="e-chip !text-[10px] !py-0.5 hidden sm:inline-flex"><span className="material-symbols-outlined" aria-hidden="true">visibility_off</span>Oculto</span>
      ) : padreOculto ? (
        <span className="e-chip !text-[10px] !py-0.5 hidden sm:inline-flex" title="Su módulo padre está oculto">Por su padre</span>
      ) : ocultoEnPerfiles > 0 ? (
        <span className="e-chip !text-[10px] !py-0.5 hidden sm:inline-flex" title="Oculto para algunos perfiles">
          <span className="material-symbols-outlined" aria-hidden="true">person_off</span>{ocultoEnPerfiles}
        </span>
      ) : null}
      <button
        type="button"
        className={`e-icono-boton ${estado.oculto ? "!text-rose-300" : ""}`}
        onClick={(e) => { e.stopPropagation(); onOcultar(); }}
        aria-label={estado.oculto ? `Mostrar ${nombre} para toda la escuela` : `Ocultar ${nombre} para toda la escuela`}
        title={estado.oculto ? "Mostrar para toda la escuela" : "Ocultar para toda la escuela"}
      >
        <span className="material-symbols-outlined">{estado.oculto ? "visibility_off" : "visibility"}</span>
      </button>
      {!hija && (
        <span className="flex">
          <button type="button" className="e-icono-boton !w-7" onClick={(e) => { e.stopPropagation(); onSubir?.(); }} disabled={!onSubir} aria-label={`Subir ${nombre}`} title="Subir"><span className="material-symbols-outlined">keyboard_arrow_up</span></button>
          <button type="button" className="e-icono-boton !w-7" onClick={(e) => { e.stopPropagation(); onBajar?.(); }} disabled={!onBajar} aria-label={`Bajar ${nombre}`} title="Bajar"><span className="material-symbols-outlined">keyboard_arrow_down</span></button>
        </span>
      )}
    </div>
  );
}
