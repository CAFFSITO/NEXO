// src/paginas/ComunidadPage.tsx
// VISTA: Comunidad (ruta /comunidad), estilo X y Reddit.
//   · Pestañas: Para vos (algoritmo del genoma), Siguiendo, Recientes,
//     Guardados y Menciones; filtro por #tema y búsqueda.
//   · Publicar: emojis, @menciones, #temas, fotos, videos y archivos (si el
//     perfil tiene la capacidad que da la dirección), encuesta, hilo, programar,
//     quién responde; citar y repostear.
//   · Conversación en hilos y sub-hilos con la línea vertical (Reddit), votos
//     con flechas verde y roja (no hay "me gusta") y reacciones con emoji.
//   · Fijar sin límite: lo último que se fija queda arriba (capacidad "fijar").
// El servidor decide y valida todo; acá solo se dibuja.

import { useEffect, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { usePestanasComunidad } from "./components/comunidad/pestanas";
import { rutaVisible } from "./components/shared/navegacionItems";
import { useCapacidad, useFuncion, useInstancia } from "../servicios/instancia";
import { limpiarEnfoque, verEnfoque } from "../servicios/enfoque";
import { denunciar, registrarVistas, usePublicaciones, type ObjetoVotable, type Publicacion, type VistaFeed } from "../servicios/comunidad";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import Compositor from "./components/comunidad/Compositor";
import TarjetaPublicacion from "./components/comunidad/TarjetaPublicacion";
import DetallePublicacion from "./components/comunidad/DetallePublicacion";
import PerfilComunidad from "./components/comunidad/PerfilComunidad";
import PanelLateral from "./components/comunidad/PanelLateral";
import ModalDenuncia from "./components/comunidad/ModalDenuncia";
import ModalModeracion from "./components/comunidad/ModalModeracion";
import AppsInstaladas from "./components/comunidad/AppsInstaladas";
import { useDialogo } from "../servicios/useDialogo";
import { marcarEnfoque } from "../servicios/enfoque";
import CreadorDebate from "./components/comunidad/CreadorDebate";
import "./components/comunidad/comunidad.css";

const VISTAS: { id: VistaFeed; nombre: string }[] = [
  { id: "para-vos", nombre: "Para vos" },
  { id: "recientes", nombre: "Recientes" },
  { id: "guardados", nombre: "Guardados" },
  { id: "menciones", nombre: "Menciones" },
];
const PUBLICAN = ["estudiante", "profesor", "admin-academico", "centro-estudiantes"];
const VACIO: Record<VistaFeed, string> = {
  "para-vos": "Todavía no hay publicaciones en la comunidad.",
  siguiendo: "",
  recientes: "Todavía no hay publicaciones.",
  guardados: "No guardaste nada todavía: tocá el marcador de una publicación.",
  menciones: "Nadie te mencionó todavía.",
  perfil: "",
};

/** El enlace compartido (?publicacion=ID) abre esa publicación. */
const publicacionDelEnlace = () => {
  try { return new URLSearchParams(window.location.search).get("publicacion"); } catch { return null; }
};

function DialogoCita({ pub, usuario, onCerrar, onPublicado }: { pub: Publicacion; usuario: { nombre: string; avatarUrl?: string }; onCerrar: () => void; onPublicado: (m: string) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  return (
    <div className="c-velo" onClick={onCerrar}>
      <div ref={ref} className="c-dialogo p-4" role="dialog" aria-modal="true" aria-label="Citar publicación" onClick={(e) => e.stopPropagation()}>
        <Compositor usuario={usuario} citando={pub} autoFocus onCancelar={onCerrar} onPublicado={onPublicado} />
      </div>
    </div>
  );
}

export default function ComunidadPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { instancia } = useInstancia();
  const pestanas = usePestanasComunidad();
  const publicarHabilitado = useFuncion("comunidad.publicar");
  const puedeFijar = useCapacidad("comunidad.fijar");
  const rol = usuario?.rol ?? "estudiante";
  const yo = { id: usuario?.id ?? 0, rol };
  const puedePublicar = publicarHabilitado && PUBLICAN.includes(rol);
  // Crear un debate, también desde el Feed (antes solo estaba en la pestaña Debates).
  const puedeDebatir = useFuncion("debates.crear") && ["estudiante", "profesor", "admin-academico", "centro-estudiantes"].includes(usuario?.rol ?? "");
  const [creandoDebate, setCreandoDebate] = useState(false);
  const puedeModerar = rol === "admin-academico" || rol === "preceptor";

  const [vista, setVista] = useState<VistaFeed>("para-vos");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { publicaciones, cargando, error, recargar } = usePublicaciones({ vista, tag: tag ?? undefined, q: q || undefined });
  // Lo que cambia por una acción (votar, reaccionar, repostear…) hasta que llega la lista nueva.
  const [cambios, setCambios] = useState<{ base: Publicacion[] | null; mapa: Record<string, Partial<Publicacion>> }>({ base: null, mapa: {} });
  const mapa = cambios.base === publicaciones ? cambios.mapa : {};
  const lista = publicaciones?.map((p) => (mapa[p.id] ? { ...p, ...mapa[p.id] } : p)) ?? null;
  const actualizar = (id: string, cambio: Partial<Publicacion>) => setCambios({ base: publicaciones, mapa: { ...mapa, [id]: { ...mapa[id], ...cambio } } });

  const [detalle, setDetalle] = useState<string | null>(publicacionDelEnlace);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [citando, setCitando] = useState<Publicacion | null>(null);
  const [denunciaDe, setDenunciaDe] = useState<{ tipo: ObjetoVotable; id: string } | null>(null);
  const [moderando, setModerando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);
  const [enfoqueUsado, setEnfoqueUsado] = useState(false);

  // Una notificación puede pedir abrir una publicación o un perfil.
  const enfoquePub = !enfoqueUsado ? verEnfoque("publicacion") : null;
  const enfoqueUsuario = !enfoqueUsado ? verEnfoque("usuario") : null;
  const detalleAbierto = detalle ?? enfoquePub;
  const perfilAbierto = perfil ?? enfoqueUsuario;
  const consumirEnfoque = () => { if (enfoquePub || enfoqueUsuario) { limpiarEnfoque(); setEnfoqueUsado(true); } };

  // Las vistas de lo que se mostró (una por persona y publicación).
  useEffect(() => {
    if (!publicaciones?.length) return;
    registrarVistas(publicaciones.slice(0, 40).map((p) => p.id)).catch(() => { /* las vistas no son críticas */ });
  }, [publicaciones]);

  const avisar = (texto: string, tipo: "ok" | "error" = "ok") => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 3500);
  };
  const filtrarTag = (t: string) => { setTag(t); setQ(""); setVista("recientes"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (!usuario) return null;
  const tarjeta = (p: Publicacion) => (
    <TarjetaPublicacion
      key={p.clave}
      pub={p}
      yo={yo}
      puedeFijar={puedeFijar}
      puedePublicar={puedePublicar}
      onActualizar={actualizar}
      onAbrir={setDetalle}
      onPerfil={setPerfil}
      onTag={filtrarTag}
      onCitar={setCitando}
      onRecargar={recargar}
      onDenunciar={(id) => setDenunciaDe({ tipo: "publicacion", id })}
      onAviso={avisar}
    />
  );

  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Comunidad" pestanas={pestanas} />
        <AppsInstaladas />

        <div className="mx-auto flex w-full max-w-[1180px] flex-1 gap-8 px-3 py-6 sm:px-8">
          <div className="min-w-0 max-w-[680px] flex-1">
            <form className="relative mb-3 xl:hidden" onSubmit={(e) => { e.preventDefault(); setQ(new FormData(e.currentTarget).get("q")?.toString().trim() ?? ""); }}>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" aria-hidden="true">search</span>
              <input name="q" className="c-input !rounded-full !py-2.5 !pl-10" placeholder="Buscar en la comunidad" aria-label="Buscar en la comunidad" />
            </form>

            <div className="c-pestanas mb-4" role="tablist" aria-label="Qué ver">
              {VISTAS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={vista === v.id && !tag} className="c-pestana" onClick={() => { setVista(v.id); setTag(null); }}>{v.nombre}</button>
              ))}
            </div>

            {(tag || q) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {tag && <span className="c-reaccion !py-1 !text-sm" aria-pressed="true">#{tag}<button type="button" onClick={() => setTag(null)} aria-label="Quitar el filtro por tema"><span className="material-symbols-outlined !text-[16px]">close</span></button></span>}
                {q && <span className="c-reaccion !py-1 !text-sm" aria-pressed="true">«{q}»<button type="button" onClick={() => setQ("")} aria-label="Quitar la búsqueda"><span className="material-symbols-outlined !text-[16px]">close</span></button></span>}
              </div>
            )}

            {puedeDebatir && (
              <div className="mb-3 flex justify-end">
                <button type="button" className="nx-btn nx-btn-secundario nx-btn-chico" onClick={() => setCreandoDebate(true)}>
                  <span className="material-symbols-outlined" aria-hidden="true">forum</span>Nuevo debate
                </button>
              </div>
            )}
            {puedePublicar ? (
              <div className="mb-5"><Compositor usuario={usuario} onPublicado={(m) => { avisar(m); recargar(); }} /></div>
            ) : (
              <div className="c-panel mb-5 flex items-center gap-3 p-4 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-acento" aria-hidden="true">visibility</span>
                Tu perfil lee, vota, reacciona y responde en la Comunidad; publicar queda para otros perfiles.
              </div>
            )}

            {puedeModerar && (
              <button type="button" onClick={() => setModerando(true)} className="c-boton-fantasma c-chico mb-4 xl:hidden"><span className="material-symbols-outlined" aria-hidden="true">gavel</span>Moderación</button>
            )}

            <div className="flex flex-col gap-3">
              {cargando && !lista && <Cargando que="la comunidad" />}
              {error && !lista && <Fallo error={error} onReintentar={recargar} />}
              {lista?.length === 0 && <Vacio icono={tag || q ? "search_off" : "forum"} mensaje={tag || q ? "No hay publicaciones con ese filtro." : VACIO[vista]} />}
              {lista?.map(tarjeta)}
            </div>
          </div>

          <div className="hidden w-80 shrink-0 xl:block">
            <div className="sticky top-6 flex flex-col gap-4">
              {puedeModerar && (
                <button type="button" onClick={() => setModerando(true)} className="c-boton-fantasma self-start"><span className="material-symbols-outlined" aria-hidden="true">gavel</span>Bandeja de moderación</button>
              )}
              <PanelLateral
                onBuscar={(texto) => { setQ(texto); setTag(null); }}
                onTag={filtrarTag}
                onPerfil={setPerfil}
                onVerTendencias={rutaVisible(instancia, "/comunidad/tendencias") ? () => navegar("/comunidad/tendencias") : undefined}
                onAviso={avisar}
              />
            </div>
          </div>
        </div>
      </main>

      {perfilAbierto && (
        <PerfilComunidad
          id={perfilAbierto}
          yo={yo}
          puedeFijar={puedeFijar}
          puedePublicar={puedePublicar}
          onCerrar={() => { setPerfil(null); consumirEnfoque(); }}
          onAbrir={setDetalle}
          onPerfil={setPerfil}
          onTag={filtrarTag}
          onCitar={setCitando}
          onDenunciar={(id) => setDenunciaDe({ tipo: "publicacion", id })}
          onAviso={avisar}
        />
      )}
      {detalleAbierto && (
        <DetallePublicacion
          tipo="publicacion"
          id={detalleAbierto}
          yo={yo}
          puedeFijar={puedeFijar}
          puedePublicar={puedePublicar}
          onCerrar={() => { setDetalle(null); consumirEnfoque(); }}
          onCambio={recargar}
          onPerfil={setPerfil}
          onTag={filtrarTag}
          onCitar={setCitando}
          onDenunciar={(tipo, id) => setDenunciaDe({ tipo, id })}
          onAviso={avisar}
        />
      )}
      {citando && <DialogoCita pub={citando} usuario={usuario} onCerrar={() => setCitando(null)} onPublicado={(m) => { setCitando(null); avisar(m); recargar(); }} />}
      {denunciaDe && (
        <ModalDenuncia
          onCerrar={() => setDenunciaDe(null)}
          onEnviar={async (motivo) => { await denunciar(denunciaDe.tipo, denunciaDe.id, motivo); setDenunciaDe(null); avisar("Gracias: la denuncia llegó a moderación."); }}
        />
      )}
      {moderando && <ModalModeracion onCerrar={() => setModerando(false)} />}
      {creandoDebate && <CreadorDebate onCerrar={() => setCreandoDebate(false)} onCreado={(id) => { setCreandoDebate(false); marcarEnfoque("debate", id); navegar("/comunidad/debates"); }} />}
      {aviso && (
        <div role="status" className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold shadow-2xl c-aparecer ${aviso.tipo === "ok" ? "bg-primary text-on-primary" : "bg-rose-500 text-white"}`}>
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
