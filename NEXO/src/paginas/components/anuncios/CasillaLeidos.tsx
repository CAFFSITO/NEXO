// La casilla de leídos: todos los avisos que ya marqué, con quién los mandó,
// cuándo llegaron y cuándo los leí. No existe casilla de "no leídos": lo que no
// está leído está encima de todo, en la capa obligatoria.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  copiarTexto,
  estiloAviso,
  fechaCompacta,
  fechaLarga,
  iconoDestino,
  pedirLeidos,
  reaccionarAviso,
  rolEnAvisos,
  type AvisoLeido,
} from "../../../servicios/anuncios";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";
import Avatar from "./Avatar";
import AdjuntosAviso from "./AdjuntosAviso";
import RespuestasAviso from "./RespuestasAviso";

const LARGO_RECORTE = 360;

function ItemLeido({ aviso, emojis, onReaccion }: { aviso: AvisoLeido; emojis: string[]; onReaccion: (emoji: string | null) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [respondiendo, setRespondiendo] = useState(false);
  const largo = aviso.cuerpo.length > LARGO_RECORTE || aviso.cuerpo.split("\n").length > 5;

  const copiar = async () => {
    if (await copiarTexto(aviso.cuerpo)) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    }
  };

  return (
    <article className="av-item" style={estiloAviso(aviso.color)}>
      <div className="av-item-cab">
        <Avatar persona={aviso.autor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong>{aviso.autor?.nombre ?? "Alguien que ya no está en NEXO"}</strong>
            <span className="av-chip">
              <span className="material-symbols-outlined" aria-hidden="true">{iconoDestino(aviso.grupo?.tipo)}</span>
              {aviso.grupo?.nombre ?? "Mensaje directo"}
            </span>
          </div>
          <small>
            {aviso.autor && `${rolEnAvisos(aviso.autor.rol)} · `}
            <time dateTime={aviso.creadoEn} title={fechaLarga(aviso.creadoEn)}>{fechaLarga(aviso.creadoEn)}</time>
          </small>
        </div>
        {aviso.cuerpo && (
          <button type="button" className="av-icono-boton" onClick={copiar} aria-label="Copiar el mensaje" title={copiado ? "Copiado" : "Copiar el mensaje"}>
            <span className="material-symbols-outlined" aria-hidden="true">{copiado ? "check" : "content_copy"}</span>
          </button>
        )}
      </div>

      {aviso.cuerpo && <p className={`av-item-texto ${largo && !abierto ? "recortado" : ""}`}>{aviso.cuerpo}</p>}
      {largo && (
        <button type="button" className="self-start text-xs font-bold text-primary hover:underline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? "Ver menos" : "Ver todo"}
        </button>
      )}
      <AdjuntosAviso adjuntos={aviso.adjuntos ?? []} />
      <button type="button" className="self-start text-sm font-bold text-primary" onClick={() => setRespondiendo((v) => !v)}>{respondiendo ? "Ocultar respuestas" : "Responder · texto, archivos o audio"}</button>
      {respondiendo && <RespuestasAviso anuncioId={aviso.id} />}

      <div className="av-item-pie">
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined" aria-hidden="true">done_all</span>
          Leído {fechaCompacta(aviso.leidoEn)}
        </span>
        {eligiendo ? (
          <div className="av-mini-emojis" role="group" aria-label="Cambiar la reacción">
            {emojis.map((e) => (
              <button
                key={e}
                type="button"
                className="av-mini-emoji"
                aria-pressed={aviso.reaccion === e}
                aria-label={`Reaccionar con ${e}`}
                onClick={async () => {
                  await onReaccion(aviso.reaccion === e ? null : e);
                  setEligiendo(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={() => setEligiendo(true)}>
            {aviso.reaccion ? <span className="text-lg leading-none">{aviso.reaccion}</span> : <span className="material-symbols-outlined" aria-hidden="true">add_reaction</span>}
            {aviso.reaccion ? "Cambiar reacción" : "Reaccionar"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function CasillaLeidos() {
  const [avisos, setAvisos] = useState<AvisoLeido[]>([]);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const consulta = useRef(0);

  const cargar = useCallback(async (q: string, antes?: string) => {
    const numero = ++consulta.current;
    setCargando(true);
    setError("");
    try {
      const r = await pedirLeidos({ q, antes });
      if (numero !== consulta.current) return;
      setEmojis(r.emojis);
      setHayMas(r.hayMas);
      setAvisos((previos) => (antes ? [...previos, ...r.anuncios] : r.anuncios));
    } catch (e) {
      if (numero === consulta.current) setError(e instanceof Error ? e.message : "No se pudo traer la casilla.");
    } finally {
      if (numero === consulta.current) setCargando(false);
    }
  }, []);

  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    const t = window.setTimeout(() => void cargar(buscar), buscar ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [buscar, cargar]);

  // Lo que se termina de leer en la capa obligatoria aparece acá enseguida.
  useTiempoReal(useCallback((e: EventoVivo) => {
    if (e.tipo === "anuncio-leido") void cargar(buscar);
    // Quien lo mandó lo borró para todos: se va de la casilla.
    if (e.tipo === "anuncio-borrado") setAvisos((lista) => lista.filter((a) => a.id !== e.anuncioId));
  }, [cargar, buscar]));

  const reaccionar = async (id: string, emoji: string | null) => {
    try {
      await reaccionarAviso(id, emoji);
      setAvisos((lista) => lista.map((a) => (a.id === id ? { ...a, reaccion: emoji } : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la reacción.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="av-buscar-caja">
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input className="av-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en los avisos leídos: texto, quién lo mandó o grupo" aria-label="Buscar en los avisos leídos" />
      </div>
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      {!cargando && avisos.length === 0 && !error && (
        <div className="av-vacio">
          <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
          <strong>{buscar ? "No hay avisos con esa búsqueda" : "Todavía no leíste avisos"}</strong>
          <p className="text-sm">Cuando marques un aviso como leído, queda guardado acá con su fecha y hora.</p>
        </div>
      )}
      {avisos.map((a) => <ItemLeido key={a.id} aviso={a} emojis={emojis} onReaccion={(e) => reaccionar(a.id, e)} />)}
      {cargando && <p className="text-center text-sm text-on-surface-variant">Cargando…</p>}
      {hayMas && !cargando && (
        <button type="button" className="av-boton suave self-center" onClick={() => void cargar(buscar, avisos.at(-1)?.id)}>
          Ver avisos más viejos
        </button>
      )}
    </div>
  );
}
