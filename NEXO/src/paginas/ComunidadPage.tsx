import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaPosteo from "./components/comunidad/TarjetaPosteo";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import ModalDenuncia from "./components/comunidad/ModalDenuncia";
import ModalModeracion from "./components/comunidad/ModalModeracion";
import {
  usarPublicaciones,
  votar,
  crearPublicacion,
  denunciar,
  eliminarContenido,
  type ObjetoVotable,
} from "../servicios/comunidad";
import { textoRelativo } from "../servicios/fechas";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

// El feed inventado se fue en la Etapa 2. La Etapa 5 le da vida: publicar guarda
// en `publicaciones`, votar es a favor/en contra (único y privado, Error 2.B.1),
// el ícono de comentarios abre el hilo real (2.B.2/2.B.3) y el menú de tres
// puntos denuncia o elimina según el rol (2.B.5). La dirección y el preceptor
// tienen además la bandeja de moderación.

export default function ComunidadPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const { publicaciones, cargando, error, recargar } = usarPublicaciones();

  const rol = usuario?.rol ?? "estudiante";
  const nombre = usuario?.nombre ?? "Usuario";
  const usuarioId = usuario?.id ?? 0;

  const [texto, setTexto] = useState("");
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
      await crearPublicacion(texto.trim());
      setTexto("");
      recargar();
    } catch (e) {
      setAvisoError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublicando(false);
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

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
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
          {/* Header */}
          <div className="mb-10 flex items-start justify-between max-w-2xl">
            <div>
              <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-2">
                Comunidad NEXO
              </h1>
              <p className="text-gray-400 font-body">
                Conecta con otros estudiantes, comparte preguntas y crea una red de aprendizaje colaborativo.
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
            <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6 mb-8 max-w-2xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{nombre.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={2}
                    placeholder="¿Qué está en tu mente?"
                    className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500 resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={publicar}
                      disabled={!texto.trim() || publicando}
                      className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {publicando ? "Publicando…" : "Publicar"}
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
          <div className="space-y-6 max-w-2xl">
            {cargando && <Cargando que="el feed de la comunidad" />}
            {error && <Fallo error={error} onReintentar={recargar} />}
            {!cargando && !error && publicaciones?.length === 0 && (
              <Vacio icono="forum" mensaje="Todavía no hay publicaciones en la comunidad." />
            )}
            {publicaciones?.map((posteo) => (
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
                onVotar={(postura) => handleVotar(posteo.id, postura)}
                onComentar={() => setDetalleId(posteo.id)}
                onDenunciar={(tipo, id) => setDenunciaDe({ tipo, id })}
                onEliminar={handleEliminar}
              />
            ))}
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
