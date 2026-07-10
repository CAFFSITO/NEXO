import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import DebateDestacadoCard from "./components/tendencias/DebateDestacadoCard";
import ArticuloTecnicoCard from "./components/tendencias/ArticuloTecnicoCard";
import PublicacionComunidadCard from "./components/tendencias/PublicacionComunidadCard";
import DebateActivoCard from "./components/tendencias/DebateActivoCard";

// ─── TIPOS ──────────────────────────────────────────────

type Alcance = "global" | "mi-red";

interface DebateDestacado {
  id: string;
  titulo: string;
  participaciones: number;
  rankingTrending: number;
  avataresParticipantes: string[];
  totalRestante: number;
}

interface Articulo {
  id: string;
  titulo: string;
  descripcion: string;
  lecturas: number;
  icono: string;
}

interface Publicacion {
  id: string;
  titulo: string;
  icono: string;
  likes: number;
  autor: string;
}

interface DebateActivo {
  id: string;
  titulo: string;
  icono: string;
  respuestas: number;
  enVivo: boolean;
}

interface FeedTendencias {
  destacado: DebateDestacado;
  articulo: Articulo;
  publicacion: Publicacion;
  debateActivo: DebateActivo;
}

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

const FEEDS: Record<Alcance, FeedTendencias> = {
  global: {
    destacado: {
      id: "deb-1",
      titulo: "¿Es la IA el fin de la creatividad humana?",
      participaciones: 2400,
      rankingTrending: 1,
      avataresParticipantes: [avatar("Lucia"), avatar("Tomas"), avatar("Mara")],
      totalRestante: 2000,
    },
    articulo: {
      id: "art-1",
      titulo: "Impacto de la Computación Cuántica en la Educación",
      descripcion:
        "Exploramos cómo el procesamiento cuántico transformará los modelos de aprendizaje adaptativo y la simulación científica escolar.",
      lecturas: 1800,
      icono: "memory",
    },
    publicacion: {
      id: "pub-1",
      titulo: "Mejores recursos para Python 2026",
      icono: "code",
      likes: 950,
      autor: "dev_marco",
    },
    debateActivo: {
      id: "act-1",
      titulo: "Ética en la manipulación genética",
      icono: "biotech",
      respuestas: 700,
      enVivo: true,
    },
  },
  "mi-red": {
    destacado: {
      id: "deb-2",
      titulo: "¿Conviene rendir libre las materias que más nos cuestan?",
      participaciones: 320,
      rankingTrending: 1,
      avataresParticipantes: [avatar("Julieta"), avatar("Nico"), avatar("Sol")],
      totalRestante: 120,
    },
    articulo: {
      id: "art-2",
      titulo: "Técnicas de estudio basadas en evidencia para 4° año",
      descripcion:
        "Recuperación activa y práctica espaciada: un repaso práctico de los métodos que mejor funcionan para preparar parciales.",
      lecturas: 540,
      icono: "psychology",
    },
    publicacion: {
      id: "pub-2",
      titulo: "Apuntes compartidos de Historia — Renacimiento",
      icono: "history_edu",
      likes: 210,
      autor: "martin_lopez",
    },
    debateActivo: {
      id: "act-2",
      titulo: "¿Deberíamos tener más salidas educativas?",
      icono: "groups",
      respuestas: 86,
      enVivo: false,
    },
  },
};

// ─── COMPONENTE ─────────────────────────────────────────

export default function TendenciasPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  // El estudiante configura su feed desde Objetivos; el resto vuelve a Comunidad.
  const rutaConfigFeed = rol === "estudiante" ? "/objetivos" : "/comunidad";
  const labelConfigFeed = rol === "estudiante" ? "Configurar mi Feed" : "Ir a Comunidad";

  const [alcance, setAlcance] = useState<Alcance>("global");
  const [debatesUnidos, setDebatesUnidos] = useState<string[]>([]);
  const [debatesParticipando, setDebatesParticipando] = useState<string[]>([]);
  const [guardados, setGuardados] = useState<string[]>([]);
  const [likesExtra, setLikesExtra] = useState<Record<string, number>>({});
  const [actualizadoEn] = useState(() => Date.now());

  const feed = FEEDS[alcance];

  const minutosDesdeActualizacion = useMemo(
    () => Math.max(1, Math.round((Date.now() - actualizadoEn) / 60000)),
    [actualizadoEn]
  );

  const unirseDebate = (id: string) =>
    setDebatesUnidos((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const participarDebate = (id: string) =>
    setDebatesParticipando((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const toggleGuardado = (id: string) =>
    setGuardados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/comunidad/tendencias"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Tendencias" />

        <div className="flex-1 overflow-y-auto p-8 bg-[#1C1030]">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 text-[#C548F5] mb-2">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                  <span className="text-xs font-bold tracking-[0.2em] uppercase">
                    Popular ahora
                  </span>
                </div>
                <h1 className="text-4xl font-extrabold text-white font-headline tracking-tight">
                  Tendencias del momento
                </h1>
              </div>

              {/* Toggle alcance */}
              <div className="flex bg-surface-container rounded-full p-1 border border-white/5">
                {(["global", "mi-red"] as Alcance[]).map((opcion) => (
                  <button
                    key={opcion}
                    onClick={() => setAlcance(opcion)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                      alcance === opcion
                        ? "bg-[#C548F5] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opcion === "global" ? "Global" : "Mi Red"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-12 gap-6">
              <DebateDestacadoCard
                titulo={feed.destacado.titulo}
                participaciones={feed.destacado.participaciones}
                rankingTrending={feed.destacado.rankingTrending}
                avataresParticipantes={feed.destacado.avataresParticipantes}
                totalRestante={feed.destacado.totalRestante}
                unido={debatesUnidos.includes(feed.destacado.id)}
                onUnirse={() => unirseDebate(feed.destacado.id)}
              />

              <ArticuloTecnicoCard
                titulo={feed.articulo.titulo}
                descripcion={feed.articulo.descripcion}
                lecturas={feed.articulo.lecturas}
                icono={feed.articulo.icono}
                onAbrir={() => handleNavegar(`/biblioteca/articulo/${feed.articulo.id}`)}
              />

              <PublicacionComunidadCard
                titulo={feed.publicacion.titulo}
                icono={feed.publicacion.icono}
                likes={feed.publicacion.likes + (likesExtra[feed.publicacion.id] ?? 0)}
                autor={feed.publicacion.autor}
                guardado={guardados.includes(feed.publicacion.id)}
                onToggleGuardado={() => toggleGuardado(feed.publicacion.id)}
                onLike={() =>
                  setLikesExtra((prev) => ({
                    ...prev,
                    [feed.publicacion.id]: (prev[feed.publicacion.id] ?? 0) + 1,
                  }))
                }
              />

              <DebateActivoCard
                titulo={feed.debateActivo.titulo}
                icono={feed.debateActivo.icono}
                respuestas={feed.debateActivo.respuestas}
                enVivo={feed.debateActivo.enVivo}
                participando={debatesParticipando.includes(feed.debateActivo.id)}
                onParticipar={() => participarDebate(feed.debateActivo.id)}
              />
            </div>

            {/* Footer CTA */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-between p-8 rounded-lg bg-gradient-to-r from-[#2D1B4E] to-[#160D28] border border-white/5">
              <div className="mb-6 md:mb-0">
                <h4 className="text-xl font-bold text-white mb-1">¿Querés ver más?</h4>
                <p className="text-slate-400 text-sm">
                  Explorá las tendencias personalizadas según tus intereses de aprendizaje.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Actualizado hace
                  </p>
                  <p className="text-white font-bold">
                    {minutosDesdeActualizacion} min
                  </p>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <button
                  onClick={() => handleNavegar(rutaConfigFeed)}
                  className="px-8 py-3 bg-white text-[#160D28] rounded-full font-bold hover:bg-[#edb1ff] transition-all transform active:scale-95"
                >
                  {labelConfigFeed}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
