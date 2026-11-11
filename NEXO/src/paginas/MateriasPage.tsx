// src/paginas/MateriasPage.tsx
// Sección "Materias" de la dirección (ruta /admin/materias): cada materia con
// sus detalles, su temario opcional y los profesores que la dan. La lógica vive
// en PanelMaterias; esta página solo aporta el menú y la barra de arriba.

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import PanelMaterias from "./components/materias/PanelMaterias";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";

export default function MateriasPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = useInstitucion();

  if (!usuario) return null;

  return (
    <div className="flex bg-background min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen">
        <TopBar title="Materias" subtitle={subtituloInstitucional(institucion)} />
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <PanelMaterias />
        </div>
      </main>
    </div>
  );
}
