import { useState } from "react";
import {
  NavegacionContext,
  rutaAPagina,
  puedeAcceder,
  CREDENCIALES,
  HOME_POR_ROL,
  type Page,
  type Usuario,
} from "./navegacion";
import LoginPage from "./paginas/LoginPage.tsx";
import AsistenciaIAPage from "./paginas/AsistenciaIAPage.tsx";
import BibliotecaPage from "./paginas/BibliotecaPage.tsx";
import BibliotecaNacionalPage from "./paginas/BibliotecaNacionalPage.tsx";
import ComunidadPage from "./paginas/ComunidadPage.tsx";
import DebatesPage from "./paginas/DebatesPage.tsx";
import ChatPage from "./paginas/ChatPage.tsx";
import DashboardProfesorPage from "./paginas/DashboardProfesorPage.tsx";
import GestionInstitucionalPage from "./paginas/GestionInstitucionalPage.tsx";
import PanelBibliotecarioPage from "./paginas/PanelBibliotecarioPage.tsx";
import PortalCentroEstudiantesPage from "./paginas/PortalCentroEstudiantesPage.tsx";
import GestionQuejasPage from "./paginas/GestionQuejasPage.tsx";
import CalendarioInstitucionalPage from "./paginas/CalendarioInstitucionalPage.tsx";
import CursosActivosPage from "./paginas/CursosActivosPage.tsx";
import PerfilesAcademicosPage from "./paginas/PerfilesAcademicosPage.tsx";
import PanelInstitucionalPage from "./paginas/PanelInstitucionalPage.tsx";
import TendenciasPage from "./paginas/TendenciasPage.tsx";
import CompetenciasPage from "./paginas/CompetenciasPage.tsx";
import DashboardObjetivosPage from "./paginas/DashboardObjetivosPage.tsx";
import HabitosPage from "./paginas/HabitosPage.tsx";
import MisMetasPage from "./paginas/MisMetasPage.tsx";
import CalificacionesPage from "./paginas/CalificacionesPage.tsx";
import AulaVirtualEstudiantePage from "./paginas/AulaVirtualEstudiantePage.tsx";
import AulaVirtualProfesorPage from "./paginas/AulaVirtualProfesorPage.tsx";
import MisCursosEstudiantePage from "./paginas/MisCursosEstudiantePage.tsx";
import MisTareasEstudiantePage from "./paginas/MisTareasEstudiantePage.tsx";
import FamiliaCalendarioPage from "./paginas/FamiliaCalendarioPage.tsx";
import FamiliaChatPage from "./paginas/FamiliaChatPage.tsx";
import FamiliaComunicadosPage from "./paginas/FamiliaComunicadosPage.tsx";
import MisCursosPreceptorPage from "./paginas/MisCursosPreceptorPage.tsx";
import DiarioReflexivoProfesorPage from "./paginas/DiarioReflexivoProfesorPage.tsx";
import GestionTareasProfesorPage from "./paginas/GestionTareasProfesorPage.tsx";

// Registro central: cada página se renderiza según la Page activa.
const PAGINAS: Record<Exclude<Page, "login">, () => React.ReactElement> = {
  "asistencia-ia": () => <AsistenciaIAPage />,
  biblioteca: () => <BibliotecaPage />,
  "biblioteca-nacional": () => <BibliotecaNacionalPage />,
  comunidad: () => <ComunidadPage />,
  debates: () => <DebatesPage />,
  chat: () => <ChatPage />,
  "profesor-dashboard": () => <DashboardProfesorPage />,
  "gestion-institucional": () => <GestionInstitucionalPage />,
  "panel-bibliotecario": () => <PanelBibliotecarioPage />,
  "portal-centro": () => <PortalCentroEstudiantesPage />,
  "gestion-quejas": () => <GestionQuejasPage />,
  "calendario-institucional": () => <CalendarioInstitucionalPage />,
  "cursos-activos": () => <CursosActivosPage />,
  "perfiles-academicos": () => <PerfilesAcademicosPage />,
  "panel-institucional": () => <PanelInstitucionalPage />,
  tendencias: () => <TendenciasPage />,
  competencias: () => <CompetenciasPage />,
  "objetivos-dashboard": () => <DashboardObjetivosPage />,
  "objetivos-habitos": () => <HabitosPage />,
  "objetivos-metas": () => <MisMetasPage />,
  calificaciones: () => <CalificacionesPage />,
  "aula-virtual-estudiante": () => <AulaVirtualEstudiantePage />,
  "aula-virtual-profesor": () => <AulaVirtualProfesorPage />,
  "mis-cursos-estudiante": () => <MisCursosEstudiantePage />,
  "mis-tareas-estudiante": () => <MisTareasEstudiantePage />,
  "familia-calendario": () => <FamiliaCalendarioPage />,
  "familia-chat": () => <FamiliaChatPage />,
  "familia-comunicados": () => <FamiliaComunicadosPage />,
  "mis-cursos-preceptor": () => <MisCursosPreceptorPage />,
  "diario-reflexivo-profesor": () => <DiarioReflexivoProfesorPage />,
  "gestion-tareas-profesor": () => <GestionTareasProfesorPage />,
};

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("login");
  const [rutaActiva, setRutaActiva] = useState<string>("/comunidad");

  // Coloca la app en una ruta ya validada (sin re-chequear permisos).
  const irA = (ruta: string) => {
    const pagina = rutaAPagina(ruta);
    if (pagina && pagina !== "login") {
      setCurrentPage(pagina);
      setRutaActiva(ruta);
    }
  };

  // Navegación con control de acceso por rol.
  const navegar = (ruta: string) => {
    if (!usuario) return;
    const pagina = rutaAPagina(ruta);
    if (!pagina) {
      console.warn("Ruta sin página asociada:", ruta);
      return;
    }
    if (puedeAcceder(usuario.rol, ruta)) {
      irA(ruta);
    } else {
      // Rol sin permiso: se lo devuelve a su home en vez de mostrar la vista ajena.
      console.warn(`Acceso denegado a ${ruta} para rol ${usuario.rol}`);
      irA(HOME_POR_ROL[usuario.rol]);
    }
  };

  // Valida credenciales y abre la sesión en el home del rol.
  const login = (email: string, password: string): boolean => {
    const cred = CREDENCIALES[email.trim().toLowerCase()];
    if (!cred || cred.password !== password) return false;
    setUsuario(cred.usuario);
    irA(HOME_POR_ROL[cred.usuario.rol]);
    return true;
  };

  const cerrarSesion = () => {
    setUsuario(null);
    setCurrentPage("login");
    setRutaActiva("/comunidad");
  };

  const render = currentPage !== "login" ? PAGINAS[currentPage] : undefined;

  return (
    <NavegacionContext.Provider value={{ usuario, rutaActiva, navegar, cerrarSesion, login }}>
      {!usuario || currentPage === "login" ? <LoginPage /> : render ? render() : <ComunidadPage />}
    </NavegacionContext.Provider>
  );
}
