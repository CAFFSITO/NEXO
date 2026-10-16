// src/paginas/CalendarioInstitucionalPage.tsx
// VISTA: Calendario de la comunidad (ruta /comunidad/calendario).
// Un calendario con JERARQUÍA: cada nivel de la escuela le muestra eventos al
// suyo y a los de abajo (la dirección y el centro arriba; profesores,
// biblioteca y preceptoría en el medio; estudiantes y familias, solo eventos
// personales). Repeticiones, recordatorios, confirmaciones, eventos de varios
// días, capas, supervisión y exportación. Quién ve qué lo decide el servidor.

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import Calendario from "./components/agenda/Calendario";
import { useNavegacion } from "../navegacion";

export default function CalendarioInstitucionalPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  if (!usuario) return null;
  return (
    <div className="flex bg-fondo min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen">
        <TopBar title="Calendario" />
        <div className="mx-auto max-w-375 p-4 sm:p-8">
          <Calendario titulo="Calendario" />
        </div>
      </main>
    </div>
  );
}
