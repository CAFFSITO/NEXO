import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaPosteo from "./components/comunidad/TarjetaPosteo";

interface Posteo {
  id: string;
  autor: string;
  rol: "estudiante" | "profesor" | "admin";
  contenido: string;
  fecha: string;
  avatarUrl?: string;
  likes: number;
  comments: number;
  shares: number;
}

const INITIAL_POSTEOS: Posteo[] = [
  {
    id: "1",
    autor: "Martín López",
    rol: "estudiante",
    contenido:
      "¡Alguien sabe dónde consigo apuntes de la clase de Historia? El parcial es en una semana y necesito repasar los temas del renacimiento.",
    fecha: "hace 2 horas",
    likes: 12,
    comments: 8,
    shares: 3,
  },
  {
    id: "2",
    autor: "Prof. García",
    rol: "profesor",
    contenido:
      "Recordatorio: El material para la clase de mañana está en la biblioteca. Cualquier duda, pueden enviarme un mensaje privado.",
    fecha: "hace 4 horas",
    likes: 45,
    comments: 15,
    shares: 8,
  },
  {
    id: "3",
    autor: "Sofia Chen",
    rol: "estudiante",
    contenido:
      "Acabo de formar un grupo de estudio para Matemática. Si alguien quiere sumarse, avísame. Nos juntamos los jueves a las 14hs.",
    fecha: "hace 6 horas",
    likes: 28,
    comments: 12,
    shares: 5,
  },
  {
    id: "4",
    autor: "Admin Académico",
    rol: "admin",
    contenido:
      "Nuevo comunicado: Se extendió la fecha de entrega de trabajos finales hasta el 15 de junio. Por favor, actualizar sus calendarios.",
    fecha: "hace 1 día",
    likes: 67,
    comments: 22,
    shares: 31,
  },
  {
    id: "5",
    autor: "Juan Pérez",
    rol: "estudiante",
    contenido:
      "¿Alguien vio la película que recomendó el profe para Lengua? Estaría bueno compartir opiniones en clase.",
    fecha: "hace 1 día",
    likes: 9,
    comments: 6,
    shares: 2,
  },
];

export default function ComunidadPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol = usuario?.rol ?? "estudiante";
  const nombre = usuario?.nombre ?? "Usuario";

  // Quién puede publicar en la Comunidad general (arquitectura NEXO):
  // estudiantes, profesores, admin académica y centro de estudiantes.
  // Preceptor y bibliotecario tienen acceso de solo lectura.
  const puedePublicar =
    rol === "estudiante" ||
    rol === "profesor" ||
    rol === "admin-academico" ||
    rol === "centro-estudiantes";

  const [posteos, setPosteos] = useState<Posteo[]>(INITIAL_POSTEOS);

  const handleLike = (id: string) => {
    setPosteos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p))
    );
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario ?? { nombre, rol }}
        rutaActiva="/comunidad"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Comunidad" />

        {/* Sub-navegación del módulo Comunidad */}
        <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
          {[
            { label: "Feed", ruta: "/comunidad" },
            { label: "Debates", ruta: "/comunidad/debate" },
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
          <div className="mb-10">
            <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-2">
              Comunidad NEXO
            </h1>
            <p className="text-gray-400 font-body max-w-2xl">
              Conecta con otros estudiantes, comparte preguntas y crea una red de aprendizaje colaborativo.
            </p>
          </div>

          {/* New Post Form — solo para roles con permiso de publicación */}
          {puedePublicar ? (
            <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{nombre.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="¿Qué está en tu mente?"
                    className="w-full bg-[#1C1030] text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 border border-[#3b2f50] placeholder-gray-500"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button className="text-gray-400 hover:text-primary transition-colors p-2">
                      <span className="material-symbols-outlined">image</span>
                    </button>
                    <button className="text-gray-400 hover:text-primary transition-colors p-2">
                      <span className="material-symbols-outlined">emoji_emotions</span>
                    </button>
                    <button className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#d15aff] transition-all">
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#2D1B4E]/40 border border-[#3b2f50] rounded-lg p-4 mb-8 flex items-center gap-3 text-gray-400 text-sm">
              <span className="material-symbols-outlined text-[#C548F5]">visibility</span>
              Tenés acceso de solo lectura a la Comunidad general.
            </div>
          )}

          {/* Feed */}
          <div className="space-y-6 max-w-2xl">
            {posteos.map((posteo) => (
              <TarjetaPosteo
                key={posteo.id}
                autor={posteo.autor}
                rol={posteo.rol}
                contenido={posteo.contenido}
                fecha={posteo.fecha}
                avatarUrl={posteo.avatarUrl}
                likes={posteo.likes}
                comments={posteo.comments}
                shares={posteo.shares}
                onLike={() => handleLike(posteo.id)}
                onComment={() => console.log("Comment on", posteo.id)}
                onShare={() => console.log("Share", posteo.id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
