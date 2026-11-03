// src/paginas/components/shared/Sidebar.tsx
// La navegación de NEXO, como la de cualquier aplicación grande:
//   · Computadora: menú lateral fijo con la escuela arriba, un buscador, las
//     secciones (en categorías si son muchas) y la cuenta abajo.
//   · Celular: barra inferior con las 4 secciones principales del perfil y
//     "Más", que abre el menú completo como hoja desde abajo.

import { useEffect, useRef, useState } from "react";
import { MAPA_RUTAS, seccionDeRuta, useNavegacion, type RutaPrivada } from "../../../navegacion";
import { ROL_LABELS, type Rol } from "./roles";
import { useResumenNotificaciones } from "../../../servicios/notificaciones";
import { categorizar, menuPorSecciones, NOMBRE_CATEGORIA, pestanasInferiores, ubicacionEnMenu } from "./navegacionItems";
import { useInstancia } from "../../../servicios/instancia";
import BuscadorNavegacion from "./BuscadorNavegacion";
import MenuCuenta, { AvatarCuenta } from "./MenuCuenta";
import { ANCHO_POR_DEFECTO, aplicarAncho, anchoMenu, fijarAncho, fijarCerrado, useMenuCerrado } from "../../../servicios/menuLateral";

export type { Rol };
interface SidebarProps {
  usuario?: { nombre: string; rol: Rol; avatarUrl?: string; curso?: string; materia?: string };
  onNavegar: (ruta: string) => void;
  onCerrarSesion: () => void;
}

export default function Sidebar({ usuario, onNavegar, onCerrarSesion }: SidebarProps) {
  const { usuario: sesion, rutaActiva } = useNavegacion();
  const u = sesion ?? usuario;
  const { resumen } = useResumenNotificaciones();
  // El genoma de la escuela: qué módulos ve esta persona, en qué orden y con qué
  // nombre; cómo se llama su perfil y la propia escuela.
  const { instancia } = useInstancia();
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [cuenta, setCuenta] = useState<{ ancla: HTMLElement; lado: "arriba" | "abajo" } | null>(null);
  const menu = useRef<HTMLElement>(null);
  const botonMas = useRef<HTMLButtonElement>(null);
  const botonCuenta = useRef<HTMLButtonElement>(null);
  const cerrado = useMenuCerrado();

  useEffect(() => {
    const buscar = () => setBuscando(true);
    const abrirCuenta = (e: Event) => {
      const ancla = (e as CustomEvent<HTMLElement | null>).detail ?? botonCuenta.current;
      if (ancla) setCuenta({ ancla, lado: "abajo" });
    };
    const teclado = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); buscar(); }
      // Ctrl + barra invertida abre y cierra el menú lateral (como en Notion).
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") { e.preventDefault(); fijarCerrado(!document.documentElement.hasAttribute("data-menu-cerrado")); }
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("nexo:buscar", buscar);
    window.addEventListener("nexo:cuenta", abrirCuenta);
    window.addEventListener("keydown", teclado);
    return () => {
      window.removeEventListener("nexo:buscar", buscar);
      window.removeEventListener("nexo:cuenta", abrirCuenta);
      window.removeEventListener("keydown", teclado);
    };
  }, []);
  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    const disparador = botonMas.current;
    document.body.style.overflow = "hidden";
    menu.current?.querySelector<HTMLButtonElement>(".nexo-nav-item")?.focus();
    return () => { document.body.style.overflow = anterior; disparador?.focus(); };
  }, [abierto]);
  if (!u) return null;

  // Arrastrar el borde: más angosto o más ancho; si se lleva casi hasta el
  // costado, se cierra. Doble clic: el ancho de siempre.
  const empezarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const borde = e.currentTarget;
    borde.setPointerCapture(e.pointerId);
    document.documentElement.dataset.redimensionando = "";
    let ancho = anchoMenu();
    const mover = (ev: PointerEvent) => { ancho = ev.clientX; aplicarAncho(ev.clientX); };
    const soltar = () => {
      borde.removeEventListener("pointermove", mover);
      delete document.documentElement.dataset.redimensionando;
      if (ancho < 140) { aplicarAncho(anchoMenu()); fijarCerrado(true); } else fijarAncho(ancho);
    };
    borde.addEventListener("pointermove", mover);
    borde.addEventListener("pointerup", soltar, { once: true });
    borde.addEventListener("pointercancel", soltar, { once: true });
  };

  // Un solo ítem encendido: el de la dirección exacta o, si no, el primero de su sección
  // (antes se encendían todos los de la misma sección: Mi aprendizaje y Métodos de estudio).
  const enMenu = ubicacionEnMenu(u.rol, instancia, rutaActiva)?.item.ruta;
  const activo = (ruta: RutaPrivada) => enMenu ? ruta === enMenu : MAPA_RUTAS[ruta].seccion === seccionDeRuta(rutaActiva);
  const ir = (ruta: string) => { setAbierto(false); setBuscando(false); onNavegar(ruta); };
  const badge = (n: number) => n > 0 ? <span className="nexo-nav-badge" aria-label={`${n} sin leer`}>{n > 99 ? "99+" : n}</span> : null;
  // El menú en las secciones que armó la dirección ("Mi espacio" primero).
  const gruposMenu = menuPorSecciones(u.rol, instancia);
  const soloUnGrupo = gruposMenu.length === 1;
  const perfil = instancia?.perfil;
  const escuela = instancia?.institucion ? instancia.identidad.nombre : u.rol === "administrador" ? "Estudio del Maestro" : "NEXO";
  const inferiores = pestanasInferiores(u.rol, instancia);
  const masActivo = !inferiores.some((i) => activo(i.ruta));

  const item = (i: { ruta: RutaPrivada; label: string; icono: string }) => (
    <button key={i.ruta} type="button" onClick={() => ir(i.ruta)} className={`nexo-nav-item ${activo(i.ruta) ? "is-active" : ""}`} aria-current={activo(i.ruta) ? "page" : undefined}>
      <span className="material-symbols-outlined" aria-hidden="true">{i.icono}</span>
      <span>{i.label}</span>
      {i.ruta === "/chat" && badge(resumen.chat)}
    </button>
  );

  return <>
    <a className="nexo-skip-link" href="#contenido-principal" onClick={() => document.getElementById("contenido-principal")?.focus()}>Saltar al contenido</a>
    {abierto && <button className="nexo-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setAbierto(false)} />}
    <nav ref={menu} id="nexo-sidebar" className={`nexo-sidebar ${abierto ? "is-open" : ""}`} aria-label="Navegación principal"
      onKeyDown={e => {
        if (!abierto || e.key !== "Tab") return;
        const botones = menu.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!botones?.length) return;
        const primero = botones[0], ultimo = botones[botones.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }}>
      <div className="nexo-escuela">
        <span className="nexo-escuela-logo material-symbols-outlined" aria-hidden="true">{instancia?.identidad.icono || "hub"}</span>
        <span className="nexo-escuela-texto" title={instancia?.identidad.lema || undefined}>
          <span className="nexo-escuela-nombre">{escuela}</span>
          <span className="nexo-escuela-marca">NEXO · {perfil?.nombre ?? ROL_LABELS[u.rol]}</span>
        </span>
        <button type="button" className="nexo-icon-button nexo-menu-cerrar" aria-label="Cerrar el menú lateral" title="Cerrar el menú (Ctrl + \)" onClick={() => fijarCerrado(true)}><span className="material-symbols-outlined" aria-hidden="true">left_panel_close</span></button>
        <button className="nexo-icon-button nexo-drawer-close" aria-label="Cerrar menú" onClick={() => setAbierto(false)}><span className="material-symbols-outlined">close</span></button>
      </div>
      <button type="button" onClick={() => setBuscando(true)} className="nexo-nav-search">
        <span className="material-symbols-outlined" aria-hidden="true">search</span><span>Buscar</span><kbd>Ctrl K</kbd>
      </button>
      <div className="nexo-sidebar-scroll">
        {gruposMenu.map(grupo => <div key={grupo.id || "base"} className="nexo-nav-group" role="group" aria-label={grupo.nombre}>
          {/* El grupo de siempre ("Mi espacio") va sin título salvo que la escuela haya armado otras secciones. */}
          {(!soloUnGrupo || grupo.id) && <div className="nexo-nav-section-label">{grupo.id && grupo.icono && <span className="material-symbols-outlined" aria-hidden="true">{grupo.icono}</span>}{grupo.nombre}</div>}
          {grupo.id
            ? <div className="nexo-nav-items">{grupo.items.map(item)}</div>
            : categorizar(grupo.items).map((c) => <div key={c.categoria ?? "todo"} className="nexo-nav-group">
                {c.categoria && c.categoria !== "principal" && <div className="nexo-nav-section-label">{NOMBRE_CATEGORIA[c.categoria]}</div>}
                <div className="nexo-nav-items">{c.items.map(item)}</div>
              </div>)}
        </div>)}
        <div className="nexo-nav-group lg:hidden">
          <div className="nexo-nav-section-label">Cuenta</div>
          <div className="nexo-nav-items">
            <button type="button" onClick={() => ir("/notificaciones")} className={`nexo-nav-item ${activo("/notificaciones") ? "is-active" : ""}`} aria-current={activo("/notificaciones") ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">notifications</span><span>Notificaciones</span>{badge(resumen.notificaciones)}</button>
            <button type="button" onClick={() => ir("/configuracion")} className={`nexo-nav-item ${activo("/configuracion") ? "is-active" : ""}`} aria-current={activo("/configuracion") ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">settings</span><span>Mi cuenta y preferencias</span></button>
            <button type="button" onClick={() => { setAbierto(false); onCerrarSesion(); }} className="nexo-nav-item"><span className="material-symbols-outlined" aria-hidden="true">logout</span><span>Cerrar sesión</span></button>
          </div>
        </div>
      </div>
      <div className="nexo-user-card">
        <button ref={botonCuenta} type="button" className="nexo-user-boton" aria-haspopup="menu" aria-expanded={Boolean(cuenta)} onClick={(e) => setCuenta(cuenta ? null : { ancla: e.currentTarget, lado: "arriba" })}>
          <AvatarCuenta tamano={34} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight text-on-surface break-words">{u.nombre}</span>
            <span className="block truncate text-xs text-on-surface-variant">{perfil?.nombre ?? ROL_LABELS[u.rol]}</span>
          </span>
          {resumen.notificaciones > 0 && <span className="nexo-nav-badge" aria-label={`${resumen.notificaciones} notificaciones sin leer`}>{resumen.notificaciones > 99 ? "99+" : resumen.notificaciones}</span>}
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true" style={{ fontSize: 18 }}>unfold_more</span>
        </button>
      </div>
    </nav>
    {/* El borde para cambiar el ancho va afuera del menú (que recorta lo que sobresale):
        así se agarra justo sobre la línea divisoria. */}
    <div className="nexo-sidebar-borde" role="separator" aria-orientation="vertical" aria-label="Ancho del menú lateral" tabIndex={0}
      aria-valuemin={200} aria-valuemax={420} aria-valuenow={anchoMenu()}
      onPointerDown={empezarArrastre} onDoubleClick={() => fijarAncho(ANCHO_POR_DEFECTO)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); fijarAncho(anchoMenu() + (e.key === "ArrowRight" ? 16 : -16)); }
        if (e.key === "Enter") fijarCerrado(true);
      }} />
    {/* Con el menú cerrado, un botón para volver a abrirlo (solo computadora). */}
    {cerrado && <button type="button" className="nexo-menu-abrir" onClick={() => fijarCerrado(false)} aria-label="Abrir el menú lateral" title="Abrir el menú (Ctrl + \)">
      <span className="material-symbols-outlined" aria-hidden="true">left_panel_open</span>
    </button>}

    {/* Celular: las cuatro secciones principales + "Más". */}
    <nav className="nexo-barra-inferior" aria-label="Secciones principales">
      {inferiores.map((i) => (
        <button key={i.ruta} type="button" onClick={() => ir(i.ruta)} aria-current={activo(i.ruta) ? "page" : undefined}>
          <span className="icono"><span className="material-symbols-outlined" aria-hidden="true">{i.icono}</span></span>
          {i.ruta === "/chat" && resumen.chat > 0 && <span className="globo" aria-hidden="true">{resumen.chat > 99 ? "99+" : resumen.chat}</span>}
          <span>{i.label}</span>
        </button>
      ))}
      <button ref={botonMas} type="button" onClick={() => setAbierto(true)} aria-expanded={abierto} aria-controls="nexo-sidebar" aria-current={masActivo && !abierto ? "page" : undefined} aria-label="Más secciones">
        <span className="icono"><span className="material-symbols-outlined" aria-hidden="true">{abierto ? "close" : "menu"}</span></span>
        <span>Más</span>
      </button>
    </nav>

    {buscando && <BuscadorNavegacion rol={u.rol} onCerrar={() => setBuscando(false)} onNavegar={ir} />}
    {cuenta && <MenuCuenta ancla={cuenta.ancla} lado={cuenta.lado} onCerrar={() => setCuenta(null)} />}
  </>;
}
