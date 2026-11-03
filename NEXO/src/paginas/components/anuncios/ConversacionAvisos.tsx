// Una conversación de Anuncios, como en WhatsApp: los avisos que mandé a la
// derecha (con sus tildes de lectura), los que recibí a la izquierda, un
// separador por día y el campo para escribir abajo. Cada mensaje tiene su menú
// (la flechita): info de lectura, responder en privado, reaccionar, copiar,
// eliminar para todos.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { copiarTexto, estiloAviso, rolEnAvisos, type AvisoEnviado, type Destinos } from "../../../servicios/anuncios";
import AdjuntosAviso from "./AdjuntosAviso";
import Avatar from "./Avatar";
import EscribirAviso from "./EscribirAviso";
import Desplegable from "../shared/Desplegable";
import { etiquetaDia, horaDe, subtituloChat, type ChatAviso, type Mensaje } from "./chats";
import { iconoDestino } from "../../../servicios/anuncios";

export function AvatarChat({ chat, tamano }: { chat: Pick<ChatAviso, "clase" | "color" | "grupo" | "personas">; tamano?: "chico" | "grande" }) {
  const estilo = estiloAviso(chat.color) as CSSProperties;
  if (chat.clase === "persona" && chat.personas[0]) {
    return <span className={`wa-avatar ${tamano === "chico" ? "chico" : ""}`} style={estilo}><Avatar persona={chat.personas[0]} /></span>;
  }
  return (
    <span className={`wa-avatar solido ${tamano === "chico" ? "chico" : ""}`} style={estilo} aria-hidden="true">
      <span className="material-symbols-outlined">{chat.clase === "lista" ? "groups" : iconoDestino(chat.grupo?.tipo)}</span>
    </span>
  );
}

function Tildes({ aviso }: { aviso: AvisoEnviado }) {
  const todos = aviso.total > 0 && aviso.leidos === aviso.total;
  const alguno = aviso.leidos > 0;
  const texto = todos ? "Leído por todos" : alguno ? `Leído por ${aviso.leidos} de ${aviso.total}` : "Entregado, sin leer";
  return (
    <span className={`wa-tilde ${todos ? "leido" : ""}`} title={texto} aria-label={texto}>
      <span className="material-symbols-outlined" aria-hidden="true">{alguno ? "done_all" : "done"}</span>
    </span>
  );
}

const LARGO = 900;

function Burbuja({ mensaje, chat, primera, emojis, onPanel, onBorrar, onReaccion }: {
  mensaje: Mensaje;
  chat: ChatAviso;
  primera: boolean;
  emojis: string[];
  onPanel: (panel: string) => void;
  onBorrar: (aviso: AvisoEnviado) => void;
  onReaccion: (id: string, emoji: string | null) => void;
}) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [completo, setCompleto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { aviso } = mensaje;
  const saliente = mensaje.tipo === "enviado";
  const largo = aviso.cuerpo.length > LARGO || aviso.cuerpo.split("\n").length > 14;
  const enviado = saliente ? (mensaje.aviso as AvisoEnviado) : null;
  const respuestas = enviado ? enviado.destinatarios.reduce((n, d) => n + (d.respuestas ?? 0), 0) : 0;
  const reacciones = enviado
    ? Object.entries(enviado.destinatarios.reduce<Record<string, number>>((acc, d) => { if (d.reaccion) acc[d.reaccion] = (acc[d.reaccion] ?? 0) + 1; return acc; }, {}))
    : mensaje.tipo === "recibido" && mensaje.aviso.reaccion ? [[mensaje.aviso.reaccion, 1] as [string, number]] : [];

  const copiar = async () => {
    if (await copiarTexto(aviso.cuerpo)) { setCopiado(true); window.setTimeout(() => setCopiado(false), 1500); }
  };

  return (
    <div className={`wa-fila ${saliente ? "saliente" : "entrante"} ${primera ? "primera" : ""} ${reacciones.length ? "con-reaccion" : ""}`} id={`aviso-${aviso.id}`}>
      <article className="wa-burbuja" style={estiloAviso(chat.color) as CSSProperties} aria-label={saliente ? "Aviso que enviaste" : `Aviso de ${aviso.autor?.nombre ?? "NEXO"}`}>
        {!saliente && chat.clase === "grupo" && primera && (
          <span className="wa-burbuja-autor">{aviso.autor?.nombre ?? "Alguien que ya no está en NEXO"}{aviso.autor && <span className="font-normal text-on-surface-variant"> · {rolEnAvisos(aviso.autor.rol)}</span>}</span>
        )}
        {aviso.cuerpo && <div className={`wa-burbuja-texto ${largo && !completo ? "recortado" : ""}`}>{aviso.cuerpo}</div>}
        {largo && <button type="button" className="text-[13px] font-semibold text-primary" onClick={() => setCompleto((v) => !v)}>{completo ? "Ver menos" : "Leer más"}</button>}
        <AdjuntosAviso adjuntos={aviso.adjuntos ?? []} />
        {respuestas > 0 && (
          <button type="button" className="wa-respuestas-link" onClick={() => onPanel(`aviso:${aviso.id}`)}>
            <span className="material-symbols-outlined" aria-hidden="true">forum</span>
            {respuestas === 1 ? "1 respuesta" : `${respuestas} respuestas`}
          </button>
        )}
        <span className="wa-burbuja-pie">
          {copiado && <span role="status">Copiado ·</span>}
          {enviado && enviado.total > 1 && (
            <button type="button" onClick={() => onPanel(`aviso:${aviso.id}`)} title="Ver quién lo leyó">{enviado.leidos}/{enviado.total}</button>
          )}
          <time dateTime={aviso.creadoEn}>{horaDe(aviso.creadoEn)}</time>
          {enviado && <Tildes aviso={enviado} />}
        </span>
        <button type="button" className="wa-menu-boton" aria-label="Opciones del aviso" aria-haspopup="menu" aria-expanded={Boolean(menu)} onClick={(e) => setMenu(menu ? null : e.currentTarget)}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>expand_more</span>
        </button>
        {reacciones.length > 0 && (
          <span className="wa-reacciones" aria-label="Reacciones">
            {reacciones.map(([e, n]) => <span key={e}>{e}{n > 1 ? <b className="ml-0.5 text-[11px] font-semibold text-on-surface-variant">{n}</b> : null}</span>)}
          </span>
        )}
      </article>
      {menu && (
        <Desplegable ancla={menu} onCerrar={() => setMenu(null)} alineado={saliente ? "derecha" : "izquierda"} etiqueta="Opciones del aviso">
          {mensaje.tipo === "recibido" && emojis.length > 0 && (
            <div className="av-mini-emojis" role="group" aria-label="Reaccionar">
              {emojis.map((e) => (
                <button key={e} type="button" role="menuitem" className="av-mini-emoji" aria-pressed={mensaje.aviso.reaccion === e} aria-label={`Reaccionar con ${e}`}
                  onClick={() => onReaccion(aviso.id, mensaje.aviso.reaccion === e ? null : e)}>{e}</button>
              ))}
            </div>
          )}
          {saliente && (
            <button type="button" role="menuitem" onClick={() => onPanel(`aviso:${aviso.id}`)}>
              <span className="material-symbols-outlined" aria-hidden="true">info</span>Info: quién lo leyó
            </button>
          )}
          {!saliente && aviso.autor && (
            <button type="button" role="menuitem" onClick={() => onPanel(`hilo:${aviso.id}`)}>
              <span className="material-symbols-outlined" aria-hidden="true">reply</span>Responder en privado
            </button>
          )}
          {aviso.cuerpo && (
            <button type="button" role="menuitem" onClick={() => void copiar()}>
              <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>Copiar texto
            </button>
          )}
          {enviado && (
            <button type="button" role="menuitem" className="peligro" onClick={() => onBorrar(enviado)}>
              <span className="material-symbols-outlined" aria-hidden="true">delete</span>Eliminar para todos
            </button>
          )}
        </Desplegable>
      )}
    </div>
  );
}

export default function ConversacionAvisos({ chat, destinos, emojis, puedeEnviar, hayMas, cargandoMas, onCargarMas, onVolver, onPanel, onEnviado, onBorrar, onReaccion, enfocar }: {
  chat: ChatAviso;
  destinos: Destinos | null;
  emojis: string[];
  puedeEnviar: boolean;
  hayMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => Promise<void>;
  onVolver: () => void;
  onPanel: (panel: string) => void;
  onEnviado: (aviso: AvisoEnviado) => void;
  onBorrar: (aviso: AvisoEnviado) => void;
  onReaccion: (id: string, emoji: string | null) => void;
  /** Un aviso puntual para mostrar (desde una notificación). */
  enfocar?: string | null;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const ultimo = chat.mensajes.at(-1)?.aviso.id;
  const altoPrevio = useRef<number | null>(null);

  // Al abrir y cuando llega uno nuevo: abajo de todo, como en cualquier chat.
  useLayoutEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (altoPrevio.current !== null) {
      el.scrollTop += el.scrollHeight - altoPrevio.current;
      altoPrevio.current = null;
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [chat.clave, ultimo, chat.mensajes.length]);

  useEffect(() => {
    if (!enfocar) return;
    const el = document.getElementById(`aviso-${enfocar}`);
    el?.scrollIntoView({ block: "center" });
  }, [enfocar]);

  const anteriores = async () => {
    altoPrevio.current = lista.current?.scrollHeight ?? null;
    await onCargarMas();
  };

  // Separadores de día y "primera burbuja" de cada racha del mismo autor.
  const filas: { m: Mensaje; dia: string | null; primera: boolean }[] = [];
  {
    let diaPrevio = "";
    let autorPrevio = "";
    for (const m of chat.mensajes) {
      const dia = etiquetaDia(m.aviso.creadoEn);
      const autor = m.tipo === "enviado" ? "yo" : m.aviso.autor?.id ?? "?";
      filas.push({ m, dia: dia !== diaPrevio ? dia : null, primera: dia !== diaPrevio || autor !== autorPrevio });
      diaPrevio = dia;
      autorPrevio = autor;
    }
  }
  return (
    <section className="wa-conversacion" aria-label={`Conversación: ${chat.nombre}`}>
      <header className="wa-conversacion-cab">
        <button type="button" className="av-icono-boton wa-volver" onClick={onVolver} aria-label="Volver a los chats">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <button type="button" className="wa-conversacion-titulo" onClick={() => onPanel("info")} title="Ver información">
          <AvatarChat chat={chat} tamano="chico" />
          <span className="min-w-0">
            <h2>{chat.nombre}</h2>
            <p>{subtituloChat(chat)}</p>
          </span>
        </button>
        <button type="button" className="av-icono-boton" onClick={() => onPanel("info")} aria-label="Información del chat">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
        </button>
      </header>

      <div ref={lista} className="wa-mensajes" role="log" aria-label="Avisos" aria-live="polite">
        {hayMas && (
          <button type="button" className="wa-dia !font-semibold !text-primary" onClick={() => void anteriores()} disabled={cargandoMas}>
            {cargandoMas ? "Cargando…" : "Ver avisos anteriores"}
          </button>
        )}
        <p className="wa-aviso-sistema">
          <span className="material-symbols-outlined" aria-hidden="true">lock</span>
          Los avisos llegan como tarjeta obligatoria: aparecen encima de todo hasta que cada persona los marca como leídos. Las respuestas son privadas entre quien envía y quien recibe.
        </p>
        {chat.mensajes.length === 0 && (
          <p className="wa-dia">Todavía no hay avisos en este chat.</p>
        )}
        {filas.map(({ m, dia, primera }) => (
          <div key={`${m.tipo}-${m.aviso.id}`} className="contents">
            {dia && <p className="wa-dia">{dia}</p>}
            <Burbuja mensaje={m} chat={chat} primera={primera} emojis={emojis} onPanel={onPanel} onBorrar={onBorrar} onReaccion={onReaccion} />
          </div>
        ))}
      </div>

      {puedeEnviar && chat.destino
        ? <EscribirAviso key={chat.clave} chat={chat} destinos={destinos} onEnviado={onEnviado} />
        : <p className="wa-solo-lectura">
            {chat.clase === "grupo" ? "En este grupo solo recibís avisos. Podés responder en privado desde cada aviso." : "No podés enviarle avisos a esta persona. Podés responder en privado desde cada aviso."}
          </p>}
    </section>
  );
}
