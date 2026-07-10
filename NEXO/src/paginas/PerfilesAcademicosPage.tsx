// src/paginas/PerfilesAcademicosPage.tsx
// Vista standalone "Perfiles Académicos" — Admin Académica 🟣 (ruta /admin/perfiles).
// La lógica vive en PanelPerfiles; esta página solo aporta el chrome (sidebar + header).

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import PanelPerfiles from "./components/perfiles/PanelPerfiles";
import { useNavegacion } from "../navegacion";

export default function PerfilesAcademicosPage() {
  const { navegar, cerrarSesion } = useNavegacion();
  const [usuario] = useState({
    nombre: "Directora Romero",
    rol: "admin-academico" as const,
  });

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/admin/perfiles"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* Header de la vista */}
        <header className="flex justify-between items-center h-24 px-8 bg-[#1C1030]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white font-headline">Gestión Institucional</h1>
            <p className="text-slate-400 text-xs font-medium">Colegio San Martín — Ciclo 2025</p>
          </div>
        </header>

        <section className="p-8 flex-1 overflow-y-auto bg-[#190d2d]">
          <div className="max-w-7xl mx-auto">
            <PanelPerfiles />
          </div>
        </section>
      </main>
    </div>
  );
}
