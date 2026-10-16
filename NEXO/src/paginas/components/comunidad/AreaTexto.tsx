// Un área de texto que crece sola y completa @menciones con la gente de la
// escuela (flechas, Enter o Tab para elegir). Ctrl+Enter envía.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { buscarPersonas, type PersonaComunidad } from "../../../servicios/comunidad";
import { Avatar } from "./piezas";

interface Props {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder?: string;
  maximo?: number;
  autoFocus?: boolean;
  onEnviar?: () => void;
  refArea?: RefObject<HTMLTextAreaElement | null>;
  etiqueta: string;
  minAlto?: number;
}

const TOKEN = /(^|\s)@([a-z0-9._-]{0,30})$/i;

export default function AreaTexto({ valor, onCambiar, placeholder, maximo = 1000, autoFocus, onEnviar, refArea, etiqueta, minAlto = 48 }: Props) {
  const propia = useRef<HTMLTextAreaElement>(null);
  const area = refArea ?? propia;
  const [busqueda, setBusqueda] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaComunidad[]>([]);
  const [elegida, setElegida] = useState(0);

  // Crecer con el texto.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minAlto, el.scrollHeight)}px`;
  }, [valor, area, minAlto]);

  useEffect(() => {
    if (busqueda === null) return;
    let vigente = true;
    const t = window.setTimeout(async () => {
      try {
        const r = await buscarPersonas(busqueda);
        if (vigente) { setPersonas(r.personas); setElegida(0); }
      } catch { /* sin sugerencias */ }
    }, 160);
    return () => { vigente = false; window.clearTimeout(t); };
  }, [busqueda]);

  const detectar = (texto: string, cursor: number) => {
    const m = texto.slice(0, cursor).match(TOKEN);
    setBusqueda(m ? m[2] : null);
  };

  const completar = (p: PersonaComunidad) => {
    const el = area.current;
    const cursor = el?.selectionStart ?? valor.length;
    const antes = valor.slice(0, cursor).replace(TOKEN, (_, espacio) => `${espacio}@${p.handle} `);
    const nuevo = antes + valor.slice(cursor);
    onCambiar(nuevo);
    setBusqueda(null);
    window.requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(antes.length, antes.length); });
  };

  const abiertas = busqueda !== null && personas.length > 0;

  return (
    <div className="relative">
      <textarea
        ref={area}
        className="c-area"
        value={valor}
        maxLength={maximo + 200}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={etiqueta}
        aria-autocomplete="list"
        aria-expanded={abiertas}
        onChange={(e) => { onCambiar(e.target.value); detectar(e.target.value, e.target.selectionStart); }}
        onClick={(e) => detectar(valor, e.currentTarget.selectionStart)}
        onBlur={() => window.setTimeout(() => setBusqueda(null), 150)}
        onKeyDown={(e) => {
          if (abiertas) {
            if (e.key === "ArrowDown") { e.preventDefault(); setElegida((elegida + 1) % personas.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setElegida((elegida - 1 + personas.length) % personas.length); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); completar(personas[elegida]); return; }
            if (e.key === "Escape") { e.stopPropagation(); setBusqueda(null); return; }
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onEnviar) { e.preventDefault(); onEnviar(); }
        }}
      />
      {abiertas && (
        <div className="c-sugerencias" role="listbox" aria-label="Personas para mencionar">
          {personas.map((p, i) => (
            <button key={p.id} type="button" role="option" aria-selected={i === elegida} className="c-sugerencia" onMouseDown={(e) => { e.preventDefault(); completar(p); }}>
              <Avatar nombre={p.nombre} url={p.avatar} chico />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{p.nombre}</span>
                <span className="block truncate text-[11.5px] text-on-surface-variant/60">@{p.handle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
