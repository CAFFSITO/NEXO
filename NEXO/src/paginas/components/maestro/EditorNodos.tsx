// El editor de nodos del Maestro: crear algoritmos y funciones sin escribir una
// línea de código, solo conectando nodos. Arrastrá desde una salida (derecha de
// un nodo) hasta una entrada (izquierda de otro). "Probar" corre el grafo una
// vez y muestra el número que viaja por cada cable; "Simular" lo corre miles de
// veces con valores al azar; "Aprobar" sella el grafo con su probabilidad. Sin
// aprobación, un grafo no se activa (el servidor lo exige).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aprobarGrafo,
  evaluarGrafo,
  simularGrafo,
  type AlgoritmoCatalogo,
  type Aprobacion,
  type Catalogo,
  type Conexion,
  type DatosNodo,
  type Evaluacion,
  type Genoma,
  type Grafo,
  type ModoGrafo,
  type Nodo,
  type Simulacion,
  type TipoNodo,
} from "../../../servicios/maestro";
import PanelSimulacion from "./PanelSimulacion";
import { clonar, COLOR_CATEGORIA, NOMBRE_CATEGORIA, numeroCorto } from "./genomaUtil";
import Selector from "../shared/Selector";

const ANCHO = 214;
const CABECERA = 36;
const FILA = 26;
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const altoDe = (t: TipoNodo) => CABECERA + Math.max(t.entradas.length, t.salidas.length, 1) * FILA + 12;
const puertoEntrada = (n: Nodo, i: number) => ({ x: n.x, y: n.y + CABECERA + FILA * i + FILA / 2 });
const puertoSalida = (n: Nodo, j: number) => ({ x: n.x + ANCHO, y: n.y + CABECERA + FILA * j + FILA / 2 });
function curva(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = Math.max(50, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

type Eleccion = { tipo: "nodo"; id: string } | { tipo: "cable"; indice: number } | null;
type Arrastre =
  | { tipo: "nodo"; id: string; dx: number; dy: number; antes: Grafo; movido: boolean }
  | { tipo: "fondo"; x0: number; y0: number; vx: number; vy: number }
  | null;

export interface EditorNodosProps {
  modo: ModoGrafo;
  titulo: string;
  catalogo: Catalogo;
  grafoInicial: Grafo;
  slot?: AlgoritmoCatalogo;
  genoma: Genoma;
  aprobacionInicial: Aprobacion | null;
  onCerrar: () => void;
  onAplicar: (grafo: Grafo, aprobacion: Aprobacion | null) => void;
}

export default function EditorNodos({ modo, titulo, catalogo, grafoInicial, slot, genoma, aprobacionInicial, onCerrar, onAplicar }: EditorNodosProps) {
  const tipos = useMemo(() => new Map(catalogo.nodos.map((t) => [t.tipo, t])), [catalogo]);
  const [grafo, setGrafo] = useState<Grafo>(() => clonar(grafoInicial));
  const [aprobacion, setAprobacion] = useState<Aprobacion | null>(aprobacionInicial);
  const [historial, setHistorial] = useState<Grafo[]>([]);
  const [eleccion, setEleccion] = useState<Eleccion>(null);
  const [vista, setVista] = useState({ x: 70, y: 70, k: 0.8 });
  const [cableTemporal, setCableTemporal] = useState<{ de: string; salida: string; x: number; y: number } | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | "probar" | "simular" | "aprobar">(null);
  const [pestana, setPestana] = useState<"nodo" | "probar" | "simular">("simular");
  const [valores, setValores] = useState<Record<string, number>>({});
  const [rangos, setRangos] = useState<Record<string, [number, number]>>({});
  const [iteraciones, setIteraciones] = useState(3000);
  const [busqueda, setBusqueda] = useState("");
  const lienzo = useRef<SVGSVGElement>(null);
  const arrastre = useRef<Arrastre>(null);
  const [encuadrado, setEncuadrado] = useState(false);

  /** Acerca o aleja y centra para que todo el grafo entre en el lienzo. */
  const encuadrar = useCallback((nodos: Nodo[]) => {
    const svg = lienzo.current;
    if (!svg || nodos.length === 0) return;
    const r = svg.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodos) {
      const t = tipos.get(n.tipo);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + ANCHO);
      maxY = Math.max(maxY, n.y + (t ? altoDe(t) : 120) + 20);
    }
    const margen = 56;
    const LEGIBLE = 0.6;
    const ideal = Math.min(1.15, (r.width - 2 * margen) / (maxX - minX), (r.height - 2 * margen) / (maxY - minY));
    if (ideal >= LEGIBLE) {
      setVista({ k: ideal, x: (r.width - (maxX - minX) * ideal) / 2 - minX * ideal, y: (r.height - (maxY - minY) * ideal) / 2 - minY * ideal });
    } else {
      // No entra entero a un tamaño legible: se muestra desde el comienzo (las
      // entradas) y el resto se recorre arrastrando el fondo o con la rueda.
      const altoVisible = Math.min(r.height - 2 * margen, (maxY - minY) * LEGIBLE);
      setVista({ k: LEGIBLE, x: margen - minX * LEGIBLE, y: (r.height - altoVisible) / 2 - minY * LEGIBLE });
    }
  }, [tipos]);

  // Al abrir, el grafo se encuadra solo (una vez que el lienzo tiene tamaño).
  useEffect(() => {
    if (encuadrado) return;
    const cuadro = requestAnimationFrame(() => {
      encuadrar(grafo.nodos);
      setEncuadrado(true);
    });
    return () => cancelAnimationFrame(cuadro);
  }, [encuadrado, encuadrar, grafo.nodos]);

  // Variables que el grafo necesita para probarse y simularse.
  const variables = useMemo(() => {
    if (modo === "algoritmo") {
      return (slot?.entradas ?? []).map((e) => ({ id: e.id, nombre: e.nombre, rango: e.rango as [number, number] }));
    }
    const lista: { id: string; nombre: string; rango: [number, number] }[] = [
      { id: "hora", nombre: "Hora del día", rango: [0, 24] },
      { id: "diaSemana", nombre: "Día de la semana (1 = lunes)", rango: [1, 8] },
    ];
    const vistas = new Set<string>();
    for (const n of grafo.nodos) {
      if (n.tipo !== "conteo") continue;
      const id = String(n.datos.metrica ?? "");
      if (!id || vistas.has(id)) continue;
      vistas.add(id);
      lista.push({ id: "metrica:" + id, nombre: catalogo.metricas.find((m) => m.id === id)?.nombre ?? id, rango: [0, 20] });
    }
    return lista;
  }, [modo, slot, grafo.nodos, catalogo.metricas]);

  const valorDe = (id: string, rango: [number, number]) => valores[id] ?? (modo === "flujo" && id === "hora" ? 10 : modo === "flujo" && id === "diaSemana" ? 2 : Math.round(((rango[0] + rango[1]) / 2) * 10) / 10);
  const rangoDe = (id: string, rango: [number, number]) => rangos[id] ?? rango;

  // ── Cambios ──────────────────────────────────────────
  /** Un cambio de LÓGICA: entra al historial y vence la aprobación. */
  const cambiar = useCallback((fn: (g: Grafo) => Grafo) => {
    setHistorial((h) => [...h.slice(-49), grafo]);
    setGrafo(fn(grafo));
    setAprobacion(null);
    setEvaluacion(null);
    setSimulacion(null);
    setError(null);
  }, [grafo]);

  const deshacer = useCallback(() => {
    if (!historial.length) return;
    setGrafo(historial[historial.length - 1]);
    setHistorial(historial.slice(0, -1));
    setAprobacion(null);
    setEvaluacion(null);
  }, [historial]);

  const eliminarElegido = useCallback(() => {
    if (!eleccion) return;
    if (eleccion.tipo === "nodo") {
      cambiar((g) => ({ nodos: g.nodos.filter((n) => n.id !== eleccion.id), conexiones: g.conexiones.filter((c) => c.de !== eleccion.id && c.a !== eleccion.id) }));
    } else {
      cambiar((g) => ({ ...g, conexiones: g.conexiones.filter((_, i) => i !== eleccion.indice) }));
    }
    setEleccion(null);
  }, [eleccion, cambiar]);

  useEffect(() => {
    const teclado = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      if (destino && ["INPUT", "TEXTAREA", "SELECT"].includes(destino.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && eleccion) { e.preventDefault(); eliminarElegido(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); deshacer(); }
      if (e.key === "Escape") setEleccion(null);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [eleccion, eliminarElegido, deshacer]);

  // Zoom con la rueda, alrededor del puntero (el listener no puede ser pasivo).
  useEffect(() => {
    const svg = lienzo.current;
    if (!svg) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      setVista((v) => {
        const k = Math.min(2.2, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
        return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
      });
    };
    svg.addEventListener("wheel", rueda, { passive: false });
    return () => svg.removeEventListener("wheel", rueda);
  }, []);

  const aGrafo = (clientX: number, clientY: number) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: (clientX - r.left - vista.x) / vista.k, y: (clientY - r.top - vista.y) / vista.k };
  };

  // ── Arrastres ────────────────────────────────────────
  const empezarNodo = (e: React.PointerEvent, nodo: Nodo) => {
    e.stopPropagation();
    lienzo.current?.setPointerCapture(e.pointerId);
    const p = aGrafo(e.clientX, e.clientY);
    arrastre.current = { tipo: "nodo", id: nodo.id, dx: p.x - nodo.x, dy: p.y - nodo.y, antes: grafo, movido: false };
    setEleccion({ tipo: "nodo", id: nodo.id });
    setPestana("nodo");
  };

  const empezarCable = (e: React.PointerEvent, nodo: Nodo, salida: string) => {
    e.stopPropagation();
    lienzo.current?.setPointerCapture(e.pointerId);
    const p = aGrafo(e.clientX, e.clientY);
    setCableTemporal({ de: nodo.id, salida, x: p.x, y: p.y });
  };

  const empezarFondo = (e: React.PointerEvent) => {
    lienzo.current?.setPointerCapture(e.pointerId);
    arrastre.current = { tipo: "fondo", x0: e.clientX, y0: e.clientY, vx: vista.x, vy: vista.y };
    setEleccion(null);
  };

  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (cableTemporal) {
      const p = aGrafo(e.clientX, e.clientY);
      setCableTemporal({ ...cableTemporal, x: p.x, y: p.y });
    } else if (a?.tipo === "nodo") {
      const p = aGrafo(e.clientX, e.clientY);
      const x = Math.round((p.x - a.dx) / 10) * 10;
      const y = Math.round((p.y - a.dy) / 10) * 10;
      a.movido = true;
      setGrafo((g) => ({ ...g, nodos: g.nodos.map((n) => (n.id === a.id ? { ...n, x, y } : n)) }));
    } else if (a?.tipo === "fondo") {
      setVista((v) => ({ ...v, x: a.vx + e.clientX - a.x0, y: a.vy + e.clientY - a.y0 }));
    }
  };

  /** ¿Conectar a→b crearía un ciclo? (si desde b ya se llega a a). */
  const creariaCiclo = (desde: string, hasta: string, conexiones: Conexion[]) => {
    const pila = [hasta];
    const vistos = new Set<string>();
    while (pila.length) {
      const actual = pila.pop()!;
      if (actual === desde) return true;
      if (vistos.has(actual)) continue;
      vistos.add(actual);
      for (const c of conexiones) if (c.de === actual) pila.push(c.a);
    }
    return false;
  };

  const soltar = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (cableTemporal) {
      const bajo = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      const objetivo = bajo?.closest("[data-entrada]");
      const nodoId = objetivo?.getAttribute("data-nodo");
      const entrada = objetivo?.getAttribute("data-entrada");
      if (nodoId && entrada && nodoId !== cableTemporal.de) {
        if (creariaCiclo(cableTemporal.de, nodoId, grafo.conexiones)) {
          setError("Esa conexión formaría un ciclo: una señal no puede volver al nodo de donde salió.");
        } else {
          const nueva = { de: cableTemporal.de, salida: cableTemporal.salida, a: nodoId, entrada };
          cambiar((g) => ({ ...g, conexiones: [...g.conexiones.filter((c) => !(c.a === nodoId && c.entrada === entrada)), nueva] }));
        }
      }
      setCableTemporal(null);
    }
    if (a?.tipo === "nodo" && a.movido) setHistorial((h) => [...h.slice(-49), a.antes]);
    arrastre.current = null;
  };

  // ── Agregar nodos ────────────────────────────────────
  const datosIniciales = (t: TipoNodo): DatosNodo => {
    const d: DatosNodo = {};
    for (const c of t.campos) {
      if (c.tipo === "numero") d[c.id] = c.id === "dias" ? 7 : c.min ?? 0;
      else if (c.tipo === "variable") d[c.id] = slot?.entradas[0]?.id ?? "";
      else if (c.tipo === "evento") d[c.id] = catalogo.eventos[0]?.id ?? "";
      else if (c.tipo === "metrica") d[c.id] = catalogo.metricas[0]?.id ?? "";
      else if (c.tipo === "hora") d[c.id] = "08:00";
      else if (c.tipo === "dias") d[c.id] = [1, 2, 3, 4, 5];
      else if (c.tipo === "destino") d[c.id] = "direccion";
      else d[c.id] = "";
    }
    return d;
  };

  const agregar = (t: TipoNodo, datosExtra: DatosNodo = {}) => {
    const r = lienzo.current?.getBoundingClientRect();
    const centro = r ? aGrafo(r.left + r.width / 2, r.top + r.height / 2) : { x: 0, y: 0 };
    const desplazamiento = (grafo.nodos.length % 6) * 24;
    const usados = new Set(grafo.nodos.map((n) => n.id));
    let numero = grafo.nodos.length + 1;
    while (usados.has(`${t.tipo.slice(0, 6)}-${numero}`)) numero++;
    const id = `${t.tipo.slice(0, 6)}-${numero}`;
    const nodo: Nodo = {
      id,
      tipo: t.tipo,
      x: Math.round((centro.x - ANCHO / 2 + desplazamiento) / 10) * 10,
      y: Math.round((centro.y - 40 + desplazamiento) / 10) * 10,
      datos: { ...datosIniciales(t), ...datosExtra },
    };
    cambiar((g) => ({ ...g, nodos: [...g.nodos, nodo] }));
    setEleccion({ tipo: "nodo", id });
    setPestana("nodo");
  };

  const ordenar = () => {
    const profundidad = new Map<string, number>();
    const entrantes = new Map(grafo.nodos.map((n) => [n.id, 0]));
    for (const c of grafo.conexiones) entrantes.set(c.a, (entrantes.get(c.a) ?? 0) + 1);
    const cola = grafo.nodos.filter((n) => !entrantes.get(n.id)).map((n) => n.id);
    cola.forEach((id) => profundidad.set(id, 0));
    const pendientes = new Map(entrantes);
    while (cola.length) {
      const id = cola.shift()!;
      for (const c of grafo.conexiones.filter((x) => x.de === id)) {
        profundidad.set(c.a, Math.max(profundidad.get(c.a) ?? 0, (profundidad.get(id) ?? 0) + 1));
        pendientes.set(c.a, (pendientes.get(c.a) ?? 1) - 1);
        if (pendientes.get(c.a) === 0) cola.push(c.a);
      }
    }
    const filas = new Map<number, number>();
    const nodos = grafo.nodos.map((n) => {
      const d = profundidad.get(n.id) ?? 0;
      const fila = filas.get(d) ?? 0;
      const t = tipos.get(n.tipo);
      filas.set(d, fila + (t ? altoDe(t) : 120) + 40);
      return { ...n, x: d * 280, y: fila };
    });
    setHistorial((h) => [...h.slice(-49), grafo]);
    setGrafo({ ...grafo, nodos });
    encuadrar(nodos);
  };

  // ── Servidor ─────────────────────────────────────────
  const opciones = () => ({
    slot: slot?.id,
    genoma,
    rangos: Object.fromEntries(variables.map((v) => [v.id, rangoDe(v.id, v.rango)])),
  });

  const probar = async () => {
    setOcupado("probar");
    setError(null);
    try {
      const r = await evaluarGrafo(modo, grafo, Object.fromEntries(variables.map((v) => [v.id, valorDe(v.id, v.rango)])), { slot: slot?.id, genoma });
      setEvaluacion(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo probar el grafo.");
    } finally {
      setOcupado(null);
    }
  };

  const simular = async () => {
    setOcupado("simular");
    setError(null);
    try {
      setSimulacion(await simularGrafo(modo, grafo, { ...opciones(), iteraciones, semilla: Math.floor(Math.random() * 1e6) }));
      setPestana("simular");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo simular el grafo.");
    } finally {
      setOcupado(null);
    }
  };

  const aprobar = async () => {
    setOcupado("aprobar");
    setError(null);
    try {
      const r = await aprobarGrafo(modo, grafo, opciones());
      setGrafo(r.grafo);
      setAprobacion(r.aprobacion);
      setSimulacion(r.simulacion);
      setPestana("simular");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar el grafo.");
    } finally {
      setOcupado(null);
    }
  };

  // ── Datos de un nodo ─────────────────────────────────
  const editarDatos = (id: string, cambio: (d: DatosNodo) => DatosNodo) =>
    cambiar((g) => ({ ...g, nodos: g.nodos.map((n) => (n.id === id ? { ...n, datos: cambio({ ...n.datos }) } : n)) }));

  const nodoElegido = eleccion?.tipo === "nodo" ? grafo.nodos.find((n) => n.id === eleccion.id) ?? null : null;
  const tipoElegido = nodoElegido ? tipos.get(nodoElegido.tipo) ?? null : null;
  const disparadas = new Set(evaluacion?.acciones.map((a) => a.nodoId) ?? []);
  const valorSalida = (nodoId: string, salida: string) => {
    const v = evaluacion?.valores[nodoId]?.[salida];
    return typeof v === "number" ? v : null;
  };
  const haySalida = grafo.nodos.some((n) => n.tipo === "salida");
  const disponibles = catalogo.nodos.filter((t) => t.modos.includes(modo) && (!busqueda || t.nombre.toLowerCase().includes(busqueda.toLowerCase())));
  const categorias = [...new Set(disponibles.map((t) => t.categoria))];
  const nombresVariables = Object.fromEntries(variables.map((v) => [v.id, v.nombre]));

  return (
    <div className="m-editor maestro" role="dialog" aria-label={`Editor de nodos: ${titulo}`}>
      <div className="m-editor-barra">
        <span className="material-symbols-outlined text-[color:var(--m-cian)]" aria-hidden="true">account_tree</span>
        <div className="min-w-0 mr-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--m-tenue)]">{modo === "flujo" ? "Función por nodos" : "Algoritmo por nodos"}</p>
          <h2 className="font-headline font-bold truncate">{titulo}</h2>
        </div>
        <span className={`m-sello ${aprobacion ? "aprobado" : "pendiente"}`}>
          <span className="material-symbols-outlined text-base" aria-hidden="true">{aprobacion ? "verified" : "pending"}</span>
          {aprobacion ? `Aprobado · ${(aprobacion.probabilidad * 100).toFixed(1)} %` : "Sin aprobar"}
        </span>
        <button className="m-icono-boton" onClick={deshacer} disabled={!historial.length} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><span className="material-symbols-outlined">undo</span></button>
        <button className="m-icono-boton" onClick={ordenar} title="Ordenar automáticamente" aria-label="Ordenar"><span className="material-symbols-outlined">auto_fix_high</span></button>
        <button className="m-icono-boton" onClick={() => encuadrar(grafo.nodos)} title="Encuadrar todo" aria-label="Encuadrar todo"><span className="material-symbols-outlined">center_focus_strong</span></button>
        <button className="m-boton-fantasma m-boton-chico" onClick={() => { setPestana("probar"); void probar(); }} disabled={!!ocupado}>
          <span className={`material-symbols-outlined ${ocupado === "probar" ? "animate-spin" : ""}`} aria-hidden="true">{ocupado === "probar" ? "progress_activity" : "play_arrow"}</span>Probar
        </button>
        <button className="m-boton-fantasma m-boton-chico" onClick={() => void simular()} disabled={!!ocupado}>
          <span className={`material-symbols-outlined ${ocupado === "simular" ? "animate-spin" : ""}`} aria-hidden="true">{ocupado === "simular" ? "progress_activity" : "casino"}</span>Simular
        </button>
        <button className="m-boton-fantasma m-boton-chico" onClick={() => void aprobar()} disabled={!!ocupado}>
          <span className={`material-symbols-outlined ${ocupado === "aprobar" ? "animate-spin" : ""}`} aria-hidden="true">{ocupado === "aprobar" ? "progress_activity" : "verified"}</span>Aprobar
        </button>
        <button className="m-boton m-boton-chico" onClick={() => onAplicar(grafo, aprobacion)}>
          <span className="material-symbols-outlined" aria-hidden="true">check</span>{aprobacion ? "Usar este grafo" : "Guardar borrador"}
        </button>
        <button className="m-icono-boton" onClick={onCerrar} title="Cerrar sin aplicar" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
      </div>

      <div className="m-editor-cuerpo">
        {/* Paleta */}
        <aside className="m-editor-panel izq" aria-label="Paleta de nodos">
          <input className="m-input" placeholder="Buscar nodo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar nodo" />
          {modo === "algoritmo" && slot && (
            <div className="m-paleta-grupo">
              <h4 style={{ color: COLOR_CATEGORIA.entrada }}>Variables del módulo</h4>
              {slot.entradas.map((v) => (
                <button key={v.id} className="m-paleta-item" onClick={() => agregar(tipos.get("entrada")!, { variable: v.id })}>
                  <i style={{ background: COLOR_CATEGORIA.entrada }} />{v.nombre}
                </button>
              ))}
            </div>
          )}
          {categorias.map((cat) => (
            <div key={cat} className="m-paleta-grupo">
              <h4 style={{ color: COLOR_CATEGORIA[cat] }}>{NOMBRE_CATEGORIA[cat] ?? cat}</h4>
              {disponibles.filter((t) => t.categoria === cat && t.tipo !== "entrada").map((t) => (
                <button
                  key={t.tipo}
                  className="m-paleta-item"
                  onClick={() => agregar(t)}
                  disabled={t.tipo === "salida" && haySalida}
                  title={t.descripcion}
                >
                  <i style={{ background: COLOR_CATEGORIA[cat] }} />{t.nombre}
                </button>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-[color:var(--m-tenue)] mt-6 leading-relaxed">
            Arrastrá desde un punto de salida (derecha) hasta uno de entrada (izquierda). Suprimir borra lo elegido. La rueda acerca y aleja; arrastrar el fondo lo mueve.
          </p>
        </aside>

        {/* Lienzo */}
        <div className="m-lienzo">
          <svg
            ref={lienzo}
            onPointerDown={empezarFondo}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            role="application"
            aria-label="Lienzo de nodos"
          >
            <defs>
              <filter id="m-resplandor" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
              {grafo.conexiones.map((c, i) => {
                const de = grafo.nodos.find((n) => n.id === c.de);
                const a = grafo.nodos.find((n) => n.id === c.a);
                const td = de && tipos.get(de.tipo);
                const ta = a && tipos.get(a.tipo);
                if (!de || !a || !td || !ta) return null;
                const p1 = puertoSalida(de, Math.max(0, td.salidas.indexOf(c.salida)));
                const p2 = puertoEntrada(a, Math.max(0, ta.entradas.findIndex((x) => x.id === c.entrada)));
                const camino = curva(p1, p2);
                const color = COLOR_CATEGORIA[td.categoria] ?? "#fff";
                const valor = valorSalida(c.de, c.salida);
                const elegido = eleccion?.tipo === "cable" && eleccion.indice === i;
                return (
                  <g key={`${c.de}-${c.salida}-${c.a}-${c.entrada}`}>
                    <path d={camino} className="m-cable-fondo" onPointerDown={(e) => { e.stopPropagation(); setEleccion({ tipo: "cable", indice: i }); }} />
                    <path d={camino} className={`m-cable ${elegido ? "is-elegido" : ""}`} stroke={color} />
                    {valor !== null && (
                      <g transform={`translate(${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2})`}>
                        <rect x={-26} y={-11} width={52} height={22} rx={11} fill="#0b0619" stroke={color} />
                        <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fill="#fff">{numeroCorto(valor)}</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {cableTemporal && (() => {
                const de = grafo.nodos.find((n) => n.id === cableTemporal.de);
                const td = de && tipos.get(de.tipo);
                if (!de || !td) return null;
                const p1 = puertoSalida(de, Math.max(0, td.salidas.indexOf(cableTemporal.salida)));
                return <path d={curva(p1, cableTemporal)} className="m-cable" stroke="#ffffff" />;
              })()}

              {grafo.nodos.map((n) => {
                const t = tipos.get(n.tipo);
                if (!t) return null;
                const color = COLOR_CATEGORIA[t.categoria] ?? "#fff";
                const alto = altoDe(t);
                const elegido = eleccion?.tipo === "nodo" && eleccion.id === n.id;
                const conectadas = new Set(grafo.conexiones.filter((c) => c.a === n.id).map((c) => c.entrada));
                const subtitulo = resumenNodo(n, t, catalogo, slot);
                return (
                  <g
                    key={n.id}
                    className={`m-nodo ${elegido ? "is-elegido" : ""} ${disparadas.has(n.id) ? "is-activo" : ""}`}
                    transform={`translate(${n.x} ${n.y})`}
                    style={{ "--nodo-color": color } as React.CSSProperties}
                    onPointerDown={(e) => empezarNodo(e, n)}
                  >
                    <rect className="m-nodo-cuerpo" width={ANCHO} height={alto} rx={16} />
                    <rect width={ANCHO} height={CABECERA} rx={16} fill={color} opacity={0.18} />
                    <rect y={CABECERA - 2} width={ANCHO} height={2} fill={color} opacity={0.6} />
                    <circle cx={16} cy={CABECERA / 2} r={5} fill={color} filter="url(#m-resplandor)" />
                    <text x={30} y={CABECERA / 2 - 2} fontSize="12.5" fontWeight="800" fill="#fff">{recortar(t.nombre, 22)}</text>
                    <text x={30} y={CABECERA / 2 + 11} fontSize="9.5" fill="#b9a9d9">{recortar(subtitulo, 30)}</text>
                    {t.entradas.map((ent, i) => {
                      const p = { x: 0, y: CABECERA + FILA * i + FILA / 2 };
                      const fijo = n.datos.en?.[ent.id] ?? ent.defecto;
                      return (
                        <g key={ent.id} data-nodo={n.id} data-entrada={ent.id}>
                          <circle className="m-puerto" cx={p.x} cy={p.y} r={6.5} fill={conectadas.has(ent.id) ? color : "#0b0619"} stroke={color} strokeWidth={2} data-nodo={n.id} data-entrada={ent.id} />
                          <text x={14} y={p.y + 4} fontSize="11" fill="#d6cbee" pointerEvents="none">{ent.nombre}</text>
                          {!conectadas.has(ent.id) && (
                            <text x={ANCHO / 2 + 18} y={p.y + 4} fontSize="10.5" fill="#7d6fa0" pointerEvents="none">= {numeroCorto(fijo)}</text>
                          )}
                        </g>
                      );
                    })}
                    {t.salidas.map((sal, j) => {
                      const p = { x: ANCHO, y: CABECERA + FILA * j + FILA / 2 };
                      const valor = valorSalida(n.id, sal);
                      return (
                        <g key={sal}>
                          <text x={ANCHO - 14} y={p.y + 4} textAnchor="end" fontSize="11" fill="#d6cbee" pointerEvents="none">
                            {valor !== null ? `${numeroCorto(valor)} ▸` : sal}
                          </text>
                          <circle className="m-puerto" cx={p.x} cy={p.y} r={6.5} fill={color} stroke="#fff" strokeWidth={1.5} onPointerDown={(e) => empezarCable(e, n, sal)} />
                        </g>
                      );
                    })}
                    {disparadas.has(n.id) && (
                      <text x={ANCHO / 2} y={alto + 16} textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>¡ACTÚA!</text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          {error && (
            <div className="absolute left-4 right-4 bottom-4 m-aviso error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span className="flex-1">{error}</span>
              <button className="m-icono-boton" onClick={() => setError(null)} aria-label="Cerrar aviso"><span className="material-symbols-outlined">close</span></button>
            </div>
          )}
        </div>

        {/* Inspector y simulación */}
        <aside className="m-editor-panel der" aria-label="Inspector">
          <div className="flex gap-1 mb-4 p-1 rounded-full bg-white/5">
            {(["nodo", "probar", "simular"] as const).map((p) => (
              <button key={p} onClick={() => setPestana(p)} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${pestana === p ? "bg-blanco text-[#0b0619]" : "text-[color:var(--m-suave)]"}`}>
                {p === "nodo" ? "Nodo" : p === "probar" ? "Probar" : "Simular"}
              </button>
            ))}
          </div>

          {pestana === "nodo" && (
            nodoElegido && tipoElegido ? (
              <InspectorNodo
                nodo={nodoElegido}
                tipo={tipoElegido}
                catalogo={catalogo}
                slot={slot}
                genoma={genoma}
                conectadas={new Set(grafo.conexiones.filter((c) => c.a === nodoElegido.id).map((c) => c.entrada))}
                onCambiar={(fn) => editarDatos(nodoElegido.id, fn)}
                onEliminar={eliminarElegido}
              />
            ) : eleccion?.tipo === "cable" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[color:var(--m-suave)]">Cable elegido.</p>
                <button className="m-boton-fantasma" onClick={eliminarElegido}><span className="material-symbols-outlined" aria-hidden="true">link_off</span>Cortar cable</button>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--m-tenue)] leading-relaxed">Elegí un nodo para editar sus datos. Las entradas sin conectar usan el número que escribas acá.</p>
            )
          )}

          {pestana === "probar" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[color:var(--m-suave)] leading-relaxed">Valores para una corrida. Los resultados aparecen sobre cada cable.</p>
              {variables.map((v) => (
                <label key={v.id} className="m-campo">
                  <span>{v.nombre}</span>
                  <input type="number" className="m-input" value={valorDe(v.id, v.rango)} onChange={(e) => setValores({ ...valores, [v.id]: Number(e.target.value) })} />
                </label>
              ))}
              <button className="m-boton mt-2" onClick={() => void probar()} disabled={!!ocupado}>
                <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>Correr una vez
              </button>
              {evaluacion && (
                <div className="m-aviso info">
                  <span className="material-symbols-outlined" aria-hidden="true">insights</span>
                  <span>
                    {modo === "algoritmo"
                      ? <>Salida: <strong>{numeroCorto(evaluacion.salida)}</strong></>
                      : evaluacion.acciones.length ? <>Actúan {evaluacion.acciones.length} acción(es).</> : <>Con estos valores, ninguna acción se dispara.</>}
                  </span>
                </div>
              )}
            </div>
          )}

          {pestana === "simular" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[color:var(--m-suave)] leading-relaxed">Cada variable toma un valor al azar dentro de su rango, miles de veces. Así se ve con qué probabilidad actúa el grafo antes de aprobarlo.</p>
              {variables.map((v) => {
                const [lo, hi] = rangoDe(v.id, v.rango);
                return (
                  <div key={v.id} className="m-campo">
                    <span>{v.nombre}</span>
                    <div className="flex gap-2 items-center">
                      <input type="number" className="m-input" value={lo} onChange={(e) => setRangos({ ...rangos, [v.id]: [Number(e.target.value), hi] })} aria-label={`${v.nombre}: mínimo`} />
                      <span className="text-[color:var(--m-tenue)]">a</span>
                      <input type="number" className="m-input" value={hi} onChange={(e) => setRangos({ ...rangos, [v.id]: [lo, Number(e.target.value)] })} aria-label={`${v.nombre}: máximo`} />
                    </div>
                  </div>
                );
              })}
              <label className="m-campo">
                <span>Universos a simular: {iteraciones.toLocaleString("es-AR")}</span>
                <input type="range" className="m-deslizador" min={500} max={20000} step={500} value={iteraciones} onChange={(e) => setIteraciones(Number(e.target.value))} />
              </label>
              <div className="flex gap-2">
                <button className="m-boton-fantasma flex-1" onClick={() => void simular()} disabled={!!ocupado}><span className="material-symbols-outlined" aria-hidden="true">casino</span>Simular</button>
                <button className="m-boton flex-1" onClick={() => void aprobar()} disabled={!!ocupado}><span className="material-symbols-outlined" aria-hidden="true">verified</span>Aprobar</button>
              </div>
              {simulacion && <PanelSimulacion simulacion={simulacion} modo={modo} grafo={grafo} nombresVariables={nombresVariables} />}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function recortar(texto: string, largo: number) {
  return texto.length > largo ? texto.slice(0, largo - 1) + "…" : texto;
}

/** Una línea que resume la configuración de un nodo (debajo de su nombre). */
function resumenNodo(n: Nodo, t: TipoNodo, catalogo: Catalogo, slot?: AlgoritmoCatalogo): string {
  const d = n.datos;
  switch (t.tipo) {
    case "entrada": return slot?.entradas.find((e) => e.id === d.variable)?.nombre ?? String(d.variable ?? "");
    case "constante": return String(d.valor ?? 0);
    case "disparador": return catalogo.eventos.find((e) => e.id === d.evento)?.nombre ?? "elegí un evento";
    case "reloj": return `${d.hora ?? "08:00"} · ${(Array.isArray(d.dias) ? d.dias : []).map((x) => DIAS[Number(x) - 1]).join("")}`;
    case "conteo": return `${catalogo.metricas.find((m) => m.id === d.metrica)?.nombre ?? "métrica"} · ${d.dias ?? 7} días`;
    case "notificar": return `→ ${destinoLegible(String(d.destino ?? ""))}`;
    case "registrar": return String(d.etiqueta || "historial");
    default: return t.descripcion;
  }
}

function destinoLegible(destino: string) {
  if (destino === "actor") return "quien lo provocó";
  if (destino === "direccion") return "la dirección";
  if (destino.startsWith("arquetipo:")) return "todos: " + destino.slice(10);
  if (destino.startsWith("perfil:")) return "perfil " + destino.slice(7);
  return destino;
}

// ── Inspector ──────────────────────────────────────────
function InspectorNodo({
  nodo, tipo, catalogo, slot, genoma, conectadas, onCambiar, onEliminar,
}: {
  nodo: Nodo;
  tipo: TipoNodo;
  catalogo: Catalogo;
  slot?: AlgoritmoCatalogo;
  genoma: Genoma;
  conectadas: Set<string>;
  onCambiar: (fn: (d: DatosNodo) => DatosNodo) => void;
  onEliminar: () => void;
}) {
  const color = COLOR_CATEGORIA[tipo.categoria];
  const campo = (id: string, valor: unknown) => onCambiar((d) => ({ ...d, [id]: valor }));
  return (
    <div className="flex flex-col gap-4 m-aparecer" key={nodo.id}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color }}>{NOMBRE_CATEGORIA[tipo.categoria]}</p>
        <h3 className="font-headline text-lg font-bold mt-1">{tipo.nombre}</h3>
        <p className="text-xs text-[color:var(--m-suave)] mt-1 leading-relaxed">{tipo.descripcion}</p>
      </div>

      {tipo.campos.map((c) => {
        const valor = nodo.datos[c.id];
        switch (c.tipo) {
          case "numero":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <input type="number" className="m-input" value={Number(valor ?? 0)} min={c.min} max={c.max} onChange={(e) => campo(c.id, Number(e.target.value))} />
              </label>
            );
          case "texto":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <input className="m-input" value={String(valor ?? "")} maxLength={120} onChange={(e) => campo(c.id, e.target.value)} />
              </label>
            );
          case "plantilla":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <textarea className="m-input" value={String(valor ?? "")} maxLength={400} onChange={(e) => campo(c.id, e.target.value)} />
              </label>
            );
          case "variable":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <Selector className="m-input" value={String(valor ?? "")} onChange={(e) => campo(c.id, e.target.value)}>
                  {(slot?.entradas ?? []).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </Selector>
              </label>
            );
          case "evento":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <Selector className="m-input" value={String(valor ?? "")} onChange={(e) => campo(c.id, e.target.value)}>
                  {catalogo.eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}{ev.anonimo ? " (anónimo)" : ""}</option>)}
                </Selector>
              </label>
            );
          case "metrica":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <Selector className="m-input" value={String(valor ?? "")} onChange={(e) => campo(c.id, e.target.value)}>
                  {catalogo.metricas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </Selector>
              </label>
            );
          case "hora":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <input type="time" className="m-input" value={String(valor ?? "08:00")} onChange={(e) => campo(c.id, e.target.value)} />
              </label>
            );
          case "dias": {
            const dias = new Set(Array.isArray(valor) ? valor.map(Number) : []);
            return (
              <div key={c.id} className="m-campo"><span>{c.nombre}</span>
                <div className="flex gap-1.5">
                  {DIAS.map((d, i) => (
                    <button key={d} type="button" className={`m-chip ${dias.has(i + 1) ? "is-activo" : ""}`} aria-pressed={dias.has(i + 1)}
                      onClick={() => {
                        const nuevo = new Set(dias);
                        if (nuevo.has(i + 1)) nuevo.delete(i + 1); else nuevo.add(i + 1);
                        campo(c.id, [...nuevo].sort());
                      }}>{d}</button>
                  ))}
                </div>
              </div>
            );
          }
          case "destino":
            return (
              <label key={c.id} className="m-campo"><span>{c.nombre}</span>
                <Selector className="m-input" value={String(valor ?? "direccion")} onChange={(e) => campo(c.id, e.target.value)}>
                  <option value="direccion">La dirección</option>
                  <option value="actor">Quien provocó el evento</option>
                  <optgroup label="Todo un arquetipo">
                    {catalogo.arquetipos.map((a) => <option key={a.id} value={`arquetipo:${a.id}`}>{a.nombre}</option>)}
                  </optgroup>
                  <optgroup label="Un perfil de esta instancia">
                    {genoma.perfiles.map((p) => <option key={p.clave} value={`perfil:${p.clave}`}>{p.nombre}</option>)}
                  </optgroup>
                </Selector>
              </label>
            );
          default:
            return null;
        }
      })}

      {tipo.entradas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)]">Entradas</p>
          {tipo.entradas.map((ent) => (
            <label key={ent.id} className="flex items-center gap-2 text-xs">
              <span className="w-24 text-[color:var(--m-suave)] truncate">{ent.nombre}</span>
              {conectadas.has(ent.id) ? (
                <span className="m-chip"><span className="material-symbols-outlined" aria-hidden="true">link</span>conectada</span>
              ) : (
                <input
                  type="number"
                  step="any"
                  className="m-input"
                  placeholder={String(ent.defecto)}
                  value={nodo.datos.en?.[ent.id] ?? ""}
                  onChange={(e) => onCambiar((d) => {
                    const en = { ...(d.en ?? {}) };
                    if (e.target.value === "") delete en[ent.id];
                    else en[ent.id] = Number(e.target.value);
                    return { ...d, en };
                  })}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <button className="m-boton-fantasma mt-2" onClick={onEliminar}>
        <span className="material-symbols-outlined" aria-hidden="true">delete</span>Quitar nodo
      </button>
    </div>
  );
}
