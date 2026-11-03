// src/paginas/components/shared/MenuCuenta.tsx
// El menú de la cuenta, como en cualquier aplicación: se abre desde la foto de
// la persona (abajo del menú lateral en la computadora, arriba a la derecha en
// el celular). Reúne lo que no es una sección: mi cuenta, notificaciones, la
// apariencia (claro / oscuro / automático) y cerrar sesión.

import { useEffect, useRef, useState } from "react";
import { useNavegacion } from "../../../navegacion";
import { useInstancia } from "../../../servicios/instancia";
import { useResumenNotificaciones } from "../../../servicios/notificaciones";
import { guardarPreferenciaModo, type PreferenciaModo } from "../../../servicios/tema";
import { usePreferenciaModo } from "../../../servicios/useModo";
import { ROL_LABELS } from "./roles";

const MODOS: { id: PreferenciaModo; nombre: string; icono: string }[] = [
  { id: "claro", nombre: "Claro", icono: "light_mode" },
  { id: "oscuro", nombre: "Oscuro", icono: "dark_mode" },
  { id: "sistema", nombre: "Automático", icono: "contrast" },
];

/** La foto de la persona o sus iniciales. */
export function AvatarCuenta({ tamano = 32 }: { tamano?: number }) {
  const { usuario } = useNavegacion();
  const [fallo, setFallo] = useState(false);
  if (!usuario) return null;
  const iniciales = usuario.nombre.replace(/^(Prof\.|Directora?|Preceptora?)\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const estilo = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.38) };
  return usuario.avatarUrl && !fallo
    ? <img src={usuario.avatarUrl} alt="" className="nexo-avatar" style={estilo} onError={() => setFallo(true)} />
    : <span className="nexo-avatar" style={estilo} aria-hidden="true">{iniciales}</span>;
}

interface MenuCuentaProps {
  /** El botón que lo abrió: el menú se ubica junto a él y le devuelve el foco. */
  ancla: HTMLElement | null;
  /** Hacia dónde se despliega en la computadora. */
  lado?: "arriba" | "abajo";
  onCerrar: () => void;
}

export default function MenuCuenta({ ancla, lado = "arriba", onCerrar }: MenuCuentaProps) {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const { instancia } = useInstancia();
  const { resumen } = useResumenNotificaciones();
  const modo = usePreferenciaModo();
  const caja = useRef<HTMLDivElement>(null);
  // Junto al botón que lo abrió (se calcula al abrir: el menú se monta cada vez).
  const [posicion] = useState<{ left: number; top?: number; bottom?: number }>(() => {
    if (!ancla) return { left: 12, bottom: 72 };
    const r = ancla.getBoundingClientRect();
    const ancho = 280;
    const left = Math.max(8, Math.min(window.innerWidth - ancho - 8, lado === "arriba" ? r.left : r.right - ancho));
    return lado === "arriba" ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 };
  });

  useEffect(() => {
    caja.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCerrar(); ancla?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const botones = [...(caja.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
        const i = botones.indexOf(document.activeElement as HTMLButtonElement);
        botones[(i + (e.key === "ArrowDown" ? 1 : -1) + botones.length) % botones.length]?.focus();
        e.preventDefault();
      }
    };
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node) && !ancla?.contains(e.target as Node)) onCerrar();
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("pointerdown", fuera);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("pointerdown", fuera); };
  }, [ancla, onCerrar]);

  if (!usuario) return null;
  const ir = (ruta: string) => { onCerrar(); navegar(ruta); };
  const perfil = instancia?.perfil;
  const escuela = instancia?.institucion ? instancia.identidad.nombre : null;

  return (
    <div ref={caja} className="nexo-menu" role="menu" aria-label="Mi cuenta" style={posicion}>
      <div className="nexo-menu-cabecera">
        <AvatarCuenta tamano={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{usuario.nombre}</p>
          <p className="truncate text-xs text-on-surface-variant flex items-center gap-1.5">
            {perfil && <span className="nexo-perfil-punto" style={{ background: perfil.color }} aria-hidden="true" />}
            {perfil?.nombre ?? ROL_LABELS[usuario.rol]}{escuela ? ` · ${escuela}` : ""}
          </p>
        </div>
      </div>
      <div className="nexo-menu-separador" />
      <button type="button" role="menuitem" className="nexo-menu-item" onClick={() => ir("/configuracion")}>
        <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>Mi cuenta y preferencias
      </button>
      <button type="button" role="menuitem" className="nexo-menu-item" onClick={() => ir("/notificaciones")}>
        <span className="material-symbols-outlined" aria-hidden="true">notifications</span>Notificaciones
        {resumen.notificaciones > 0 && <span className="nexo-nav-badge">{resumen.notificaciones > 99 ? "99+" : resumen.notificaciones}</span>}
      </button>
      <div className="nexo-menu-separador" />
      <p className="nexo-menu-etiqueta" id="menu-apariencia">Apariencia</p>
      <div className="nexo-segmentado" role="group" aria-labelledby="menu-apariencia">
        {MODOS.map((m) => (
          <button key={m.id} type="button" aria-pressed={modo === m.id} onClick={() => guardarPreferenciaModo(m.id)}>
            <span className="material-symbols-outlined" aria-hidden="true">{m.icono}</span>{m.nombre}
          </button>
        ))}
      </div>
      <div className="nexo-menu-separador" />
      <button type="button" role="menuitem" className="nexo-menu-item" onClick={() => { onCerrar(); window.open("/ayuda-de-acceso", "_blank", "noopener"); }}>
        <span className="material-symbols-outlined" aria-hidden="true">help</span>Ayuda
      </button>
      <button type="button" role="menuitem" className="nexo-menu-item peligro" onClick={() => { onCerrar(); cerrarSesion(); }}>
        <span className="material-symbols-outlined" aria-hidden="true">logout</span>Cerrar sesión
      </button>
    </div>
  );
}
