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
import type { RecursoNacional, TipoRecurso } from "./components/biblioteca/tiposNacional";
import { normalizar, usarBiblioteca, type Recurso } from "../servicios/biblioteca";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";
import { urlDescarga } from "../servicios/archivos";

// Se fueron los cuatro recursos inventados (uno "de la Escuela Técnica Nº5",
// otro "del Instituto Belgrano", escuelas que no existen). La Biblioteca
// Nacional muestra ahora los recursos reales que el bibliotecario aprobó para
// alcance nacional (Error 2.E.7): la consulta ya trae lo institucional que pasó
// a nacional, no dos bibliotecas separadas.

// Días entre dos fechas (positivo si la fecha es pasada)
const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

// El tipo de la base (documento/guia/video/enlace/libro) traducido al del
// módulo nacional, que es solo presentación.
const TIPO_NACIONAL: Record<Recurso["tipo"], TipoRecurso> = {
  documento: "articulo",
  guia: "pdf",
  video: "video",
  enlace: "articulo",
  libro: "articulo",
};

export default function BibliotecaNacionalPage() {
  const [filtros, setFiltros] = useState<EstadoFiltros>(FILTROS_INICIALES);
  const { recursos, cargando, error, recargar } = usarBiblioteca("nacional");

  // Cada recurso de la base, vestido para este módulo. Los votos van en cero:
  // votar recursos de biblioteca no existe todavía en NEXO (la tabla `votos`
  // es de la comunidad, no de la biblioteca), así que mostrar cualquier otro
  // número sería inventarlo. El día que se agregue, saldrá de acá.
  const nacionales = useMemo<RecursoNacional[]>(() => {
    return (recursos ?? []).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      materia: r.categoria,
      escuela: r.institucion ?? "Nacional",
      tipo: TIPO_NACIONAL[r.tipo],
      votosPositivos: 0,
      votosNegativos: 0,
      fechaPublicacion: r.creadoEn,
    }));
  }, [recursos]);

  // Votar recursos es escritura y no existe como dato: se deja el gesto pero no
  // altera nada (Etapa 5).
  const handleVotar = (id: string, tipo: "positivo" | "negativo") =>
    console.log("Votar recurso", id, tipo);

  // Opciones de filtro derivadas de los datos reales (sin duplicados)
  const materias = useMemo(() => [...new Set(nacionales.map((r) => r.materia))], [nacionales]);
  const escuelas = useMemo(() => [...new Set(nacionales.map((r) => r.escuela))], [nacionales]);

  // BuscarRecursos: texto (sin distinguir tildes, Error 2.E.3) + filtros
  const recursosVisibles = useMemo(() => {
    const q = normalizar(filtros.query.trim());
    return nacionales.filter((r) => {
      if (q && !normalizar(`${r.titulo} ${r.materia} ${r.escuela}`).includes(q)) return false;
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
  }, [nacionales, filtros]);

  // Tendencias por materia: cuántos recursos hay de cada una. Antes se calculaba
  // sobre votos inventados; ahora es un conteo real de lo publicado.
  const tendencias = useMemo<Tendencia[]>(() => {
    const acum = new Map<string, number>();
    for (const r of nacionales) acum.set(r.materia, (acum.get(r.materia) ?? 0) + 1);
    const total = [...acum.values()].reduce((a, b) => a + b, 0) || 1;
    return [...acum.entries()]
      .map(([materia, cant]) => ({ materia, variacion: Math.round((cant / total) * 100) }))
      .sort((a, b) => b.variacion - a.variacion);
  }, [nacionales]);

  const nuevosEstaSemana = useMemo(
    () => nacionales.filter((r) => diasDesde(r.fechaPublicacion) <= 7).length,
    [nacionales],
  );

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  // Abrir un recurso abre de verdad (Error 2.E.4): el enlace tal cual, o la
  // descarga vía /api/archivos/:id con el permiso validado en el servidor.
  const handleAbrir = (id: string) => {
    const r = (recursos ?? []).find((x) => x.id === id);
    if (!r) return;
    if (r.enlaceUrl) window.open(r.enlaceUrl, "_blank", "noopener");
    else if (r.archivoId) window.open(urlDescarga(r.archivoId), "_blank");
  };

  return (
    <div className="bg-[#1C1030] min-h-screen text-[#ecdcff] font-body">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
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
            {cargando ? (
              <Cargando que="la biblioteca nacional" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : recursosVisibles.length > 0 ? (
              recursosVisibles.map((r) => (
                <TarjetaRecursoNacional
                  key={r.id}
                  recurso={r}
                  voto={null}
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
