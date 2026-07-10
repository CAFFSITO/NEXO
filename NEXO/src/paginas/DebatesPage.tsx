import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaDebate, { type Debate, type PosturaVoto } from "./components/comunidad/TarjetaDebate";
import PanelLateralDebates, {
  type DebateReciente,
  type Tendencia,
} from "./components/comunidad/PanelLateralDebates";

type Tab = "feed" | "debates" | "tendencias";

const DEBATES_INICIALES: Debate[] = [
  {
    id: "1",
    titulo: "¿Debería la salud mental ser obligatoria en la currícula?",
    votosAFavor: 152,
    votosEnContra: 14,
    comentarios: 42,
    tiempo: "Hace 2 horas",
    abierto: true,
  },
  {
    id: "2",
    titulo: "¿Es la IA el fin de la creatividad humana?",
    votosAFavor: 87,
    votosEnContra: 53,
    comentarios: 128,
    tiempo: "Hace 5 horas",
    abierto: true,
  },
  {
    id: "3",
    titulo: "¿Deberían eliminarse las calificaciones numéricas?",
    votosAFavor: 201,
    votosEnContra: 82,
    comentarios: 315,
    tiempo: "Hace 1 día",
    abierto: true,
  },
];

const TENDENCIAS: Tendencia[] = [
  { hashtag: "#NeuroPlasticidad", detalle: "1.2k debates esta semana" },
  { hashtag: "#HackathonNexo", detalle: "850 participantes" },
  { hashtag: "#IAyEducacion", detalle: "530 debates activos" },
];

const RECIENTES: DebateReciente[] = [
  {
    iniciales: "MS",
    resumen: '"El impacto de la gamificación..."',
    autor: "Marco Solís",
    tiempo: "15m",
  },
  {
    iniciales: "LP",
    resumen: '"Metodologías ágiles en el aula"',
    autor: "Lucía Pérez",
    tiempo: "45m",
  },
];

export default function DebatesPage() {
  const [debates, setDebates] = useState<Debate[]>(DEBATES_INICIALES);
  const [tab, setTab] = useState<Tab>("debates");
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  // Escritura de debates: perfiles participativos. Preceptor/bibliotecario solo leen.
  const puedeCrearDebate =
    rol === "estudiante" ||
    rol === "profesor" ||
    rol === "admin-academico" ||
    rol === "centro-estudiantes";

  const debatesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return debates;
    return debates.filter((d) => d.titulo.toLowerCase().includes(q));
  }, [debates, busqueda]);

  const handleVotar = (id: string, postura: PosturaVoto) => {
    setDebates((prev) =>
      prev.map((d) => {
        if (d.id !== id || !d.abierto) return d;

        let { votosAFavor, votosEnContra } = d;

        // Quitar voto previo
        if (d.miVoto === "a-favor") votosAFavor -= 1;
        if (d.miVoto === "en-contra") votosEnContra -= 1;

        // Toggle: re-clic en la misma postura = anular voto
        if (d.miVoto === postura) {
          return { ...d, votosAFavor, votosEnContra, miVoto: undefined };
        }

        if (postura === "a-favor") votosAFavor += 1;
        else votosEnContra += 1;

        return { ...d, votosAFavor, votosEnContra, miVoto: postura };
      })
    );
  };

  const handleParticipar = (id: string) => {
    console.log("Participar en debate:", id);
  };

  const handleTendenciaClick = (hashtag: string) => {
    setBusqueda(hashtag.replace("#", ""));
  };

  const handleCrearDebate = () => {
    const titulo = nuevoTitulo.trim();
    if (!titulo) return;

    const nuevo: Debate = {
      id: crypto.randomUUID(),
      titulo,
      votosAFavor: 0,
      votosEnContra: 0,
      comentarios: 0,
      tiempo: "Recién",
      abierto: true,
    };

    setDebates((prev) => [nuevo, ...prev]);
    setNuevoTitulo("");
    setModalAbierto(false);
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/comunidad"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen bg-[#190d2d]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 w-full sticky top-0 z-50 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] shadow-lg shadow-black/20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white uppercase tracking-tight font-headline">
              Comunidad General
            </h1>
            <span className="px-3 py-1 bg-purple-900/40 text-[#C548F5] text-[10px] font-black rounded-full border border-[#C548F5]/20">
              SCHOOL ALPHA
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                search
              </span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-[#2D1B4E] border-none text-sm rounded-full py-2 pl-10 pr-4 w-64 focus:ring-1 focus:ring-[#C548F5] text-white placeholder-white/40"
                placeholder="Buscar debates..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="text-white/60 hover:text-[#C548F5] transition-all relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#C548F5] rounded-full" />
              </button>
              <button className="text-white/60 hover:text-[#C548F5] transition-all">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-8 border-b border-[#2D1B4E] bg-[#1C1030]/40">
          <div className="flex gap-8 pt-4">
            {(["feed", "debates", "tendencias"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm transition-all capitalize ${
                  tab === t
                    ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                    : "text-white/60 hover:text-[#C548F5] font-medium"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 flex gap-8">
          <div className="flex-1 space-y-6">
            {puedeCrearDebate && (
              <div className="flex justify-end">
                <button
                  onClick={() => setModalAbierto(true)}
                  className="flex items-center gap-2 bg-[#C548F5] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#d15aff] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo debate
                </button>
              </div>
            )}

            {debatesFiltrados.length === 0 ? (
              <div className="text-center text-white/40 py-20">
                <span className="material-symbols-outlined text-4xl mb-2 block">forum</span>
                No se encontraron debates.
              </div>
            ) : (
              debatesFiltrados.map((debate) => (
                <TarjetaDebate
                  key={debate.id}
                  debate={debate}
                  onVotar={handleVotar}
                  onParticipar={handleParticipar}
                />
              ))
            )}
          </div>

          <PanelLateralDebates
            tendencias={TENDENCIAS}
            recientes={RECIENTES}
            onTendenciaClick={handleTendenciaClick}
          />
        </div>
      </main>

      {/* Modal Nuevo Debate */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-[#2D1B4E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-headline">Crear nuevo debate</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Pregunta del debate
            </label>
            <textarea
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              placeholder="¿Debería...?"
              rows={3}
              className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 text-sm border border-[#3b2f50] focus:ring-1 focus:ring-[#C548F5] placeholder-white/30 resize-none"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 rounded-full text-sm font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearDebate}
                disabled={!nuevoTitulo.trim()}
                className="bg-[#C548F5] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#d15aff] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
