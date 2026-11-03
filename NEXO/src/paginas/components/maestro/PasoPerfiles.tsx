// Paso «Perfiles»: los siete perfiles de siempre y los que invente el Maestro.
// Cada perfil nace de un ARQUETIPO, que es su techo: lo que el servidor sabe
// custodiar para ese rol. Dentro de ese techo, el Maestro decide qué módulos
// ve, con qué nombre, en qué orden, qué funciones tiene y dónde empieza.

import { useState } from "react";
import type { Catalogo, Genoma, PerfilGenoma } from "../../../servicios/maestro";
import { claveUnica, clonar, modulosDePerfil, mover } from "./genomaUtil";
import SelectorIcono from "./SelectorIcono";
import VistaPreviaMenu from "./VistaPreviaMenu";
import Selector from "../shared/Selector";

interface Props {
  genoma: Genoma;
  catalogo: Catalogo;
  onCambiar: (genoma: Genoma) => void;
  usuariosPorPerfil?: Record<string, number>;
}

export default function PasoPerfiles({ genoma, catalogo, onCambiar, usuariosPorPerfil = {} }: Props) {
  const [elegido, setElegido] = useState(genoma.perfiles[0]?.clave ?? "estudiante");
  const [creando, setCreando] = useState(false);
  const perfil = genoma.perfiles.find((p) => p.clave === elegido) ?? genoma.perfiles[0];

  const editarPerfil = (clave: string, cambio: (p: PerfilGenoma) => void) => {
    const g = clonar(genoma);
    const p = g.perfiles.find((x) => x.clave === clave);
    if (p) cambio(p);
    onCambiar(g);
  };

  const crear = (datos: { arquetipo: string; nombre: string; color: string; icono: string }) => {
    const clave = claveUnica(datos.nombre, new Set(genoma.perfiles.map((p) => p.clave).concat(catalogo.arquetipos.map((a) => a.id))), "perfil");
    const g = clonar(genoma);
    g.perfiles.push({ clave, arquetipo: datos.arquetipo, nombre: datos.nombre, color: datos.color, icono: datos.icono, predeterminado: false, inicio: "", modulos: {} });
    onCambiar(g);
    setElegido(clave);
    setCreando(false);
  };

  const quitar = (clave: string) => {
    const g = clonar(genoma);
    g.perfiles = g.perfiles.filter((p) => p.clave !== clave);
    if (g.personalizacion) delete g.personalizacion.perfiles[clave];
    onCambiar(g);
    setElegido(g.perfiles[0]?.clave ?? "estudiante");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="m-aparecer">
        <p className="m-eyebrow">Perfiles</p>
        <h2 className="m-titulo text-3xl mt-3">Quiénes habitan este universo</h2>
        <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-3xl leading-relaxed">
          Elegí un perfil para esculpirlo o creá uno nuevo a partir de un arquetipo. El arquetipo es el techo: un perfil
          puede tener menos que su arquetipo, nunca más (eso es lo que el servidor sabe custodiar).
        </p>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[260px_minmax(0,1fr)_auto] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 m-escalonado">
          {genoma.perfiles.map((p) => (
            <button
              key={p.clave}
              type="button"
              onClick={() => { setElegido(p.clave); setCreando(false); }}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${p.clave === perfil?.clave && !creando ? "border-white/25 bg-white/[0.07]" : "border-white/5 hover:bg-white/[0.04]"}`}
            >
              <span className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: p.color + "26", color: p.color, boxShadow: `0 0 0 1px ${p.color}55` }}>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">{p.icono}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold truncate">{p.nombre}</span>
                <span className="block text-[11px] text-[color:var(--m-tenue)] truncate">
                  {p.predeterminado ? "Predeterminado" : `Propio · ${catalogo.arquetipos.find((a) => a.id === p.arquetipo)?.nombre}`}
                  {usuariosPorPerfil[p.clave] ? ` · ${usuariosPorPerfil[p.clave]} pers.` : ""}
                </span>
              </span>
            </button>
          ))}
          <button type="button" className="m-boton mt-2" onClick={() => setCreando(true)}>
            <span className="material-symbols-outlined" aria-hidden="true">person_add</span>Crear perfil
          </button>
        </aside>

        {creando ? (
          <CrearPerfil catalogo={catalogo} onCrear={crear} onCancelar={() => setCreando(false)} />
        ) : perfil ? (
          <EditorPerfil
            key={perfil.clave}
            genoma={genoma}
            catalogo={catalogo}
            perfil={perfil}
            usuarios={usuariosPorPerfil[perfil.clave] ?? 0}
            onEditar={(cambio) => editarPerfil(perfil.clave, cambio)}
            onQuitar={() => quitar(perfil.clave)}
          />
        ) : null}

        {perfil && !creando && (
          <div className="hidden 2xl:block m-aparecer">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-3">Así lo ve</p>
            <VistaPreviaMenu genoma={genoma} catalogo={catalogo} perfil={perfil} alto={460} />
          </div>
        )}
      </div>
    </div>
  );
}

function CrearPerfil({ catalogo, onCrear, onCancelar }: {
  catalogo: Catalogo;
  onCrear: (datos: { arquetipo: string; nombre: string; color: string; icono: string }) => void;
  onCancelar: () => void;
}) {
  const [arquetipo, setArquetipo] = useState(catalogo.arquetipos[0].id);
  const base = catalogo.arquetipos.find((a) => a.id === arquetipo)!;
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#f43f5e");
  const [icono, setIcono] = useState("");

  return (
    <section className="m-cristal p-6 flex flex-col gap-6 m-aparecer">
      <div>
        <h3 className="m-titulo text-2xl">Un perfil nuevo</h3>
        <p className="text-sm text-[color:var(--m-suave)] mt-1">Elegí de qué arquetipo nace. Después lo esculpís.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {catalogo.arquetipos.map((a) => {
          const modulos = catalogo.modulos.filter((m) => m.arquetipos.includes(a.id));
          const funciones = modulos.flatMap((m) => m.funciones).filter((f) => f.arquetipos.includes(a.id)).length;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setArquetipo(a.id)}
              className={`rounded-2xl border p-4 text-left transition ${arquetipo === a.id ? "border-white/40 bg-white/[0.08]" : "border-white/10 hover:bg-white/[0.04]"}`}
              style={arquetipo === a.id ? { borderColor: a.color } : undefined}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: a.color }} aria-hidden="true">{a.icono}</span>
              <span className="block font-bold mt-2">{a.nombre}</span>
              <span className="block text-[11px] text-[color:var(--m-tenue)] mt-1">{modulos.length} módulos · {funciones} funciones de techo</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto_auto] items-end">
        <label className="m-campo">
          <span>Nombre del perfil</span>
          <input className="m-input" value={nombre} maxLength={40} placeholder={`Ej: ${base.id === "preceptor" ? "Tutor de convivencia" : base.id === "profesor" ? "Docente invitado" : base.id === "estudiante" ? "Estudiante ingresante" : "Coordinación"}`} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </label>
        <label className="m-campo">
          <span>Color</span>
          <input type="color" className="h-[46px] w-16 rounded-xl bg-transparent border border-white/10 cursor-pointer" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="m-campo">
          <span>Ícono</span>
          <SelectorIcono valor={icono} porDefecto={base.icono} onCambiar={setIcono} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" className="m-boton-fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="m-boton" disabled={!nombre.trim()} onClick={() => onCrear({ arquetipo, nombre: nombre.trim(), color, icono: icono || base.icono })}>
          <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>Dar vida al perfil
        </button>
      </div>
    </section>
  );
}

function EditorPerfil({ genoma, catalogo, perfil, usuarios, onEditar, onQuitar }: {
  genoma: Genoma;
  catalogo: Catalogo;
  perfil: PerfilGenoma;
  usuarios: number;
  onEditar: (cambio: (p: PerfilGenoma) => void) => void;
  onQuitar: () => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const modulos = modulosDePerfil(genoma, catalogo, perfil);
  const ordenPropio = modulos.some((m) => perfil.modulos[m.modulo.id]?.orden !== undefined);
  const arquetipo = catalogo.arquetipos.find((a) => a.id === perfil.arquetipo);

  const moduloPerfil = (p: PerfilGenoma, id: string) => (p.modulos[id] ??= {});
  const limpiar = (p: PerfilGenoma, id: string) => {
    const m = p.modulos[id];
    if (m?.funciones && Object.keys(m.funciones).length === 0) delete m.funciones;
    if (m && Object.keys(m).length === 0) delete p.modulos[id];
  };

  const reordenar = (desde: number, hasta: number) => onEditar((p) => {
    const ids = mover(modulos.map((m) => m.modulo.id), desde, hasta);
    ids.forEach((id, i) => { moduloPerfil(p, id).orden = i; });
  });

  return (
    <section className="m-cristal p-6 flex flex-col gap-6 min-w-0 m-aparecer">
      <div className="flex flex-wrap items-end gap-4">
        <label className="m-campo flex-1 min-w-[200px]">
          <span>Nombre</span>
          <input className="m-input" value={perfil.nombre} maxLength={40} onChange={(e) => onEditar((p) => { p.nombre = e.target.value; })} />
        </label>
        <label className="m-campo">
          <span>Color</span>
          <input type="color" className="h-[46px] w-16 rounded-xl bg-transparent border border-white/10 cursor-pointer" value={perfil.color} onChange={(e) => onEditar((p) => { p.color = e.target.value; })} />
        </label>
        <div className="m-campo">
          <span>Ícono</span>
          <SelectorIcono valor={perfil.icono} porDefecto={arquetipo?.icono} onCambiar={(icono) => onEditar((p) => { p.icono = icono || arquetipo?.icono || "person"; })} />
        </div>
        <label className="m-campo min-w-[200px]">
          <span>Empieza en</span>
          <Selector className="m-input" value={perfil.inicio} onChange={(e) => onEditar((p) => { p.inicio = e.target.value; })}>
            <option value="">El inicio habitual</option>
            {modulos.filter((m) => m.visible).map((m) => (
              <option key={m.modulo.id} value={m.modulo.id}>{m.etiqueta || m.modulo.nombre}</option>
            ))}
          </Selector>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--m-suave)]">
        <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">{arquetipo?.icono}</span>Arquetipo: {arquetipo?.nombre}</span>
        <span className="m-chip">{modulos.filter((m) => m.visible).length}/{modulos.length} módulos visibles</span>
        {ordenPropio && (
          <button type="button" className="m-chip" onClick={() => onEditar((p) => { for (const id of Object.keys(p.modulos)) { delete p.modulos[id].orden; limpiar(p, id); } })}>
            <span className="material-symbols-outlined" aria-hidden="true">restart_alt</span>Usar el orden de la instancia
          </button>
        )}
        {!perfil.predeterminado && (
          <button
            type="button"
            className="m-chip ml-auto"
            disabled={usuarios > 0}
            title={usuarios > 0 ? "Tiene personas asignadas: la dirección tiene que reasignarlas antes." : "Quitar este perfil"}
            onClick={onQuitar}
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete</span>{usuarios > 0 ? `${usuarios} persona(s) asignada(s)` : "Quitar perfil"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {modulos.map((m, indice) => {
          const propio = perfil.modulos[m.modulo.id] ?? {};
          const funciones = m.modulo.funciones;
          const delTecho = funciones.filter((f) => f.arquetipos.includes(perfil.arquetipo));
          const apagadasEscuela = genoma.modulos[m.modulo.id]?.funciones ?? {};
          return (
            <div key={m.modulo.id} className={`m-modulo rounded-2xl border border-white/10 bg-black/20 ${m.visible ? "" : "is-oculto"}`}>
              <div className="flex flex-wrap items-center gap-3 p-3">
                <span className="m-modulo-icono" style={{ background: m.modulo.color + "26", color: m.modulo.color }}>
                  <span className="material-symbols-outlined" aria-hidden="true">{m.icono || m.modulo.icono}</span>
                </span>
                <input
                  className="m-nombre-editable flex-1 min-w-[160px] bg-transparent font-bold outline-none border-b border-transparent focus:border-[color:var(--m-cian)]"
                  value={propio.etiqueta ?? ""}
                  placeholder={genoma.modulos[m.modulo.id]?.etiqueta || m.modulo.nombre}
                  maxLength={40}
                  onChange={(e) => onEditar((p) => { const mp = moduloPerfil(p, m.modulo.id); if (e.target.value) mp.etiqueta = e.target.value; else delete mp.etiqueta; limpiar(p, m.modulo.id); })}
                  aria-label={`Nombre de ${m.modulo.nombre} para ${perfil.nombre}`}
                />
                {m.ocultoEn === "institucion" && <span className="m-chip text-[color:var(--m-oro)]">oculto en toda la instancia</span>}
                {m.ocultoEn === "padre" && <span className="m-chip text-[color:var(--m-oro)]">su módulo padre está oculto</span>}
                {delTecho.length > 0 && (
                  <button type="button" className="m-chip" onClick={() => setAbierto(abierto === m.modulo.id ? null : m.modulo.id)} aria-expanded={abierto === m.modulo.id}>
                    <span className="material-symbols-outlined" aria-hidden="true">checklist</span>
                    {delTecho.filter((f) => apagadasEscuela[f.id] !== false && propio.funciones?.[f.id] !== false).length}/{delTecho.length}
                  </button>
                )}
                <div className="flex flex-col">
                  <button type="button" className="m-icono-boton h-5" onClick={() => reordenar(indice, indice - 1)} disabled={indice === 0} aria-label="Subir"><span className="material-symbols-outlined">expand_less</span></button>
                  <button type="button" className="m-icono-boton h-5" onClick={() => reordenar(indice, indice + 1)} disabled={indice === modulos.length - 1} aria-label="Bajar"><span className="material-symbols-outlined">expand_more</span></button>
                </div>
                <button
                  type="button"
                  className="m-interruptor"
                  role="switch"
                  aria-checked={!propio.oculto}
                  aria-label={`${propio.oculto ? "Mostrar" : "Ocultar"} ${m.modulo.nombre} para ${perfil.nombre}`}
                  onClick={() => onEditar((p) => { const mp = moduloPerfil(p, m.modulo.id); if (mp.oculto) delete mp.oculto; else mp.oculto = true; limpiar(p, m.modulo.id); })}
                />
              </div>
              {abierto === m.modulo.id && (
                <div className="border-t border-white/10 p-4 grid gap-2 md:grid-cols-2 m-aparecer">
                  {funciones.map((f) => {
                    const enTecho = f.arquetipos.includes(perfil.arquetipo);
                    const apagadaEscuela = apagadasEscuela[f.id] === false;
                    const activa = enTecho && !apagadaEscuela && propio.funciones?.[f.id] !== false;
                    const motivo = !enTecho ? "Fuera del techo del arquetipo" : apagadaEscuela ? "Apagada para toda la instancia" : null;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5 transition disabled:hover:bg-transparent"
                        disabled={!!motivo}
                        role="checkbox"
                        aria-checked={activa}
                        title={motivo ?? undefined}
                        onClick={() => onEditar((p) => {
                          const mp = moduloPerfil(p, m.modulo.id);
                          const fs = { ...(mp.funciones ?? {}) };
                          if (activa) fs[f.id] = false; else delete fs[f.id];
                          mp.funciones = fs;
                          limpiar(p, m.modulo.id);
                        })}
                      >
                        <span className="m-casilla" aria-checked={activa} />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold ${motivo ? "text-[color:var(--m-tenue)]" : ""}`}>{f.nombre}</span>
                          {motivo && <span className="flex items-center gap-1 text-[11px] text-[color:var(--m-tenue)]"><span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>{motivo}</span>}
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
    </section>
  );
}
