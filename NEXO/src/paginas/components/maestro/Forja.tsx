// La Forja: donde el Maestro diseña una instancia, paso a paso, a pantalla
// completa. Sirve para CREAR (termina en la Ignición, que crea la escuela de
// verdad) y para EDITAR una existente (termina en "Guardar nueva versión", con
// historial y restauración). El borrador vive acá; el servidor valida todo.

import { useCallback, useMemo, useState } from "react";
import {
  forjarInstancia,
  guardarGenoma,
  obtenerDetalleInstancia,
  restaurarVersion,
  type AlgoritmoCatalogo,
  type Aprobacion,
  type Catalogo,
  type DetalleInstancia,
  type Genoma,
  type Grafo,
} from "../../../servicios/maestro";
import { usePlantillas } from "../../../servicios/plataforma";
import CampoEstelar from "./CampoEstelar";
import IntroCine from "./IntroCine";
import Ignicion from "./Ignicion";
import EditorNodos from "./EditorNodos";
import PasoGenesis from "./PasoGenesis";
import PasoIdentidad, { type DatosCreacion } from "./PasoIdentidad";
import PasoPaleta from "./PasoPaleta";
import PasoModulos from "./PasoModulos";
import PasoAlgoritmos from "./PasoAlgoritmos";
import PasoPerfiles from "./PasoPerfiles";
import PasoFlujos from "./PasoFlujos";
import PasoRevision from "./PasoRevision";
import { clonar } from "./genomaUtil";
import PanelPersonalizacion from "../shared/personalizacion/PanelPersonalizacion";

type Editor =
  | { modo: "algoritmo"; slot: AlgoritmoCatalogo; grafo: Grafo; aprobacion: Aprobacion | null }
  | { modo: "flujo"; flujoId: string; titulo: string; grafo: Grafo; aprobacion: Aprobacion | null };

interface Props {
  catalogo: Catalogo;
  modo: "crear" | "editar";
  detalle?: DetalleInstancia;
  onRecargar?: () => void;
  onSalir: () => void;
  onAbrirInstancia: (id: string) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Forja({ catalogo, modo, detalle, onRecargar, onSalir, onAbrirInstancia }: Props) {
  const [genoma, setGenomaCrudo] = useState<Genoma>(() => {
    if (detalle) return clonar(detalle.genoma);
    const g = clonar(catalogo.genomaPorDefecto);
    g.identidad.nombre = "";
    return g;
  });
  const [creacion, setCreacion] = useState<DatosCreacion>(() => ({
    ciclo: new Date().getFullYear(),
    direccionNombre: "",
    direccionEmail: "",
    cuentasSemilla: true,
    plantillaId: "",
  }));
  const [version, setVersion] = useState(detalle?.version ?? 0);
  const [paso, setPaso] = useState(modo === "crear" ? 0 : 3);
  const [intro, setIntro] = useState(modo === "crear");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [ignicion, setIgnicion] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [verVersiones, setVerVersiones] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; conflicto?: boolean } | null>(null);
  const { plantillas } = usePlantillas();

  const terminarIntro = useCallback(() => setIntro(false), []);
  const setGenoma = useCallback((g: Genoma | ((previo: Genoma) => Genoma)) => {
    setGenomaCrudo(g);
    setSucio(true);
  }, []);

  const pasos = useMemo(() => [
    { id: "genesis", titulo: "Génesis", sub: "Probabilidad, no IA", icono: "casino" },
    { id: "identidad", titulo: "Identidad", sub: "Nombre, lema, dominio", icono: "badge" },
    { id: "paleta", titulo: "Paleta", sub: "Colores con matemática", icono: "palette" },
    { id: "modulos", titulo: "Módulos", sub: "Ocultar, ordenar, checklist", icono: "widgets" },
    { id: "algoritmos", titulo: "Algoritmos", sub: "Cómo piensa", icono: "function" },
    { id: "perfiles", titulo: "Perfiles", sub: "Quiénes la habitan", icono: "groups" },
    { id: "flujos", titulo: "Flujos", sub: "Funciones por nodos", icono: "account_tree" },
    { id: "personalizacion", titulo: "Personalización", sub: "Lectura, evidencia y conservación", icono: "tune" },
    { id: "revision", titulo: "Revisión", sub: modo === "crear" ? "Y la ignición" : "Guardar versión", icono: modo === "crear" ? "rocket_launch" : "save" },
  ], [modo]);

  const emailDireccion = creacion.direccionEmail || (genoma.identidad.dominio ? `direccion@${genoma.identidad.dominio}` : "");
  const faltantes = modo === "crear" ? [
    ...(!genoma.identidad.nombre.trim() ? ["Ponele un nombre a la instancia (paso Identidad)."] : []),
    ...(!creacion.direccionNombre.trim() ? ["Falta el nombre de quien dirige la escuela (paso Identidad)."] : []),
    ...(!EMAIL.test(emailDireccion) ? ["Falta un correo válido para la dirección (paso Identidad)."] : []),
    ...(creacion.cuentasSemilla && !genoma.identidad.dominio ? ["Las cuentas semilla necesitan un dominio (paso Identidad)."] : []),
    ...(!Number.isInteger(creacion.ciclo) || creacion.ciclo < 2000 || creacion.ciclo > 2100 ? ["El ciclo lectivo tiene que ser un año válido."] : []),
  ] : (!genoma.identidad.nombre.trim() ? ["La instancia necesita un nombre."] : []);

  const forjar = useCallback(() => forjarInstancia({
    genoma,
    cicloLectivo: creacion.ciclo,
    direccion: { nombre: creacion.direccionNombre.trim(), email: emailDireccion },
    cuentasSemilla: creacion.cuentasSemilla,
    plantillaId: creacion.plantillaId ? Number(creacion.plantillaId) : null,
  }), [genoma, creacion, emailDireccion]);

  const guardar = async () => {
    if (!detalle) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await guardarGenoma(detalle.institucion.id, genoma, version, nota.trim() || "Cambios del Maestro");
      setGenomaCrudo(r.genoma);
      setVersion(r.version);
      setSucio(false);
      setNota("");
      setMensaje({ tipo: "ok", texto: `Versión ${r.version} guardada. La escuela ya la está usando.` });
      onRecargar?.();
    } catch (e) {
      const texto = e instanceof Error ? e.message : "No se pudo guardar.";
      setMensaje({ tipo: "error", texto, conflicto: /cambió/.test(texto) });
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async (numero: number) => {
    if (!detalle) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await restaurarVersion(detalle.institucion.id, numero);
      setGenomaCrudo(r.genoma);
      setVersion(r.version);
      setSucio(false);
      setMensaje({ tipo: "ok", texto: `Volviste a la versión ${numero} (ahora es la versión ${r.version}).` });
      onRecargar?.();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo restaurar." });
    } finally {
      setGuardando(false);
    }
  };

  // Tras un conflicto (alguien guardó otra versión mientras se editaba): se trae
  // lo último del servidor y se sigue desde ahí, sin pisar el cambio ajeno.
  const recargarDesdeCero = async () => {
    if (!detalle) return;
    setGuardando(true);
    try {
      const nuevo = await obtenerDetalleInstancia(detalle.institucion.id);
      setGenomaCrudo(clonar(nuevo.genoma));
      setVersion(nuevo.version);
      setSucio(false);
      setMensaje({ tipo: "ok", texto: `Recargada la versión ${nuevo.version}. Volvé a aplicar tus cambios sobre ella.` });
      onRecargar?.();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo recargar la instancia." });
    } finally {
      setGuardando(false);
    }
  };

  const aplicarEditor = (grafo: Grafo, aprobacion: Aprobacion | null) => {
    if (!editor) return;
    if (editor.modo === "algoritmo") {
      const slotId = editor.slot.id;
      setGenoma((previo) => {
        const g = clonar(previo);
        const a = g.algoritmos[slotId];
        a.grafo = grafo;
        a.aprobacion = aprobacion;
        a.variante = aprobacion ? "personalizado" : "nativo";
        return g;
      });
    } else {
      const flujoId = editor.flujoId;
      setGenoma((previo) => {
        const g = clonar(previo);
        const f = g.flujos.find((x) => x.id === flujoId);
        if (f) {
          f.grafo = grafo;
          f.aprobacion = aprobacion;
          if (!aprobacion) f.activo = false;
        }
        return g;
      });
    }
    setEditor(null);
  };

  const salir = () => (sucio ? setConfirmarSalida(true) : onSalir());
  const actual = pasos[paso];
  const colores = useMemo(() => [genoma.tema.acento, genoma.tema.primario, genoma.tema.secundario, "#ffffff"], [genoma.tema.acento, genoma.tema.primario, genoma.tema.secundario]);

  return (
    <div className="m-forja maestro maestro-fondo">
      <CampoEstelar className="m-fondo-estelar" velocidad={0.35} densidad={260} colores={colores} />

      <nav className="m-rail" aria-label="Pasos de la Forja">
        <div className="m-rail-marca flex items-center gap-2 px-2">
          <span className="material-symbols-outlined text-[color:var(--m-magenta)]" aria-hidden="true">local_fire_department</span>
          <div>
            <p className="font-headline font-extrabold tracking-tight">La Forja</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--m-tenue)]">{modo === "crear" ? "Nueva instancia" : `Versión ${version}`}</p>
          </div>
        </div>
        <div className="m-rail-pasos">
          {pasos.map((p, i) => (
            <button key={p.id} type="button" className={`m-paso ${i === paso ? "is-activo" : ""} ${i < paso ? "is-hecho" : ""}`} onClick={() => setPaso(i)} aria-current={i === paso ? "step" : undefined}>
              <span className="m-paso-astro"><span className="material-symbols-outlined" aria-hidden="true">{i < paso ? "check" : p.icono}</span></span>
              <span><strong>{p.titulo}</strong><small>{p.sub}</small></span>
            </button>
          ))}
        </div>
      </nav>

      <main id="contenido-principal" tabIndex={-1} className="m-forja-centro">
        <div className="m-progreso"><span style={{ width: `${((paso + 1) / pasos.length) * 100}%` }} /></div>
        <header className="m-forja-cabecera">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" className="m-icono-boton" onClick={salir} aria-label="Salir de la Forja" title="Salir de la Forja"><span className="material-symbols-outlined">close</span></button>
            <span className="material-symbols-outlined text-2xl" style={{ color: genoma.tema.acento }} aria-hidden="true">{genoma.identidad.icono || "hub"}</span>
            <div className="min-w-0">
              <p className="font-headline font-bold truncate">{genoma.identidad.nombre || "Instancia sin nombre"}</p>
              <p className="text-[11px] text-[color:var(--m-tenue)] truncate">{actual.titulo} · paso {paso + 1} de {pasos.length}{sucio ? " · cambios sin guardar" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modo === "editar" && detalle && (
              <>
                <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => setVerVersiones(!verVersiones)} aria-expanded={verVersiones}>
                  <span className="material-symbols-outlined" aria-hidden="true">history</span>Versiones
                </button>
                <button type="button" className="m-boton m-boton-chico" onClick={() => void guardar()} disabled={guardando || !sucio || faltantes.length > 0}>
                  <span className="material-symbols-outlined" aria-hidden="true">{guardando ? "progress_activity" : "save"}</span>{guardando ? "Guardando…" : "Guardar"}
                </button>
              </>
            )}
          </div>
        </header>

        {confirmarSalida && (
          <div className="mx-[clamp(18px,3vw,42px)] mt-4 m-aviso info items-center flex-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">warning</span>
            <span className="flex-1">{modo === "crear" ? "¿Salir sin forjar? Se pierde el diseño." : "Hay cambios sin guardar. ¿Salir igual?"}</span>
            <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => setConfirmarSalida(false)}>Seguir diseñando</button>
            <button type="button" className="m-boton m-boton-chico" onClick={onSalir}>Salir</button>
          </div>
        )}

        <div className="m-forja-contenido">
          {mensaje && (
            <div className={`m-aviso ${mensaje.tipo === "ok" ? "ok" : "error"} mb-6 items-center flex-wrap`} role={mensaje.tipo === "error" ? "alert" : "status"}>
              <span className="material-symbols-outlined" aria-hidden="true">{mensaje.tipo === "ok" ? "celebration" : "error"}</span>
              <span className="flex-1">{mensaje.texto}</span>
              {mensaje.conflicto && (
                <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => void recargarDesdeCero()} disabled={guardando}>Recargar la instancia</button>
              )}
              <button type="button" className="m-icono-boton" onClick={() => setMensaje(null)} aria-label="Cerrar aviso"><span className="material-symbols-outlined">close</span></button>
            </div>
          )}

          {verVersiones && detalle && (
            <section className="m-cristal p-5 mb-6 m-aparecer">
              <h3 className="font-headline font-bold mb-3">Historial de versiones</h3>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto m-scroll">
                {detalle.versiones.map((v) => (
                  <div key={v.version} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 px-3 py-2">
                    <span className="m-chip">v{v.version}</span>
                    <span className="material-symbols-outlined text-lg" style={{ color: v.autorRol === "direccion" ? "#34d399" : "#ff4fd8" }} title={v.autorRol === "direccion" ? "Cambio de la dirección" : "Cambio del Maestro"} aria-hidden="true">
                      {v.autorRol === "direccion" ? "account_balance" : "auto_awesome"}
                    </span>
                    <span className="flex-1 min-w-[160px] text-sm">{v.nota || "Sin nota"}</span>
                    <span className="text-[11px] text-[color:var(--m-tenue)]">{new Date(v.creadoEn.replace(" ", "T") + "Z").toLocaleString("es-AR")}</span>
                    {v.version !== version && (
                      <button type="button" className="m-boton-fantasma m-boton-chico" onClick={() => void restaurar(v.version)} disabled={guardando}>
                        <span className="material-symbols-outlined" aria-hidden="true">restore</span>Restaurar
                      </button>
                    )}
                  </div>
                ))}
                {detalle.versiones.length === 0 && <p className="text-sm text-[color:var(--m-suave)]">Esta escuela todavía usa el genoma por defecto: la primera vez que guardes, nace la versión 1.</p>}
              </div>
            </section>
          )}

          <div key={actual.id}>
            {actual.id === "personalizacion" && <PanelPersonalizacion valor={genoma.personalizacion} perfiles={genoma.perfiles} algoritmos={catalogo.algoritmos} onCambiar={p => setGenoma(g => ({ ...g, personalizacion: p }))} />}
            {actual.id === "genesis" && <PasoGenesis catalogo={catalogo} genoma={genoma} onAplicar={(g) => { setGenoma(g); setMensaje({ tipo: "ok", texto: "Propuesta aplicada. Seguí esculpiendo en los próximos pasos." }); }} />}
            {actual.id === "identidad" && (
              <PasoIdentidad
                genoma={genoma}
                onCambiar={setGenoma}
                creacion={modo === "crear" ? creacion : null}
                onCambiarCreacion={(d) => { setCreacion(d); setSucio(true); }}
                plantillas={plantillas ?? []}
              />
            )}
            {actual.id === "paleta" && <PasoPaleta genoma={genoma} catalogo={catalogo} onCambiar={setGenoma} />}
            {actual.id === "modulos" && <PasoModulos genoma={genoma} catalogo={catalogo} onCambiar={setGenoma} />}
            {actual.id === "algoritmos" && (
              <PasoAlgoritmos
                genoma={genoma}
                catalogo={catalogo}
                onCambiar={setGenoma}
                onAbrirEditor={({ slot, grafo, aprobacion }) => setEditor({ modo: "algoritmo", slot, grafo, aprobacion })}
              />
            )}
            {actual.id === "perfiles" && <PasoPerfiles genoma={genoma} catalogo={catalogo} onCambiar={setGenoma} usuariosPorPerfil={detalle?.usuariosPorPerfil} />}
            {actual.id === "flujos" && (
              <PasoFlujos
                genoma={genoma}
                catalogo={catalogo}
                onCambiar={setGenoma}
                actividad={detalle?.actividad}
                onAbrirEditor={({ flujo }) => setEditor({ modo: "flujo", flujoId: flujo.id, titulo: flujo.nombre, grafo: flujo.grafo, aprobacion: flujo.aprobacion })}
              />
            )}
            {actual.id === "revision" && (
              <PasoRevision
                genoma={genoma}
                catalogo={catalogo}
                modo={modo}
                faltantes={faltantes}
                nota={nota}
                onNota={setNota}
                ocupado={guardando}
                onFinal={() => (modo === "crear" ? setIgnicion(true) : void guardar())}
              />
            )}
          </div>
        </div>

        <footer className="m-forja-pie">
          <button type="button" className="m-boton-fantasma" onClick={() => setPaso(Math.max(0, paso - 1))} disabled={paso === 0}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Anterior
          </button>
          {paso < pasos.length - 1 && (
            <button type="button" className="m-boton" onClick={() => setPaso(paso + 1)}>
              {pasos[paso + 1].titulo}<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </button>
          )}
        </footer>
      </main>

      {editor && (
        <EditorNodos
          modo={editor.modo}
          titulo={editor.modo === "algoritmo" ? editor.slot.nombre : editor.titulo}
          catalogo={catalogo}
          grafoInicial={editor.grafo}
          slot={editor.modo === "algoritmo" ? editor.slot : undefined}
          genoma={genoma}
          aprobacionInicial={editor.aprobacion}
          onCerrar={() => setEditor(null)}
          onAplicar={aplicarEditor}
        />
      )}

      {intro && <IntroCine onTerminar={terminarIntro} />}

      {ignicion && (
        <Ignicion
          genoma={genoma}
          catalogo={catalogo}
          direccion={creacion.direccionNombre}
          forjar={forjar}
          onVolver={() => setIgnicion(false)}
          onAbrirInstancia={onAbrirInstancia}
          onIrAlUniverso={onSalir}
        />
      )}
    </div>
  );
}
