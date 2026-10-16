// src/paginas/PerfilesAcademicosPage.tsx
// Vista standalone "Perfiles Académicos" — Admin Académica 🟣 (ruta /admin/perfiles).
// La lógica vive en PanelPerfiles; esta página solo aporta el chrome (sidebar + header).

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import PanelPerfiles from "./components/perfiles/PanelPerfiles";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";

export default function PerfilesAcademicosPage() {
  // Quién está mirando sale de la sesión. Antes esta página tenía escrito
  // `useState({ nombre: "Directora Romero" })`: entrara quien entrara, el menú
  // lateral saludaba a Romero. Ahora es quien realmente inició sesión.
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = useInstitucion();

  if (!usuario) return null;

  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        {/* Decía "Colegio San Martín — Ciclo 2025" escrito a mano, y el ciclo de
            la base es 2026 (Error 13.7). */}
        <TopBar title="Gestión Institucional" subtitle={subtituloInstitucional(institucion)} />

        <section className="p-8 flex-1 overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto">
            <PanelPerfiles />
          </div>
        </section>
      </main>
    </div>
  );
}
