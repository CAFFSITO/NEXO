import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaPosteo from "./components/comunidad/TarjetaPosteo";
import SidebarTendencias from "./components/comunidad/SidebarTendencias";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import ModalDenuncia from "./components/comunidad/ModalDenuncia";
import ModalModeracion from "./components/comunidad/ModalModeracion";
import {
  usePublicaciones,
  votar,
  crearPublicacion,
  fijarPublicacion,
  denunciar,
  eliminarContenido,
  type ObjetoVotable,
} from "../servicios/comunidad";
import { textoRelativo } from "../servicios/fechas";
import { useInstitucion } from "../servicios/institucion";
import { NAV_POR_ROL } from "./components/shared/navegacionItems";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

// El feed inventado se fue en la Etapa 2. La Etapa 5 le da vida: publicar guarda
// en `publicaciones`, votar es a favor/en contra (único y privado, Error 2.B.1),
// el ícono de comentarios abre el hilo real (2.B.2/2.B.3) y el menú de tres
// puntos denuncia o elimina según el rol (2.B.5). La dirección y el preceptor
// tienen además la bandeja de moderación.

export default function ComunidadPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const { publicaciones, cargando, error, recargar } = usePublicaciones();
  const { institucion } = useInstitucion();
  const [busqueda, setBusqueda] = useState("");
  const [programando, setProgramando] = useState(false);

  const rol = usuario?.rol ?? "estudiante";
  const nombre = usuario?.nombre ?? "Usuario";
  const usuarioId = usuario?.id ?? 0;

  const [texto, setTexto] = useState("");
  // Fecha-hora de publicación programada (valor de un <input datetime-local>).
  // Vacío = "Publicar ahora", que es el modo por defecto (Prompt 13).
  const [programarEn, setProgramarEn] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [denunciaDe, setDenunciaDe] = useState<{ tipo: ObjetoVotable; id: string } | null>(null);
  const [moderando, setModerando] = useState(false);

  // Quién puede publicar en la Comunidad general (arquitectura NEXO):
  // estudiantes, profesores, admin académica y centro de estudiantes.
  // Preceptor y bibliotecario tienen acceso de solo lectura.
  const puedePublicar =
    rol === "estudiante" ||
    rol === "profesor" ||
    rol === "admin-academico" ||
    rol === "centro-estudiantes";

  // La dirección y el preceptor moderan (la ventanilla del servidor vuelve a
  // controlarlo; esto solo decide si se muestra el botón).
  const puedeModerar = rol === "admin-academico" || rol === "preceptor";

  const publicar = async () => {
    if (!texto.trim()) return;
    setPublicando(true);
    setAvisoError(null);
    try {
      // El <input datetime-local> da hora LOCAL ("2026-08-03T15:30"); se pasa a
      // ISO para el servidor, que decide si es futuro (programada) o no. Vacío =
      // publicar ya.
      const publicarEn = programarEn ? new Date(programarEn).toISOString() : null;
      await crearPublicacion(texto.trim(), { publicarEn });
      setTexto("");
      setProgramarEn("");
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublicando(false);
    }
  };

  // Fijar / desfijar (solo la dirección; el servidor vuelve a validarlo).
  const handleFijar = async (id: string, fijado: boolean) => {
    try {
      await fijarPublicacion(id, fijado);
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo fijar la publicación.");
    }
  };

  const handleVotar = async (id: string, postura: "a-favor" | "en-contra") => {
    try {
      await votar("publicacion", id, postura === "a-favor" ? 1 : -1);
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo votar.");
    }
  };

  const handleEliminar = async (tipo: ObjetoVotable, id: string) => {
    try {
      await eliminarContenido(tipo, id);
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre, rol }}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Comunidad" />

        {/* Sub-navegación del módulo Comunidad */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {[
            { label: "Feed", ruta: "/comunidad" },
            { label: "Debates", ruta: "/comunidad/debates" },
            { label: "Tendencias", ruta: "/comunidad/tendencias" },
          ].map((tab) => {
            const activa = tab.ruta === "/comunidad";
            return (
              <button
                key={tab.ruta}
                onClick={() => handleNavegar(tab.ruta)}
                className={`pb-1 font-headline text-sm font-medium transition-all ${
                  activa
                    ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#190d2d]">
          <section className="nexo-community-welcome">
            <div><p className="nexo-eyebrow">{institucion?.nombre ?? "Tu comunidad educativa"}</p>
              <h1>Hola, {nombre.split(" ")[0]}. <span>Seguimos aprendiendo.</span></h1>
              <p>Tu próxima idea, tu próximo logro, tu próxima conversación. Todo empieza acá.</p>
            </div>
            <span className="material-symbols-outlined nexo-welcome-symbol" aria-hidden="true">diversity_3</span>
          </section>
          <div className="nexo-quick-grid">
            {NAV_POR_ROL[rol].filter(i => i.ruta !== "/comunidad").slice(0, 3).map((item, index) => <button className="nexo-quick-card" key={item.ruta} onClick={() => handleNavegar(item.ruta)}>
              <span className={`material-symbols-outlined nexo-quick-icon tone-${index}`} aria-hidden="true">{item.icono}</span>
              <span><strong>{item.label}</strong><small>Explorá tu espacio</small></span>
              <span className="material-symbols-outlined nexo-quick-arrow" aria-hidden="true">arrow_outward</span>
            </button>)}
          </div>
          {/* Columna del feed (izquierda) + previsualización de Tendencias
              (derecha). En pantallas chicas la sidebar se oculta (xl:block) y el
              feed ocupa todo, sin scroll horizontal. */}
          <div className="flex gap-8 items-start">
          <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex flex-wrap gap-3 items-start justify-between max-w-2xl">
            <div>
              <h2 className="text-xl font-bold font-headline text-white mb-1">
                La conversación sigue acá
              </h2>
              <p className="text-on-surface-variant/60 text-sm">
                Ideas, novedades y preguntas de tu comunidad.
              </p>
            </div>
            {puedeModerar && (
              <button
                onClick={() => setModerando(true)}
                className="flex items-center gap-2 bg-[#2D1B4E] border border-orange-400/30 text-orange-300 px-4 py-2 rounded-full text-xs font-bold hover:bg-orange-500/10 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Moderación
              </button>
            )}
          </div>

          {avisoError && (
            <div className="max-w-2xl mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {avisoError}
            </div>
          )}

          {/* Nueva publicación (Error 2.B.4: publicar de verdad) */}
          {puedePublicar ? (
            <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 mb-6 max-w-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{nombre.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    aria-label="Nueva publicación"
                    maxLength={10000}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={2}
                    placeholder="Compartí una idea, una pregunta o algo que aprendiste…"
                    className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500 resize-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    {/* Selector opcional de fecha/hora de publicación. Vacío =
                        "Publicar ahora" (el modo por defecto, Prompt 13). */}
                    <button type="button" onClick={() => { setProgramando(!programando); if (programando) setProgramarEn(""); }} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-lg" aria-hidden="true">schedule</span>{programando ? "Publicar ahora" : "Programar publicación"}</button>
                    {programando && <label className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="material-symbols-outlined text-[18px] text-[#C548F5]">schedule</span>
                      <span>Programar:</span>
                      <input
                        type="datetime-local"
                        value={programarEn}
                        onChange={(e) => setProgramarEn(e.target.value)}
                        className="bg-[#1C1030] text-white rounded-lg px-2 py-1 border border-[#3b2f50] text-xs focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      />
                      {programarEn && (
                        <button
                          type="button"
                          onClick={() => setProgramarEn("")}
                          className="text-gray-500 hover:text-white"
                          aria-label="Publicar ahora"
                          title="Publicar ahora"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </label>}
                    <button
                      onClick={publicar}
                      disabled={!texto.trim() || publicando}
                      className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {publicando ? "Publicando…" : programarEn ? "Programar" : "Publicar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#2D1B4E]/40 border border-[#3b2f50] rounded-lg p-4 mb-8 flex items-center gap-3 text-gray-400 text-sm max-w-2xl">
              <span className="material-symbols-outlined text-[#C548F5]">visibility</span>
              Tenés acceso de solo lectura a la Comunidad general.
            </div>
          )}

          {/* Feed */}
          <div className="max-w-2xl mb-5 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold text-on-surface-variant/70 whitespace-nowrap">PUBLICACIONES</p>
            <label className="flex items-center gap-2 text-on-surface-variant/60"><span className="material-symbols-outlined text-lg" aria-hidden="true">search</span><input aria-label="Buscar publicaciones" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en la comunidad" className="bg-transparent w-full max-w-48 text-xs py-2 outline-none" /></label>
          </div>
          <div className="space-y-6 max-w-2xl">
            {cargando && <Cargando que="el feed de la comunidad" />}
            {error && <Fallo error={error} onReintentar={recargar} />}
            {!cargando && !error && publicaciones?.length === 0 && (
              <Vacio icono="forum" mensaje="Todavía no hay publicaciones en la comunidad." />
            )}
            {publicaciones?.filter(p => `${p.contenido} ${p.autor}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map((posteo) => (
              <TarjetaPosteo
                key={posteo.id}
                id={posteo.id}
                autor={posteo.autor}
                rol={posteo.autorRol}
                rolLector={rol}
                esAutor={posteo.autorId === String(usuarioId)}
                contenido={posteo.contenido}
                fecha={textoRelativo(posteo.creadoEn)}
                avatarUrl={posteo.autorAvatar}
                votosAFavor={posteo.votosAFavor}
                votosEnContra={posteo.votosEnContra}
                comentarios={posteo.comentarios}
                miVoto={posteo.miVoto}
                fijado={posteo.fijado}
                programada={posteo.programada}
                publicarEn={posteo.publicarEn}
                onVotar={(postura) => handleVotar(posteo.id, postura)}
                onComentar={() => setDetalleId(posteo.id)}
                onDenunciar={(tipo, id) => setDenunciaDe({ tipo, id })}
                onEliminar={handleEliminar}
                onFijar={rol === "admin-academico" ? handleFijar : undefined}
              />
            ))}
            {busqueda && publicaciones && !publicaciones.some(p => `${p.contenido} ${p.autor}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())) && <Vacio icono="search_off" mensaje="No hay publicaciones que coincidan con tu búsqueda." />}
          </div>
          </div>

          <SidebarTendencias onVer={() => handleNavegar("/comunidad/tendencias")} />
          </div>
        </div>
      </main>

      {detalleId && (
        <ModalDetalleComunidad
          tipo="publicacion"
          id={detalleId}
          rol={rol}
          usuarioId={usuarioId}
          onCerrar={() => setDetalleId(null)}
          onCambio={recargar}
        />
      )}

      {denunciaDe && (
        <ModalDenuncia
          onCerrar={() => setDenunciaDe(null)}
          onEnviar={async (motivo) => {
            await denunciar(denunciaDe.tipo, denunciaDe.id, motivo);
            setDenunciaDe(null);
          }}
        />
      )}

      {moderando && <ModalModeracion onCerrar={() => setModerando(false)} />}
    </div>
  );
}
