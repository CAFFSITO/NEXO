// ============================================================================
// NEXO — Intérprete de grafos de nodos (perfil Maestro)
// ----------------------------------------------------------------------------
// El Maestro no escribe código: conecta nodos. Este archivo es lo que les da
// vida. Un grafo es una lista de nodos (cada uno de un TIPO de esta tabla) y una
// lista de conexiones "salida de A → entrada de B". Se usa para dos cosas:
//
//   · ALGORITMOS ("modo algoritmo"): una fórmula pura. Recibe variables (votos,
//     horas, porcentaje en riesgo…) y devuelve UN número por el nodo "Salida".
//     Así se arma, por ejemplo, el orden del feed de una escuela.
//
//   · FLUJOS ("modo flujo"): automatizaciones. Un disparador (un evento de la
//     escuela o un horario) enciende un pulso que viaja por condiciones,
//     puertas de probabilidad y cálculos hasta acciones (avisar, registrar).
//
// No hay `eval`, no hay código del usuario, no hay IA: cada nodo es una función
// matemática fija escrita acá. El grafo solo elige cuáles y cómo se conectan.
// Todo número que sale de un nodo se sanea (sin NaN ni infinitos), y los nodos
// de azar usan un generador con semilla: la misma semilla da el mismo resultado,
// que es lo que permite simular y APROBAR un grafo por probabilidad.
// ============================================================================

import { createHash } from "node:crypto";

export const LIMITE_NODOS = 160;
export const LIMITE_CONEXIONES = 320;
const TOPE_VALOR = 1e12;

/** Número seguro: sin NaN, sin infinitos y dentro de un tope razonable. */
export function sano(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-TOPE_VALOR, Math.min(TOPE_VALOR, n));
}

const entre01 = (p) => Math.max(0, Math.min(1, sano(p)));
const verdad = (x) => sano(x) >= 0.5;

/** Generador pseudoaleatorio con semilla (mulberry32): reproducible. */
export function crearAzar(semilla = 1) {
  let a = (Number(semilla) >>> 0) || 0x9e3779b9;
  return function azar() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Tabla de tipos de nodo ───────────────────────────────────────────────────
// `modos` dice dónde se puede usar cada tipo. `campos` son los datos editables
// del nodo (el inspector del editor los dibuja según su `tipo`). Cada entrada sin
// conectar usa el valor escrito en el propio nodo (datos.en[puerto]) o su
// `defecto`: así no hace falta un nodo "Constante" para cada número.
const AMBOS = ["algoritmo", "flujo"];
const e = (id, nombre, defecto = 0) => ({ id, nombre, defecto });

const TIPOS = [
  // Entradas y contexto
  {
    tipo: "entrada", nombre: "Variable", categoria: "entrada", modos: ["algoritmo"],
    descripcion: "Un dato real que el módulo entrega al algoritmo.",
    entradas: [], salidas: ["valor"], campos: [{ id: "variable", tipo: "variable", nombre: "Variable" }],
    calcular: (_en, datos, ctx) => sano(ctx.entradas?.[datos.variable]),
  },
  {
    tipo: "constante", nombre: "Constante", categoria: "entrada", modos: AMBOS,
    descripcion: "Un número fijo.",
    entradas: [], salidas: ["valor"], campos: [{ id: "valor", tipo: "numero", nombre: "Valor" }],
    calcular: (_en, datos) => sano(datos.valor),
  },
  {
    tipo: "hora", nombre: "Hora del día", categoria: "contexto", modos: ["flujo"],
    descripcion: "La hora actual (0 a 23).",
    entradas: [], salidas: ["valor"], campos: [],
    calcular: (_en, _d, ctx) => sano(ctx.hora),
  },
  {
    tipo: "dia-semana", nombre: "Día de la semana", categoria: "contexto", modos: ["flujo"],
    descripcion: "1 = lunes … 7 = domingo.",
    entradas: [], salidas: ["valor"], campos: [],
    calcular: (_en, _d, ctx) => sano(ctx.diaSemana),
  },
  {
    tipo: "conteo", nombre: "Conteo", categoria: "contexto", modos: ["flujo"],
    descripcion: "Cuántas veces pasó algo en la escuela en los últimos N días. Solo totales, nunca personas.",
    entradas: [], salidas: ["valor"],
    campos: [
      { id: "metrica", tipo: "metrica", nombre: "Qué contar" },
      { id: "dias", tipo: "numero", nombre: "Últimos días", min: 1, max: 90 },
    ],
    calcular: (_en, datos, ctx) => sano(ctx.metrica?.(datos.metrica, datos.dias)),
  },
  {
    tipo: "disparador", nombre: "Cuando ocurre…", categoria: "disparador", modos: ["flujo"],
    descripcion: "Emite un pulso (1) cada vez que ocurre el evento elegido.",
    entradas: [], salidas: ["pulso"], campos: [{ id: "evento", tipo: "evento", nombre: "Evento" }],
    calcular: (_en, _d, ctx, nodo) => (ctx.disparadores?.has(nodo.id) ? 1 : 0),
  },
  {
    tipo: "reloj", nombre: "Todos los días a…", categoria: "disparador", modos: ["flujo"],
    descripcion: "Emite un pulso a la hora elegida, los días marcados.",
    entradas: [], salidas: ["pulso"],
    campos: [
      { id: "hora", tipo: "hora", nombre: "Hora (HH:MM)" },
      { id: "dias", tipo: "dias", nombre: "Días" },
    ],
    calcular: (_en, _d, ctx, nodo) => (ctx.disparadores?.has(nodo.id) ? 1 : 0),
  },

  // Matemática
  { tipo: "sumar", nombre: "Sumar", categoria: "matematica", modos: AMBOS, descripcion: "a + b",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => v.a + v.b },
  { tipo: "restar", nombre: "Restar", categoria: "matematica", modos: AMBOS, descripcion: "a − b",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => v.a - v.b },
  { tipo: "multiplicar", nombre: "Multiplicar", categoria: "matematica", modos: AMBOS, descripcion: "a × b",
    entradas: [e("a", "a", 1), e("b", "b", 1)], salidas: ["valor"], campos: [], calcular: (v) => v.a * v.b },
  { tipo: "dividir", nombre: "Dividir", categoria: "matematica", modos: AMBOS, descripcion: "a ÷ b (si b es 0, da 0)",
    entradas: [e("a", "a"), e("b", "b", 1)], salidas: ["valor"], campos: [], calcular: (v) => (v.b === 0 ? 0 : v.a / v.b) },
  { tipo: "potencia", nombre: "Potencia", categoria: "matematica", modos: AMBOS, descripcion: "a elevado a b",
    entradas: [e("a", "base", 2), e("b", "exponente", 2)], salidas: ["valor"], campos: [], calcular: (v) => Math.pow(v.a, v.b) },
  { tipo: "minimo", nombre: "Mínimo", categoria: "matematica", modos: AMBOS, descripcion: "el menor entre a y b",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => Math.min(v.a, v.b) },
  { tipo: "maximo", nombre: "Máximo", categoria: "matematica", modos: AMBOS, descripcion: "el mayor entre a y b",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => Math.max(v.a, v.b) },
  { tipo: "promedio", nombre: "Promedio", categoria: "matematica", modos: AMBOS, descripcion: "(a + b) ÷ 2",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (v.a + v.b) / 2 },
  { tipo: "absoluto", nombre: "Valor absoluto", categoria: "matematica", modos: AMBOS, descripcion: "|x|",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [], calcular: (v) => Math.abs(v.x) },
  { tipo: "negar", nombre: "Invertir signo", categoria: "matematica", modos: AMBOS, descripcion: "−x",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [], calcular: (v) => -v.x },
  { tipo: "log", nombre: "Logaritmo suave", categoria: "matematica", modos: AMBOS, descripcion: "ln(1 + |x|) con el signo de x: achica los números grandes",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [], calcular: (v) => Math.sign(v.x) * Math.log1p(Math.abs(v.x)) },
  { tipo: "raiz", nombre: "Raíz cuadrada", categoria: "matematica", modos: AMBOS, descripcion: "√|x|",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [], calcular: (v) => Math.sqrt(Math.abs(v.x)) },
  { tipo: "decaimiento", nombre: "Decaimiento", categoria: "matematica", modos: AMBOS,
    descripcion: "0,5 elevado a (x ÷ vida media): vale 1 al principio y la mitad cada 'vida media'",
    entradas: [e("x", "x"), e("vida", "vida media", 24)], salidas: ["valor"], campos: [],
    calcular: (v) => (v.vida <= 0 ? 0 : Math.pow(0.5, Math.max(0, v.x) / v.vida)) },
  { tipo: "limitar", nombre: "Limitar", categoria: "matematica", modos: AMBOS, descripcion: "x encerrado entre mín y máx",
    entradas: [e("x", "x"), e("min", "mín", 0), e("max", "máx", 1)], salidas: ["valor"], campos: [],
    calcular: (v) => Math.min(Math.max(v.x, Math.min(v.min, v.max)), Math.max(v.min, v.max)) },
  { tipo: "mapear", nombre: "Mapear rango", categoria: "matematica", modos: AMBOS,
    descripcion: "lleva x del rango [desde, hasta] al rango [a, b]",
    entradas: [e("x", "x"), e("desde", "desde", 0), e("hasta", "hasta", 1), e("a", "a", 0), e("b", "b", 100)],
    salidas: ["valor"], campos: [],
    calcular: (v) => (v.hasta === v.desde ? v.a : ((v.x - v.desde) / (v.hasta - v.desde)) * (v.b - v.a) + v.a) },
  { tipo: "redondear", nombre: "Redondear", categoria: "matematica", modos: AMBOS, descripcion: "redondea a N decimales",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [{ id: "decimales", tipo: "numero", nombre: "Decimales", min: 0, max: 6 }],
    calcular: (v, datos) => {
      const f = Math.pow(10, Math.max(0, Math.min(6, Math.round(sano(datos.decimales)))));
      return Math.round(v.x * f) / f;
    } },

  // Lógica
  { tipo: "mayor", nombre: "¿Mayor que?", categoria: "logica", modos: AMBOS, descripcion: "1 si a > b, si no 0",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (v.a > v.b ? 1 : 0) },
  { tipo: "mayor-igual", nombre: "¿Mayor o igual?", categoria: "logica", modos: AMBOS, descripcion: "1 si a ≥ b, si no 0",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (v.a >= v.b ? 1 : 0) },
  { tipo: "menor", nombre: "¿Menor que?", categoria: "logica", modos: AMBOS, descripcion: "1 si a < b, si no 0",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (v.a < v.b ? 1 : 0) },
  { tipo: "igual", nombre: "¿Igual?", categoria: "logica", modos: AMBOS, descripcion: "1 si a = b, si no 0",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (Math.abs(v.a - v.b) < 1e-9 ? 1 : 0) },
  { tipo: "entre", nombre: "¿Entre?", categoria: "logica", modos: AMBOS, descripcion: "1 si mín ≤ x ≤ máx",
    entradas: [e("x", "x"), e("min", "mín", 0), e("max", "máx", 1)], salidas: ["valor"], campos: [],
    calcular: (v) => (v.x >= v.min && v.x <= v.max ? 1 : 0) },
  { tipo: "si", nombre: "Si… entonces… si no", categoria: "logica", modos: AMBOS, descripcion: "si la condición vale 1 da 'sí', si no da 'no'",
    entradas: [e("cond", "condición"), e("si", "sí", 1), e("no", "no", 0)], salidas: ["valor"], campos: [],
    calcular: (v) => (verdad(v.cond) ? v.si : v.no) },
  { tipo: "y", nombre: "Y", categoria: "logica", modos: AMBOS, descripcion: "1 si a y b valen 1",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (verdad(v.a) && verdad(v.b) ? 1 : 0) },
  { tipo: "o", nombre: "O", categoria: "logica", modos: AMBOS, descripcion: "1 si a o b valen 1",
    entradas: [e("a", "a"), e("b", "b")], salidas: ["valor"], campos: [], calcular: (v) => (verdad(v.a) || verdad(v.b) ? 1 : 0) },
  { tipo: "no", nombre: "No", categoria: "logica", modos: AMBOS, descripcion: "1 si x vale 0, 0 si vale 1",
    entradas: [e("x", "x")], salidas: ["valor"], campos: [], calcular: (v) => (verdad(v.x) ? 0 : 1) },

  // Probabilidad
  { tipo: "azar", nombre: "Número al azar", categoria: "probabilidad", modos: AMBOS, descripcion: "un número uniforme entre mín y máx",
    entradas: [e("min", "mín", 0), e("max", "máx", 1)], salidas: ["valor"], campos: [],
    calcular: (v, _d, ctx) => v.min + ctx.azar() * (v.max - v.min) },
  { tipo: "bernoulli", nombre: "Moneda cargada", categoria: "probabilidad", modos: AMBOS, descripcion: "1 con probabilidad p, si no 0",
    entradas: [e("p", "p", 0.5)], salidas: ["valor"], campos: [],
    calcular: (v, _d, ctx) => (ctx.azar() < entre01(v.p) ? 1 : 0) },
  { tipo: "normal", nombre: "Campana (normal)", categoria: "probabilidad", modos: AMBOS, descripcion: "un número de una distribución normal",
    entradas: [e("media", "media", 0), e("desvio", "desvío", 1)], salidas: ["valor"], campos: [],
    calcular: (v, _d, ctx) => {
      const u = Math.max(ctx.azar(), 1e-12);
      const w = ctx.azar();
      return v.media + Math.abs(v.desvio) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
    } },
  { tipo: "sigmoide", nombre: "Curva S", categoria: "probabilidad", modos: AMBOS,
    descripcion: "convierte cualquier puntaje en una probabilidad entre 0 y 1",
    entradas: [e("x", "x"), e("k", "pendiente", 1), e("centro", "centro", 0)], salidas: ["valor"], campos: [],
    calcular: (v) => 1 / (1 + Math.exp(-v.k * (v.x - v.centro))) },
  { tipo: "puerta", nombre: "Puerta de probabilidad", categoria: "probabilidad", modos: AMBOS,
    descripcion: "deja pasar la señal con probabilidad p; si no, da 0",
    entradas: [e("senal", "señal", 1), e("p", "p", 0.5)], salidas: ["valor"], campos: [],
    calcular: (v, _d, ctx) => (ctx.azar() < entre01(v.p) ? v.senal : 0) },
  { tipo: "wilson", nombre: "Confianza de votos", categoria: "probabilidad", modos: AMBOS,
    descripcion: "Límite inferior de Wilson: qué proporción de votos positivos se puede asegurar con 95 % de confianza. Pocos votos dan poca confianza; muchos votos en contra la bajan.",
    entradas: [e("positivos", "a favor", 0), e("total", "total", 0), e("z", "z", 1.96)], salidas: ["valor"], campos: [],
    calcular: (v) => {
      const n = v.total;
      if (n <= 0) return 0;
      const p = Math.min(1, Math.max(0, v.positivos / n));
      const z = Math.abs(v.z) || 1.96;
      const z2 = z * z;
      return Math.max(0, (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n));
    } },
  { tipo: "elegir", nombre: "Elegir con pesos", categoria: "probabilidad", modos: AMBOS,
    descripcion: "elige a o b según sus pesos (peso a ÷ (peso a + peso b))",
    entradas: [e("a", "a", 1), e("b", "b", 0), e("pa", "peso a", 1), e("pb", "peso b", 1)], salidas: ["valor"], campos: [],
    calcular: (v, _d, ctx) => {
      const pa = Math.max(0, v.pa);
      const pb = Math.max(0, v.pb);
      if (pa + pb === 0) return 0;
      return ctx.azar() < pa / (pa + pb) ? v.a : v.b;
    } },

  // Salidas y acciones
  { tipo: "salida", nombre: "Salida", categoria: "salida", modos: ["algoritmo"], descripcion: "El resultado del algoritmo.",
    entradas: [e("valor", "valor")], salidas: [], campos: [], calcular: (v) => v.valor },
  { tipo: "notificar", nombre: "Avisar", categoria: "accion", modos: ["flujo"],
    descripcion: "Si 'activar' vale 1, envía una notificación a quien elijas.",
    entradas: [e("activar", "activar"), e("valor", "valor")], salidas: [],
    campos: [
      { id: "destino", tipo: "destino", nombre: "A quién" },
      { id: "titulo", tipo: "texto", nombre: "Título" },
      { id: "cuerpo", tipo: "plantilla", nombre: "Mensaje ({valor}, {hora}, {evento})" },
    ],
    calcular: (v) => v.activar },
  { tipo: "registrar", nombre: "Registrar", categoria: "accion", modos: ["flujo"],
    descripcion: "Si 'activar' vale 1, deja una marca en el historial del flujo con el valor.",
    entradas: [e("activar", "activar"), e("valor", "valor")], salidas: [],
    campos: [{ id: "etiqueta", tipo: "texto", nombre: "Etiqueta" }],
    calcular: (v) => v.activar },
];

export const TIPOS_NODO = new Map(TIPOS.map((t) => [t.tipo, t]));

/** La tabla de tipos sin las funciones: es lo que se le manda al editor. */
export function catalogoNodos() {
  return TIPOS.map(({ calcular: _calcular, ...resto }) => ({
    ...resto,
    entradas: resto.entradas.map((x) => ({ ...x })),
  }));
}

// ── Validación ──────────────────────────────────────────────────────────────

export class ErrorGrafo extends Error {}

const ID_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;

function limpiarTexto(valor, largo = 200) {
  return String(valor ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, largo);
}

function limpiarDatos(def, crudos, opciones) {
  const datos = {};
  const fuente = crudos && typeof crudos === "object" ? crudos : {};
  for (const campo of def.campos) {
    const v = fuente[campo.id];
    switch (campo.tipo) {
      case "numero": {
        let n = sano(v);
        if (campo.min !== undefined) n = Math.max(campo.min, n);
        if (campo.max !== undefined) n = Math.min(campo.max, n);
        datos[campo.id] = n;
        break;
      }
      case "variable": {
        const nombre = limpiarTexto(v, 40);
        if (opciones.variables && !opciones.variables.includes(nombre)) {
          throw new ErrorGrafo(`La variable «${nombre || "(vacía)"}» no existe en este algoritmo.`);
        }
        datos[campo.id] = nombre;
        break;
      }
      case "evento": {
        const nombre = limpiarTexto(v, 60);
        if (opciones.eventos && !opciones.eventos.includes(nombre)) {
          throw new ErrorGrafo("Hay un disparador sin un evento válido.");
        }
        datos[campo.id] = nombre;
        break;
      }
      case "metrica": {
        const nombre = limpiarTexto(v, 60);
        if (opciones.metricas && !opciones.metricas.includes(nombre)) {
          throw new ErrorGrafo("Hay un nodo de conteo sin una métrica válida.");
        }
        datos[campo.id] = nombre;
        break;
      }
      case "hora": {
        const texto = limpiarTexto(v, 5);
        datos[campo.id] = /^([01]\d|2[0-3]):[0-5]\d$/.test(texto) ? texto : "08:00";
        break;
      }
      case "dias": {
        const lista = Array.isArray(v) ? v : [];
        const dias = [...new Set(lista.map((d) => Math.round(sano(d))).filter((d) => d >= 1 && d <= 7))].sort();
        datos[campo.id] = dias.length ? dias : [1, 2, 3, 4, 5];
        break;
      }
      case "destino": {
        const texto = limpiarTexto(v, 60);
        if (opciones.destinos && !opciones.destinos(texto)) {
          throw new ErrorGrafo("Hay un aviso sin un destinatario válido.");
        }
        datos[campo.id] = texto;
        break;
      }
      case "plantilla":
        datos[campo.id] = limpiarTexto(v, 400);
        break;
      default:
        datos[campo.id] = limpiarTexto(v, 120);
    }
  }
  // Valores escritos en las entradas sin conectar.
  const en = {};
  const crudasEn = fuente.en && typeof fuente.en === "object" ? fuente.en : {};
  for (const entrada of def.entradas) {
    if (crudasEn[entrada.id] !== undefined && crudasEn[entrada.id] !== null && crudasEn[entrada.id] !== "") {
      en[entrada.id] = sano(crudasEn[entrada.id]);
    }
  }
  if (Object.keys(en).length) datos.en = en;
  return datos;
}

/**
 * Valida y limpia un grafo. Devuelve una copia saneada (con el orden de
 * evaluación ya calculado aparte) o lanza ErrorGrafo con un motivo legible.
 *
 * opciones:
 *   modo       "algoritmo" | "flujo"
 *   variables  nombres de variables permitidas (modo algoritmo)
 *   eventos    ids de eventos permitidos (modo flujo)
 *   metricas   ids de métricas permitidas (modo flujo)
 *   destinos   función que dice si un destino de aviso es válido
 */
export function validarGrafo(crudo, opciones) {
  const modo = opciones.modo;
  if (!crudo || typeof crudo !== "object") throw new ErrorGrafo("El grafo está vacío.");
  const nodosCrudos = Array.isArray(crudo.nodos) ? crudo.nodos : [];
  const conexionesCrudas = Array.isArray(crudo.conexiones) ? crudo.conexiones : [];
  if (nodosCrudos.length === 0) throw new ErrorGrafo("El grafo no tiene nodos.");
  if (nodosCrudos.length > LIMITE_NODOS) throw new ErrorGrafo(`Un grafo admite hasta ${LIMITE_NODOS} nodos.`);
  if (conexionesCrudas.length > LIMITE_CONEXIONES) {
    throw new ErrorGrafo(`Un grafo admite hasta ${LIMITE_CONEXIONES} conexiones.`);
  }

  const nodos = [];
  const porId = new Map();
  for (const n of nodosCrudos) {
    const id = String(n?.id ?? "");
    if (!ID_VALIDO.test(id)) throw new ErrorGrafo("Hay un nodo con un identificador inválido.");
    if (porId.has(id)) throw new ErrorGrafo("Hay dos nodos con el mismo identificador.");
    const def = TIPOS_NODO.get(String(n?.tipo ?? ""));
    if (!def) throw new ErrorGrafo(`El tipo de nodo «${String(n?.tipo ?? "")}» no existe.`);
    if (!def.modos.includes(modo)) {
      throw new ErrorGrafo(`El nodo «${def.nombre}» no se puede usar en un ${modo === "flujo" ? "flujo" : "algoritmo"}.`);
    }
    const limpio = {
      id,
      tipo: def.tipo,
      x: Math.round(Math.max(-5000, Math.min(5000, sano(n.x)))),
      y: Math.round(Math.max(-5000, Math.min(5000, sano(n.y)))),
      datos: limpiarDatos(def, n.datos, opciones),
    };
    nodos.push(limpio);
    porId.set(id, limpio);
  }

  const conexiones = [];
  const entradaOcupada = new Set();
  for (const c of conexionesCrudas) {
    const de = porId.get(String(c?.de ?? ""));
    const a = porId.get(String(c?.a ?? ""));
    const salida = String(c?.salida ?? "");
    const entrada = String(c?.entrada ?? "");
    if (!de || !a) throw new ErrorGrafo("Hay una conexión que apunta a un nodo inexistente.");
    if (!TIPOS_NODO.get(de.tipo).salidas.includes(salida)) throw new ErrorGrafo("Hay una conexión desde una salida inexistente.");
    if (!TIPOS_NODO.get(a.tipo).entradas.some((x) => x.id === entrada)) {
      throw new ErrorGrafo("Hay una conexión hacia una entrada inexistente.");
    }
    if (de.id === a.id) throw new ErrorGrafo("Un nodo no puede conectarse consigo mismo.");
    const clave = a.id + "::" + entrada;
    if (entradaOcupada.has(clave)) throw new ErrorGrafo("Una entrada solo puede recibir una conexión.");
    entradaOcupada.add(clave);
    conexiones.push({ de: de.id, salida, a: a.id, entrada });
  }

  const grafo = { nodos, conexiones };
  ordenTopologico(grafo); // lanza si hay ciclos

  if (modo === "algoritmo") {
    const salidas = nodos.filter((n) => n.tipo === "salida");
    if (salidas.length !== 1) throw new ErrorGrafo("Un algoritmo necesita exactamente un nodo «Salida».");
  } else {
    if (!nodos.some((n) => TIPOS_NODO.get(n.tipo).categoria === "disparador")) {
      throw new ErrorGrafo("Un flujo necesita al menos un disparador («Cuando ocurre…» o «Todos los días a…»).");
    }
    if (!nodos.some((n) => TIPOS_NODO.get(n.tipo).categoria === "accion")) {
      throw new ErrorGrafo("Un flujo necesita al menos una acción («Avisar» o «Registrar»).");
    }
  }
  return grafo;
}

/** Orden de evaluación (Kahn). Lanza ErrorGrafo si hay un ciclo. */
export function ordenTopologico(grafo) {
  const grado = new Map(grafo.nodos.map((n) => [n.id, 0]));
  const salientes = new Map(grafo.nodos.map((n) => [n.id, []]));
  for (const c of grafo.conexiones) {
    grado.set(c.a, grado.get(c.a) + 1);
    salientes.get(c.de).push(c.a);
  }
  const cola = grafo.nodos.filter((n) => grado.get(n.id) === 0).map((n) => n.id);
  const orden = [];
  while (cola.length) {
    const id = cola.shift();
    orden.push(id);
    for (const sig of salientes.get(id)) {
      grado.set(sig, grado.get(sig) - 1);
      if (grado.get(sig) === 0) cola.push(sig);
    }
  }
  if (orden.length !== grafo.nodos.length) {
    throw new ErrorGrafo("El grafo tiene un ciclo: una señal no puede volver a entrar al nodo de donde salió.");
  }
  return orden;
}

/** Huella del grafo: cambia si cambia la lógica, no si se mueven los nodos. */
export function huellaGrafo(grafo) {
  const canonico = {
    nodos: [...grafo.nodos]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => [n.id, n.tipo, n.datos]),
    conexiones: [...grafo.conexiones]
      .map((c) => `${c.de}.${c.salida}>${c.a}.${c.entrada}`)
      .sort(),
  };
  return createHash("sha256").update(JSON.stringify(canonico)).digest("hex").slice(0, 16);
}

// ── Evaluación ──────────────────────────────────────────────────────────────

/**
 * Prepara un grafo YA VALIDADO para evaluarlo muchas veces: resuelve el orden
 * y de dónde le llega cada entrada a cada nodo. Devuelve una función
 * `evaluar(ctx)` → { salida, valores, acciones }.
 */
export function compilarGrafo(grafo) {
  const orden = ordenTopologico(grafo);
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]));
  const fuentes = new Map(); // "nodo::entrada" → { de, salida }
  for (const c of grafo.conexiones) fuentes.set(c.a + "::" + c.entrada, { de: c.de, salida: c.salida });
  const pasos = orden.map((id) => {
    const nodo = porId.get(id);
    const def = TIPOS_NODO.get(nodo.tipo);
    return {
      nodo,
      def,
      entradas: def.entradas.map((ent) => ({
        id: ent.id,
        fuente: fuentes.get(id + "::" + ent.id) ?? null,
        fijo: nodo.datos.en?.[ent.id] ?? ent.defecto,
      })),
    };
  });

  return function evaluar(ctx) {
    const contexto = { azar: Math.random, ...ctx };
    const valores = {};
    const acciones = [];
    let salida = null;
    for (const paso of pasos) {
      const en = {};
      for (const ent of paso.entradas) {
        en[ent.id] = ent.fuente ? sano(valores[ent.fuente.de]?.[ent.fuente.salida]) : sano(ent.fijo);
      }
      const resultado = sano(paso.def.calcular(en, paso.nodo.datos, contexto, paso.nodo));
      const nombreSalida = paso.def.salidas[0] ?? "valor";
      valores[paso.nodo.id] = { [nombreSalida]: resultado, entradas: en };
      if (paso.def.tipo === "salida") salida = resultado;
      if (paso.def.categoria === "accion" && verdad(en.activar)) {
        acciones.push({ nodoId: paso.nodo.id, tipo: paso.def.tipo, datos: paso.nodo.datos, valor: en.valor });
      }
    }
    return { salida, valores, acciones };
  };
}

// ── Simulación Monte Carlo ──────────────────────────────────────────────────

/** Intervalo de Wilson al 95 % para una proporción. */
export function intervaloWilson(exitos, n) {
  if (n === 0) return [0, 0];
  const z = 1.959964;
  const p = exitos / n;
  const den = 1 + (z * z) / n;
  const centro = (p + (z * z) / (2 * n)) / den;
  const margen = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, centro - margen), Math.min(1, centro + margen)];
}

function percentil(ordenados, q) {
  if (ordenados.length === 0) return 0;
  const pos = (ordenados.length - 1) * q;
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
}

function correlacion(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

const redondear = (x, d = 4) => Math.round(sano(x) * 10 ** d) / 10 ** d;

/**
 * Corre el grafo `iteraciones` veces con entradas al azar dentro de `rangos` y
 * devuelve la distribución de lo que pasa. Es el corazón de "aprobar por
 * probabilidad": antes de activar un algoritmo o un flujo, el Maestro ve con
 * qué frecuencia dispara y qué valores produce.
 *
 *   rangos: { variable: [min, max] }  (modo algoritmo: variables del slot;
 *           modo flujo: "metrica:<id>", "hora", "diaSemana")
 */
export function simularGrafo(grafo, { modo, rangos = {}, iteraciones = 2000, semilla = 7 }) {
  const n = Math.max(50, Math.min(20000, Math.round(sano(iteraciones)) || 2000));
  const evaluar = compilarGrafo(grafo);
  const azar = crearAzar(semilla);
  const disparadores = new Set(
    grafo.nodos.filter((x) => TIPOS_NODO.get(x.tipo).categoria === "disparador").map((x) => x.id)
  );
  const variables = Object.keys(rangos);
  const muestras = Object.fromEntries(variables.map((v) => [v, []]));
  const salidas = [];
  const disparosPorAccion = new Map(
    grafo.nodos.filter((x) => TIPOS_NODO.get(x.tipo).categoria === "accion").map((x) => [x.id, 0])
  );
  let algunaAccion = 0;

  const muestrear = (v) => {
    const [lo, hi] = Array.isArray(rangos[v]) ? rangos[v].map(sano) : [0, 1];
    return lo + azar() * (hi - lo);
  };

  for (let i = 0; i < n; i++) {
    const valoresEntrada = {};
    for (const v of variables) {
      valoresEntrada[v] = muestrear(v);
      muestras[v].push(valoresEntrada[v]);
    }
    const ctx = modo === "flujo"
      ? {
          azar,
          disparadores,
          hora: rangos.hora ? Math.floor(valoresEntrada.hora) : Math.floor(azar() * 24),
          diaSemana: rangos.diaSemana ? Math.floor(valoresEntrada.diaSemana) : 1 + Math.floor(azar() * 7),
          metrica: (id) => Math.round(valoresEntrada["metrica:" + id] ?? azar() * 20),
        }
      : { azar, entradas: valoresEntrada };
    const r = evaluar(ctx);
    if (modo === "flujo") {
      if (r.acciones.length) algunaAccion++;
      for (const a of r.acciones) disparosPorAccion.set(a.nodoId, disparosPorAccion.get(a.nodoId) + 1);
      salidas.push(r.acciones.length ? 1 : 0);
    } else {
      salidas.push(r.salida ?? 0);
    }
  }

  const ordenados = [...salidas].sort((a, b) => a - b);
  const media = salidas.reduce((s, x) => s + x, 0) / n;
  const varianza = salidas.reduce((s, x) => s + (x - media) ** 2, 0) / n;
  const min = ordenados[0];
  const max = ordenados[ordenados.length - 1];
  const BINS = 24;
  const ancho = max > min ? (max - min) / BINS : 1;
  const histograma = Array.from({ length: max > min ? BINS : 1 }, (_, k) => ({
    desde: redondear(min + k * ancho),
    hasta: redondear(max > min ? min + (k + 1) * ancho : max),
    cuenta: 0,
  }));
  for (const x of salidas) {
    const k = max > min ? Math.min(BINS - 1, Math.floor((x - min) / ancho)) : 0;
    histograma[k].cuenta++;
  }
  const positivos = modo === "flujo" ? algunaAccion : salidas.filter((x) => x >= 0.5).length;

  return {
    modo,
    iteraciones: n,
    semilla,
    media: redondear(media),
    desvio: redondear(Math.sqrt(varianza)),
    min: redondear(min),
    max: redondear(max),
    p5: redondear(percentil(ordenados, 0.05)),
    p50: redondear(percentil(ordenados, 0.5)),
    p95: redondear(percentil(ordenados, 0.95)),
    histograma,
    probabilidad: redondear(positivos / n),
    intervalo: intervaloWilson(positivos, n).map((x) => redondear(x)),
    // Cuánto "mueve" cada variable el resultado (correlación de Pearson).
    influencias: variables.map((v) => ({ variable: v, correlacion: redondear(correlacion(muestras[v], salidas), 3) })),
    acciones: [...disparosPorAccion.entries()].map(([nodoId, k]) => ({
      nodoId,
      probabilidad: redondear(k / n),
      intervalo: intervaloWilson(k, n).map((x) => redondear(x)),
    })),
  };
}
