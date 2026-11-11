import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ComponentType } from "react";
import ErrorBoundary from "./paginas/components/shared/ErrorBoundary";
import Sidebar from "./paginas/components/shared/Sidebar";
import EstadoConexion from "./paginas/components/shared/EstadoConexion";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  NavegacionContext,
  MAPA_RUTAS,
  MAPA_RUTAS_PUBLICAS,
  RUTA_PRIMER_INGRESO,
  useNavegacion,
  type Page,
  type ResultadoLogin,
  type Usuario,
} from "./navegacion";
import { iniciarSesion, sesionActual, cerrarSesionEnServidor } from "./servicios/sesion";
import { accesoRecordado, consultarAcceso, olvidarPermisos, type ResultadoAcceso } from "./servicios/permisos";
import { InstanciaContext, pedirInstancia, useInstancia, type Instancia } from "./servicios/instancia";
import { aplicarTema } from "./servicios/tema";
import { aplicarPreferencias } from "./servicios/aplicarPreferencias";
import { olvidarPush } from "./servicios/push";
import { accesosDeRol, inicioPara } from "./paginas/components/shared/navegacionItems";

// Cada pantalla se descarga recién cuando hace falta (lazy), pero se puede
// pedir antes: después de entrar, en los ratos libres, NEXO trae las pantallas
// del menú de esa persona para que tocar un ítem sea instantáneo.
const cargadores = new WeakMap<object, () => Promise<unknown>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- el mismo tipo que pide React.lazy
function diferida<T extends ComponentType<any>>(cargar: () => Promise<{ default: T }>) {
  let promesa: Promise<{ default: T }> | null = null;
  // Si falla (sin conexión), se puede volver a intentar: no queda guardado el error.
  const una = () => (promesa ??= cargar().catch((e) => { promesa = null; throw e; }));
  const componente = lazy(una);
  cargadores.set(componente, una);
  return componente;
}

const LoginPage = diferida(() => import("./paginas/LoginPage.tsx"));
const ConfiguracionCuentaPage = diferida(() => import("./paginas/ConfiguracionCuentaPage.tsx"));
const RecuperarContrasenaPage = diferida(() => import("./paginas/RecuperarContrasenaPage.tsx"));
const AyudaDeAccesoPage = diferida(() => import("./paginas/AyudaDeAccesoPage.tsx"));
const AsistenciaIAPage = diferida(() => import("./paginas/AsistenciaIAPage.tsx"));
const BibliotecaPage = diferida(() => import("./paginas/BibliotecaPage.tsx"));
const DocumentosPage = diferida(() => import("./paginas/DocumentosPage.tsx"));
const ProyectosPage = diferida(() => import("./paginas/ProyectosPage.tsx"));
const MetodosEstudioPage = diferida(() => import("./paginas/MetodosEstudioPage.tsx"));
const BibliotecaNacionalPage = diferida(() => import("./paginas/BibliotecaNacionalPage.tsx"));
const ComunidadPage = diferida(() => import("./paginas/ComunidadPage.tsx"));
const DebatesPage = diferida(() => import("./paginas/DebatesPage.tsx"));
const ChatPage = diferida(() => import("./paginas/ChatPage.tsx"));
const NotificacionesPage = diferida(() => import("./paginas/NotificacionesPage.tsx"));
const DashboardProfesorPage = diferida(() => import("./paginas/DashboardProfesorPage.tsx"));
const PanelBibliotecarioPage = diferida(() => import("./paginas/PanelBibliotecarioPage.tsx"));
const PortalCentroEstudiantesPage = diferida(() => import("./paginas/PortalCentroEstudiantesPage.tsx"));
const GestionQuejasPage = diferida(() => import("./paginas/GestionQuejasPage.tsx"));
const CalendarioInstitucionalPage = diferida(() => import("./paginas/CalendarioInstitucionalPage.tsx"));
const CursosActivosPage = diferida(() => import("./paginas/CursosActivosPage.tsx"));
const MateriasPage = diferida(() => import("./paginas/MateriasPage.tsx"));
const PerfilesAcademicosPage = diferida(() => import("./paginas/PerfilesAcademicosPage.tsx"));
const PanelInstitucionalPage = diferida(() => import("./paginas/PanelInstitucionalPage.tsx"));
const ReportesPage = diferida(() => import("./paginas/ReportesPage.tsx"));
const GestionInstitucionesPage = diferida(() => import("./paginas/GestionInstitucionesPage.tsx"));
const SaludSistemaPage = diferida(() => import("./paginas/SaludSistemaPage.tsx"));
const TendenciasPage = diferida(() => import("./paginas/TendenciasPage.tsx"));
const CompetenciasPage = diferida(() => import("./paginas/CompetenciasPage.tsx"));
const DashboardObjetivosPage = diferida(() => import("./paginas/DashboardObjetivosPage.tsx"));
const HabitosPage = diferida(() => import("./paginas/HabitosPage.tsx"));
const MisMetasPage = diferida(() => import("./paginas/MisMetasPage.tsx"));
const CalificacionesPage = diferida(() => import("./paginas/CalificacionesPage.tsx"));
const AulaVirtualEstudiantePage = diferida(() => import("./paginas/AulaVirtualEstudiantePage.tsx"));
const AulaVirtualProfesorPage = diferida(() => import("./paginas/AulaVirtualProfesorPage.tsx"));
const MisCursosEstudiantePage = diferida(() => import("./paginas/MisCursosEstudiantePage.tsx"));
const MisTareasEstudiantePage = diferida(() => import("./paginas/MisTareasEstudiantePage.tsx"));
const DetalleMateriaPage = diferida(() => import("./paginas/DetalleMateriaPage.tsx"));
const FamiliaCalendarioPage = diferida(() => import("./paginas/FamiliaCalendarioPage.tsx"));
const FamiliaComunicadosPage = diferida(() => import("./paginas/FamiliaComunicadosPage.tsx"));
const MisCursosPreceptorPage = diferida(() => import("./paginas/MisCursosPreceptorPage.tsx"));
const DiarioReflexivoProfesorPage = diferida(() => import("./paginas/DiarioReflexivoProfesorPage.tsx"));
const GestionTareasProfesorPage = diferida(() => import("./paginas/GestionTareasProfesorPage.tsx"));
const EnviarQuejaPage = diferida(() => import("./paginas/EnviarQuejaPage.tsx"));
const MaestroEstudioPage = diferida(() => import("./paginas/MaestroEstudioPage.tsx"));
const ModoEdicionPage = diferida(() => import("./paginas/ModoEdicionPage.tsx"));
const AnunciosPage = diferida(() => import("./paginas/AnunciosPage.tsx"));
const AnunciosMaestroPage = diferida(() => import("./paginas/AnunciosMaestroPage.tsx"));
// La capa de avisos obligatorios: se monta en toda la app (fuera de las rutas)
// y tapa cualquier pantalla mientras haya avisos sin leer.
const AvisosObligatorios = diferida(() => import("./paginas/components/anuncios/BandejaObligatoria.tsx"));
const AlertasMensajes = diferida(() => import("./paginas/components/chat/AlertasMensajes.tsx"));

// Registro central: qué componente concreto dibuja cada página.
const PAGINAS: Record<Exclude<Page, "login">, () => React.ReactElement> = {
  "en-construccion": () => <EnConstruccion />,
  "configuracion-cuenta": () => <ConfiguracionCuentaPage />,
  "recuperar-contrasena": () => <RecuperarContrasenaPage />,
  "ayuda-de-acceso": () => <AyudaDeAccesoPage />,
  "asistencia-ia": () => <AsistenciaIAPage />,
  biblioteca: () => <BibliotecaPage />,
  documentos: () => <DocumentosPage />,
  proyectos: () => <ProyectosPage />,
  "metodos-estudio": () => <MetodosEstudioPage />,
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
  "materias-institucion": () => <MateriasPage />,
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
  "maestro-estudio": () => <MaestroEstudioPage />,
  "modulos-institucion": () => <ModoEdicionPage />,
  anuncios: () => <AnunciosPage />,
  "anuncios-maestro": () => <AnunciosMaestroPage />,
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
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-background" role="status">
      <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "var(--nexo-acento)", color: "var(--nexo-sobre-acento)" }} aria-hidden="true">
        <span className="material-symbols-outlined relleno" style={{ fontSize: 28 }}>hub</span>
      </span>
      <span className="nx-barra-carga w-32" aria-hidden="true" />
      <p className="sr-only">Abriendo NEXO…</p>
    </div>
  );
}

/**
 * Espera entre una pantalla y otra (el permiso o la pantalla todavía no
 * llegaron): el menú queda donde estaba y arriba corre una barra, como en
 * cualquier aplicación. Antes se tapaba todo con el logo.
 */
function CargandoPantalla() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  if (!usuario || usuario.primerIngreso) return <Cargando />;
  return (
    <div className="flex bg-fondo min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main className="app-content flex min-h-screen flex-col" aria-busy="true">
        <span className="nx-progreso-ruta" role="progressbar" aria-label="Abriendo la pantalla" />
        <div className="nx-esperando mx-auto mt-[30vh] flex flex-col items-center gap-3 text-sm text-on-surface-variant" role="status">
          <span className="material-symbols-outlined nx-giro" style={{ fontSize: 28 }} aria-hidden="true">progress_activity</span>
          Abriendo…
        </div>
      </main>
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
  const { instancia } = useInstancia();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="material-symbols-outlined grid h-14 w-14 place-items-center rounded-full bg-surface-container-high text-on-surface-variant" aria-hidden="true">lock</span>
      <p className="text-xl font-semibold text-on-surface">
        {motivo ?? "No tenés permiso para ver esta sección."}
      </p>
      <p className="max-w-sm text-sm text-on-surface-variant">
        {temporal ? "No pudimos comprobar el acceso. Volvé a intentarlo cuando se restablezca la conexión." : "Tu perfil no tiene acceso a esta parte de NEXO."}
      </p>
      {temporal && <button onClick={() => window.location.reload()} className="nx-btn nx-btn-primario">Reintentar</button>}
      <button
        onClick={() => navegar(usuario ? inicioPara(usuario.rol, instancia) : "/login")}
        className="nx-btn nx-btn-secundario"
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
  const { instancia } = useInstancia();
  const location = useLocation();
  const [consulta, setConsulta] = useState<{ pagina: Page; usuarioId: number; acceso: ResultadoAcceso } | null>(null);
  // Si cambia la configuración de la escuela se vuelve a preguntar en segundo
  // plano: la pantalla sigue a la vista mientras tanto (no parpadea ni se pierde lo escrito).
  // Lo ya permitido se usa al instante (sin esperar al servidor).
  const acceso = (consulta?.pagina === pagina && consulta?.usuarioId === usuario?.id ? consulta.acceso : null) ?? accesoRecordado(pagina);

  useEffect(() => {
    if (!usuario) return;

    let vigente = true;
    consultarAcceso(pagina).then((respuesta) => {
      if (vigente) setConsulta({ pagina, usuarioId: usuario.id, acceso: respuesta });
    });

    return () => {
      vigente = false;
    };
  }, [usuario, pagina, instancia]);

  if (revisandoSesion) return <Cargando />;

  if (!usuario) {
    return <Navigate to="/login" replace state={sesionFinalizada === "manual" ? null : { destino: location.pathname + location.search, sesionVencida: sesionFinalizada === "vencida" }} />;
  }

  // La primera vez que alguien entra, lo primero que ve es la configuración de
  // su cuenta (ahí puede cambiar la contraseña inicial, si quiere). Hasta que
  // elija, cualquier otra pantalla lo devuelve ahí.
  if (usuario.primerIngreso && pagina !== "configuracion-cuenta") {
    return <Navigate to={RUTA_PRIMER_INGRESO} replace />;
  }

  if (!acceso) return <CargandoPantalla />;
  if (!acceso.permitido) return <SinPermiso motivo={acceso.error} temporal={acceso.temporal} />;

  return PAGINAS[pagina]();
}

/** El login. Si ya hay sesión, no tiene sentido mostrarlo: se entra derecho. */
function PantallaLogin() {
  const { usuario, revisandoSesion } = useNavegacion();
  const { instancia, lista } = useInstancia();
  const location = useLocation();

  if (revisandoSesion) return <Cargando />;
  // El inicio depende del genoma de la escuela (puede estar oculto el módulo de
  // siempre): se espera a conocerlo antes de mandar a la persona a algún lado.
  if (usuario && !lista) return <Cargando />;

  if (usuario) {
    // Si llegó acá por haber pedido una pantalla puntual sin sesión, se lo
    // devuelve a esa pantalla; si no, al inicio de su rol. Acá ya no se juzga
    // si el rol puede verla: de eso se encarga <Pantalla> preguntándole al
    // servidor, y si no puede, se lo dice con todas las letras en vez de
    // dejarlo en otro lado sin explicación (Error 12.6).
    const destino = (location.state as { destino?: string } | null)?.destino;
    return <Navigate to={destino ?? inicioPara(usuario.rol, instancia)} replace />;
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
  const { instancia } = useInstancia();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="material-symbols-outlined grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true">explore_off</span>
      <p className="text-xl font-semibold text-on-surface">No encontramos esta página</p>
      <p className="text-sm text-on-surface-variant">
        Revisá la dirección o volvé a tu espacio para continuar.
      </p>
      <button
        onClick={() => navegar(usuario ? inicioPara(usuario.rol, instancia) : "/login")}
        className="nx-btn nx-btn-secundario"
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

  // La instancia (genoma) de la escuela de quien entró: colores, menú, perfil.
  // Se pide cada vez que cambia la persona; al salir se vuelve a la paleta de
  // siempre. `lista` dice si ya se intentó (aunque haya fallado: sin ella la
  // aplicación funciona igual, con el menú de fábrica).
  const [estadoInstancia, setEstadoInstancia] = useState<{ usuarioId: number; instancia: Instancia | null } | null>(null);
  const [versionInstancia, setVersionInstancia] = useState(0);
  const recargarInstancia = useCallback(() => setVersionInstancia((n) => n + 1), []);
  useEffect(() => {
    if (!usuario) return;
    const controlador = new AbortController();
    pedirInstancia(controlador.signal)
      .then((instancia) => {
        if (controlador.signal.aborted) return;
        // Cambió la configuración de la escuela (o es la primera vez): los permisos
        // recordados pueden ya no valer (un módulo que se mostró o se ocultó).
        olvidarPermisos();
        aplicarTema(instancia.tema);
        aplicarPreferencias(instancia.personalizacion ?? null);
        setEstadoInstancia({ usuarioId: usuario.id, instancia });
      })
      .catch(() => {
        if (!controlador.signal.aborted) setEstadoInstancia({ usuarioId: usuario.id, instancia: null });
      });
    return () => controlador.abort();
  }, [usuario, versionInstancia]);
  useEffect(() => {
    aplicarPreferencias(null);
    if (!usuario) aplicarTema(null);
  }, [usuario]);
  const instanciaVigente = usuario && estadoInstancia?.usuarioId === usuario.id ? estadoInstancia.instancia : null;
  const instanciaLista = !usuario || estadoInstancia?.usuarioId === usuario.id;

  // En los ratos libres después de entrar: las pantallas del menú de esta
  // persona (el código y el permiso) quedan listas, así tocar un ítem es
  // instantáneo. Se saltea si el dispositivo pide ahorrar datos.
  const rolPrecarga = usuario && !usuario.primerIngreso && instanciaLista ? usuario.rol : null;
  useEffect(() => {
    if (!rolPrecarga) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const paginas = [...new Set(accesosDeRol(rolPrecarga, instanciaVigente).map((i) => MAPA_RUTAS[i.ruta]?.pagina as Exclude<Page, "login"> | undefined).filter((p) => p !== undefined))];
    let cancelado = false;
    const libre = (f: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(f, { timeout: 3000 }) : window.setTimeout(f, 300));
    const siguiente = (i: number) => {
      if (cancelado || i >= paginas.length) return;
      const pagina = paginas[i];
      const elemento = PAGINAS[pagina]?.();
      const cargar = elemento ? cargadores.get(elemento.type as object) : undefined;
      Promise.allSettled([cargar?.(), consultarAcceso(pagina)]).then(() => libre(() => siguiente(i + 1)));
    };
    const espera = window.setTimeout(() => libre(() => siguiente(0)), 1200);
    return () => { cancelado = true; window.clearTimeout(espera); };
  }, [rolPrecarga, instanciaVigente]);
  const valorInstancia = useMemo(
    () => ({ instancia: instanciaVigente, recargar: recargarInstancia, lista: instanciaLista }),
    [instanciaVigente, recargarInstancia, instanciaLista]
  );

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
  // Va en una transición: si la pantalla nueva todavía no llegó, la anterior
  // queda a la vista (con una barra arriba) en vez de un cartel de "cargando".
  const [cambiandoPantalla, iniciarCambio] = useTransition();
  const navegar = useCallback((ruta: string) => iniciarCambio(() => { void navigate(ruta); }), [navigate]);

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
    // la llave seguiría viva y serviría para volver a entrar. Antes, que este
    // navegador deje de recibir los avisos push de esta persona.
    void olvidarPush().finally(() => cerrarSesionEnServidor());
    olvidarPermisos();
    setUsuario(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const terminarPrimerIngreso = useCallback(() => {
    setUsuario((actual) => (actual ? { ...actual, primerIngreso: false } : actual));
  }, []);

  const actualizarUsuario = useCallback((cambios: Partial<Usuario>) => {
    setUsuario((actual) => (actual ? { ...actual, ...cambios } : actual));
  }, []);

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
      terminarPrimerIngreso,
      actualizarUsuario,
    }),
    [usuario, location.pathname, revisandoSesion, sesionFinalizada, navegar, cerrarSesion, login, terminarPrimerIngreso, actualizarUsuario]
  );

  return (
    <NavegacionContext.Provider value={valor}>
    <InstanciaContext.Provider value={valorInstancia}>
      <EstadoConexion />
      <Suspense fallback={null}>
        <AvisosObligatorios />
        {usuario && !usuario.primerIngreso && <AlertasMensajes key={usuario.id} />}
      </Suspense>
      {cambiandoPantalla && <span className="nx-progreso-ruta" role="progressbar" aria-label="Abriendo la pantalla" />}
      <ErrorBoundary ruta={location.pathname}>
      <Suspense fallback={<CargandoPantalla />}>
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
    </InstanciaContext.Provider>
    </NavegacionContext.Provider>
  );
}

/** La raíz "/" no es una pantalla: solo decide a dónde mandar a quien entra. */
function PantallaRaiz() {
  const { usuario, revisandoSesion } = useNavegacion();
  const { instancia, lista } = useInstancia();
  if (revisandoSesion || (usuario && !lista)) return <Cargando />;
  return <Navigate to={usuario ? inicioPara(usuario.rol, instancia) : "/login"} replace />;
}
