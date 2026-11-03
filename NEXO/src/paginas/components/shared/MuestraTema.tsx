// Un NEXO en miniatura (menú, una tarjeta y sus botones) pintado con una paleta
// en un modo, sin tocar el resto de la aplicación: las variables del tema van
// como estilo en línea y `data-modo` trae las superficies de ese modo.

import type { CSSProperties } from "react";
import { estiloDeTema, type ModoColor, type Tema } from "../../../servicios/tema";

const MENU = [
  { nombre: "Inicio", icono: "home" },
  { nombre: "Anuncios", icono: "campaign" },
  { nombre: "Mensajes", icono: "chat" },
  { nombre: "Calendario", icono: "calendar_month" },
];

export default function MuestraTema({ tema, modo, nombre = "Tu escuela", icono = "school" }: { tema: Tema; modo: ModoColor; nombre?: string; icono?: string }) {
  const estilo = estiloDeTema(tema, modo) as CSSProperties;
  return (
    <figure data-modo={modo} style={estilo} className="m-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-linea bg-background text-on-surface">
      <figcaption className="border-b border-linea px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{modo === "claro" ? "Modo claro" : "Modo oscuro"}</figcaption>
      <div className="flex">
        <div className="flex w-[40%] max-w-[150px] shrink-0 flex-col gap-0.5 border-r border-linea p-2" style={{ background: "var(--nexo-sidebar)" }}>
          <div className="mb-1.5 flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined grid h-5 w-5 shrink-0 place-items-center rounded" style={{ background: "var(--nexo-acento)", color: "var(--nexo-sobre-acento)", fontSize: 13 }} aria-hidden="true">{icono}</span>
            <span className="min-w-0 break-words text-[11px] font-semibold leading-tight">{nombre}</span>
          </div>
          {MENU.map((m, i) => (
            <span
              key={m.nombre}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] ${i === 1 ? "font-semibold" : "text-on-surface-variant"}`}
              style={i === 1 ? { background: "color-mix(in srgb, var(--nexo-acento) 10%, transparent)", color: "var(--nexo-primario)" } : undefined}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">{m.icono}</span>{m.nombre}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-2.5">
          <div className="rounded-md border border-linea bg-surface-container-low p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-tertiary" style={{ background: "color-mix(in srgb, var(--nexo-terciario) 16%, transparent)" }}>Nuevo</span>
              <span className="rounded bg-secondary-container px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary">3.º A</span>
            </div>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug">Feria de ciencias el viernes</p>
            <p className="text-[11px] leading-snug text-on-surface-variant">Traé tu proyecto al laboratorio a las 10.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--nexo-acento)", color: "var(--nexo-sobre-acento)" }}>Me sumo</span>
              <span className="rounded border border-linea px-2 py-1 text-[11px] font-semibold text-primary">Ver más</span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
