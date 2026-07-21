// src/paginas/PerfilesAcademicosPage.tsx
// Vista standalone "Perfiles Académicos" — Admin Académica 🟣 (ruta /admin/perfiles).
// La lógica vive en PanelPerfiles; esta página solo aporta el chrome (sidebar + header).

import Sidebar from "./components/shared/Sidebar";
import PanelPerfiles from "./components/perfiles/PanelPerfiles";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, usarInstitucion } from "../servicios/institucion";

export default function PerfilesAcademicosPage() {
  // Quién está mirando sale de la sesión. Antes esta página tenía escrito
  // `useState({ nombre: "Directora Romero" })`: entrara quien entrara, el menú
  // lateral saludaba a Romero. Ahora es quien realmente inició sesión.
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = usarInstitucion();

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* Header de la vista */}
        <header className="flex justify-between items-center h-24 px-8 bg-[#1C1030]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white font-headline">Gestión Institucional</h1>
            {/* Decía "Colegio San Martín — Ciclo 2025" escrito a mano, y el
                ciclo de la base es 2026 (Error 13.7). */}
            <p className="text-slate-400 text-xs font-medium">
              {subtituloInstitucional(institucion)}
            </p>
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
