// Vista: Ver Quejas Estudiantes (Centro de Estudiantes / Admin Académica)
// Sistema de retroalimentación estudiantil anónima.
// Lógica: filtro por categoría, búsqueda por texto, marcar como vista,
// y estadísticas (totales / nuevas / distribución / tendencias) derivadas de los datos.

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

const CATEGORIAS: CategoriaQueja[] = [
  "Metodología",
  "Convivencia",
  "Infraestructura",
  "Otro",
];

const QUEJAS_INICIALES: Queja[] = [
  {
    id: "1",
    categoria: "Metodología",
    texto:
      "En Matemática siempre hacemos lo mismo: el profesor explica y nosotros copiamos. Me gustaría que sea algo más participativo o que usemos la compu más seguido para graficar, se hace muy pesado estar dos horas escribiendo sin entender mucho.",
    tiempo: "Hace 15 min",
    vista: false,
  },
  {
    id: "2",
    categoria: "Convivencia",
    texto:
      "Hay un grupo de chicos que siempre molesta en el recreo cerca del kiosco. Tiran pelotas fuerte y no dejan pasar a los más chicos. Ya se les dijo varias veces pero no hacen caso. Sería bueno que un preceptor se quede cerca de esa zona un rato.",
    tiempo: "Hace 2 horas",
    vista: false,
  },
  {
    id: "3",
    categoria: "Infraestructura",
    texto:
      "Los baños del segundo piso siempre están sucios y no hay papel después del mediodía. Por favor revisen la frecuencia de limpieza en ese turno.",
    tiempo: "Ayer, 14:30",
    vista: true,
  },
  {
    id: "4",
    categoria: "Metodología",
    texto:
      "Me gustaría que en Lengua podamos elegir los libros que leemos para los trabajos prácticos, al menos uno por trimestre. Los que nos dan a veces son muy viejos y no enganchan a nadie.",
    tiempo: "23 May, 10:15",
    vista: true,
  },
];

// Variación respecto al mes anterior (dato externo / backend en producción).
const VARIACION_MENSUAL = 20;

type FiltroCategoria = "todas" | CategoriaQueja;

export default function GestionQuejasPage() {
  const [quejas, setQuejas] = useState<Queja[]>(QUEJAS_INICIALES);
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todas");
  const [busqueda, setBusqueda] = useState("");

  const [usuario] = useState({
    nombre: "Centro de Estudiantes",
    rol: "centro-estudiantes" as const,
  });

  // ── Acciones ──
  const marcarComoVista = (id: string) =>
    setQuejas((prev) =>
      prev.map((q) => (q.id === id ? { ...q, vista: true } : q))
    );

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  // ── Feed filtrado (categoría + texto) ──
  const quejasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return quejas.filter((queja) => {
      const coincideCategoria =
        filtroCategoria === "todas" || queja.categoria === filtroCategoria;
      const coincideTexto = q === "" || queja.texto.toLowerCase().includes(q);
      return coincideCategoria && coincideTexto;
    });
  }, [quejas, filtroCategoria, busqueda]);

  // ── Estadísticas derivadas (sobre el total, no sobre el filtro) ──
  const totales = quejas.length;
  const nuevas = useMemo(() => quejas.filter((q) => !q.vista).length, [quejas]);

  const distribucion = useMemo<DistribucionCategoria[]>(
    () =>
      CATEGORIAS.map((categoria) => ({
        categoria,
        cantidad: quejas.filter((q) => q.categoria === categoria).length,
      })),
    [quejas]
  );

  const temaMasMencionado = useMemo<CategoriaQueja | null>(() => {
    const top = distribucion.reduce(
      (acc, d) => (d.cantidad > acc.cantidad ? d : acc),
      { categoria: null as CategoriaQueja | null, cantidad: 0 }
    );
    return top.categoria;
  }, [distribucion]);

  return (
    <div className="flex bg-background min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        rutaActiva="/centro-estudiantes/quejas"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

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
              onChange={(e) =>
                setFiltroCategoria(e.target.value as FiltroCategoria)
              }
              className="bg-surface-container border-none text-on-surface rounded-full px-6 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <option value="todas">Filtrar por categoría</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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

        {/* ── Grid ── */}
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
              variacionPorcentual={VARIACION_MENSUAL}
            />

            {/* Tarjeta de soporte */}
            <div className="rounded-lg p-6 bg-gradient-to-br from-primary/20 to-tertiary/20 border border-primary/20 overflow-hidden relative">
              <h4 className="text-white font-bold mb-2">
                ¿Necesitás elevar esto?
              </h4>
              <p className="text-xs text-on-surface-variant mb-4">
                Si considerás que una queja requiere intervención directa,
                contactá al delegado de curso.
              </p>
              <button className="bg-white text-surface text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-fixed transition-colors">
                Hablar con soporte
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
