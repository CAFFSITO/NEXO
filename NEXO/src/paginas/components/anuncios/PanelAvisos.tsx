// El panel de la derecha (como "Info del contacto" de WhatsApp):
//   · info          → el grupo o la persona del chat (y editar el grupo, la dirección).
//   · aviso:ID      → quién leyó un aviso que mandé, a qué hora, su reacción y sus respuestas.
//   · hilo:ID[:DEST]→ la conversación privada sobre un aviso.
//   · alertas       → las alertas de este dispositivo.

import { useState } from "react";
import { useDatos } from "../../../servicios/api";
import { fechaCompacta, fechaLarga, nombreTipo, resumenDeCursos, rolEnAvisos, TIPOS_GRUPO, type AvisoEnviado, type GruposDeEscuela, type PersonaAnuncio } from "../../../servicios/anuncios";
import Avatar from "./Avatar";
import EditorGrupo from "./EditorGrupo";
import EstadoAlertas from "./EstadoAlertas";
import RespuestasAviso from "./RespuestasAviso";
import { AvatarChat } from "./ConversacionAvisos";
import { subtituloChat, type ChatAviso } from "./chats";

function Persona({ persona, detalle, extra }: { persona: PersonaAnuncio; detalle?: string; extra?: React.ReactNode }) {
  return (
    <li className="wa-lector">
      <span className="wa-avatar chico" style={{ width: 38, height: 38 }}><Avatar persona={persona} /></span>
      <span className="min-w-0 flex-1">
        <b className="truncate">{persona.nombre}</b>
        <small className="truncate">{detalle ?? rolEnAvisos(persona.rol)}</small>
      </span>
      {extra}
    </li>
  );
}

function InfoGrupo({ chat, gestiona }: { chat: ChatAviso; gestiona: boolean }) {
  const { datos, recargar } = useDatos<GruposDeEscuela>(gestiona ? "/api/anuncios/grupos" : null);
  const [editando, setEditando] = useState(false);
  const grupo = datos?.grupos.find((g) => g.id === chat.grupo?.id) ?? null;
  const tipo = TIPOS_GRUPO.find((t) => t.id === chat.grupo?.tipo);
  return (
    <>
      {(grupo?.descripcion || chat.grupo?.descripcion) && (
        <div className="wa-panel-bloque"><h3>Descripción</h3><p className="text-sm">{grupo?.descripcion || chat.grupo?.descripcion}</p></div>
      )}
      {tipo && (
        <div className="wa-panel-bloque">
          <h3>Cómo circulan los avisos</h3>
          <p className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-primary" aria-hidden="true">{tipo.icono}</span>{tipo.nombre}</p>
          <p className="mt-1 text-[13px] text-on-surface-variant">{tipo.ejemplo}</p>
        </div>
      )}
      {grupo ? (
        <>
          {grupo.tipo === "muchos-a-muchos" ? (
            <div className="wa-panel-bloque"><h3>{grupo.miembros.length} miembros</h3><ul className="wa-lectores">{grupo.miembros.map((p) => <Persona key={p.id} persona={p} />)}</ul></div>
          ) : (
            <>
              <div className="wa-panel-bloque"><h3>Envían ({grupo.emisores.length})</h3><ul className="wa-lectores">{grupo.emisores.map((p) => <Persona key={p.id} persona={p} />)}</ul></div>
              <div className="wa-panel-bloque"><h3>Reciben ({grupo.receptores.length})</h3><ul className="wa-lectores">{grupo.receptores.map((p) => <Persona key={p.id} persona={p} detalle={resumenDeCursos(p) || undefined} />)}</ul></div>
            </>
          )}
          <div className="wa-panel-bloque">
            <p className="text-[13px] text-on-surface-variant">{grupo.enviados === 1 ? "1 aviso enviado" : `${grupo.enviados} avisos enviados`}{grupo.creadoPor ? ` · creado por ${grupo.creadoPor}` : ""}</p>
            <button type="button" className="av-boton suave chico mt-3" onClick={() => setEditando(true)}>
              <span className="material-symbols-outlined" aria-hidden="true">edit</span>Editar grupo
            </button>
          </div>
          {editando && datos && (
            <EditorGrupo grupo={grupo} personas={datos.personas} paleta={datos.paleta} onCerrar={() => setEditando(false)} onGuardado={() => { setEditando(false); recargar(); }} />
          )}
        </>
      ) : chat.personas.length > 0 && (
        <div className="wa-panel-bloque"><h3>Les llega a ({chat.personas.length})</h3><ul className="wa-lectores">{chat.personas.map((p) => <Persona key={p.id} persona={p} detalle={resumenDeCursos(p) || undefined} />)}</ul></div>
      )}
    </>
  );
}

function InfoAviso({ aviso, onHilo }: { aviso: AvisoEnviado; onHilo: (destinatarioId: string) => void }) {
  const leyeron = aviso.destinatarios.filter((d) => d.leidoEn);
  const faltan = aviso.destinatarios.filter((d) => !d.leidoEn);
  const fila = (d: AvisoEnviado["destinatarios"][number]) => (
    <Persona key={d.persona.id} persona={d.persona}
      detalle={d.leidoEn ? `Leído ${fechaCompacta(d.leidoEn)}` : `Sin leer · ${rolEnAvisos(d.persona.rol)}`}
      extra={<>
        {d.reaccion && <span className="emoji" title="Su reacción">{d.reaccion}</span>}
        <button type="button" className="av-boton suave chico shrink-0" onClick={() => onHilo(d.persona.id)} aria-label={`Respuestas de ${d.persona.nombre}`}>
          <span className="material-symbols-outlined" aria-hidden="true">forum</span>{d.respuestas ?? 0}
        </button>
      </>} />
  );
  return (
    <>
      <div className="wa-panel-bloque">
        <p className="whitespace-pre-wrap break-words text-sm line-clamp-6">{aviso.cuerpo || "Aviso con archivos o audio"}</p>
        <p className="mt-2 text-[12.5px] text-on-surface-variant">Enviado el {fechaLarga(aviso.creadoEn)}</p>
        <div className="av-barra mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={aviso.total} aria-valuenow={aviso.leidos} aria-label="Lecturas">
          <i style={{ width: `${aviso.total ? (aviso.leidos / aviso.total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="wa-panel-bloque">
        <h3 className="flex items-center gap-1.5"><span className="material-symbols-outlined wa-tilde leido" aria-hidden="true" style={{ fontSize: 18 }}>done_all</span>Leído por {leyeron.length}</h3>
        {leyeron.length ? <ul className="wa-lectores">{leyeron.map(fila)}</ul> : <p className="text-sm text-on-surface-variant">Nadie todavía.</p>}
      </div>
      {faltan.length > 0 && (
        <div className="wa-panel-bloque">
          <h3 className="flex items-center gap-1.5"><span className="material-symbols-outlined wa-tilde" aria-hidden="true" style={{ fontSize: 18 }}>done</span>Entregado, sin leer ({faltan.length})</h3>
          <ul className="wa-lectores">{faltan.map(fila)}</ul>
        </div>
      )}
    </>
  );
}

export default function PanelAvisos({ panel, chat, enviados, gestionaGrupos, onPanel, onCerrar }: {
  panel: string;
  chat: ChatAviso | null;
  enviados: AvisoEnviado[];
  gestionaGrupos: boolean;
  onPanel: (panel: string) => void;
  onCerrar: () => void;
}) {
  const [tipo, id, destino] = panel.split(":");
  const aviso = tipo === "aviso" || tipo === "hilo" ? enviados.find((a) => a.id === id) ?? null : null;
  const titulo = tipo === "info" ? (chat?.clase === "grupo" ? "Info del grupo" : chat?.clase === "lista" ? "Info de la lista" : "Info del contacto")
    : tipo === "aviso" ? "Info del aviso" : tipo === "alertas" ? "Alertas de este dispositivo" : "Respuestas";
  const volver = tipo === "hilo" && destino && aviso ? () => onPanel(`aviso:${id}`) : null;
  const persona = destino ? aviso?.destinatarios.find((d) => d.persona.id === destino)?.persona : null;

  return (
    <aside className="wa-panel" aria-label={titulo}>
      <header className="wa-panel-cab">
        <button type="button" className="av-icono-boton" onClick={volver ?? onCerrar} aria-label={volver ? "Volver" : "Cerrar panel"}>
          <span className="material-symbols-outlined" aria-hidden="true">{volver ? "arrow_back" : "close"}</span>
        </button>
        <h2>{titulo}{persona ? ` · ${persona.nombre}` : ""}</h2>
      </header>
      <div className="wa-panel-cuerpo">
        {tipo === "info" && chat && (
          <>
            <div className="wa-panel-perfil">
              <AvatarChat chat={chat} />
              <h3>{chat.nombre}</h3>
              <p>{chat.clase === "grupo" ? `Grupo de difusión · ${chat.grupo ? nombreTipo(chat.grupo.tipo) : ""}` : subtituloChat(chat)}</p>
              {chat.clase === "persona" && chat.personas[0] && resumenDeCursos(chat.personas[0]) && <p className="text-[13px]">{resumenDeCursos(chat.personas[0])}</p>}
            </div>
            {chat.clase === "grupo" && <InfoGrupo chat={chat} gestiona={gestionaGrupos} />}
            {chat.clase === "lista" && (
              <div className="wa-panel-bloque"><h3>{chat.personas.length} personas</h3><ul className="wa-lectores">{chat.personas.map((p) => <Persona key={p.id} persona={p} />)}</ul></div>
            )}
            <div className="wa-panel-bloque">
              <p className="text-[13px] text-on-surface-variant">{chat.mensajes.length === 1 ? "1 aviso en este chat" : `${chat.mensajes.length} avisos en este chat`}</p>
            </div>
          </>
        )}
        {tipo === "aviso" && (aviso
          ? <InfoAviso aviso={aviso} onHilo={(d) => onPanel(`hilo:${aviso.id}:${d}`)} />
          : <p className="p-6 text-sm text-on-surface-variant">Este aviso ya no está disponible.</p>)}
        {tipo === "hilo" && id && (
          <div className="wa-panel-bloque">
            <RespuestasAviso key={`${id}-${destino ?? ""}`} anuncioId={id} destinatarioId={destino || undefined} />
          </div>
        )}
        {tipo === "alertas" && <div className="p-3"><EstadoAlertas /></div>}
      </div>
    </aside>
  );
}
