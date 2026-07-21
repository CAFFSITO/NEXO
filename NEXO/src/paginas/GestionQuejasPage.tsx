// Vista: Ver Quejas Estudiantes (Centro de Estudiantes / Admin Académica)
// Sistema de retroalimentación estudiantil anónima (sección 14.14).
//
// Se fueron las cuatro quejas escritas a mano y la variación mensual fija: las
// quejas salen de la tabla `quejas` (sin autor: el anonimato es estructural,
// Error 8.B.1), las no vistas van arriba (Error 8.B.5) y la estadística de
// evolución mes contra mes la calcula el servidor (Error 8.B.4).

import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaQueja, {
  type Queja,
  type CategoriaQueja,
} from "./components/centro-estudiantes/TarjetaQueja";
import ResumenQuejasCard, {
  type DistribucionCategoria,
} from "./components/centro-estudiantes/ResumenQuejasCard";
import TendenciasQuejasCard from "./components/centro-estudiantes/TendenciasQuejasCard";
import { usarQuejas, marcarQuejaVista } from "../servicios/quejas";
import { textoRelativo } from "../servicios/fechas";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

const CATEGORIAS: CategoriaQueja[] = [
  "Metodología",
  "Convivencia",
  "Infraestructura",
  "Otro",
];

type FiltroCategoria = "todas" | CategoriaQueja;

export default function GestionQuejasPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { quejas: datos, estadistica, cargando, error, recargar } = usarQuejas();

  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todas");
  const [busqueda, setBusqueda] = useState("");

  // Abrir/registrar una queja como vista guarda quién la LEYÓ, no quién la
  // escribió (14.14). Después se recarga para reordenar (las vistas bajan).
  const marcarComoVista = async (id: string) => {
    try {
      await marcarQuejaVista(id);
    } finally {
      recargar();
    }
  };

  // Adapta las quejas del servidor a lo que dibuja la tarjeta.
  const quejas = useMemo<Queja[]>(
    () =>
      (datos ?? []).map((q) => ({
        id: q.id,
        // La categoría es texto de la base; se muestra tal cual (el tipo cerrado
        // es solo para el color, y las desconocidas se ven igual).
        categoria: q.categoria as CategoriaQueja,
        texto: q.contenido,
        tiempo: textoRelativo(q.creadoEn),
        vista: q.vista,
      })),
    [datos],
  );

  // Feed filtrado (categoría + texto).
  const quejasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return quejas.filter((queja) => {
      const coincideCategoria =
        filtroCategoria === "todas" || queja.categoria === filtroCategoria;
      const coincideTexto = q === "" || queja.texto.toLowerCase().includes(q);
      return coincideCategoria && coincideTexto;
    });
  }, [quejas, filtroCategoria, busqueda]);

  const totales = quejas.length;
  const nuevas = useMemo(() => quejas.filter((q) => !q.vista).length, [quejas]);

  // Distribución sobre las categorías conocidas (las demás caen en "Otro").
  const distribucion = useMemo<DistribucionCategoria[]>(
    () =>
      CATEGORIAS.map((categoria) => ({
        categoria,
        cantidad: quejas.filter((q) =>
          categoria === "Otro"
            ? !CATEGORIAS.slice(0, 3).includes(q.categoria)
            : q.categoria === categoria,
        ).length,
      })),
    [quejas],
  );

  // El tema más mencionado del mes, de la estadística real del servidor.
  const temaMasMencionado = useMemo<CategoriaQueja | null>(() => {
    const top = estadistica?.porCategoria?.[0];
    return top ? (top.categoria as CategoriaQueja) : null;
  }, [estadistica]);

  if (!usuario) return null;

  return (
    <div className="flex bg-background min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] flex-1 pt-8 px-8 pb-12 max-w-7xl">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold font-headline text-white tracking-tight">
              Quejas Estudiantiles
            </h2>
            <p className="text-slate-400 mt-1">
              Retroalimentación anónima de la comunidad estudiantil.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              htmlFor="filtro-categoria"
              className="text-xs font-bold uppercase tracking-widest text-slate-500"
            >
              Vista:
            </label>
            <select
              id="filtro-categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as FiltroCategoria)}
              className="bg-surface-container border-none text-on-surface rounded-full px-6 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <option value="todas">Filtrar por categoría</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Barra de búsqueda ── */}
        <div className="relative mb-6 max-w-md">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar reporte..."
            type="text"
            className="bg-surface-container/60 border-none rounded-full pl-4 pr-10 py-2.5 text-sm w-full focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder:text-slate-500"
          />
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
            search
          </span>
        </div>

        {cargando && <Cargando que="las quejas" />}
        {error && <Fallo error={error} onReintentar={recargar} />}

        {/* ── Grid ── */}
        {!cargando && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna izquierda: Feed */}
            <div className="lg:col-span-8 space-y-4">
              {quejasVisibles.length > 0 ? (
                quejasVisibles.map((queja) => (
                  <TarjetaQueja
                    key={queja.id}
                    queja={queja}
                    onMarcarVista={marcarComoVista}
                  />
                ))
              ) : (
                <div className="bg-surface border border-surface-container-highest rounded-lg p-10 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                    inbox
                  </span>
                  No hay quejas que coincidan con tu búsqueda.
                </div>
              )}
            </div>

            {/* Columna derecha: Estadísticas */}
            <div className="lg:col-span-4 space-y-6">
              <ResumenQuejasCard
                totales={totales}
                nuevas={nuevas}
                distribucion={distribucion}
              />
              <TendenciasQuejasCard
                temaMasMencionado={temaMasMencionado}
                variacionPorcentual={estadistica?.variacionPorcentual ?? 0}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
