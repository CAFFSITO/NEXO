// src/paginas/ModoEdicionPage.tsx
// VISTA: Modo edición — Dirección (ruta /admin/edicion; /admin/modulos es alias).
// El Maestro diseña la instancia; la dirección la retoca desde adentro sin
// escribir código:
//   · Menú: secciones, qué módulo va en cuál y en qué orden.
//   · Jerarquía de perfiles: los niveles de la escuela y a quién le muestra
//     eventos cada uno (la dirección siempre arriba).
//   · Módulos: ocultar / desocultar (para toda la escuela o por perfil), nombre,
//     ícono y checklist de funciones.
//   · Colores: la paleta de toda la escuela, sacada del logo o a mano.
//   · Algoritmos: encender, apagar y calibrar, probando cada valor sobre los
//     datos reales de la escuela.
// Todo se arma en un borrador (con deshacer y rehacer) y se guarda de una vez
// como versión nueva del genoma. El permiso y la validación son del servidor.

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";
import { useNavegacion } from "../navegacion";
import { useInstancia } from "../servicios/instancia";
import { useEdicion, type Borrador, type Edicion } from "../servicios/edicion";
import { clonar } from "./components/maestro/genomaUtil";
import { borradorDe, contarCambios, jerarquia } from "./components/edicion/edicionUtil";
import ArbolJerarquia from "./components/edicion/ArbolJerarquia";
import PanelModulo from "./components/edicion/PanelModulo";
import VistaPreviaEscuela from "./components/edicion/VistaPreviaEscuela";
import TarjetaAlgoritmoEscuela from "./components/edicion/TarjetaAlgoritmoEscuela";
import DialogoGuardar from "./components/edicion/DialogoGuardar";
import PanelJerarquia from "./components/edicion/PanelJerarquia";
import PanelPersonalizacion from "./components/shared/personalizacion/PanelPersonalizacion";
import PanelAppsPublicas from "./components/edicion/PanelAppsPublicas";
import PanelColores from "./components/edicion/PanelColores";
import "./components/edicion/edicion.css";

type Pestana = "jerarquia" | "perfiles" | "colores" | "algoritmos" | "historial" | "personalizacion" | "apps";

interface Trabajo {
  version: number;
  borrador: Borrador;
  pasado: Borrador[];
  futuro: Borrador[];
  /** Clave del último cambio: los cambios seguidos con la misma clave (arrastrar una perilla, escribir un nombre) son un solo paso de deshacer. */
  ultimaClave: string | null;
}

const PESTANAS: { id: Pestana; nombre: string; icono: string }[] = [
  { id: "jerarquia", nombre: "Menú y módulos", icono: "widgets" },
  { id: "perfiles", nombre: "Jerarquía de perfiles", icono: "account_tree" },
  { id: "colores", nombre: "Colores", icono: "palette" },
  { id: "algoritmos", nombre: "Algoritmos", icono: "function" },
  { id: "historial", nombre: "Historial", icono: "history" },
  { id: "personalizacion", nombre: "Personalización", icono: "tune" },
  { id: "apps", nombre: "Apps públicas", icono: "apps" },
];

const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fechaDe = (iso: string) => {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? iso : fecha.format(d);
};

export default function ModoEdicionPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { recargar: recargarInstancia } = useInstancia();
  const { datos, cargando, error, recargar } = useEdicion();
  // Lo que devolvió el último guardado (más nuevo que lo que trajo la carga).
  const [guardada, setGuardada] = useState<Edicion | null>(null);
  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [pestana, setPestana] = useState<Pestana>("jerarquia");
  const [elegido, setElegido] = useState<string | null>(null);
  const [perfilVista, setPerfilVista] = useState("estudiante");
  const [guardando, setGuardando] = useState(false);
  const [celebracion, setCelebracion] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const edicion = guardada && datos ? (guardada.version >= datos.version ? guardada : datos) : guardada ?? datos;
  // Un servidor que no se reinició después de actualizar NEXO no manda la
  // jerarquía de perfiles: se avisa en vez de romper la pantalla.
  const desactualizada = Boolean(edicion && !edicion.jerarquia);
  const base = useMemo(() => (edicion && !desactualizada ? borradorDe(edicion) : null), [edicion, desactualizada]);
  const vigente = trabajo && edicion && trabajo.version === edicion.version ? trabajo : null;
  const borrador = vigente?.borrador ?? base;
  const catalogo = edicion?.catalogo;
  const cambios = base && borrador && catalogo ? contarCambios(base, borrador, catalogo.modulos) : 0;
  const sucio = cambios > 0;

  const cambiar = (cambio: (b: Borrador) => void, clave?: string) => {
    if (!borrador || !edicion) return;
    const b = clonar(borrador);
    cambio(b);
    const pasado = vigente?.pasado ?? [];
    const fusionar = Boolean(clave) && vigente?.ultimaClave === clave;
    setTrabajo({ version: edicion.version, borrador: b, pasado: fusionar ? pasado : [...pasado, borrador].slice(-80), futuro: [], ultimaClave: clave ?? null });
    setAviso(null);
  };

  const deshacer = () => {
    if (!vigente || vigente.pasado.length === 0) return;
    setTrabajo({ ...vigente, borrador: vigente.pasado[vigente.pasado.length - 1], pasado: vigente.pasado.slice(0, -1), futuro: [vigente.borrador, ...vigente.futuro], ultimaClave: null });
  };
  const rehacer = () => {
    if (!vigente || vigente.futuro.length === 0) return;
    setTrabajo({ ...vigente, borrador: vigente.futuro[0], pasado: [...vigente.pasado, vigente.borrador], futuro: vigente.futuro.slice(1), ultimaClave: null });
  };

  // Ctrl+Z / Ctrl+Shift+Z fuera de los campos de texto (ahí manda el deshacer del navegador).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || guardando) return;
      const destino = e.target as HTMLElement | null;
      if (destino && (destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); deshacer(); }
      if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); rehacer(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // Cerrar la pestaña con cambios sin guardar pide confirmación.
  useEffect(() => {
    if (!sucio) return;
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [sucio]);

  if (!usuario) return null;

  const primero = borrador && catalogo ? jerarquia(borrador, catalogo.modulos).flatMap((g) => g.ids)[0] ?? null : null;
  const moduloElegido = elegido && catalogo?.modulos.some((m) => m.id === elegido) ? elegido : primero;

  const elegir = (id: string) => {
    setElegido(id);
    setPestana("jerarquia");
    // Si el panel quedó fuera de la vista (pantalla angosta o con zoom), se lo trae.
    window.requestAnimationFrame(() => {
      const r = panel.current?.getBoundingClientRect();
      if (r && (r.top > window.innerHeight * 0.6 || r.bottom < 80)) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const totales = borrador && catalogo ? {
    modulos: catalogo.modulos.length,
    visibles: catalogo.modulos.filter((m) => !borrador.modulos[m.id].oculto).length,
    secciones: borrador.secciones.length,
    algoritmos: catalogo.algoritmos.length,
    encendidos: catalogo.algoritmos.filter((a) => borrador.algoritmos[a.id].activo).length,
  } : null;

  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Modo edición" subtitle="Genoma de la escuela" />
        <section className="p-4 sm:p-8 flex-1">
          <div className="max-w-[1500px] mx-auto">
            {cargando && !edicion && <Cargando que="el modo edición" />}
            {error && !edicion && <Fallo error={error} onReintentar={recargar} />}
            {desactualizada && <Fallo error={"El servidor de NEXO sigue corriendo una versión anterior. Cerralo (Ctrl+C en la terminal de «npm run dev») y volvé a ejecutarlo: al arrancar actualiza la base sola. Después recargá esta página."} onReintentar={recargar} />}

            {edicion && borrador && base && catalogo && totales && (
              <div className="e-marco">
                <div className="e-marco-dentro">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-2xl">
                      <span className="e-insignia"><span className="e-insignia-punto" aria-hidden="true" />Modo edición · Dirección</span>
                      <h1 className="font-headline text-3xl sm:text-4xl font-bold text-white mt-4 tracking-tight">Diseñá cómo funciona {edicion.escuela.nombre}</h1>
                      <p className="text-on-surface-variant/70 text-sm mt-2 leading-relaxed">
                        Armá el menú, ordená los perfiles en la jerarquía de la escuela, mostrá u ocultá módulos, encendé o apagá sus
                        funciones y calibrá sus algoritmos mirando cómo quedan con los datos reales. Los módulos ocultos pueden volver a mostrarse.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">visibility</span>{totales.visibles}/{totales.modulos} módulos a la vista</span>
                        <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">folder</span>{totales.secciones + 1} secciones</span>
                        <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">account_tree</span>{borrador.jerarquia.niveles.length} niveles</span>
                        <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">function</span>{totales.encendidos}/{totales.algoritmos} algoritmos</span>
                        <span className="e-chip"><span className="material-symbols-outlined" aria-hidden="true">tag</span>versión {edicion.version}</span>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="e-icono-boton border border-white/10" onClick={deshacer} disabled={!vigente?.pasado.length} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><span className="material-symbols-outlined">undo</span></button>
                        <button type="button" className="e-icono-boton border border-white/10" onClick={rehacer} disabled={!vigente?.futuro.length} aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)"><span className="material-symbols-outlined">redo</span></button>
                        <button type="button" className="e-boton" onClick={() => setGuardando(true)} disabled={!sucio}>
                          <span className="material-symbols-outlined" aria-hidden="true">save</span>
                          {sucio ? `Revisar y guardar (${cambios})` : "Sin cambios"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {aviso && (
                    <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>{aviso}
                    </p>
                  )}

                  <div className="e-pestanas mt-6" role="tablist" aria-label="Partes del modo edición">
                    {PESTANAS.map((p) => (
                      <button key={p.id} type="button" role="tab" id={`e-tab-${p.id}`} aria-controls={`e-panel-${p.id}`} aria-selected={pestana === p.id} className="e-pestana" onClick={() => setPestana(p.id)}>
                        <span className="material-symbols-outlined" aria-hidden="true">{p.icono}</span>{p.nombre}
                      </button>
                    ))}
                  </div>

                  {pestana === "jerarquia" && (
                    <div id="e-panel-jerarquia" role="tabpanel" aria-labelledby="e-tab-jerarquia" className="mt-6 @container">
                    <div className="grid grid-cols-1 items-start gap-6 @3xl:grid-cols-2 @6xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto]">
                      <div className="e-panel p-3">
                        <ArbolJerarquia borrador={borrador} catalogo={catalogo.modulos} elegido={moduloElegido} onElegir={elegir} onCambiar={cambiar} />
                      </div>
                      <div ref={panel} className="scroll-mt-6">
                        {moduloElegido && (
                          <PanelModulo key={moduloElegido} moduloId={moduloElegido} borrador={borrador} guardado={base} catalogo={catalogo} onCambiar={cambiar} />
                        )}
                      </div>
                      <div className="@3xl:col-span-2 @6xl:col-span-1">
                        <VistaPreviaEscuela
                          borrador={borrador}
                          edicion={edicion}
                          perfilClave={perfilVista}
                          onPerfil={setPerfilVista}
                          elegido={moduloElegido}
                          onElegir={elegir}
                          onCambiar={cambiar}
                        />
                      </div>
                    </div>
                    </div>
                  )}

                  {pestana === "perfiles" && (
                    <div id="e-panel-perfiles" role="tabpanel" aria-labelledby="e-tab-perfiles" className="mt-6">
                      <PanelJerarquia borrador={borrador} onCambiar={cambiar} />
                    </div>
                  )}

                  {pestana === "colores" && (
                    <div id="e-panel-colores" role="tabpanel" aria-labelledby="e-tab-colores" className="mt-6">
                      <PanelColores
                        tema={borrador.tema}
                        guardado={base.tema}
                        escuela={edicion.escuela}
                        onCambiar={(c, clave) => cambiar((b) => { b.tema = { ...b.tema, ...c }; }, clave)}
                      />
                    </div>
                  )}

                  {pestana === "algoritmos" && (
                    <div id="e-panel-algoritmos" role="tabpanel" aria-labelledby="e-tab-algoritmos" className="mt-6">
                      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-on-surface-variant/70">
                        Sin IA: cada algoritmo es matemática que el servidor ejecuta. Movés una perilla y ves al instante cómo quedaría
                        tu escuela. Los diseños de nodos son del Maestro: si dejó uno aprobado, podés elegirlo acá.
                      </p>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {catalogo.algoritmos.map((a) => {
                          const modulo = catalogo.modulos.find((m) => m.id === a.modulo);
                          const padre = modulo?.padre ?? null;
                          return (
                            <TarjetaAlgoritmoEscuela
                              key={a.id}
                              slot={a}
                              modulo={modulo}
                              config={borrador.algoritmos[a.id]}
                              guardado={base.algoritmos[a.id]}
                              moduloOculto={Boolean(borrador.modulos[a.modulo]?.oculto || (padre && borrador.modulos[padre]?.oculto))}
                              onCambiar={(cambio, clave) => cambiar((b) => cambio(b.algoritmos[a.id]), clave)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pestana === "personalizacion" && <div id="e-panel-personalizacion" role="tabpanel" aria-labelledby="e-tab-personalizacion" className="mt-6"><PanelPersonalizacion valor={borrador.personalizacion} perfiles={borrador.perfiles} algoritmos={catalogo.algoritmos} onCambiar={p => cambiar(b => { b.personalizacion = p; })} /></div>}
                  {pestana === "apps" && <div id="e-panel-apps" role="tabpanel" aria-labelledby="e-tab-apps" className="mt-6"><PanelAppsPublicas /></div>}
                  {pestana === "historial" && (
                    <div id="e-panel-historial" role="tabpanel" aria-labelledby="e-tab-historial" className="mt-6 max-w-3xl">
                      {edicion.historial.length === 0 ? (
                        <p className="e-panel p-6 text-sm text-on-surface-variant/70">Tu escuela todavía usa el diseño de fábrica: no hay versiones guardadas.</p>
                      ) : (
                        <ol className="flex flex-col gap-2">
                          {edicion.historial.map((h, i) => (
                            <li key={h.version} className="e-panel flex items-start gap-4 p-4 e-aparecer" style={{ animationDelay: `${i * 40}ms` }}>
                              <span className="e-puesto w-10 shrink-0 pt-0.5">v{h.version}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white">{h.nota || "Sin nota"}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant/60">
                                  <span className={`e-chip !py-0.5 !text-[10px] ${h.autorRol === "maestro" ? "!text-primary" : h.autorRol === "direccion" ? "!text-primary" : ""}`}>
                                    <span className="material-symbols-outlined" aria-hidden="true">{h.autorRol === "maestro" ? "auto_awesome" : h.autorRol === "direccion" ? "badge" : "settings"}</span>{h.autor}
                                  </span>
                                  {fechaDe(h.creadoEn)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {sucio && (
                    <div className="e-barra-cambios" role="region" aria-label="Cambios sin guardar">
                      <p className="flex items-center gap-2 text-sm text-white">
                        <span className="e-insignia-punto" aria-hidden="true" />
                        {cambios === 1 ? "Tenés 1 cambio sin guardar" : `Tenés ${cambios} cambios sin guardar`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="e-boton-fantasma e-boton-chico" onClick={() => setTrabajo(null)}>
                          <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>Descartar
                        </button>
                        <button type="button" className="e-boton e-boton-chico" onClick={() => setGuardando(true)}>
                          <span className="material-symbols-outlined" aria-hidden="true">save</span>Revisar y guardar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {guardando && edicion && borrador && (
        <DialogoGuardar
          borrador={borrador}
          version={edicion.version}
          onCerrar={() => setGuardando(false)}
          onGuardado={(r) => {
            setGuardada(r.edicion);
            setTrabajo(null);
            setGuardando(false);
            setCelebracion(r.version);
            setAviso(`Versión ${r.version} guardada: ${r.cambios.length} ${r.cambios.length === 1 ? "cambio aplicado" : "cambios aplicados"} en toda la escuela.`);
            window.setTimeout(() => setCelebracion(null), 2300);
            // El menú propio también cambia (secciones, nombres, lo oculto).
            recargarInstancia();
          }}
          onTraerNueva={() => {
            setGuardando(false);
            setTrabajo(null);
            setGuardada(null);
            recargar();
            setAviso("Trajimos la versión nueva de la instancia. Tus cambios sin guardar se descartaron.");
          }}
        />
      )}

      {celebracion !== null && (
        <div className="e-celebracion" aria-hidden="true">
          <span className="e-onda" /><span className="e-onda" /><span className="e-onda" />
          <span className="e-celebracion-texto"><span className="material-symbols-outlined">verified</span>Versión {celebracion} en vivo</span>
        </div>
      )}
    </div>
  );
}
