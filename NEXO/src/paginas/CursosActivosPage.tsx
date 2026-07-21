// src/paginas/CursosActivosPage.tsx
// Vista standalone "Cursos Activos" del módulo Gestión Institucional (Admin Académica).
// La lógica vive en PanelCursos; esta página solo aporta el chrome (sidebar + topbar).

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import PanelCursos from "./components/cursos/PanelCursos";
import { useNavegacion } from "../navegacion";
import { usarInstitucion } from "../servicios/institucion";

export default function CursosActivosPage() {
  // El usuario sale de la sesión: antes esta página decía "Directora Romero"
  // aunque entrara otra persona.
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = usarInstitucion();

  if (!usuario) return null;

  return (
    <div className="flex bg-[#190d2d] min-h-screen text-on-background">
      <Sidebar
        usuario={usuario}
        onNavegar={navegar}
        onCerrarSesion={cerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        {/* El nombre del colegio estaba escrito acá. Sale de la base: el día que
            haya un segundo colegio, esta pantalla no tiene que cambiar. */}
        <TopBar title="Gestión Institucional" subtitle={institucion?.nombre ?? ""} />

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          <PanelCursos />
        </div>
      </main>
    </div>
  );
}
