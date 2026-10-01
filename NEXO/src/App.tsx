import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ErrorBoundary from "./paginas/components/shared/ErrorBoundary";
import EstadoConexion from "./paginas/components/shared/EstadoConexion";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  NavegacionContext,
  MAPA_RUTAS,
  MAPA_RUTAS_PUBLICAS,
  useNavegacion,
  HOME_POR_ROL,
  type Page,
  type ResultadoLogin,
  type Usuario,
} from "./navegacion";
import { iniciarSesion, sesionActual, cerrarSesionEnServidor } from "./servicios/sesion";
import { consultarAcceso, olvidarPermisos, type ResultadoAcceso } from "./servicios/permisos";
const LoginPage = lazy(() => import("./paginas/LoginPage.tsx"));
const ConfiguracionCuentaPage = lazy(() => import("./paginas/ConfiguracionCuentaPage.tsx"));
const RecuperarContrasenaPage = lazy(() => import("./paginas/RecuperarContrasenaPage.tsx"));
const AyudaDeAccesoPage = lazy(() => import("./paginas/AyudaDeAccesoPage.tsx"));
const AsistenciaIAPage = lazy(() => import("./paginas/AsistenciaIAPage.tsx"));
const BibliotecaPage = lazy(() => import("./paginas/BibliotecaPage.tsx"));
const BibliotecaNacionalPage = lazy(() => import("./paginas/BibliotecaNacionalPage.tsx"));
const ComunidadPage = lazy(() => import("./paginas/ComunidadPage.tsx"));
const DebatesPage = lazy(() => import("./paginas/DebatesPage.tsx"));
const ChatPage = lazy(() => import("./paginas/ChatPage.tsx"));
const NotificacionesPage = lazy(() => import("./paginas/NotificacionesPage.tsx"));
const DashboardProfesorPage = lazy(() => import("./paginas/DashboardProfesorPage.tsx"));
const PanelBibliotecarioPage = lazy(() => import("./paginas/PanelBibliotecarioPage.tsx"));
const PortalCentroEstudiantesPage = lazy(() => import("./paginas/PortalCentroEstudiantesPage.tsx"));
const GestionQuejasPage = lazy(() => import("./paginas/GestionQuejasPage.tsx"));
const CalendarioInstitucionalPage = lazy(() => import("./paginas/CalendarioInstitucionalPage.tsx"));
const CursosActivosPage = lazy(() => import("./paginas/CursosActivosPage.tsx"));
const PerfilesAcademicosPage = lazy(() => import("./paginas/PerfilesAcademicosPage.tsx"));
const PanelInstitucionalPage = lazy(() => import("./paginas/PanelInstitucionalPage.tsx"));
const ReportesPage = lazy(() => import("./paginas/ReportesPage.tsx"));
const GestionInstitucionesPage = lazy(() => import("./paginas/GestionInstitucionesPage.tsx"));
const SaludSistemaPage = lazy(() => import("./paginas/SaludSistemaPage.tsx"));
const TendenciasPage = lazy(() => import("./paginas/TendenciasPage.tsx"));
const CompetenciasPage = lazy(() => import("./paginas/CompetenciasPage.tsx"));
const DashboardObjetivosPage = lazy(() => import("./paginas/DashboardObjetivosPage.tsx"));
const HabitosPage = lazy(() => import("./paginas/HabitosPage.tsx"));
const MisMetasPage = lazy(() => import("./paginas/MisMetasPage.tsx"));
const CalificacionesPage = lazy(() => import("./paginas/CalificacionesPage.tsx"));
const AulaVirtualEstudiantePage = lazy(() => import("./paginas/AulaVirtualEstudiantePage.tsx"));
const AulaVirtualProfesorPage = lazy(() => import("./paginas/AulaVirtualProfesorPage.tsx"));
const MisCursosEstudiantePage = lazy(() => import("./paginas/MisCursosEstudiantePage.tsx"));
const MisTareasEstudiantePage = lazy(() => import("./paginas/MisTareasEstudiantePage.tsx"));
const DetalleMateriaPage = lazy(() => import("./paginas/DetalleMateriaPage.tsx"));
const FamiliaCalendarioPage = lazy(() => import("./paginas/FamiliaCalendarioPage.tsx"));
const FamiliaComunicadosPage = lazy(() => import("./paginas/FamiliaComunicadosPage.tsx"));
const MisCursosPreceptorPage = lazy(() => import("./paginas/MisCursosPreceptorPage.tsx"));
const DiarioReflexivoProfesorPage = lazy(() => import("./paginas/DiarioReflexivoProfesorPage.tsx"));
const GestionTareasProfesorPage = lazy(() => import("./paginas/GestionTareasProfesorPage.tsx"));
const EnviarQuejaPage = lazy(() => import("./paginas/EnviarQuejaPage.tsx"));

// Registro central: qué componente concreto dibuja cada página.
const PAGINAS: Record<Exclude<Page, "login">, () => React.ReactElement> = {
  "en-construccion": () => <EnConstruccion />,
  "configuracion-cuenta": () => <ConfiguracionCuentaPage />,
  "recuperar-contrasena": () => <RecuperarContrasenaPage />,
  "ayuda-de-acceso": () => <AyudaDeAccesoPage />,
  "asistencia-ia": () => <AsistenciaIAPage />,
  biblioteca: () => <BibliotecaPage />,
  "biblioteca-nacional": () => <BibliotecaNacionalPage />,
  comunidad: () => <ComunidadPage />,
  debates: () => <DebatesPage />,
  chat: () => <ChatPage />,
  notificaciones: () => <NotificacionesPage />,
  "profesor-dashboard": () => <DashboardProfesorPage />,
  "panel-bibliotecario": () => <PanelBibliotecarioPage />,
  "portal-centro": () => <PortalCentroEstudiantesPage />,
  "gestion-quejas": () => <GestionQuejasPage />,
  "calendario-institucional": () => <CalendarioInstitucionalPage />,
  "cursos-activos": () => <CursosActivosPage />,
  "perfiles-academicos": () => <PerfilesAcademicosPage />,
  "panel-institucional": () => <PanelInstitucionalPage />,
  reportes: () => <ReportesPage />,
  "gestion-instituciones": () => <GestionInstitucionesPage />,
  "salud-sistema": () => <SaludSistemaPage />,
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
  "detalle-materia-estudiante": () => <DetalleMateriaPage />,
  "familia-calendario": () => <FamiliaCalendarioPage />,
  "familia-comunicados": () => <FamiliaComunicadosPage />,
  "mis-cursos-preceptor": () => <MisCursosPreceptorPage />,
  "diario-reflexivo-profesor": () => <DiarioReflexivoProfesorPage />,
  "gestion-tareas-profesor": () => <GestionTareasProfesorPage />,
  "enviar-queja": () => <EnviarQuejaPage />,
};

// Las direcciones NO se vuelven a escribir acá: se generan del mapa MAPA_RUTAS
// de navegacion.tsx, que sigue siendo la única lista de rutas de la aplicación.
// Agregar una pantalla nueva es agregar una línea allá, y el enrutador la toma
// sola (principio de fuente única, sección 1.4 del informe).
const RUTAS = Object.entries(MAPA_RUTAS).map(
  ([ruta, destino]) => [ruta, destino.pagina] as const
);

// Las públicas se dibujan SIN pasar por <Pantalla>: no exigen sesión ni permiso
// (ver MAPA_RUTAS_PUBLICAS). Son las pantallas de quien no puede entrar, así que
// exigirles sesión las volvería inalcanzables justo para quien las necesita.
const RUTAS_PUBLICAS = Object.entries(MAPA_RUTAS_PUBLICAS).map(
  ([ruta, destino]) => [ruta, destino.pagina] as const
);

/** Pantalla de espera mientras el servidor dice si la sesión guardada sigue viva. */
function Cargando() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <p className="text-sm font-medium text-on-surface-variant/60">Abriendo NEXO...</p>
    </div>
  );
}

/**
 * Pantalla a la que el rol no tiene acceso. Antes de esto, la aplicación
 * teletransportaba al usuario a su inicio sin decir una palabra, y el usuario
 * creía que la aplicación estaba fallada (Error 12.6). Ahora se le explica,
 * con el mensaje que mandó el servidor, y se le ofrece una salida.
 */
function SinPermiso({ motivo, temporal }: { motivo?: string; temporal?: boolean }) {
  const { usuario, navegar } = useNavegacion();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">lock</span>
      <p className="text-lg font-bold text-on-surface-variant">
        {motivo ?? "No tenés permiso para ver esta sección."}
      </p>
      <p className="text-sm text-on-surface-variant/60">
        {temporal ? "No pudimos comprobar el acceso. Volvé a intentarlo cuando se restablezca la conexión." : "Tu perfil no tiene acceso a esta parte de NEXO."}
      </p>
      {temporal && <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold">Reintentar</button>}
      <button
        onClick={() => navegar(usuario ? HOME_POR_ROL[usuario.rol] : "/login")}
        className="px-4 py-2 rounded-lg bg-primary/20 text-sm font-medium text-primary hover:bg-primary/30 transition"
      >
        Volver a mi inicio
      </button>
    </div>
  );
}

/**
 * Una pantalla de la aplicación. Antes de dibujarla comprueba dos cosas, en
 * este orden:
 *   1. ¿Hay sesión? Si no, al login, ANOTANDO a dónde quería ir, para volver
 *      ahí después de entrar.
 *   2. ¿El rol puede ver esta pantalla? La respuesta ya no la decide la
 *      vidriera: se le pregunta al SERVIDOR, que es el único que tiene la tabla
 *      de permisos. Hace falta preguntar en cada pantalla porque la dirección
 *      se puede escribir a mano en el navegador: no alcanza con revisar clics.
 */
function Pantalla({ pagina }: { pagina: Exclude<Page, "login"> }) {
  const { usuario, revisandoSesion, sesionFinalizada } = useNavegacion();
  const location = useLocation();
  const [consulta, setConsulta] = useState<{ pagina: Page; usuarioId: number; acceso: ResultadoAcceso } | null>(null);
  const acceso = consulta?.pagina === pagina && consulta?.usuarioId === usuario?.id ? consulta.acceso : null;

  useEffect(() => {
    if (!usuario) return;

    let vigente = true;
    consultarAcceso(pagina).then((respuesta) => {
      if (vigente) setConsulta({ pagina, usuarioId: usuario.id, acceso: respuesta });
    });

    return () => {
      vigente = false;
    };
  }, [usuario, pagina]);

  if (revisandoSesion) return <Cargando />;

  if (!usuario) {
    return <Navigate to="/login" replace state={sesionFinalizada === "manual" ? null : { destino: location.pathname + location.search, sesionVencida: sesionFinalizada === "vencida" }} />;
  }

  if (!acceso) return <Cargando />;
  if (!acceso.permitido) return <SinPermiso motivo={acceso.error} temporal={acceso.temporal} />;

  return PAGINAS[pagina]();
}

/** El login. Si ya hay sesión, no tiene sentido mostrarlo: se entra derecho. */
function PantallaLogin() {
  const { usuario, revisandoSesion } = useNavegacion();
  const location = useLocation();

  if (revisandoSesion) return <Cargando />;

  if (usuario) {
    // Si llegó acá por haber pedido una pantalla puntual sin sesión, se lo
    // devuelve a esa pantalla; si no, al inicio de su rol. Acá ya no se juzga
    // si el rol puede verla: de eso se encarga <Pantalla> preguntándole al
    // servidor, y si no puede, se lo dice con todas las letras en vez de
    // dejarlo en otro lado sin explicación (Error 12.6).
    const destino = (location.state as { destino?: string } | null)?.destino;
    return <Navigate to={destino ?? HOME_POR_ROL[usuario.rol]} replace />;
  }

  return <LoginPage />;
}

/**
 * Destino que todavía no está construido. Antes esto era silencio absoluto: el
 * botón no hacía "nada de nada" y el usuario creía que la aplicación estaba
 * rota (Error 12.8). Ahora, como mínimo, se ve y se puede salir.
 *
 * La usan los dos caminos posibles hacia la nada, para que digan lo mismo:
 *   1. Un ítem del menú que apunta a una pantalla que falta construir (hoy,
 *      "Notificaciones" del bibliotecario, Error 9.D.1). Esos destinos están
 *      declarados en MAPA_RUTAS apuntando a la página "en-construccion".
 *   2. Una dirección escrita a mano que no existe (la ruta "*" del enrutador).
 */
function EnConstruccion() {
  const { usuario, navegar } = useNavegacion();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="material-symbols-outlined text-4xl text-primary">explore_off</span>
      <p className="text-lg font-bold text-on-surface-variant">No encontramos esta página</p>
      <p className="text-sm text-on-surface-variant/60">
        Revisá la dirección o volvé a tu espacio para continuar.
      </p>
      <button
        onClick={() => navegar(usuario ? HOME_POR_ROL[usuario.rol] : "/login")}
        className="px-4 py-2 rounded-lg bg-primary/20 text-sm font-medium text-primary hover:bg-primary/30 transition"
      >
        Volver al inicio
      </button>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [revisandoSesion, setRevisandoSesion] = useState(true);
  const sesionCerrada = useRef(false);
  const [sesionFinalizada, setSesionFinalizada] = useState<"manual" | "vencida" | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const vencida = () => {
      if (sesionCerrada.current || !usuario) return;
      sesionCerrada.current = true;
      setSesionFinalizada("vencida");
      olvidarPermisos();
      setUsuario(null);
      navigate("/login", { replace: true, state: { destino: location.pathname + location.search, sesionVencida: true } });
    };
    window.addEventListener("nexo:sesion-vencida", vencida);
    return () => window.removeEventListener("nexo:sesion-vencida", vencida);
  }, [navigate, location.pathname, location.search, usuario]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // Al arrancar (y en cada F5), preguntarle al servidor si la cookie de sesión
  // sigue siendo válida. Ya NO se manda al usuario al inicio de su rol: la URL
  // dice dónde estaba, así que alcanza con confirmar quién es y dejar que el
  // enrutador dibuje la dirección que ya está en la barra. Eso es lo que
  // completa el paso 2 de la Etapa 1: F5 devuelve a la pantalla exacta.
  useEffect(() => {
    let vigente = true;

    sesionActual().then((usuarioGuardado) => {
      if (!vigente) return;
      setUsuario(usuarioGuardado);
      setRevisandoSesion(false);
    });

    return () => {
      vigente = false;
    };
  }, []);

  // Navegar = cambiar la dirección del navegador. Con eso queda registrado en
  // el historial, y "Atrás"/"Adelante" funcionan solos (Error 12.2). El control
  // de permisos ya no vive acá sino en <Pantalla>, para que también proteja a
  // quien escribe la dirección a mano.
  const navegar = useCallback((ruta: string) => navigate(ruta), [navigate]);

  // El servidor valida las credenciales contra la tabla `usuarios`; la pantalla
  // ya no sabe ninguna contraseña. No se navega desde acá: al aparecer el
  // usuario, <PantallaLogin> redirige sola al destino que corresponda.
  const login = useCallback(async (email: string, contrasena: string): Promise<ResultadoLogin> => {
    const resultado = await iniciarSesion(email, contrasena);
    if (!resultado.ok || !resultado.usuario) {
      return { ok: false, error: resultado.error };
    }
    // Los permisos recordados son los del rol anterior: hay que olvidarlos
    // antes de que entre alguien que quizás ve otras pantallas.
    olvidarPermisos();
    sesionCerrada.current = false;
    setSesionFinalizada(null);
    setUsuario(resultado.usuario);
    return { ok: true };
  }, []);

  const cerrarSesion = useCallback(() => {
    sesionCerrada.current = true;
    setSesionFinalizada("manual");
    // Borrar la sesión también en el servidor: si solo se limpiara la pantalla,
    // la llave seguiría viva y serviría para volver a entrar.
    void cerrarSesionEnServidor();
    olvidarPermisos();
    setUsuario(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const valor = useMemo(
    () => ({
      usuario,
      // La ruta activa deja de ser una copia guardada en memoria: es,
      // literalmente, la dirección que muestra el navegador.
      rutaActiva: location.pathname,
      revisandoSesion,
      sesionFinalizada,
      navegar,
      cerrarSesion,
      login,
    }),
    [usuario, location.pathname, revisandoSesion, sesionFinalizada, navegar, cerrarSesion, login]
  );

  return (
    <NavegacionContext.Provider value={valor}>
      <EstadoConexion />
      <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/login" element={<PantallaLogin />} />
        {RUTAS_PUBLICAS.map(([ruta, pagina]) => (
          <Route key={ruta} path={ruta} element={PAGINAS[pagina]()} />
        ))}
        {RUTAS.map(([ruta, pagina]) => (
          <Route key={ruta} path={ruta} element={<Pantalla pagina={pagina} />} />
        ))}
        {/* La raíz manda a cada rol a su inicio (o al login si no hay sesión). */}
        <Route path="/" element={<PantallaRaiz />} />
        <Route path="*" element={<EnConstruccion />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </NavegacionContext.Provider>
  );
}

/** La raíz "/" no es una pantalla: solo decide a dónde mandar a quien entra. */
function PantallaRaiz() {
  const { usuario, revisandoSesion } = useNavegacion();
  if (revisandoSesion) return <Cargando />;
  return <Navigate to={usuario ? HOME_POR_ROL[usuario.rol] : "/login"} replace />;
}
