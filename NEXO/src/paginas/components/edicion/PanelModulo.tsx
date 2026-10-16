// Un módulo en el modo edición: su nombre e ícono en el menú, su sección, quién
// lo ve (toda la escuela o perfil por perfil), el checklist de sus funciones
// —para toda la escuela o solo para un perfil— y sus algoritmos.

import { useState } from "react";
import type { Borrador, Edicion } from "../../../servicios/edicion";
import { ROL_LABELS, type Rol } from "../shared/roles";
import { Casilla, Interruptor, SelectorIcono } from "./controles";
import { limpiarModuloDePerfil, perfilesDeModulo } from "./edicionUtil";
import TarjetaAlgoritmoEscuela from "./TarjetaAlgoritmoEscuela";
import Selector from "../shared/Selector";

interface Props {
  moduloId: string;
  borrador: Borrador;
  guardado: Borrador;
  catalogo: Edicion["catalogo"];
  onCambiar: (cambio: (b: Borrador) => void, clave?: string) => void;
}

export default function PanelModulo({ moduloId, borrador, guardado, catalogo, onCambiar }: Props) {
  const modulo = catalogo.modulos.find((m) => m.id === moduloId)!;
  const padre = modulo.padre ? catalogo.modulos.find((m) => m.id === modulo.padre) ?? null : null;
  const estado = borrador.modulos[moduloId];
  const perfiles = perfilesDeModulo(borrador, modulo);
  const [alcance, setAlcance] = useState<string>("");
  const perfilAlcance = perfiles.find((p) => p.clave === alcance) ?? null;
  const algoritmos = catalogo.algoritmos.filter((a) => a.modulo === moduloId);
  const padreOculto = padre ? borrador.modulos[padre.id].oculto : false;
  const nombre = estado.etiqueta || modulo.nombre;

  const editarPerfil = (clave: string, cambio: (m: NonNullable<Borrador["perfiles"][number]["modulos"][string]>) => void) => {
    onCambiar((b) => {
      const p = b.perfiles.find((x) => x.clave === clave);
      if (!p) return;
      const m = (p.modulos[moduloId] ??= {});
      cambio(m);
      limpiarModuloDePerfil(p.modulos, moduloId);
    });
  };

  const funciones = perfilAlcance ? modulo.funciones.filter((f) => f.arquetipos.includes(perfilAlcance.arquetipo)) : modulo.funciones;
  const encendidaEscuela = (id: string) => estado.funciones[id] !== false;
  const encendidaPerfil = (id: string) => perfilAlcance?.modulos[moduloId]?.funciones?.[id] !== false;
  const encendidas = funciones.filter((f) => encendidaEscuela(f.id) && (!perfilAlcance || encendidaPerfil(f.id))).length;

  return (
    <div className="flex flex-col gap-5 e-aparecer">
      <header className="e-panel relative overflow-hidden p-5">
        <span aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-30 blur-3xl" style={{ background: modulo.color }} />
        <div className="relative flex items-start gap-4">
          <span className="e-modulo-icono !h-14 !w-14 !rounded-2xl" style={{ background: modulo.color + "2e", color: modulo.color }} aria-hidden="true">
            <span className="material-symbols-outlined !text-[28px]">{estado.icono || modulo.icono}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: modulo.color }}>{padre ? `Dentro de ${borrador.modulos[padre.id].etiqueta || padre.nombre}` : "Módulo"}</p>
            <h2 className="font-headline text-2xl font-bold text-white leading-tight">{nombre}</h2>
            {estado.etiqueta && <p className="text-[11px] text-on-surface-variant/55">Módulo «{modulo.nombre}»</p>}
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant/75">{modulo.descripcion}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {perfiles.map((p) => (
                <span key={p.clave} className="e-chip !text-[10.5px]"><span className="nexo-perfil-punto" style={{ background: p.color }} aria-hidden="true" />{p.nombre}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* En el menú */}
      <section className="e-panel p-5" aria-labelledby="e-menu-titulo">
        <h3 id="e-menu-titulo" className="e-subtitulo mb-3">En el menú</h3>
        <div className="flex flex-wrap items-end gap-3">
          <SelectorIcono valor={estado.icono} porDefecto={modulo.icono} etiqueta={`Ícono de ${nombre}`} onCambiar={(icono) => onCambiar((b) => { b.modulos[moduloId].icono = icono; })} />
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant/70">Nombre que ve la escuela</span>
            <input
              className="e-input"
              value={estado.etiqueta}
              maxLength={40}
              placeholder={modulo.nombre}
              onChange={(e) => { const v = e.target.value; onCambiar((b) => { b.modulos[moduloId].etiqueta = v; }, "etiqueta:" + moduloId); }}
            />
          </label>
          {!padre && (
            <label className="flex min-w-[160px] flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-on-surface-variant/70">Sección</span>
              <Selector
                className="e-input"
                value={estado.seccion}
                onChange={(e) => {
                  const destino = e.target.value;
                  onCambiar((b) => {
                    b.modulos[moduloId].seccion = destino;
                    // Al final de su nueva sección, con sus submódulos detrás.
                    const ultimo = Math.max(...Object.values(b.modulos).map((m) => m.orden));
                    b.modulos[moduloId].orden = ultimo + 1;
                    catalogo.modulos.filter((h) => h.padre === moduloId).forEach((h, i) => { b.modulos[h.id].seccion = destino; b.modulos[h.id].orden = ultimo + 2 + i; });
                  });
                }}
              >
                <option value="">Mi espacio</option>
                {borrador.secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Selector>
            </label>
          )}
        </div>
        {padre && <p className="mt-3 text-[11px] text-on-surface-variant/55">Va siempre junto a «{borrador.modulos[padre.id].etiqueta || padre.nombre}»: comparten pantalla.</p>}
      </section>

      {/* Quién lo ve */}
      <section className="e-panel p-5" aria-labelledby="e-visibilidad-titulo">
        <h3 id="e-visibilidad-titulo" className="e-subtitulo mb-3">Quién lo ve</h3>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <span className={`material-symbols-outlined ${estado.oculto ? "text-rose-300" : "text-acento"}`} aria-hidden="true">{estado.oculto ? "visibility_off" : "visibility"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{estado.oculto ? "Oculto para toda la escuela" : "Visible para toda la escuela"}</p>
            <p className="text-[11px] text-on-surface-variant/60">{estado.oculto ? "Nadie lo ve ni puede usarlo, aunque llame a la API a mano. No se borra nada." : "Cada perfil de abajo lo ve, salvo que lo ocultes solo para ese perfil."}</p>
          </div>
          <Interruptor activo={!estado.oculto} etiqueta={estado.oculto ? `Mostrar ${nombre} para toda la escuela` : `Ocultar ${nombre} para toda la escuela`} onCambiar={() => onCambiar((b) => { b.modulos[moduloId].oculto = !b.modulos[moduloId].oculto; })} />
        </div>
        {padreOculto && (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-amber-200">
            <span className="material-symbols-outlined text-base" aria-hidden="true">info</span>
            «{padre && (borrador.modulos[padre.id].etiqueta || padre.nombre)}» está oculto, así que este tampoco se ve.
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-1">
          {perfiles.map((p) => {
            const propio = p.modulos[moduloId] ?? {};
            const visible = !estado.oculto && !propio.oculto && !padreOculto;
            return (
              <li key={p.clave} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.03]">
                <span className="nexo-perfil-punto !h-2.5 !w-2.5" style={{ background: p.color }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{p.nombre}{!p.predeterminado && <span className="ml-2 text-[10px] text-on-surface-variant/50">perfil de {ROL_LABELS[p.arquetipo as Rol] ?? p.arquetipo}</span>}</p>
                  <p className="text-[11px] text-on-surface-variant/55">
                    {estado.oculto ? "Oculto para toda la escuela" : padreOculto ? "Oculto por su módulo padre" : propio.oculto ? "Oculto solo para este perfil" : "Lo ve"}
                  </p>
                  {(propio.etiqueta || propio.icono) && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant/60">
                      {propio.icono && <span className="material-symbols-outlined text-sm" aria-hidden="true">{propio.icono}</span>}
                      {propio.etiqueta ? <>Para este perfil se llama «{propio.etiqueta}»</> : "Tiene su propio ícono"}
                      <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => editarPerfil(p.clave, (m) => { delete m.etiqueta; delete m.icono; })}>
                        Usar el de la escuela
                      </button>
                    </p>
                  )}
                </div>
                <Interruptor
                  activo={visible}
                  disabled={estado.oculto || padreOculto}
                  etiqueta={propio.oculto ? `Mostrar ${nombre} para ${p.nombre}` : `Ocultar ${nombre} para ${p.nombre}`}
                  onCambiar={() => editarPerfil(p.clave, (m) => { m.oculto = !m.oculto; })}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Funciones */}
      <section className="e-panel p-5" aria-labelledby="e-funciones-titulo">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="e-funciones-titulo" className="e-subtitulo">Funciones</h3>
          <span className="text-[11px] text-on-surface-variant/60">{encendidas} de {funciones.length} encendidas</span>
        </div>
        {modulo.funciones.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">Este módulo no tiene funciones que se puedan apagar por separado.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Para quién">
              <button type="button" className="e-chip e-chip-boton" aria-pressed={!perfilAlcance} onClick={() => setAlcance("")}>
                <span className="material-symbols-outlined" aria-hidden="true">domain</span>Toda la escuela
              </button>
              {perfiles.map((p) => (
                <button key={p.clave} type="button" className="e-chip e-chip-boton" style={{ ["--chip" as string]: p.color }} aria-pressed={perfilAlcance?.clave === p.clave} onClick={() => setAlcance(p.clave)}>
                  <span className="nexo-perfil-punto" style={{ background: p.color }} aria-hidden="true" />{p.nombre}
                </button>
              ))}
            </div>
            <ul className="flex flex-col gap-1">
              {funciones.map((f) => {
                const escuela = encendidaEscuela(f.id);
                const bloqueada = Boolean(perfilAlcance) && !escuela;
                const marcada = perfilAlcance ? escuela && encendidaPerfil(f.id) : escuela;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={marcada}
                      disabled={bloqueada}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed"
                      onClick={() => {
                        if (perfilAlcance) {
                          editarPerfil(perfilAlcance.clave, (m) => {
                            const fs = { ...(m.funciones ?? {}) };
                            if (fs[f.id] === false) delete fs[f.id];
                            else fs[f.id] = false;
                            m.funciones = fs;
                          });
                        } else {
                          onCambiar((b) => {
                            const fs = b.modulos[moduloId].funciones;
                            if (fs[f.id] === false) delete fs[f.id];
                            else fs[f.id] = false;
                          });
                        }
                      }}
                    >
                      <Casilla marcada={marcada} bloqueada={bloqueada} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${marcada ? "text-white" : "text-on-surface-variant/60"}`}>{f.nombre}</span>
                        <span className="block text-[11px] text-on-surface-variant/50">
                          {bloqueada ? "Apagada para toda la escuela" : f.arquetipos.map((a) => ROL_LABELS[a as Rol] ?? a).join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Capacidades: lo que solo algunos perfiles pueden hacer en este módulo */}
      {catalogo.capacidades?.filter((cap) => cap.modulo === moduloId).map((cap) => {
        const elegibles = borrador.perfiles.filter((p) => cap.arquetipos.includes(p.arquetipo));
        const con = new Set(borrador.capacidades[cap.id] ?? []);
        return (
          <section key={cap.id} className="e-panel p-5" aria-label={cap.nombre}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="e-subtitulo">Quién puede: {cap.nombre.toLowerCase()}</h3>
                <p className="mt-1 text-[12px] text-on-surface-variant/60">{cap.descripcion} De fábrica: {cap.porDefecto.map((c) => borrador.perfiles.find((p) => p.clave === c)?.nombre ?? c).join(" y ")}.</p>
              </div>
              <span className="e-chip">{con.size} de {elegibles.length}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {elegibles.map((p) => (
                <li key={p.clave} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.03]">
                  <span className="nexo-perfil-punto !h-2.5 !w-2.5" style={{ background: p.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-white">{p.nombre}</span>
                  <Interruptor
                    activo={con.has(p.clave)}
                    etiqueta={`${con.has(p.clave) ? "Quitarle" : "Darle"} a ${p.nombre}: ${cap.nombre.toLowerCase()}`}
                    onCambiar={() => onCambiar((b) => {
                      const lista = new Set(b.capacidades[cap.id] ?? []);
                      if (lista.has(p.clave)) lista.delete(p.clave);
                      else lista.add(p.clave);
                      b.capacidades = { ...b.capacidades, [cap.id]: [...lista] };
                    })}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Algoritmos */}
      <section aria-labelledby="e-algoritmos-titulo" className="flex flex-col gap-3">
        <h3 id="e-algoritmos-titulo" className="e-subtitulo px-1">Algoritmos de este módulo</h3>
        {algoritmos.length === 0 ? (
          <p className="e-panel px-5 py-4 text-xs text-on-surface-variant/60">Este módulo no toma decisiones automáticas: no tiene algoritmos.</p>
        ) : (
          algoritmos.map((a) => (
            <TarjetaAlgoritmoEscuela
              key={a.id}
              slot={a}
              modulo={modulo}
              config={borrador.algoritmos[a.id]}
              guardado={guardado.algoritmos[a.id]}
              moduloOculto={estado.oculto || padreOculto}
              onCambiar={(cambio, clave) => onCambiar((b) => cambio(b.algoritmos[a.id]), clave)}
            />
          ))
        )}
      </section>
    </div>
  );
}
