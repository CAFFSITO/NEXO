// src/paginas/components/shared/TopBar.tsx
// La barra de arriba de todas las pantallas con menú lateral. Una sola pieza
// para que se vea igual en todos lados: antes una docena de páginas tenían la
// suya escrita a mano, cada una con otro color, otro alto y su línea abajo.
//
// Dice dónde está la persona con lo mismo que enciende el menú (el ícono del
// ítem y el nombre de su sección), queda pegada arriba al bajar, y si el módulo
// tiene pestañas (Feed / Debates / Tendencias…) van en su segunda fila.

import { useEffect, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { useInstancia } from "../../../servicios/instancia";
import { useResumenNotificaciones } from "../../../servicios/notificaciones";
import { ubicacionEnMenu } from "./navegacionItems";

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

// Lo que está al pie del menú (no es de ningún módulo) tiene su ícono fijo.
const ICONO_HERRAMIENTA: Record<string, string> = { "/notificaciones": "notifications", "/configuracion": "settings" };

const FECHA = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });

export default function TopBar({ title, subtitle, pestanas, pestanaActiva, onHelpClick, onMenuClick }: TopBarProps) {
  const { usuario, rutaActiva, navegar } = useNavegacion();
  const { instancia } = useInstancia();
  const { resumen } = useResumenNotificaciones();
  // Al bajar, la barra se despega del contenido con una sombra (nunca con una línea).
  const [elevada, setElevada] = useState(false);
  useEffect(() => {
    const medir = () => setElevada(window.scrollY > 4);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

  const ubicacion = usuario ? ubicacionEnMenu(usuario.rol, instancia, rutaActiva) : null;
  const icono = ubicacion?.item.icono ?? ICONO_HERRAMIENTA[rutaActiva] ?? "home";
  const seccion = ubicacion?.grupo.nombre ?? "Mi espacio";
  const activa = pestanaActiva ?? rutaActiva;
  const fecha = FECHA.format(new Date());
  const avisos = resumen.notificaciones;

  return <header className={`nexo-topbar ${elevada ? "is-elevada" : ""}`}>
    <div className="nexo-topbar-fila">
      <div className="nexo-topbar-lugar">
        <span className="nexo-topbar-icono material-symbols-outlined" aria-hidden="true">{icono}</span>
        <div className="min-w-0">
          <p className="nexo-topbar-seccion">{seccion}</p>
          <div className="nexo-topbar-titulos">
            <h2 className="nexo-topbar-titulo">{title}</h2>
            {subtitle && <span className="nexo-topbar-contexto" title={subtitle}>{subtitle}</span>}
          </div>
        </div>
      </div>

      <div className="nexo-topbar-acciones">
        <span className="nexo-topbar-fecha">
          <span className="material-symbols-outlined" aria-hidden="true">calendar_today</span>
          {fecha.charAt(0).toUpperCase() + fecha.slice(1)}
        </span>
        <div className="nexo-topbar-herramientas">
          <button type="button" className="nexo-icon-button nexo-topbar-buscar" aria-label="Buscar sección" title="Buscar sección (Ctrl K)" onClick={() => window.dispatchEvent(new Event("nexo:buscar"))}>
            <span className="material-symbols-outlined">search</span>
          </button>
          <button type="button" className="nexo-icon-button relative" onClick={() => navegar("/notificaciones")} title="Notificaciones"
            aria-label={avisos > 0 ? `Notificaciones: ${avisos} sin leer` : "Notificaciones"}>
            <span className="material-symbols-outlined">notifications</span>
            {avisos > 0 && <span className="nexo-topbar-globo" aria-hidden="true">{avisos > 99 ? "99+" : avisos}</span>}
          </button>
          {onHelpClick && <button type="button" onClick={onHelpClick} className="nexo-icon-button" aria-label="Ayuda" title="Ayuda"><span className="material-symbols-outlined">help_outline</span></button>}
          {onMenuClick && <button type="button" onClick={onMenuClick} className="nexo-icon-button" aria-label="Más opciones" title="Más opciones"><span className="material-symbols-outlined">more_vert</span></button>}
        </div>
      </div>
    </div>

    {pestanas && pestanas.length > 0 && <nav className="nexo-topbar-pestanas" aria-label={`Secciones de ${title}`}>
      {pestanas.map((p) => {
        const actual = p.ruta === activa;
        return <button key={p.ruta} type="button" className="nexo-topbar-pestana" aria-current={actual ? "page" : undefined} onClick={() => { if (p.ruta !== rutaActiva) navegar(p.ruta); }}>
          {p.label}
        </button>;
      })}
    </nav>}
  </header>;
}
