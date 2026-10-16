// El algoritmo de las tendencias NACIONALES, en el Universo del Maestro. Es uno
// solo para toda la plataforma (si cada escuela lo calibrara, podría inflar sus
// números): acá se apaga, se calibra con sus perillas o se reescribe con nodos,
// con la misma tarjeta y el mismo editor que los algoritmos de cada escuela.

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  guardarAlgoritmoNacional,
  useAlgoritmoNacional,
  type AlgoritmoGenoma,
  type Catalogo,
} from "../../../servicios/maestro";
import { TarjetaAlgoritmo, type PedidoEditorAlgoritmo } from "./PasoAlgoritmos";
import EditorNodos from "./EditorNodos";
import { clonar } from "./genomaUtil";

export default function AlgoritmoNacional({ catalogo }: { catalogo: Catalogo }) {
  const { datos, error, recargar } = useAlgoritmoNacional();
  // El borrador nace de lo guardado; cada guardado lo vuelve a alinear.
  const [borrador, setBorrador] = useState<AlgoritmoGenoma | null>(null);
  const [editor, setEditor] = useState<PedidoEditorAlgoritmo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const config = borrador ?? datos?.config ?? null;
  const sucio = borrador !== null;

  const editar = (cambio: (a: AlgoritmoGenoma) => void) => {
    if (!config) return;
    const c = clonar(config);
    cambio(c);
    setBorrador(c);
    setAviso(null);
  };

  const guardar = async () => {
    if (!borrador) return;
    setGuardando(true);
    setAviso(null);
    try {
      await guardarAlgoritmoNacional(borrador);
      setBorrador(null);
      setAviso({ tipo: "ok", texto: "Guardado: las tendencias nacionales ya usan esta versión." });
      recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo guardar." });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="m-aparecer">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="m-eyebrow">Plataforma</p>
          <h2 className="m-titulo text-3xl mt-2">Tendencias nacionales</h2>
          <p className="text-sm text-[color:var(--m-suave)] mt-2 max-w-3xl leading-relaxed">
            Lo institucional sale a lo nacional solo si lo aprueba la dirección de su escuela. Este algoritmo ordena
            esas aprobaciones entre todas las escuelas: uno solo para toda la plataforma, para que ninguna escuela pueda inflar sus números.
          </p>
        </div>
        {datos && (
          <div className="flex flex-wrap gap-2">
            <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">public</span>{datos.estadisticas.aprobadas} en lo nacional</span>
            <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">school</span>{datos.estadisticas.escuelasConAprobadas} escuelas</span>
            <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">pending</span>{datos.estadisticas.propuestas} esperando a su dirección</span>
          </div>
        )}
      </div>

      {error && !datos && <div className="m-aviso error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">error</span>{error}</div>}
      {aviso && (
        <div className={`m-aviso ${aviso.tipo} mb-4`} role={aviso.tipo === "error" ? "alert" : "status"}>
          <span className="material-symbols-outlined" aria-hidden="true">{aviso.tipo === "ok" ? "check_circle" : "error"}</span>{aviso.texto}
        </div>
      )}

      {config && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] items-start">
          <TarjetaAlgoritmo
            slot={catalogo.algoritmoNacional}
            config={config}
            catalogo={catalogo}
            onEditar={editar}
            onAbrirEditor={setEditor}
          />
          <div className="flex xl:flex-col gap-2">
            <button type="button" className="m-boton" onClick={() => void guardar()} disabled={!sucio || guardando}>
              <span className={`material-symbols-outlined ${guardando ? "animate-spin" : ""}`} aria-hidden="true">{guardando ? "progress_activity" : "save"}</span>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {sucio && (
              <button type="button" className="m-boton-fantasma" onClick={() => { setBorrador(null); setAviso(null); }}>
                Descartar cambios
              </button>
            )}
          </div>
        </div>
      )}

      {/* El editor va a <body>: esta sección se anima al entrar, y una animación
          de transform convierte al ancestro en la referencia del position: fixed. */}
      {editor && config && createPortal(
        <EditorNodos
          modo="algoritmo"
          titulo={editor.slot.nombre}
          catalogo={catalogo}
          grafoInicial={editor.grafo}
          slot={editor.slot}
          genoma={catalogo.genomaPorDefecto}
          aprobacionInicial={editor.aprobacion}
          onCerrar={() => setEditor(null)}
          onAplicar={(grafo, aprobacion) => {
            editar((a) => {
              a.grafo = grafo;
              a.aprobacion = aprobacion;
              a.variante = aprobacion ? "personalizado" : "nativo";
            });
            setEditor(null);
          }}
        />,
        document.body,
      )}
    </section>
  );
}
