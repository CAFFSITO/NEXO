// Los avisos que mandé y, por cada uno, quién lo leyó, a qué hora y cómo
// reaccionó. Se actualiza en vivo: cuando alguien lee o reacciona, la cocina
// avisa ("anuncio-lectura") y la lista se refresca sola.
//
// Cada aviso se puede eliminar para todos (con un cartel que pregunta antes):
// desaparece de la pantalla de quien no lo leyó y de la casilla de quien sí.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  borrarAvisoParaTodos,
  estiloAviso,
  fechaCompacta,
  fechaLarga,
  iconoDestino,
  pedirEnviados,
  rolEnAvisos,
  type AvisoEnviado,
} from "../../../servicios/anuncios";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";
import Avatar from "./Avatar";
import AdjuntosAviso from "./AdjuntosAviso";
import DialogoConfirmar from "../shared/DialogoConfirmar";

/** Cómo se nombra el aviso en el cartel de "¿Seguro?": su comienzo, o lo que trae. */
function comoSeLlama(aviso: AvisoEnviado): string {
  const texto = aviso.cuerpo.replace(/\s+/g, " ").trim();
  if (texto) return `“${texto.length > 90 ? texto.slice(0, 89).trimEnd() + "…" : texto}”`;
  return aviso.adjuntos?.some((a) => a.voz) ? "el mensaje de voz" : "el aviso con archivos";
}

function ItemEnviado({ aviso, error, onBorrar }: { aviso: AvisoEnviado; error: string; onBorrar: () => void }) {
  const [abierto, setAbierto] = useState(aviso.total <= 4);
  const [textoAbierto, setTextoAbierto] = useState(false);
  const largo = aviso.cuerpo.length > 300 || aviso.cuerpo.split("\n").length > 4;
  const completo = aviso.total > 0 && aviso.leidos === aviso.total;
  const destino = aviso.grupo
    ? aviso.grupo.nombre
    : `Directo a ${aviso.destinatarios.map((d) => d.persona.nombre).slice(0, 3).join(", ")}${aviso.total > 3 ? "…" : ""}`;

  return (
    <article className="av-item" style={estiloAviso(aviso.color)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="av-chip max-w-full">
          <span className="material-symbols-outlined" aria-hidden="true">{iconoDestino(aviso.grupo?.tipo)}</span>
          <span className="truncate">{destino}</span>
        </span>
        <time className="text-xs text-on-surface-variant" dateTime={aviso.creadoEn} title={fechaLarga(aviso.creadoEn)}>
          Enviado {fechaCompacta(aviso.creadoEn)}
        </time>
      </div>

      {aviso.cuerpo && <p className={`av-item-texto ${largo && !textoAbierto ? "recortado" : ""}`}>{aviso.cuerpo}</p>}
      {largo && (
        <button type="button" className="self-start text-xs font-bold text-primary hover:underline" onClick={() => setTextoAbierto((v) => !v)}>
          {textoAbierto ? "Ver menos" : "Ver todo"}
        </button>
      )}
      <AdjuntosAviso adjuntos={aviso.adjuntos ?? []} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={`inline-flex items-center gap-1.5 font-bold ${completo ? "text-emerald-400" : "text-white"}`}>
            <span className="material-symbols-outlined !text-[18px]" aria-hidden="true">{completo ? "done_all" : "visibility"}</span>
            {completo ? "Lo leyeron todos" : `${aviso.leidos} de ${aviso.total} lo leyeron`}
          </span>
          <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
            {abierto ? "Ocultar detalle" : "Ver quién lo leyó"}
          </button>
        </div>
        <div className="av-barra" role="progressbar" aria-valuemin={0} aria-valuemax={aviso.total} aria-valuenow={aviso.leidos} aria-label="Lecturas">
          <i style={{ width: `${aviso.total ? (aviso.leidos / aviso.total) * 100 : 0}%` } as CSSProperties} />
        </div>
        {abierto && (
          <ul className="av-lecturas mt-1">
            {aviso.destinatarios.map((d) => (
              <li key={d.persona.id} className="av-lectura">
                <Avatar persona={d.persona} />
                <span className="min-w-0">
                  <b className="truncate">{d.persona.nombre}</b>
                  {d.leidoEn
                    ? <small className="leido">✓ Leído {fechaCompacta(d.leidoEn)}</small>
                    : <small className="pendiente">Sin leer · {rolEnAvisos(d.persona.rol)}</small>}
                </span>
                {d.reaccion && <span className="emoji" title="Su reacción">{d.reaccion}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="av-boton peligro chico self-end" onClick={onBorrar}>
        <span className="material-symbols-outlined" aria-hidden="true">delete</span>
        Eliminar para todos
      </button>
      {error && <p className="self-end text-sm text-error" role="alert">{error}</p>}
    </article>
  );
}

export default function ListaEnviados() {
  const [avisos, setAvisos] = useState<AvisoEnviado[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const vigente = useRef(true);
  // Si ya se pidieron páginas viejas, el refresco en vivo no toca "ver más".
  const pidioMas = useRef(false);
  const [aBorrar, setABorrar] = useState<AvisoEnviado | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<{ id: string; texto: string } | null>(null);
  // Los que se borraron desde acá quedan como un renglón "Listo, se borró",
  // en el mismo lugar donde estaban, para que se vea que funcionó. El ref se
  // anota ANTES de pedir: el aviso en vivo del borrado puede llegar antes que
  // la respuesta y no tiene que sacarlo de la lista.
  const [borrados, setBorrados] = useState<Set<string>>(() => new Set());
  const borradosAca = useRef(new Set<string>());

  const cargarPrimeros = useCallback(() => pedirEnviados().then((r) => {
    if (!vigente.current) return;
    // Se refrescan los que ya estaban (lecturas nuevas) sin perder los más
    // viejos que se hayan cargado con "ver más".
    setAvisos((previos) => {
      const nuevos = new Map(r.anuncios.map((a) => [a.id, a]));
      const ultimo = Number(r.anuncios.at(-1)?.id ?? Infinity);
      const quedan = previos.filter((a) => !nuevos.has(a.id) && (Number(a.id) < ultimo || borradosAca.current.has(a.id)));
      return [...r.anuncios, ...quedan].sort((a, b) => Number(b.id) - Number(a.id));
    });
    if (!pidioMas.current) setHayMas(r.hayMas);
    setError("");
  }, (e: unknown) => {
    if (vigente.current) setError(e instanceof Error ? e.message : "No se pudieron traer los avisos enviados.");
  }).finally(() => {
    if (vigente.current) setCargando(false);
  }), []);

  useEffect(() => {
    vigente.current = true;
    void cargarPrimeros();
    return () => { vigente.current = false; };
  }, [cargarPrimeros]);

  useTiempoReal(useCallback((e: EventoVivo) => {
    if (e.tipo === "anuncio-lectura") void cargarPrimeros();
    // Lo borré desde otro navegador (el celular, otra pestaña).
    if (e.tipo === "anuncio-borrado" && e.anuncioId && !borradosAca.current.has(e.anuncioId)) {
      setAvisos((lista) => lista.filter((a) => a.id !== e.anuncioId));
    }
  }, [cargarPrimeros]));

  const borrar = async (aviso: AvisoEnviado) => {
    borradosAca.current.add(aviso.id);
    try {
      await borrarAvisoParaTodos(aviso.id);
      setBorrados((previos) => new Set(previos).add(aviso.id));
    } catch (e) {
      borradosAca.current.delete(aviso.id);
      setErrorBorrar({ id: aviso.id, texto: e instanceof Error ? e.message : "No se pudo eliminar el aviso. Probá de nuevo." });
    } finally {
      setABorrar(null);
    }
  };

  const cargarMas = async () => {
    pidioMas.current = true;
    setCargando(true);
    try {
      const r = await pedirEnviados(avisos.at(-1)?.id);
      setAvisos((previos) => [...previos, ...r.anuncios.filter((a) => !previos.some((p) => p.id === a.id))]);
      setHayMas(r.hayMas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron traer más avisos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      {!cargando && avisos.length === 0 && !error && (
        <div className="av-vacio">
          <span className="material-symbols-outlined" aria-hidden="true">outgoing_mail</span>
          <strong>Todavía no mandaste avisos</strong>
          <p className="text-sm">Cuando mandes uno, acá vas a ver quién lo leyó, a qué hora y cómo reaccionó.</p>
        </div>
      )}
      {avisos.map((a) => (borrados.has(a.id)
        ? (
          <p key={a.id} role="status" className="av-borrado">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            Listo, el aviso se borró para todos.
          </p>
        )
        : (
          <ItemEnviado
            key={a.id}
            aviso={a}
            error={errorBorrar?.id === a.id ? errorBorrar.texto : ""}
            onBorrar={() => { setErrorBorrar(null); setABorrar(a); }}
          />
        )))}
      {cargando && <p className="text-center text-sm text-on-surface-variant">Cargando…</p>}
      {hayMas && !cargando && (
        <button type="button" className="av-boton suave self-center" onClick={cargarMas}>Ver avisos más viejos</button>
      )}

      {aBorrar && (
        <DialogoConfirmar
          titulo="¿Eliminar este aviso para todos?"
          icono="delete_forever"
          tono="peligro"
          textoConfirmar="Sí, eliminar para todos"
          onConfirmar={() => borrar(aBorrar)}
          onCancelar={() => setABorrar(null)}
        >
          <p className="break-words text-white">{comoSeLlama(aBorrar)}</p>
          <p>
            Se va a borrar para {aBorrar.total === 1 ? "la persona que lo recibió" : `las ${aBorrar.total} personas que lo recibieron`},
            aunque ya lo {aBorrar.total === 1 ? "haya" : "hayan"} leído{aBorrar.adjuntos?.length ? ", junto con sus archivos y audios" : ""}.
          </p>
          <p><strong className="text-white">No se puede deshacer.</strong></p>
        </DialogoConfirmar>
      )}
    </div>
  );
}
