// src/paginas/DiarioReflexivoProfesorPage.tsx
// VISTA: Diario Reflexivo (Portafolio Docente).
// Conversión de diarioReflexivoProfesor.html → React + TS + Tailwind.
// El diario es un espacio de registro y reflexión sobre la práctica docente.

import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import FormularioNuevoRegistro, {
  type NuevoRegistro,
} from "./components/portafolio-docente/FormularioNuevoRegistro";
import TarjetaRegistro, {
  type Registro,
} from "./components/portafolio-docente/TarjetaRegistro";

const MATERIAS_CURSO = ["Matemática, 4° B", "Historia, 5° A", "Física, 3° C"];

const REGISTROS_INICIALES: Registro[] = [
  {
    id: "1",
    titulo: "Clase de discriminante",
    fecha: "2026-03-19",
    materiaCurso: "Matemática, 4° B",
    resumen:
      "Se explicó el uso del discriminante en ecuaciones cuadráticas. Los estudiantes mostraron interés genuino en los casos donde no hay raíces reales.",
    queFunciono:
      "El uso de software de graficación ayudó a visualizar por qué el discriminante negativo no toca el eje X.",
    queMejorar:
      "La transición del álgebra a la gráfica fue un poco rápida para algunos alumnos rezagados.",
  },
  {
    id: "2",
    titulo: "Introducción a parábolas",
    fecha: "2026-03-17",
    materiaCurso: "Matemática, 4° B",
    resumen:
      "Primer contacto con la función cuadrática. Exploramos los coeficientes a, b y c mediante ejemplos prácticos de lanzamientos físicos.",
    queFunciono:
      "Los videos de cámara lenta de tiros libres en fútbol captaron la atención de toda la clase.",
    queMejorar:
      "Faltó tiempo para que ellos mismos intentaran graficar manualmente en el cuaderno.",
  },
  {
    id: "3",
    titulo: "Línea de tiempo Mayo",
    fecha: "2026-03-14",
    materiaCurso: "Historia, 5° A",
    resumen:
      "Construcción colaborativa de los eventos previos a la Revolución de Mayo. Análisis de causas externas (Invasiones Napoleónicas).",
    queFunciono:
      "El debate sobre el rol del Virrey Cisneros fue muy activo y argumentado.",
    queMejorar:
      "Mejorar la distribución de grupos para que los alumnos más tímidos participen más.",
  },
];

export default function DiarioReflexivoProfesorPage() {
  const [usuario] = useState({
    nombre: "Prof. García",
    rol: "profesor" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia",
  });

  const [registros, setRegistros] = useState<Registro[]>(REGISTROS_INICIALES);
  const [busqueda, setBusqueda] = useState<string>("");

  // Registros ordenados por fecha descendente + filtrados por búsqueda
  const registrosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registros
      .filter(
        (r) =>
          !q ||
          r.titulo.toLowerCase().includes(q) ||
          r.resumen.toLowerCase().includes(q) ||
          r.materiaCurso.toLowerCase().includes(q)
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [registros, busqueda]);

  const handleGuardar = (nuevo: NuevoRegistro) => {
    setRegistros((prev) => [
      { ...nuevo, id: crypto.randomUUID() },
      ...prev,
    ]);
  };

  const handleEditar = (id: string) => {
    console.log("Editar registro:", id);
  };

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  // El registro más reciente se destaca visualmente
  const idDestacado = registrosVisibles[0]?.id;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface overflow-x-hidden">
      <Sidebar
        usuario={usuario}
        rutaActiva="/portafolio-docente"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* Top nav del portafolio docente */}
        <header className="flex justify-between items-center w-full px-8 py-4 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-black text-white font-headline">Portafolio Docente</h1>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleNavegar("/portafolio-docente")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Dashboard
              </button>
              <button onClick={() => handleNavegar("/portafolio/gestion")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Gestión de Tareas
              </button>
              <button className="text-[#C548F5] border-b-2 border-[#C548F5] pb-2 font-bold font-label">
                Diario Reflexivo
              </button>
              <button onClick={() => handleNavegar("/portafolio-docente/aula-virtual")} className="text-slate-400 pb-2 hover:text-[#C548F5] transition-all font-label">
                Aula Virtual
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              notifications
            </button>
            <button className="material-symbols-outlined text-slate-400 hover:text-[#C548F5] cursor-pointer">
              settings
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          {/* Header vista + buscador */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-4xl font-extrabold text-white font-headline border-b-4 border-[#C548F5] inline-block pb-1">
              Diario Reflexivo
            </h2>
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el diario..."
                className="w-full bg-[#2D1B4E] border-none rounded-full pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5]"
              />
            </div>
          </header>

          {/* Formulario nuevo registro */}
          <FormularioNuevoRegistro materiasCurso={MATERIAS_CURSO} onGuardar={handleGuardar} />

          {/* Lista del diario */}
          <div className="space-y-6">
            {registrosVisibles.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-2 block">
                  menu_book
                </span>
                {busqueda
                  ? "No hay registros que coincidan con la búsqueda."
                  : "Todavía no hay registros. Creá el primero arriba."}
              </div>
            ) : (
              registrosVisibles.map((registro) => (
                <TarjetaRegistro
                  key={registro.id}
                  registro={registro}
                  destacado={registro.id === idDestacado}
                  onEditar={handleEditar}
                />
              ))
            )}
          </div>
        </div>

        <footer className="mt-auto py-8 text-center text-slate-500 text-xs tracking-widest uppercase font-label">
          © 2026 Portafolio Docente • Sistema de Reflexión Continua
        </footer>
      </main>
    </div>
  );
}
