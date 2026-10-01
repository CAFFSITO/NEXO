// src/paginas/PortalCentroEstudiantesPage.tsx
// VISTA: Nuestro Portal (Centro de Estudiantes).
// Todo sale del servidor y de las MISMAS tablas que el resto de la aplicación:
// los artículos son las publicaciones reales de la comunidad, las quejas salen
// de /api/quejas y los debates de /api/comunidad/debates. Antes esta pantalla
// tenía tres artículos, tres eventos, tres categorías de queja y dos debates
// escritos a mano, un usuario fijo y un calendario clavado en mayo de 2025
// (tema transversal 2 y Error 6.E.10).

import { useMemo, useState } from "react";
import ModalDetalleComunidad from "./components/comunidad/ModalDetalleComunidad";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ArticuloCard from "./components/centro-estudiantes/ArticuloCard";
import CalendarioWidget, {
  type EventoCentro,
} from "./components/centro-estudiantes/CalendarioWidget";
import QuejasWidget from "./components/centro-estudiantes/QuejasWidget";
import DebatesWidget from "./components/centro-estudiantes/DebatesWidget";
import { usePublicaciones, useDebates, votar } from "../servicios/comunidad";
import { useQuejas } from "../servicios/quejas";
import { useCalendario } from "../servicios/calendario";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { fechaCorta } from "../servicios/fechas";

export default function PortalCentroEstudiantesPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const { institucion } = useInstitucion();
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState("");

  const { publicaciones, cargando, error, recargar } = usePublicaciones();
  const { debates } = useDebates();
  const { noVistas, estadistica } = useQuejas();
  const { datos: calendario } = useCalendario();

  // "Nuestros artículos" = las publicaciones del Centro de Estudiantes en la
  // comunidad real: lo que se publica acá lo ven todos (nota transversal,
  // sección 4 del informe). Si el Centro todavía no publicó nada, se ve vacío.
  const articulos = useMemo(
    () => (publicaciones ?? []).filter((p) => p.autorRol === "centro-estudiantes"),
    [publicaciones]
  );

  // Votar acá es el MISMO voto de la comunidad (único y privado, Error 2.B.1).
  const handleVotar = async (id: string) => {
    try {
      setErrorAccion("");
      await votar("publicacion", id, 1);
      recargar();
    } catch (e) { setErrorAccion(e instanceof Error ? e.message : "No se pudo registrar el voto."); }
  };

  // Eventos del mes actual real, para el widget (nada clavado en mayo 2025).
  const hoy = new Date();
  const eventosDelMes: EventoCentro[] = useMemo(() => {
    return (calendario?.eventos ?? [])
      .map((e) => ({
        fecha: e.fecha,
        dia: Number(e.fecha.slice(8, 10)),
        titulo: e.titulo,
        detalle: e.tipo,
      }));
  }, [calendario]);

  const categoriasQuejas = useMemo(
    () => (estadistica?.porCategoria ?? []).map((c) => ({ categoria: c.categoria, cantidad: c.n })),
    [estadistica]
  );

  const debatesWidget = useMemo(
    () =>
      (debates ?? []).slice(0, 3).map((d) => ({
        id: d.id,
        titulo: d.titulo,
        participantes: d.participantes,
        tiempo: fechaCorta(d.creadoEn),
      })),
    [debates]
  );

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex-1 p-8">
        {/* Header Banner */}
        <header className="relative overflow-hidden rounded-lg mb-8 bg-gradient-to-r from-[#2D1B4E] to-[#3D2A6B] p-6 lg:p-10 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center shadow-lg border border-white/5">
          <div className="z-10">
            <h1 className="text-3xl font-headline font-extrabold text-white mb-2 tracking-tight">
              {["Centro de Estudiantes", institucion?.nombre].filter(Boolean).join(" — ")}
            </h1>
            <p className="text-on-surface-variant text-lg font-medium opacity-90">
              {subtituloInstitucional(institucion) || "Representando a la comunidad estudiantil"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 z-10 shrink-0">
            {/* Publicar un artículo es publicar en la comunidad real: se hace
                desde el compositor del Feed, que guarda en `publicaciones`. */}
            <button
              onClick={() => handleNavegar("/comunidad")}
              className="bg-[#C548F5] hover:bg-[#d15aff] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(197,72,245,0.4)]"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Nuevo artículo
            </button>
            <button
              onClick={() => handleNavegar("/comunidad/calendario")}
              className="bg-[#2D1B4E] border border-white/10 hover:bg-[#3D2A6B] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-xl">event</span>
              Crear evento
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#C548F5] opacity-10 rounded-full blur-[100px]" />
        </header>

        {errorAccion && <p role="alert" className="text-red-300 text-sm mb-4">{errorAccion}</p>}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Columna izquierda: Artículos (publicaciones reales del Centro) */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
              <h2 className="text-2xl font-headline font-bold text-white flex items-center gap-3">
                <span className="material-symbols-outlined text-[#C548F5]">article</span>
                Nuestros Artículos
              </h2>
              <button
                onClick={() => handleNavegar("/comunidad")}
                className="text-on-surface-variant hover:text-[#C548F5] text-sm font-medium flex items-center gap-1 transition-colors"
              >
                Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {cargando && <Cargando que="los artículos" />}
            {error && <Fallo error={error} onReintentar={recargar} />}
            {publicaciones && articulos.length === 0 && (
              <Vacio
                icono="article"
                mensaje="El Centro todavía no publicó artículos. Publicá el primero desde la Comunidad."
              />
            )}

            {articulos.map((a) => (
              <ArticuloCard
                key={a.id}
                titulo={a.contenido.length > 70 ? `${a.contenido.slice(0, 70)}…` : a.contenido}
                resumen={a.contenido}
                tags={[]}
                autor={a.autor}
                autorAvatarUrl={a.autorAvatar}
                votos={a.votosAFavor - a.votosEnContra}
                votado={a.miVoto === "a-favor"}
                onVotar={() => handleVotar(a.id)}
                onLeerMas={() => setDetalleId(a.id)}
              />
            ))}
          </div>

          {/* Columna derecha: Widgets con datos reales */}
          <div className="w-full xl:w-80 shrink-0 space-y-6">
            <CalendarioWidget
              anioInicial={hoy.getFullYear()}
              mesInicial={hoy.getMonth()}
              eventos={eventosDelMes}
            />
            <QuejasWidget
              categorias={categoriasQuejas}
              nuevas={noVistas}
              onVerTodas={() => handleNavegar("/centro-estudiantes/quejas")}
            />
            <DebatesWidget
              debates={debatesWidget}
              onGestionar={() => handleNavegar("/comunidad/debate")}
            />
          </div>
        </div>
      </main>
      {detalleId && <ModalDetalleComunidad tipo="publicacion" id={detalleId} rol={usuario.rol} usuarioId={usuario.id} onCerrar={()=>setDetalleId(null)} onCambio={recargar} />}
    </div>
  );
}
