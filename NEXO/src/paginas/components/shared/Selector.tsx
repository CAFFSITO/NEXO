// src/paginas/components/shared/Selector.tsx
// El desplegable de NEXO. Reemplaza al <select> del navegador, cuya lista la
// dibuja el sistema operativo (blanca, chiquita, distinta en cada compu) y no se
// puede adaptar a la escuela. Este dibuja todo: el botón, la lista con los
// colores de la escuela, opciones grandes y la marca de la elegida.
//
// Se escribe IGUAL que un <select>, a propósito: mismo `value`, mismo
// `onChange={(e) => …e.target.value}` y las mismas <option> / <optgroup> de
// hijos. Así cambiar un desplegable es cambiar el nombre de la etiqueta y nada
// más. Regla de la app: no se usa <select> nativo; se usa este.
//
// Teclado (como el nativo): flechas, Inicio/Fin, Enter o Espacio para elegir,
// Escape para cerrar, y escribir letras salta a la opción que empieza así. El
// foco se queda en el botón y la opción resaltada se anuncia con
// aria-activedescendant, como pide el patrón "combobox" de WAI-ARIA.
//
// La lista se monta en <body> con posición fija: si el desplegable está dentro
// de un modal con scroll, no queda cortada. Si abajo no hay lugar, abre hacia
// arriba.

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface Opcion {
  valor: string;
  etiqueta: string;
  deshabilitada: boolean;
  grupo?: string;
}

/** Lo que recibe `onChange`: la misma forma que usa el <select> (e.target.value). */
export interface CambioSelector {
  target: { value: string };
}

interface SelectorProps {
  value: string | number;
  onChange?: (e: CambioSelector) => void;
  /** <option> y <optgroup>, como en un <select>. */
  children: ReactNode;
  /** Clases del botón (el mismo aspecto que tenía el <select>). */
  className?: string;
  id?: string;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

// El aspecto por defecto, para un desplegable que no trae clases propias.
const BOTON_POR_DEFECTO =
  "rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface";

function textoDe(nodo: ReactNode): string {
  if (nodo == null || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join("");
  if (isValidElement(nodo)) return textoDe((nodo.props as { children?: ReactNode }).children);
  return "";
}

/** Lee las <option> (y <optgroup>) hijas, igual que el navegador. */
function leerOpciones(hijos: ReactNode, grupo?: string): Opcion[] {
  const lista: Opcion[] = [];
  Children.forEach(hijos, (hijo) => {
    if (!isValidElement(hijo)) return;
    const props = hijo.props as { value?: string | number; children?: ReactNode; disabled?: boolean; label?: string };
    if (hijo.type === "option") {
      const etiqueta = textoDe(props.children).trim();
      lista.push({ valor: String(props.value ?? etiqueta), etiqueta, deshabilitada: Boolean(props.disabled), grupo });
    } else if (hijo.type === "optgroup") {
      lista.push(...leerOpciones(props.children, props.label));
    } else if (hijo.type === Fragment) {
      lista.push(...leerOpciones(props.children, grupo));
    }
  });
  return lista;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Posicion {
  left: number;
  minWidth: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

export default function Selector({
  value,
  onChange,
  children,
  className,
  id,
  disabled = false,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SelectorProps) {
  const opciones = useMemo(() => leerOpciones(children), [children]);
  const valor = String(value);
  const indiceElegido = opciones.findIndex((o) => o.valor === valor);
  const elegida = indiceElegido >= 0 ? opciones[indiceElegido] : null;

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const tipeado = useRef({ texto: "", hasta: 0 });
  const base = useId();
  const idLista = `${base}-lista`;
  const idOpcion = (i: number) => `${base}-op-${i}`;

  const habilitadas = useMemo(() => opciones.map((o, i) => (o.deshabilitada ? -1 : i)).filter((i) => i >= 0), [opciones]);

  const ubicar = useCallback(() => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    const margen = 8;
    const abajo = window.innerHeight - r.bottom - margen;
    const arriba = r.top - margen;
    const haciaArriba = abajo < 220 && arriba > abajo;
    const lugar = (haciaArriba ? arriba : abajo) - 6;
    const ancho = Math.max(r.width, 180);
    setPosicion({
      left: Math.max(margen, Math.min(r.left, window.innerWidth - ancho - margen)),
      minWidth: r.width,
      maxHeight: Math.max(140, Math.min(340, lugar)),
      ...(haciaArriba ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, []);

  const abrir = useCallback(() => {
    if (disabled || opciones.length === 0) return;
    ubicar();
    setActivo(indiceElegido >= 0 && !opciones[indiceElegido].deshabilitada ? indiceElegido : (habilitadas[0] ?? -1));
    setAbierto(true);
  }, [disabled, opciones, indiceElegido, habilitadas, ubicar]);

  const cerrar = useCallback(() => setAbierto(false), []);

  const elegir = (i: number) => {
    const opcion = opciones[i];
    if (!opcion || opcion.deshabilitada) return;
    if (opcion.valor !== valor) onChange?.({ target: { value: opcion.valor } });
    setAbierto(false);
    boton.current?.focus();
  };

  // Mientras está abierta: clic afuera cierra; scroll o cambio de tamaño la
  // reubican (salvo el scroll de la propia lista).
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!boton.current?.contains(t) && !lista.current?.contains(t)) setAbierto(false);
    };
    const alMover = (e: Event) => {
      if (e.target instanceof Node && lista.current?.contains(e.target)) return;
      ubicar();
    };
    // Escape cierra la lista esté donde esté el foco, y no llega al modal de
    // atrás (que también se cierra con Escape): se ataja antes que nadie.
    const alEscapar = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setAbierto(false);
      boton.current?.focus();
    };
    document.addEventListener("pointerdown", alTocar);
    document.addEventListener("keydown", alEscapar, true);
    window.addEventListener("scroll", alMover, true);
    window.addEventListener("resize", alMover);
    return () => {
      document.removeEventListener("pointerdown", alTocar);
      document.removeEventListener("keydown", alEscapar, true);
      window.removeEventListener("scroll", alMover, true);
      window.removeEventListener("resize", alMover);
    };
  }, [abierto, ubicar]);

  // La opción resaltada siempre a la vista.
  useLayoutEffect(() => {
    if (abierto && activo >= 0) document.getElementById(idOpcion(activo))?.scrollIntoView({ block: "nearest" });
    // idOpcion depende solo de `base`, que no cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, activo]);

  const mover = (paso: number) => {
    if (habilitadas.length === 0) return;
    const pos = habilitadas.indexOf(activo);
    const siguiente = pos === -1 ? (paso > 0 ? 0 : habilitadas.length - 1) : Math.max(0, Math.min(habilitadas.length - 1, pos + paso));
    setActivo(habilitadas[siguiente]);
  };

  /** Escribir letras salta a la opción que empieza así (como el nativo). */
  const buscarPorTexto = (letra: string) => {
    const ahora = Date.now();
    const t = tipeado.current;
    t.texto = ahora > t.hasta ? letra : t.texto + letra;
    t.hasta = ahora + 700;
    const buscado = sinTildes(t.texto);
    const encontrada = habilitadas.find((i) => sinTildes(opciones[i].etiqueta).startsWith(buscado));
    if (encontrada === undefined) return;
    if (!abierto) abrir();
    setActivo(encontrada);
  };

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const tecla = e.key;
    if (!abierto) {
      if (tecla === "ArrowDown" || tecla === "ArrowUp" || tecla === "Enter" || tecla === " ") {
        e.preventDefault();
        abrir();
      } else if (tecla.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buscarPorTexto(tecla);
      }
      return;
    }
    switch (tecla) {
      case "ArrowDown": e.preventDefault(); mover(1); break;
      case "ArrowUp": e.preventDefault(); mover(-1); break;
      case "Home": e.preventDefault(); setActivo(habilitadas[0] ?? -1); break;
      case "End": e.preventDefault(); setActivo(habilitadas[habilitadas.length - 1] ?? -1); break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activo >= 0) elegir(activo);
        break;
      case "Tab":
        cerrar();
        break;
      default:
        if (tecla.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) buscarPorTexto(tecla);
    }
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={abierto && activo >= 0 ? idOpcion(activo) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        onClick={() => {
          // Algunos navegadores no enfocan un botón al tocarlo: sin foco, las
          // flechas no moverían la lista abierta con el mouse.
          boton.current?.focus();
          if (abierto) cerrar();
          else abrir();
        }}
        onKeyDown={alTeclear}
        className={`nexo-selector ${className ?? BOTON_POR_DEFECTO}`}
      >
        <span className="flex w-full min-w-0 items-center justify-between gap-2 text-left">
          <span className="truncate">{elegida?.etiqueta ?? ""}</span>
          <span
            className={`material-symbols-outlined shrink-0 text-[20px] leading-none opacity-70 transition-transform duration-150 ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </button>

      {abierto && posicion && createPortal(
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
          className="nexo-selector-lista fixed z-[1100] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-low p-1.5 shadow-xl"
          style={{ ...posicion, maxWidth: Math.min(440, window.innerWidth - 16) }}
          // Que tocar la lista no le saque el foco al botón.
          onMouseDown={(e) => e.preventDefault()}
        >
          {opciones.map((o, i) => {
            const nuevoGrupo = o.grupo && o.grupo !== opciones[i - 1]?.grupo;
            const esElegida = i === indiceElegido;
            return (
              <Fragment key={`${o.grupo ?? ""}:${o.valor}:${i}`}>
                {nuevoGrupo && (
                  <li role="presentation" className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                    {o.grupo}
                  </li>
                )}
                <li
                  id={idOpcion(i)}
                  role="option"
                  aria-selected={esElegida}
                  aria-disabled={o.deshabilitada || undefined}
                  onMouseEnter={() => !o.deshabilitada && setActivo(i)}
                  onClick={() => elegir(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[15px] leading-snug transition-colors ${
                    o.deshabilitada ? "cursor-not-allowed opacity-40" : ""
                  } ${i === activo ? "bg-white/5" : ""} ${esElegida ? "font-semibold text-primary" : "text-on-surface"}`}
                >
                  <span className={o.etiqueta ? "" : "opacity-50"}>{o.etiqueta || "—"}</span>
                  {esElegida && (
                    <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">
                      check
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
}
