// src/paginas/components/shared/TopBar.tsx
// La barra de arriba de todas las pantallas. Una sola pieza para que se vea
// igual en todos lados: el título de la pantalla, el buscador, la campana y —en
// el celular— la foto de la cuenta. Si el módulo tiene pestañas (Feed / Debates
// / Tendencias…) van en una segunda fila, subrayadas, como en cualquier app.

import { useEffect, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { useResumenNotificaciones } from "../../../servicios/notificaciones";
import { AvatarCuenta } from "./MenuCuenta";

export interface PestanaTopBar { label: string; ruta: string }

interface TopBarProps {
  title: string;
  /** Contexto corto al lado del título: la escuela, "En vivo", la sub-pantalla. */
  subtitle?: string;
  /** Las pestañas del módulo, como segunda fila de la barra. */
  pestanas?: PestanaTopBar[];
  /** La pestaña encendida cuando no es la dirección actual (el detalle de una materia). */
  pestanaActiva?: string;
  onHelpClick?: () => void;
  onMenuClick?: () => void;
}

export default function TopBar({ title, subtitle, pestanas, pestanaActiva, onHelpClick, onMenuClick }: TopBarProps) {
  const { rutaActiva, navegar } = useNavegacion();
  const { resumen } = useResumenNotificaciones();
  // Al bajar, la barra se separa del contenido con una línea fina.
  const [elevada, setElevada] = useState(false);
  useEffect(() => {
    const medir = () => setElevada(window.scrollY > 4);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

  const activa = pestanaActiva ?? rutaActiva;
  const avisos = resumen.notificaciones;
  const buscar = () => window.dispatchEvent(new Event("nexo:buscar"));
  const hayPestanas = Boolean(pestanas && pestanas.length > 0);

  return <header className={`nexo-topbar ${elevada ? "is-elevada" : ""} ${hayPestanas ? "con-pestanas" : ""}`}>
    <div className="nexo-topbar-fila">
      <div className="nexo-topbar-lugar">
        <div className="nexo-topbar-titulos">
          <h2 className="nexo-topbar-titulo">{title}</h2>
          {subtitle && <span className="nexo-topbar-contexto" title={subtitle}>{subtitle}</span>}
        </div>
      </div>

      <div className="nexo-topbar-acciones">
        <button type="button" className="nexo-topbar-buscar-campo" onClick={buscar} aria-label="Buscar sección" title="Buscar (Ctrl K)">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <span>Buscar en NEXO…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button type="button" className="nexo-icon-button nexo-topbar-buscar-icono" aria-label="Buscar en NEXO" onClick={buscar}>
          <span className="material-symbols-outlined">search</span>
        </button>
        <button type="button" className="nexo-icon-button" onClick={() => navegar("/notificaciones")} title="Notificaciones"
          aria-label={avisos > 0 ? `Notificaciones: ${avisos} sin leer` : "Notificaciones"}>
          <span className="material-symbols-outlined">notifications</span>
          {avisos > 0 && <span className="nexo-topbar-globo" aria-hidden="true">{avisos > 99 ? "99+" : avisos}</span>}
        </button>
        {onHelpClick && <button type="button" onClick={onHelpClick} className="nexo-icon-button" aria-label="Ayuda" title="Ayuda"><span className="material-symbols-outlined">help</span></button>}
        {onMenuClick && <button type="button" onClick={onMenuClick} className="nexo-icon-button" aria-label="Más opciones" title="Más opciones"><span className="material-symbols-outlined">more_vert</span></button>}
        <button type="button" className="nexo-icon-button nexo-topbar-avatar" aria-label="Mi cuenta" aria-haspopup="menu"
          onClick={(e) => window.dispatchEvent(new CustomEvent("nexo:cuenta", { detail: e.currentTarget }))}>
          <AvatarCuenta tamano={30} />
        </button>
      </div>
    </div>

    {hayPestanas && <nav className="nexo-topbar-pestanas" aria-label={`Secciones de ${title}`}>
      {pestanas!.map((p) => {
        const actual = p.ruta === activa;
        return <button key={p.ruta} type="button" className="nexo-topbar-pestana" aria-current={actual ? "page" : undefined} onClick={() => { if (p.ruta !== rutaActiva) navegar(p.ruta); }}>
          {p.label}
        </button>;
      })}
    </nav>}
  </header>;
}
