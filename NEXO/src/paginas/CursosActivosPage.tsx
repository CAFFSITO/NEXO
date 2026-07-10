// src/paginas/CursosActivosPage.tsx
// Vista standalone "Cursos Activos" del módulo Gestión Institucional (Admin Académica).
// La lógica vive en PanelCursos; esta página solo aporta el chrome (sidebar + topbar).

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import PanelCursos from "./components/cursos/PanelCursos";
import { useNavegacion } from "../navegacion";

export default function CursosActivosPage() {
  const { navegar, cerrarSesion } = useNavegacion();
  const [usuario] = useState({
    nombre: "Directora Romero",
    rol: "admin-academico" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Romero",
  });

  return (
    <div className="flex bg-[#190d2d] min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        rutaActiva="/admin/cursos"
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Gestión Institucional" subtitle="Colegio San Martín" />

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          <PanelCursos />
        </div>
      </main>
    </div>
  );
}
