import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import ArticuloCard from "./components/centro-estudiantes/ArticuloCard";
import CalendarioWidget, {
  type EventoCentro,
} from "./components/centro-estudiantes/CalendarioWidget";
import QuejasWidget, {
  type CategoriaQueja,
} from "./components/centro-estudiantes/QuejasWidget";
import DebatesWidget, {
  type Debate,
} from "./components/centro-estudiantes/DebatesWidget";

interface Articulo {
  id: string;
  titulo: string;
  resumen: string;
  tags: string[];
  autor: string;
  votos: number;
  votado: boolean;
}

const ARTICULOS_INICIALES: Articulo[] = [
  {
    id: "1",
    titulo: "Propuesta de reciclaje en el patio",
    resumen:
      "Queremos transformar el manejo de residuos en el colegio. Nuestra propuesta incluye 10 nuevas estaciones de separación...",
    tags: ["MedioAmbiente", "Propuesta"],
    autor: "Comisión Ambiental",
    votos: 14,
    votado: false,
  },
  {
    id: "2",
    titulo: "Resumen de la Asamblea de Mayo",
    resumen:
      "Se discutieron los nuevos horarios de biblioteca y el presupuesto para el festival de invierno. Repasá los puntos clave aquí.",
    tags: ["Asamblea", "Institucional"],
    autor: "Mesa Directiva",
    votos: 22,
    votado: false,
  },
  {
    id: "3",
    titulo: "Torneo intercolegial: ¡nos anotamos!",
    resumen:
      "Es oficial: el Colegio San Martín participará del torneo regional. Buscamos jugadores para todas las categorías.",
    tags: ["Deportes", "Torneo"],
    autor: "Comisión Deportes",
    votos: 31,
    votado: false,
  },
];

const EVENTOS: EventoCentro[] = [
  { dia: 5, titulo: "Asamblea General", detalle: "(Obligatoria)" },
  { dia: 12, titulo: "Taller de Oratoria", detalle: "(Abierto)" },
  { dia: 15, titulo: "Torneo de Fútbol", detalle: "(Inscripción)" },
];

const QUEJAS: CategoriaQueja[] = [
  { categoria: "Infraestructura", cantidad: 4 },
  { categoria: "Convivencia", cantidad: 2 },
  { categoria: "Comedor", cantidad: 1 },
];

const DEBATES: Debate[] = [
  { id: "d1", titulo: "Código de vestimenta", participantes: 45, tiempo: "Hace 2 horas" },
  { id: "d2", titulo: "Horario de recreo", participantes: 28, tiempo: "Hace 5 horas" },
];

export default function PortalCentroEstudiantesPage() {
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_INICIALES);

  const [usuario] = useState({
    nombre: "Centro de Estudiantes",
    rol: "centro-estudiantes" as const,
  });

  const handleVotar = (id: string) => {
    setArticulos((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, votado: !a.votado, votos: a.votos + (a.votado ? -1 : 1) }
          : a
      )
    );
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();
  const handleNuevoArticulo = () => console.log("Abrir formulario de artículo");
  const handleCrearEvento = () => console.log("Abrir formulario de evento");

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/centro-estudiantes"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] flex-1 p-8">
        {/* Header Banner */}
        <header className="relative overflow-hidden rounded-lg mb-8 bg-gradient-to-r from-[#2D1B4E] to-[#3D2A6B] p-10 flex justify-between items-center shadow-lg border border-white/5">
          <div className="z-10">
            <h1 className="text-3xl font-headline font-extrabold text-white mb-2 tracking-tight">
              Centro de Estudiantes — Colegio San Martín
            </h1>
            <p className="text-on-surface-variant text-lg font-medium opacity-90">
              Representando a la comunidad estudiantil
            </p>
          </div>
          <div className="flex gap-4 z-10">
            <button
              onClick={handleNuevoArticulo}
              className="bg-[#C548F5] hover:bg-[#d15aff] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(197,72,245,0.4)]"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Nuevo artículo
            </button>
            <button
              onClick={handleCrearEvento}
              className="bg-[#2D1B4E] border border-white/10 hover:bg-[#3D2A6B] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-xl">event</span>
              Crear evento
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#C548F5] opacity-10 rounded-full blur-[100px]" />
        </header>

        <div className="flex gap-8 items-start">
          {/* Columna izquierda: Artículos */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-headline font-bold text-white flex items-center gap-3">
                <span className="material-symbols-outlined text-[#C548F5]">article</span>
                Nuestros Artículos
              </h2>
              <button className="text-on-surface-variant hover:text-[#C548F5] text-sm font-medium flex items-center gap-1 transition-colors">
                Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {articulos.map((a) => (
              <ArticuloCard
                key={a.id}
                titulo={a.titulo}
                resumen={a.resumen}
                tags={a.tags}
                autor={a.autor}
                votos={a.votos}
                votado={a.votado}
                onVotar={() => handleVotar(a.id)}
                onLeerMas={() => console.log("Leer más:", a.id)}
              />
            ))}
          </div>

          {/* Columna derecha: Widgets */}
          <div className="w-[320px] space-y-6">
            <CalendarioWidget eventos={EVENTOS} />
            <QuejasWidget
              categorias={QUEJAS}
              nuevas={7}
              onVerTodas={() => handleNavegar("/centro-estudiantes/quejas")}
            />
            <DebatesWidget
              debates={DEBATES}
              onGestionar={() => console.log("Gestionar debates")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
