import { useEffect, useRef, useState } from "react";
import { MAPA_RUTAS, seccionDeRuta, useNavegacion, type RutaPrivada } from "../../../navegacion";
import { ROL_LABELS, type Rol } from "./roles";
import { useResumenNotificaciones } from "../../../servicios/notificaciones";
import { NAV_POR_ROL } from "./navegacionItems";
import BuscadorNavegacion from "./BuscadorNavegacion";

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
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const menu = useRef<HTMLElement>(null);
  const abrir = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const buscar = () => setBuscando(true);
    const teclado = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); buscar(); }
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("nexo:buscar", buscar);
    window.addEventListener("keydown", teclado);
    return () => { window.removeEventListener("nexo:buscar", buscar); window.removeEventListener("keydown", teclado); };
  }, []);
  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    const disparador = abrir.current;
    document.body.style.overflow = "hidden";
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.body.style.overflow = anterior; disparador?.focus(); };
  }, [abierto]);
  if (!u) return null;
  const activo = (ruta: RutaPrivada) => MAPA_RUTAS[ruta].seccion === seccionDeRuta(rutaActiva);
  const ir = (ruta: string) => { setAbierto(false); setBuscando(false); onNavegar(ruta); };
  const badge = (n: number) => n > 0 ? <span className="nexo-nav-badge">{n > 99 ? "99+" : n}</span> : null;
  const iniciales = u.nombre.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("");

  return <>
    <a className="nexo-skip-link" href="#contenido-principal" onClick={() => document.getElementById("contenido-principal")?.focus()}>Saltar al contenido</a>
    <div className="nexo-mobile-bar">
      <button ref={abrir} className="nexo-icon-button" onClick={() => setAbierto(true)} aria-expanded={abierto} aria-controls="nexo-sidebar" aria-label="Abrir navegación"><span className="material-symbols-outlined">menu</span></button>
      <span className="nexo-wordmark">nexo<span>.</span></span>
      <button className="nexo-icon-button" onClick={() => setBuscando(true)} aria-label="Buscar sección"><span className="material-symbols-outlined">search</span></button>
    </div>
    {abierto && <button className="nexo-drawer-backdrop" aria-label="Cerrar navegación" onClick={() => setAbierto(false)} />}
    <nav ref={menu} id="nexo-sidebar" className={`nexo-sidebar ${abierto ? "is-open" : ""}`} aria-label="Navegación principal"
      onKeyDown={e => {
        if (!abierto || e.key !== "Tab") return;
        const botones = menu.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!botones?.length) return;
        const primero = botones[0], ultimo = botones[botones.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }}>
      <div className="nexo-brand-row">
        <span className="nexo-brand-icon material-symbols-outlined" aria-hidden="true">hub</span>
        <span className="nexo-wordmark">nexo<span>.</span></span>
        <button className="nexo-icon-button nexo-drawer-close" aria-label="Cerrar navegación" onClick={() => setAbierto(false)}><span className="material-symbols-outlined">close</span></button>
      </div>
      <p className="nexo-brand-caption">TU COMUNIDAD EDUCATIVA</p>
      <button onClick={() => setBuscando(true)} className="nexo-nav-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><span>Ir a una sección</span><kbd>Ctrl K</kbd></button>
      <div className="nexo-sidebar-scroll">
        <div className="nexo-nav-section-label">MI ESPACIO</div>
        <div className="nexo-nav-items">
          {NAV_POR_ROL[u.rol].map(item => <button key={item.ruta} onClick={() => ir(item.ruta)} className={`nexo-nav-item ${activo(item.ruta) ? "is-active" : ""}`} aria-current={activo(item.ruta) ? "page" : undefined}>
            <span className="material-symbols-outlined" aria-hidden="true">{item.icono}</span><span>{item.label}</span>{item.ruta === "/chat" && badge(resumen.chat)}
          </button>)}
        </div>
        <div className="nexo-sidebar-tools">
        <button onClick={() => ir("/notificaciones")} className={`nexo-nav-item ${activo("/notificaciones") ? "is-active" : ""}`} aria-current={activo("/notificaciones") ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">notifications</span><span>Notificaciones</span>{badge(resumen.notificaciones)}</button>
        <button onClick={() => ir("/configuracion")} className={`nexo-nav-item ${activo("/configuracion") ? "is-active" : ""}`} aria-current={activo("/configuracion") ? "page" : undefined}><span className="material-symbols-outlined" aria-hidden="true">settings</span><span>Configuración</span></button>
        </div>
      </div>
      <div className="nexo-user-card">
        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="nexo-avatar" /> : <span className="nexo-avatar">{iniciales}</span>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u.nombre}</p><p className="truncate text-xs text-on-surface-variant/70">{ROL_LABELS[u.rol]}</p></div>
        <button onClick={onCerrarSesion} className="nexo-icon-button" title="Cerrar sesión" aria-label="Cerrar sesión"><span className="material-symbols-outlined">logout</span></button>
      </div>
    </nav>
    {buscando && <BuscadorNavegacion rol={u.rol} onCerrar={() => setBuscando(false)} onNavegar={ir} />}
  </>;
}
