import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaRecursoNacional from "./components/biblioteca/TarjetaRecursoNacional";
import FiltrosNacional, {
  FILTROS_INICIALES,
  type EstadoFiltros,
} from "./components/biblioteca/FiltrosNacional";
import PanelTendencias, { type Tendencia } from "./components/biblioteca/PanelTendencias";
import WidgetNovedades from "./components/biblioteca/WidgetNovedades";
import type { RecursoNacional, Voto } from "./components/biblioteca/tiposNacional";

// ─── Datos de ejemplo (español rioplatense) ──────────────
const RECURSOS: RecursoNacional[] = [
  {
    id: "1",
    titulo: "Guía completa de Funciones Cuadráticas",
    materia: "Matemática",
    escuela: "Colegio San Martín",
    tipo: "pdf",
    votosPositivos: 142,
    votosNegativos: 4,
    fechaPublicacion: "2026-06-22",
  },
  {
    id: "2",
    titulo: "Video: El eje intestino-cerebro explicado",
    materia: "Biología",
    escuela: "Escuela Técnica Nº5",
    tipo: "video",
    votosPositivos: 89,
    votosNegativos: 2,
    fechaPublicacion: "2026-06-18",
  },
  {
    id: "3",
    titulo: "Línea de tiempo Revolución de Mayo",
    materia: "Historia",
    escuela: "Instituto Belgrano",
    tipo: "linea-tiempo",
    votosPositivos: 76,
    votosNegativos: 9,
    fechaPublicacion: "2026-05-30",
  },
  {
    id: "4",
    titulo: "Simulador de parábolas interactivo",
    materia: "Matemática",
    escuela: "Colegio San Martín",
    tipo: "simulador",
    votosPositivos: 61,
    votosNegativos: 3,
    fechaPublicacion: "2026-02-10",
  },
];

// Días entre dos fechas (positivo si la fecha es pasada)
const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

export default function BibliotecaNacionalPage() {
  // Voto del usuario por recurso (un solo voto por recurso, anónimo)
  const [votos, setVotos] = useState<Record<string, Voto>>({});
  const [filtros, setFiltros] = useState<EstadoFiltros>(FILTROS_INICIALES);


  // VotarRecurso: alterna el voto. Si ya estaba ese tipo, lo quita; si era otro, lo cambia.
  const handleVotar = (id: string, tipo: "positivo" | "negativo") => {
    setVotos((prev) => ({
      ...prev,
      [id]: prev[id] === tipo ? null : tipo,
    }));
  };

  // Opciones de filtro derivadas de los datos (sin duplicados)
  const materias = useMemo(() => [...new Set(RECURSOS.map((r) => r.materia))], []);
  const escuelas = useMemo(() => [...new Set(RECURSOS.map((r) => r.escuela))], []);

  // BuscarRecursos: aplica texto + materia + tipo + escuela + fecha
  const recursosVisibles = useMemo(() => {
    const q = filtros.query.trim().toLowerCase();
    return RECURSOS.filter((r) => {
      if (q && !`${r.titulo} ${r.materia} ${r.escuela}`.toLowerCase().includes(q)) return false;
      if (filtros.materia !== "todos" && r.materia !== filtros.materia) return false;
      if (filtros.tipo !== "todos" && r.tipo !== filtros.tipo) return false;
      if (filtros.escuela !== "todos" && r.escuela !== filtros.escuela) return false;

      if (filtros.fecha !== "todos") {
        const dias = diasDesde(r.fechaPublicacion);
        if (filtros.fecha === "recientes" && dias > 14) return false;
        if (filtros.fecha === "mes" && dias > 30) return false;
        if (filtros.fecha === "historico" && dias <= 30) return false;
      }
      return true;
    });
  }, [filtros]);

  // Tendencias: materias ordenadas por puntaje neto de votos (proxy de "más votado reciente")
  const tendencias = useMemo<Tendencia[]>(() => {
    const acum = new Map<string, number>();
    for (const r of RECURSOS) {
      const neto = r.votosPositivos - r.votosNegativos;
      acum.set(r.materia, (acum.get(r.materia) ?? 0) + neto);
    }
    const total = [...acum.values()].reduce((a, b) => a + b, 0) || 1;
    return [...acum.entries()]
      .map(([materia, neto]) => ({ materia, variacion: Math.round((neto / total) * 100) }))
      .sort((a, b) => b.variacion - a.variacion);
  }, []);

  // Recursos nuevos esta semana (últimos 7 días)
  const nuevosEstaSemana = useMemo(
    () => RECURSOS.filter((r) => diasDesde(r.fechaPublicacion) <= 7).length,
    [],
  );

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  const handleAbrir = (id: string) => console.log("Abrir recurso:", id);

  return (
    <div className="bg-[#1C1030] min-h-screen text-[#ecdcff] font-body">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/biblioteca/nacional"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      {/* Top App Bar: tabs Nacional / Institucional */}
      <header className="fixed top-0 right-0 left-[220px] h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-fuchsia-900/20 z-40 flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <h1 className="font-headline font-extrabold text-white text-lg tracking-tight">Biblioteca</h1>
          <nav className="flex gap-6">
            <button className="text-sm font-medium text-fuchsia-500 border-b-2 border-fuchsia-500 pb-1">
              Nacional
            </button>
            <button
              onClick={() => handleNavegar("/biblioteca/institucional")}
              className="text-sm font-medium text-slate-400 hover:text-fuchsia-400 transition-colors"
            >
              Institucional
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-fuchsia-400 transition-colors">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="p-2 text-slate-400 hover:text-fuchsia-400 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-fuchsia-500 rounded-full" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-24 px-8 pb-12 min-h-screen">
        <FiltrosNacional
          filtros={filtros}
          materias={materias}
          escuelas={escuelas}
          onChange={setFiltros}
        />

        <div className="grid grid-cols-10 gap-8">
          {/* Feed principal (70%) */}
          <div className="col-span-7 flex flex-col gap-4">
            {recursosVisibles.length > 0 ? (
              recursosVisibles.map((r) => (
                <TarjetaRecursoNacional
                  key={r.id}
                  recurso={r}
                  voto={votos[r.id] ?? null}
                  onVotar={handleVotar}
                  onAbrir={handleAbrir}
                />
              ))
            ) : (
              <div className="text-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-4xl block mb-3">search_off</span>
                <p>No se encontraron recursos con esos filtros.</p>
              </div>
            )}
          </div>

          {/* Sidebar derecho (30%) */}
          <div className="col-span-3 space-y-6">
            <PanelTendencias
              tendencias={tendencias}
              onSeleccionar={(materia) => setFiltros((f) => ({ ...f, materia }))}
            />
            <WidgetNovedades
              cantidad={nuevosEstaSemana}
              onVerNovedades={() => setFiltros((f) => ({ ...f, fecha: "recientes" }))}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
