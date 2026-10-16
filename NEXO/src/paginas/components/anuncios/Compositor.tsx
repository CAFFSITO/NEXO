// Nuevo aviso: primero se elige a quién va (un grupo de difusión o personas
// puntuales) y después se escribe. Al aviso se le pueden sumar archivos de
// cualquier tipo y notas de voz (mantener apretado el micrófono). Los archivos
// se suben recién al tocar "Enviar aviso": hasta ahí, se pueden sacar.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDatos } from "../../../servicios/api";
import { subirArchivo, tamanoLegible } from "../../../servicios/archivos";
import {
  duracionLegible,
  enviarAviso,
  estiloAviso,
  iconoArchivo,
  iconoDestino,
  nombreTipo,
  type AvisoEnviado,
  type Destinos,
  type PersonaAnuncio,
} from "../../../servicios/anuncios";
import Avatar from "./Avatar";
import InfoPersona from "./InfoPersona";
import GrabadorVoz, { type NotaGrabada } from "./GrabadorVoz";
import ReproductorVoz from "./ReproductorVoz";

type Eleccion = { tipo: "grupo"; id: string } | { tipo: "personas" } | null;

/** Un archivo elegido (o un audio grabado) que todavía no se subió. */
interface Pendiente {
  clave: string;
  archivo: File;
  voz?: { duracionMs: number; url: string };
}

/** "Carlos Pereyra y Laura Martínez" / "Carlos, Laura y 3 más". */
function listaDeNombres(personas: PersonaAnuncio[]): string {
  const nombres = personas.map((p) => p.nombre);
  if (nombres.length <= 2) return nombres.join(" y ");
  return `${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más`;
}

const EXTENSION_AUDIO: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

export default function Compositor({ onVerEnviados }: { onVerEnviados: () => void }) {
  const { datos: destinos, cargando, error: errorCarga, recargar } = useDatos<Destinos>("/api/anuncios/destinos");
  const [eleccion, setEleccion] = useState<Eleccion>(null);
  const [personas, setPersonas] = useState<string[]>([]);
  const [buscar, setBuscar] = useState("");
  const [texto, setTexto] = useState("");
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [grabando, setGrabando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState<AvisoEnviado | null>(null);
  const elegirArchivos = useRef<HTMLInputElement>(null);
  // Claves para la lista (crypto.randomUUID no existe si NEXO se abre por http).
  const contador = useRef(0);
  const nuevaClave = () => String(++contador.current);

  const grupo = eleccion?.tipo === "grupo" ? destinos?.grupos.find((g) => g.id === eleccion.id) ?? null : null;
  const color = grupo?.color ?? destinos?.colorDirecto ?? "#7c3aed";
  const elegidas = (destinos?.personas ?? []).filter((p) => personas.includes(p.id));
  const llegaA = grupo ? grupo.destinatarios : elegidas;
  const maximo = destinos?.maxCuerpo ?? 5000;
  const maxAdjuntos = destinos?.maxAdjuntos ?? 10;
  const hayAlgo = texto.trim().length > 0 || pendientes.length > 0;
  const listo = Boolean(eleccion) && llegaA.length > 0 && hayAlgo && texto.length <= maximo && !grabando;

  const filtradas = useMemo(() => {
    const q = buscar.trim().toLocaleLowerCase("es");
    return (destinos?.personas ?? []).filter((p) => !q || p.nombre.toLocaleLowerCase("es").includes(q));
  }, [destinos, buscar]);

  // Las grabaciones se escuchan desde la memoria: al salir, se libera.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const alternarPersona = (id: string) =>
    setPersonas((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));

  const sumarArchivos = (lista: FileList | null) => {
    if (!lista?.length) return;
    setError("");
    const nuevos = [...lista].map((archivo) => ({ clave: nuevaClave(), archivo }));
    setPendientes((actuales) => {
      const juntos = [...actuales, ...nuevos];
      if (juntos.length > maxAdjuntos) setError(`Un aviso puede llevar hasta ${maxAdjuntos} archivos.`);
      return juntos.slice(0, maxAdjuntos);
    });
  };

  const sumarAudio = (nota: NotaGrabada) => {
    if (pendientes.length >= maxAdjuntos) {
      setError(`Un aviso puede llevar hasta ${maxAdjuntos} archivos.`);
      return;
    }
    const base = nota.tipo.split(";")[0];
    const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const archivo = new File([nota.blob], `Audio ${hora.replace(":", ".")}.${EXTENSION_AUDIO[base] ?? "webm"}`, { type: nota.tipo });
    const url = URL.createObjectURL(nota.blob);
    urls.current.push(url);
    setPendientes((actuales) => [...actuales, { clave: nuevaClave(), archivo, voz: { duracionMs: nota.duracionMs, url } }]);
  };

  const quitar = (clave: string) => setPendientes((actuales) => actuales.filter((p) => p.clave !== clave));

  const mandar = async () => {
    if (!listo || enviando || !eleccion) return;
    setEnviando(true);
    setError("");
    try {
      // Primero se suben los archivos (uno por uno, para poder decir cuál falló).
      const adjuntos: { id: string; voz?: boolean; duracionMs?: number }[] = [];
      for (const [i, p] of pendientes.entries()) {
        setProgresoSubida(pendientes.length > 1 ? `Subiendo ${i + 1} de ${pendientes.length}…` : "Subiendo…");
        try {
          const subido = await subirArchivo(p.archivo);
          adjuntos.push(p.voz ? { id: subido.id, voz: true, duracionMs: p.voz.duracionMs } : { id: subido.id });
        } catch (e) {
          throw new Error(`${p.voz ? "El audio" : `«${p.archivo.name}»`}: ${e instanceof Error ? e.message : "no se pudo subir."}`);
        }
      }
      setProgresoSubida("");
      const destino = eleccion.tipo === "grupo" ? { grupoId: eleccion.id } : { personas };
      const { anuncio } = await enviarAviso({ ...destino, cuerpo: texto, adjuntos });
      setEnviado(anuncio);
      setTexto("");
      setPendientes([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el aviso.");
    } finally {
      setEnviando(false);
      setProgresoSubida("");
    }
  };

  if (cargando && !destinos) return <div className="av-panel text-sm text-on-surface-variant">Cargando a quiénes podés escribir…</div>;
  if (errorCarga && !destinos) {
    return (
      <div className="av-panel flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>{errorCarga}</span>
        <button type="button" className="av-boton suave chico" onClick={recargar}>Reintentar</button>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="av-panel">
        <div className="av-vacio">
          <span className="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
          <strong>Aviso enviado</strong>
          <p className="max-w-md text-sm">
            Les llegó a {enviado.total === 1 ? "1 persona" : `${enviado.total} personas`}: {listaDeNombres(enviado.destinatarios.map((d) => d.persona))}.
            Lo van a tener encima de todo hasta marcarlo como leído. En «Enviados» ves quién ya lo leyó.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className="av-boton" onClick={() => setEnviado(null)}>
              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
              Escribir otro
            </button>
            <button type="button" className="av-boton suave" onClick={onVerEnviados}>
              <span className="material-symbols-outlined" aria-hidden="true">done_all</span>
              Ver quién lo leyó
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5" style={estiloAviso(color)}>
      <section className="av-panel flex flex-col gap-4" aria-labelledby="av-paso-1">
        <h3 id="av-paso-1" className={`av-titulo-paso ${eleccion && llegaA.length ? "is-hecho" : ""}`}>
          <i>{eleccion && llegaA.length ? <span className="material-symbols-outlined !text-[16px]">check</span> : 1}</i>
          ¿A quién va dirigido?
        </h3>
        <div className="av-destinos">
          {destinos?.grupos.map((g) => (
            <button
              key={g.id}
              type="button"
              className="av-destino"
              style={{ "--av-color": g.color } as CSSProperties}
              aria-pressed={eleccion?.tipo === "grupo" && eleccion.id === g.id}
              onClick={() => setEleccion({ tipo: "grupo", id: g.id })}
            >
              <span className="av-marca" aria-hidden="true"><span className="material-symbols-outlined">check</span></span>
              <strong>{g.nombre}</strong>
              <small>
                <span className="material-symbols-outlined" aria-hidden="true">{iconoDestino(g.tipo)}</span>
                {nombreTipo(g.tipo)}
              </small>
              <p>Le llega a {listaDeNombres(g.destinatarios) || "nadie todavía"}</p>
            </button>
          ))}
          <button
            type="button"
            className="av-destino"
            style={{ "--av-color": destinos?.colorDirecto ?? "#7c3aed" } as CSSProperties}
            aria-pressed={eleccion?.tipo === "personas"}
            onClick={() => setEleccion({ tipo: "personas" })}
          >
            <span className="av-marca" aria-hidden="true"><span className="material-symbols-outlined">check</span></span>
            <strong>A alguien en particular</strong>
            <small>
              <span className="material-symbols-outlined" aria-hidden="true">person</span>
              Mensaje directo
            </small>
            <p>Elegí una o más personas de la dirección o la preceptoría.</p>
          </button>
        </div>
        {destinos && destinos.grupos.length === 0 && (
          <p className="text-xs text-on-surface-variant">
            Todavía no estás en ningún grupo donde puedas enviar. Los grupos los arma la dirección.
          </p>
        )}

        {eleccion?.tipo === "personas" && (
          <div className="flex flex-col gap-3">
            <div className="av-buscar-caja">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input className="av-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre" aria-label="Buscar personas" />
            </div>
            <div className="av-personas" role="group" aria-label="Personas">
              {filtradas.map((p) => (
                <button key={p.id} type="button" className="av-persona" aria-pressed={personas.includes(p.id)} onClick={() => alternarPersona(p.id)}>
                  <Avatar persona={p} />
                  <InfoPersona persona={p} />
                  <span className="av-check" aria-hidden="true"><span className="material-symbols-outlined">check</span></span>
                </button>
              ))}
              {filtradas.length === 0 && <p className="text-sm text-on-surface-variant">No hay nadie con ese nombre.</p>}
            </div>
          </div>
        )}
      </section>

      <section className="av-panel flex flex-col gap-4" aria-labelledby="av-paso-2">
        <h3 id="av-paso-2" className="av-titulo-paso"><i>2</i>Escribí el aviso</h3>
        {eleccion && llegaA.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">group</span>
            Le va a llegar a {listaDeNombres(llegaA)}.
          </p>
        )}
        <textarea
          className="av-area"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={eleccion ? "Escribí acá el aviso. Va a aparecer grande, encima de todo." : "Primero elegí a quién va dirigido."}
          disabled={!eleccion}
          maxLength={maximo + 200}
          aria-label="Texto del aviso"
        />

        {/* Archivos y audios del aviso */}
        {pendientes.length > 0 && (
          <ul className="av-pendientes" aria-label="Archivos que van con el aviso">
            {pendientes.map((p) => (
              <li key={p.clave} className="av-pendiente">
                {p.voz ? (
                  <>
                    <span className="material-symbols-outlined av-adjunto-icono" aria-hidden="true">mic</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">Audio · {duracionLegible(p.voz.duracionMs)}</p>
                      <ReproductorVoz src={p.voz.url} duracionMs={p.voz.duracionMs} />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined av-adjunto-icono" aria-hidden="true">{iconoArchivo(p.archivo.type, p.archivo.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{p.archivo.name}</p>
                      <p className="text-xs text-on-surface-variant">{tamanoLegible(p.archivo.size)}</p>
                    </div>
                  </>
                )}
                <button type="button" className="av-boton suave chico" onClick={() => quitar(p.clave)} disabled={enviando} aria-label={`Sacar ${p.voz ? "el audio" : p.archivo.name}`}>
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  Sacar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="av-adjuntar">
          <button
            type="button"
            className="av-boton suave"
            onClick={() => elegirArchivos.current?.click()}
            disabled={!eleccion || enviando || grabando || pendientes.length >= maxAdjuntos}
          >
            <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
            Adjuntar archivos
          </button>
          <input
            ref={elegirArchivos}
            type="file"
            multiple
            hidden
            onChange={(e) => { sumarArchivos(e.target.files); e.target.value = ""; }}
          />
          <GrabadorVoz onGrabado={sumarAudio} onGrabando={setGrabando} disabled={!eleccion || enviando || pendientes.length >= maxAdjuntos} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs ${texto.length > maximo ? "text-error" : "text-on-surface-variant"}`}>
            {texto.length.toLocaleString("es-AR")} / {maximo.toLocaleString("es-AR")}
          </span>
          <button type="button" className="av-boton" style={{ background: "var(--av-color)", color: "var(--av-tinta)" }} disabled={!listo || enviando} onClick={mandar}>
            <span className="material-symbols-outlined" aria-hidden="true">send</span>
            {enviando ? progresoSubida || "Enviando…" : "Enviar aviso"}
          </button>
        </div>
        {error && <p className="text-sm text-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
