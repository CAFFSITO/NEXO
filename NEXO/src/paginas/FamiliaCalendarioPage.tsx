// src/paginas/FamiliaCalendarioPage.tsx
// VISTA: Calendario familiar (ruta /familia/calendario).
// La familia ve lo que la escuela le muestra (a todas las familias, a las de un
// curso o solo a ella), confirma asistencia cuando se le pide, elige sus
// recordatorios y arma sus propios eventos personales: en la jerarquía, las
// familias están en el último nivel junto con los estudiantes. Es el mismo
// calendario de la comunidad; quién ve qué lo decide el servidor.

import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import Calendario from "./components/agenda/Calendario";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, useInstitucion } from "../servicios/institucion";

export default function FamiliaCalendarioPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { institucion } = useInstitucion();
  if (!usuario) return null;
  return (
    <div className="flex bg-fondo min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen">
        <TopBar title="Calendario familiar" subtitle={subtituloInstitucional(institucion)} />
        <div className="mx-auto max-w-375 p-4 sm:p-8">
          <Calendario titulo="Calendario familiar" />
        </div>
      </main>
    </div>
  );
}
