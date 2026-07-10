// src/paginas/GestionInstitucionalPage.tsx
// VISTA: Gestión Institucional — acceso Admin Académica 🟣.
// Conversión de EstructuraCarpetasNexo/Directivo/Gestión_institucional/gestionInstitucional.html.
// Es el shell con pestañas (Cursos / Materias / Perfiles académicos) que orquesta los
// tres paneles ya construidos. Foco en lógica/funcionalidad: navegación por tabs.

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import PanelCursos from "./components/cursos/PanelCursos";
import PanelMaterias from "./components/materias/PanelMaterias";
import PanelPerfiles from "./components/perfiles/PanelPerfiles";
import { useNavegacion } from "../navegacion";

type Tab = "cursos" | "materias" | "perfiles";

const TABS: { id: Tab; label: string }[] = [
  { id: "cursos", label: "Cursos" },
  { id: "materias", label: "Materias" },
  { id: "perfiles", label: "Perfiles académicos" },
];

export default function GestionInstitucionalPage() {
  const [usuario] = useState({
    nombre: "Directora Romero",
    rol: "admin-academico" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Romero",
  });

  const [tabActiva, setTabActiva] = useState<Tab>("cursos");
  const { navegar, cerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        rutaActiva="/admin/cursos"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* ── Top app bar ── */}
        <header className="flex justify-between items-center px-10 py-8 sticky top-0 bg-[#1C1030]/80 backdrop-blur-md z-40">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface">
              Gestión Institucional
            </h1>
            <p className="text-gray-400 text-sm mt-1">Colegio San Martín</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-gray-400">
              <span className="material-symbols-outlined cursor-pointer hover:text-primary">
                notifications
              </span>
              <span className="material-symbols-outlined cursor-pointer hover:text-primary">
                settings
              </span>
            </div>
            <div className="h-10 w-px bg-purple-900/30" />
          </div>
        </header>

        {/* ── Tabs bar ── */}
        <div className="px-10 border-b border-purple-900/20">
          <nav className="flex gap-10">
            {TABS.map((tab) => {
              const activa = tab.id === tabActiva;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`pb-4 text-sm transition-all border-b-2 ${
                    activa
                      ? "text-[#C548F5] border-[#C548F5] font-bold"
                      : "text-gray-400 hover:text-[#C548F5] border-transparent font-medium"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Tab content ── */}
        <section className="p-10 flex-1 bg-[#190d2d]">
          <div className="max-w-7xl mx-auto">
            {tabActiva === "cursos" && <PanelCursos />}
            {tabActiva === "materias" && <PanelMaterias />}
            {tabActiva === "perfiles" && <PanelPerfiles />}
          </div>
        </section>
      </main>
    </div>
  );
}
