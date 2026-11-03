// src/paginas/AnunciosPage.tsx
// Anuncios: avisos obligatorios entre la dirección y la preceptoría, con la
// forma de un chat (WhatsApp). A la izquierda los chats (un grupo de difusión,
// una persona o una lista); a la derecha la conversación con un solo campo
// para escribir (texto, archivos o audio). Lo que antes eran pestañas ("Nuevo
// aviso", "Leídos", "Enviados", "Grupos") ahora está en su lugar natural:
//   · Nuevo aviso → el lápiz.          · Leídos/Enviados → la conversación.
//   · Quién lo leyó → los tildes.      · Grupos → el menú ⋮ (la dirección).
// Los avisos SIN leer siguen apareciendo encima de todo, en la capa obligatoria
// (components/anuncios/BandejaObligatoria.tsx).

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import Desplegable from "./components/shared/Desplegable";
import DialogoConfirmar from "./components/shared/DialogoConfirmar";
import { useNavegacion } from "../navegacion";
import { useFuncion } from "../servicios/instancia";
import { useDatos } from "../servicios/api";
import { useTiempoReal, type EventoVivo } from "../servicios/tiempoReal";
import { useInmersivo } from "../servicios/inmersivo";
import { normalizar } from "../servicios/biblioteca";
import { activarPush, ayudaDesbloqueo, estadoPush, type EstadoPush } from "../servicios/push";
import {
  borrarAvisoParaTodos, estiloAviso, pedirEnviados, pedirLeidos, reaccionarAviso, resumenDeCursos, rolEnAvisos,
  type AvisoEnviado, type AvisoLeido, type Destinos,
} from "../servicios/anuncios";
import { armarChats, chatNuevo, claveGrupo, claveLista, clavePersona, horaCorta, listaDeNombres, vistaPrevia, type ChatAviso } from "./components/anuncios/chats";
import ConversacionAvisos, { AvatarChat } from "./components/anuncios/ConversacionAvisos";
import PanelAvisos from "./components/anuncios/PanelAvisos";
import GestorGrupos from "./components/anuncios/GestorGrupos";
import Avatar from "./components/anuncios/Avatar";
import "./components/anuncios/anuncios.css";

type Filtro = "todos" | "recibidos" | "enviados" | "grupos";
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: "todos", nombre: "Todos" },
  { id: "recibidos", nombre: "Recibidos" },
  { id: "enviados", nombre: "Enviados" },
  { id: "grupos", nombre: "Grupos" },
];

/** Suma lo nuevo a lo que ya había (por id), sin perder lo viejo cargado con "ver anteriores". */
function fusionar<T extends { id: string }>(previos: T[], nuevos: T[]): T[] {
  const mapa = new Map(previos.map((a) => [a.id, a]));
  for (const a of nuevos) mapa.set(a.id, a);
  return [...mapa.values()].sort((a, b) => Number(b.id) - Number(a.id));
}

/** El cartel de "activá las alertas" arriba de la lista, como el de WhatsApp Web. */
function BannerAlertas({ onVer }: { onVer: () => void }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  useEffect(() => {
    let vigente = true;
    void estadoPush().then((e) => { if (vigente) setEstado(e); });
    return () => { vigente = false; };
  }, []);
  if (estado !== "inactivo" && estado !== "bloqueado") return null;
  return (
    <button type="button" className="wa-banner" onClick={async () => {
      if (estado === "bloqueado") { onVer(); return; }
      try { setEstado(await activarPush()); } catch { setEstado(await estadoPush()); }
    }}>
      <span className="material-symbols-outlined" aria-hidden="true">{estado === "bloqueado" ? "notifications_off" : "notifications"}</span>
      <span className="min-w-0">
        <strong>{estado === "bloqueado" ? "Las alertas están bloqueadas" : "Activá las alertas"}</strong>
        <p>{estado === "bloqueado" ? ayudaDesbloqueo() : "Recibí los avisos en este dispositivo aunque NEXO esté cerrado."}</p>
      </span>
    </button>
  );
}

/** Elegir a quién escribir: un grupo, una persona o varias. */
function NuevoAviso({ destinos, onElegir, onVolver }: { destinos: Destinos | null; onElegir: (clave: string) => void; onVolver: () => void }) {
  const [buscar, setBuscar] = useState("");
  const [varias, setVarias] = useState<string[] | null>(null);
  const q = normalizar(buscar.trim());
  const grupos = (destinos?.grupos ?? []).filter((g) => normalizar(g.nombre).includes(q));
  const personas = (destinos?.personas ?? []).filter((p) => normalizar(`${p.nombre} ${rolEnAvisos(p.rol)} ${resumenDeCursos(p)}`).includes(q));
  const maximo = destinos?.maxPersonas ?? 50;
  const alternar = (id: string) => setVarias((v) => !v ? [id] : v.includes(id) ? v.filter((x) => x !== id) : v.length >= maximo ? v : [...v, id]);

  return (
    <div className="wa-lista">
      <div className="wa-lista-cab">
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" className="av-icono-boton" onClick={varias ? () => setVarias(null) : onVolver} aria-label="Volver">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <h1 className="truncate">{varias ? "Elegir personas" : "Nuevo aviso"}</h1>
        </div>
        {varias && <span className="av-seleccion-contador">{varias.length} / {maximo}</span>}
      </div>
      <div className="wa-buscador">
        <label className="av-buscar-caja">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input className="av-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar un grupo o una persona" aria-label="Buscar a quién escribir" autoFocus />
        </label>
      </div>
      <div className="wa-chats">
        {!varias && (
          <button type="button" className="wa-chat" onClick={() => setVarias([])}>
            <span className="wa-avatar solido" style={estiloAviso(destinos?.colorDirecto ?? "#4f46e5") as CSSProperties} aria-hidden="true"><span className="material-symbols-outlined">group_add</span></span>
            <span className="wa-chat-cuerpo"><span className="wa-chat-nombre">Varias personas</span><span className="wa-chat-previa"><span>Armá una lista para este aviso, sin crear un grupo</span></span></span>
          </button>
        )}
        {!varias && grupos.length > 0 && <p className="wa-seccion">Grupos de difusión</p>}
        {!varias && grupos.map((g) => (
          <button key={g.id} type="button" className="wa-chat" onClick={() => onElegir(claveGrupo(g.id))}>
            <AvatarChat chat={{ clase: "grupo", color: g.color, grupo: { id: g.id, nombre: g.nombre, tipo: g.tipo, color: g.color }, personas: g.destinatarios }} />
            <span className="wa-chat-cuerpo"><span className="wa-chat-nombre">{g.nombre}</span><span className="wa-chat-previa"><span>Le llega a {listaDeNombres(g.destinatarios) || "nadie todavía"}</span></span></span>
          </button>
        ))}
        {personas.length > 0 && <p className="wa-seccion">Personas</p>}
        {personas.map((p) => {
          const elegida = varias?.includes(p.id) ?? false;
          return (
            <button key={p.id} type="button" className="wa-chat" aria-pressed={varias ? elegida : undefined}
              onClick={() => (varias ? alternar(p.id) : onElegir(clavePersona(p.id)))}
              disabled={Boolean(varias && !elegida && varias.length >= maximo)}>
              <span className="wa-avatar"><Avatar persona={p} /></span>
              <span className="wa-chat-cuerpo"><span className="wa-chat-nombre">{p.nombre}</span><span className="wa-chat-previa"><span>{[rolEnAvisos(p.rol), resumenDeCursos(p)].filter(Boolean).join(" · ")}</span></span></span>
              {varias && <span className="av-persona" style={{ padding: 0, border: 0, background: "transparent" }} aria-pressed={elegida}><span className="av-check" aria-hidden="true"><span className="material-symbols-outlined">check</span></span></span>}
            </button>
          );
        })}
        {!grupos.length && !personas.length && <p className="av-vacio text-sm">No encontramos a nadie con ese nombre.</p>}
      </div>
      {varias && varias.length > 0 && (
        <div className="flex justify-end p-3 border-t border-linea">
          <button type="button" className="av-boton" onClick={() => onElegir(varias.length === 1 ? clavePersona(varias[0]) : claveLista(varias))}>
            Escribir a {varias.length === 1 ? "1 persona" : `${varias.length} personas`}
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function AnunciosPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const [params, setParams] = useSearchParams();
  const puedeEnviar = useFuncion("anuncios.enviar");
  const gestionaGrupos = usuario?.rol === "admin-academico";
  const { datos: destinos } = useDatos<Destinos>(puedeEnviar ? "/api/anuncios/destinos" : null);

  const [enviados, setEnviados] = useState<AvisoEnviado[]>([]);
  const [leidos, setLeidos] = useState<AvisoLeido[]>([]);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [hayMas, setHayMas] = useState({ enviados: false, leidos: false });
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [aBorrar, setABorrar] = useState<AvisoEnviado | null>(null);
  const vigente = useRef(true);

  // ── Estado en la dirección: qué chat, qué panel, qué vista ───────────────
  const respuestaLegada = params.get("respuesta");
  const claveAbierta = params.get("chat");
  const vista = params.get("vista") === "grupos" && gestionaGrupos ? "grupos" : params.get("vista") === "nuevo" && puedeEnviar ? "nuevo" : null;
  const panel = params.get("panel") ?? (respuestaLegada ? `hilo:${respuestaLegada}${params.get("destinatarioId") ? `:${params.get("destinatarioId")}` : ""}` : null);
  const cambiar = useCallback((cambios: Record<string, string | null>) => {
    setParams((actual) => {
      const nuevo = new URLSearchParams(actual);
      nuevo.delete("respuesta");
      nuevo.delete("destinatarioId");
      for (const [k, v] of Object.entries(cambios)) { if (v === null) nuevo.delete(k); else nuevo.set(k, v); }
      return nuevo;
    }, { replace: true });
  }, [setParams]);

  // ── Datos ────────────────────────────────────────────────────────────────
  const cargar = useCallback(() => Promise.allSettled([pedirEnviados(), pedirLeidos()]).then(([e, l]) => {
    if (!vigente.current) return;
    if (e.status === "fulfilled") { setEnviados((p) => fusionar(p, e.value.anuncios)); setHayMas((h) => ({ ...h, enviados: e.value.hayMas })); }
    if (l.status === "fulfilled") { setLeidos((p) => fusionar(p, l.value.anuncios)); setEmojis(l.value.emojis); setHayMas((h) => ({ ...h, leidos: l.value.hayMas })); }
    if (e.status === "rejected" && l.status === "rejected") setError(l.reason instanceof Error ? l.reason.message : "No se pudieron traer los avisos.");
    else setError("");
    setCargando(false);
  }), []);

  useEffect(() => {
    vigente.current = true;
    void cargar();
    return () => { vigente.current = false; };
  }, [cargar]);

  useTiempoReal(useCallback((e: EventoVivo) => {
    if (e.tipo === "anuncio-lectura" || e.tipo === "anuncio-leido" || e.tipo === "anuncio-respuesta" || e.tipo === "conectado") void cargar();
    if (e.tipo === "anuncio-borrado" && e.anuncioId) {
      setEnviados((l) => l.filter((a) => a.id !== e.anuncioId));
      setLeidos((l) => l.filter((a) => a.id !== e.anuncioId));
    }
  }, [cargar]));

  // Buscar también en los avisos leídos que todavía no se cargaron (la búsqueda del servidor).
  useEffect(() => {
    const q = buscar.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      void pedirLeidos({ q }).then((r) => { if (vigente.current) setLeidos((p) => fusionar(p, r.anuncios)); }, () => {});
    }, 350);
    return () => window.clearTimeout(t);
  }, [buscar]);

  const cargarMas = async () => {
    setCargandoMas(true);
    try {
      const [e, l] = await Promise.all([
        hayMas.enviados ? pedirEnviados(enviados.at(-1)?.id) : null,
        hayMas.leidos ? pedirLeidos({ antes: leidos.at(-1)?.id }) : null,
      ]);
      if (e) { setEnviados((p) => fusionar(p, e.anuncios)); }
      if (l) { setLeidos((p) => fusionar(p, l.anuncios)); }
      setHayMas({ enviados: e ? e.hayMas : false, leidos: l ? l.hayMas : false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron traer más avisos.");
    } finally { setCargandoMas(false); }
  };

  const chats = useMemo(() => armarChats(enviados, leidos, destinos), [enviados, leidos, destinos]);
  // Desde una notificación de respuesta: abrir el chat del aviso.
  const claveDeRespuesta = useMemo(() => {
    if (!respuestaLegada) return null;
    return chats.find((c) => c.mensajes.some((m) => m.aviso.id === respuestaLegada))?.clave ?? null;
  }, [chats, respuestaLegada]);
  const clave = claveAbierta ?? claveDeRespuesta;
  const chat: ChatAviso | null = clave ? chats.find((c) => c.clave === clave) ?? chatNuevo(clave, destinos) : null;

  const visibles = useMemo(() => {
    const q = normalizar(buscar.trim());
    return chats.filter((c) => {
      if (filtro === "recibidos" && !c.mensajes.some((m) => m.tipo === "recibido")) return false;
      if (filtro === "enviados" && !c.mensajes.some((m) => m.tipo === "enviado")) return false;
      if (filtro === "grupos" && c.clase !== "grupo") return false;
      if (!q) return true;
      return normalizar(c.nombre).includes(q) || c.mensajes.some((m) => normalizar(m.aviso.cuerpo).includes(q));
    });
  }, [chats, filtro, buscar]);

  useInmersivo(Boolean(chat || vista === "grupos"));

  if (!usuario) return null;

  const abrir = (k: string) => cambiar({ chat: k, vista: null, panel: null });
  const reaccionar = async (id: string, emoji: string | null) => {
    try {
      await reaccionarAviso(id, emoji);
      setLeidos((l) => l.map((a) => (a.id === id ? { ...a, reaccion: emoji } : a)));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la reacción."); }
  };
  const borrar = async (aviso: AvisoEnviado) => {
    try {
      await borrarAvisoParaTodos(aviso.id);
      setEnviados((l) => l.filter((a) => a.id !== aviso.id));
      if (panel?.includes(aviso.id)) cambiar({ panel: null });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el aviso."); }
    finally { setABorrar(null); }
  };

  return (
    <div className="flex bg-fondo h-dvh overflow-hidden">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col h-full min-h-0 min-w-0">
        <TopBar title="Anuncios" />
        <div className={`wa ${chat || vista === "grupos" ? "con-chat" : ""}`}>
          {vista === "nuevo" ? (
            <NuevoAviso destinos={destinos} onElegir={abrir} onVolver={() => cambiar({ vista: null })} />
          ) : (
            <div className="wa-lista">
              <div className="wa-lista-cab">
                <h1>Avisos</h1>
                <div className="wa-acciones">
                  {puedeEnviar && (
                    <button type="button" className="av-icono-boton" onClick={() => cambiar({ vista: "nuevo" })} aria-label="Nuevo aviso" title="Nuevo aviso">
                      <span className="material-symbols-outlined" aria-hidden="true">edit_square</span>
                    </button>
                  )}
                  <button type="button" className="av-icono-boton" onClick={(e) => setMenu(menu ? null : e.currentTarget)} aria-label="Más opciones" aria-haspopup="menu" aria-expanded={Boolean(menu)}>
                    <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
                  </button>
                </div>
              </div>
              <div className="wa-buscador">
                <label className="av-buscar-caja">
                  <span className="material-symbols-outlined" aria-hidden="true">search</span>
                  <input className="av-buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar un chat o un aviso" aria-label="Buscar un chat o un aviso" />
                </label>
              </div>
              <div className="wa-filtros" role="group" aria-label="Filtrar chats">
                {FILTROS.filter((f) => f.id !== "enviados" || puedeEnviar).map((f) => (
                  <button key={f.id} type="button" className="wa-filtro" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.nombre}</button>
                ))}
              </div>
              <BannerAlertas onVer={() => cambiar({ panel: "alertas" })} />
              <div className="wa-chats">
                {error && <p className="mx-3 mb-2 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{error} <button type="button" className="underline" onClick={() => void cargar()}>Reintentar</button></p>}
                {cargando && <p className="av-vacio text-sm" role="status">Cargando avisos…</p>}
                {!cargando && visibles.length === 0 && (
                  <div className="av-vacio">
                    <span className="material-symbols-outlined" aria-hidden="true">{buscar ? "search_off" : "campaign"}</span>
                    <strong>{buscar ? "Sin resultados" : "Todavía no hay avisos"}</strong>
                    <p className="text-sm max-w-xs">{buscar ? "Probá con otra palabra." : puedeEnviar ? "Tocá el lápiz para escribir el primero." : "Cuando la dirección o la preceptoría te escriban, los vas a ver acá."}</p>
                  </div>
                )}
                {visibles.map((c) => {
                  const ultimo = c.mensajes.at(-1);
                  const previa = ultimo ? vistaPrevia(ultimo) : null;
                  const mio = ultimo?.tipo === "enviado" ? (ultimo.aviso as AvisoEnviado) : null;
                  return (
                    <button key={c.clave} type="button" className="wa-chat" aria-current={c.clave === chat?.clave ? "true" : undefined} onClick={() => abrir(c.clave)}>
                      <AvatarChat chat={c} />
                      <span className="wa-chat-cuerpo">
                        <span className="wa-chat-fila"><span className="wa-chat-nombre">{c.nombre}</span><span className="wa-chat-hora">{horaCorta(c.ultimoEn)}</span></span>
                        <span className="wa-chat-previa">
                          {mio && <span className={`material-symbols-outlined wa-tilde ${mio.total > 0 && mio.leidos === mio.total ? "leido" : ""}`} aria-hidden="true">{mio.leidos > 0 ? "done_all" : "done"}</span>}
                          {ultimo?.tipo === "recibido" && c.clase === "grupo" && ultimo.aviso.autor && <span className="shrink-0">{ultimo.aviso.autor.nombre.split(" ").slice(0, 2).join(" ")}:</span>}
                          {previa?.icono && <span className="material-symbols-outlined" aria-hidden="true">{previa.icono}</span>}
                          <span>{previa ? previa.texto : c.clase === "grupo" ? "Sin avisos todavía · tocá para escribir" : ""}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {vista === "grupos" ? (
            <section className="wa-conversacion" aria-label="Grupos de difusión">
              <header className="wa-conversacion-cab">
                <button type="button" className="av-icono-boton wa-volver" onClick={() => cambiar({ vista: null })} aria-label="Volver a los chats"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>
                <span className="px-2"><h2 className="text-[15.5px] font-semibold">Grupos de difusión</h2><p className="text-[12.5px] text-on-surface-variant">Quién le puede escribir a quién</p></span>
              </header>
              <div className="flex-1 overflow-y-auto bg-fondo p-5"><GestorGrupos /></div>
            </section>
          ) : chat ? (
            <ConversacionAvisos
              key={chat.clave}
              chat={chat}
              destinos={destinos}
              emojis={emojis}
              puedeEnviar={puedeEnviar}
              hayMas={hayMas.enviados || hayMas.leidos}
              cargandoMas={cargandoMas}
              onCargarMas={cargarMas}
              onVolver={() => cambiar({ chat: null, panel: null })}
              onPanel={(p) => cambiar({ panel: p })}
              onEnviado={(a) => { setEnviados((l) => fusionar(l, [a])); if (claveAbierta === null) cambiar({ chat: chat.clave }); }}
              onBorrar={setABorrar}
              onReaccion={(id, e) => void reaccionar(id, e)}
              enfocar={respuestaLegada}
            />
          ) : (
            <div className="wa-vacia">
              <span className="icono"><span className="material-symbols-outlined" aria-hidden="true">campaign</span></span>
              <h2>Anuncios</h2>
              <p>{puedeEnviar ? "Elegí un chat para ver los avisos y quién los leyó, o tocá el lápiz para escribir uno nuevo a un grupo o a una persona." : "Elegí un chat para ver los avisos que recibiste y responder en privado."}</p>
              {puedeEnviar && <button type="button" className="av-boton mt-2" onClick={() => cambiar({ vista: "nuevo" })}><span className="material-symbols-outlined" aria-hidden="true">edit_square</span>Nuevo aviso</button>}
              <small><span className="material-symbols-outlined" aria-hidden="true">lock</span>Los avisos sin leer aparecen encima de todo hasta marcarlos como leídos.</small>
            </div>
          )}

          {panel && (panel !== "info" || chat) && (
            <PanelAvisos panel={panel} chat={chat} enviados={enviados} gestionaGrupos={gestionaGrupos} onPanel={(p) => cambiar({ panel: p })} onCerrar={() => cambiar({ panel: null })} />
          )}
        </div>
      </main>

      {menu && (
        <Desplegable ancla={menu} onCerrar={() => setMenu(null)} etiqueta="Más opciones">
          {puedeEnviar && <button type="button" role="menuitem" onClick={() => cambiar({ vista: "nuevo" })}><span className="material-symbols-outlined" aria-hidden="true">edit_square</span>Nuevo aviso</button>}
          {gestionaGrupos && <button type="button" role="menuitem" onClick={() => cambiar({ vista: "grupos", chat: null, panel: null })}><span className="material-symbols-outlined" aria-hidden="true">groups</span>Grupos de difusión</button>}
          <button type="button" role="menuitem" onClick={() => cambiar({ panel: "alertas" })}><span className="material-symbols-outlined" aria-hidden="true">notifications_active</span>Alertas de este dispositivo</button>
        </Desplegable>
      )}

      {aBorrar && (
        <DialogoConfirmar titulo="¿Eliminar este aviso para todos?" icono="delete_forever" tono="peligro" textoConfirmar="Sí, eliminar para todos"
          onConfirmar={() => borrar(aBorrar)} onCancelar={() => setABorrar(null)}>
          <p className="break-words text-white">{aBorrar.cuerpo ? `“${aBorrar.cuerpo.length > 90 ? aBorrar.cuerpo.slice(0, 89).trimEnd() + "…" : aBorrar.cuerpo}”` : "El aviso con archivos o audio"}</p>
          <p>Se va a borrar para {aBorrar.total === 1 ? "la persona que lo recibió" : `las ${aBorrar.total} personas que lo recibieron`}, aunque ya lo {aBorrar.total === 1 ? "haya" : "hayan"} leído{aBorrar.adjuntos?.length ? ", junto con sus archivos y audios" : ""}.</p>
          <p><strong className="text-white">No se puede deshacer.</strong></p>
        </DialogoConfirmar>
      )}
    </div>
  );
}
