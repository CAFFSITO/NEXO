// ============================================================================
// NEXO — Motor del calendario con jerarquía (sección 14.12)
// ----------------------------------------------------------------------------
// Lo que el calendario necesita saber y no depende de una ventanilla:
//
//   · CATEGORÍAS de evento (evaluación, entrega, acto, salida…), con color e
//     ícono. El tipo sigue siendo texto libre (Error 6.E.4): un tipo escrito a
//     mano cae en la categoría que más se le parece.
//   · REPETICIONES: la regla de un evento que se repite (cada día, semana, mes
//     o año, cada N, ciertos días, hasta una fecha o N veces, saltando feriados
//     o fines de semana) y cómo se expande en ocurrencias, con las excepciones
//     ("solo este": cancelado o cambiado).
//   · QUIÉN LO VE: el contexto de una persona (su perfil, su nivel, sus cursos,
//     sus hijos) contra los destinos de un evento.
//   · QUÉ PUEDE COMPARTIR cada uno, según la JERARQUÍA del genoma de su escuela:
//     cada nivel le muestra eventos al suyo y a los de abajo (o solo a los de
//     abajo, o nada: solo eventos personales). Quien dicta o preside cursos
//     llega a los estudiantes y familias de SUS cursos.
// ============================================================================

import { leerGenoma, nivelDePerfil, perfilDeUsuario } from "./genoma.js";

// ── Categorías ───────────────────────────────────────────────────────────────
export const CATEGORIAS = [
  { id: "examen", nombre: "Evaluación", color: "#fb923c", icono: "quiz", claves: ["examen", "parcial", "prueba", "evaluaci", "oral"] },
  { id: "entrega", nombre: "Entrega", color: "#f472b6", icono: "assignment_turned_in", claves: ["entrega", "trabajo practico", "tp "] },
  { id: "clase", nombre: "Clase o taller", color: "#38bdf8", icono: "school", claves: ["clase", "taller", "repaso", "consulta", "tutoria"] },
  { id: "acto", nombre: "Acto escolar", color: "#facc15", icono: "celebration", claves: ["acto", "efemeride", "fiesta", "conmemora"] },
  { id: "reunion", nombre: "Reunión", color: "#a78bfa", icono: "groups", claves: ["reunion", "cita", "entrevista", "asamblea", "consejo"] },
  { id: "salida", nombre: "Salida educativa", color: "#34d399", icono: "directions_bus", claves: ["salida", "excursion", "viaje", "campamento", "visita"] },
  { id: "institucional", nombre: "Institucional", color: "#c084fc", icono: "account_balance", claves: ["institucional", "feria", "jornada", "inscripci"] },
  { id: "asueto", nombre: "Sin clases", color: "#f87171", icono: "event_busy", claves: ["asueto", "suspensi", "sin clases", "paro", "receso"] },
  { id: "personal", nombre: "Personal", color: "#94a3b8", icono: "person", claves: ["personal", "recordatorio"] },
  { id: "evento", nombre: "Evento", color: "#2dd4bf", icono: "event", claves: [] },
];
const CATEGORIA_POR_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** La categoría de un tipo: la suya si es una categoría, o la que más se le parece. */
export function categoriaDe(tipo) {
  const t = sinTildes(tipo).trim();
  if (CATEGORIA_POR_ID.has(t)) return CATEGORIA_POR_ID.get(t);
  return CATEGORIAS.find((c) => c.claves.some((k) => (t + " ").includes(k))) ?? CATEGORIA_POR_ID.get("evento");
}

// ── Fechas (días enteros, sin husos: "2026-07-22") ───────────────────────────
const DIA_MS = 864e5;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function esFechaValida(iso) {
  if (!ISO.test(String(iso ?? ""))) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}
const aNumero = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / DIA_MS; };
const aISO = (n) => new Date(n * DIA_MS).toISOString().slice(0, 10);
export const sumarDias = (iso, dias) => aISO(aNumero(iso) + dias);
export const diasEntre = (a, b) => aNumero(b) - aNumero(a);
/** 0 = domingo … 6 = sábado. */
export const diaDeSemana = (iso) => new Date(aNumero(iso) * DIA_MS).getUTCDay();
const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
const armar = (anio, mes, dia) => aISO(Date.UTC(anio, mes, dia) / DIA_MS);

// ── Repeticiones ─────────────────────────────────────────────────────────────
const FRECUENCIAS = ["diaria", "semanal", "mensual", "anual"];
const MODOS_MENSUALES = ["dia", "posicion", "ultimo"];
const MAX_ITERACIONES = 20000;

/**
 * La regla de repetición llevada a algo válido. null = no se repite. Devuelve
 * { error } si viene algo que no se puede entender.
 */
export function normalizarRecurrencia(crudo) {
  if (crudo === undefined || crudo === null || crudo === "" || crudo === false) return null;
  if (typeof crudo !== "object") return { error: "La repetición no es válida." };
  if (!FRECUENCIAS.includes(crudo.frecuencia)) return { error: "Elegí cada cuánto se repite: día, semana, mes o año." };
  const regla = { frecuencia: crudo.frecuencia };
  const intervalo = Math.round(Number(crudo.intervalo ?? 1));
  regla.intervalo = Number.isFinite(intervalo) ? Math.max(1, Math.min(99, intervalo)) : 1;
  if (regla.frecuencia === "semanal") {
    const dias = Array.isArray(crudo.dias) ? crudo.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    if (dias.length) regla.dias = [...new Set(dias)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  }
  if (regla.frecuencia === "mensual") regla.modoMensual = MODOS_MENSUALES.includes(crudo.modoMensual) ? crudo.modoMensual : "dia";
  if (crudo.hasta !== undefined && crudo.hasta !== null && crudo.hasta !== "") {
    if (!esFechaValida(crudo.hasta)) return { error: "La fecha en la que termina la repetición no es válida." };
    regla.hasta = crudo.hasta;
  }
  if (crudo.veces !== undefined && crudo.veces !== null && crudo.veces !== "") {
    const veces = Math.round(Number(crudo.veces));
    if (!Number.isFinite(veces) || veces < 1) return { error: "La cantidad de repeticiones no es válida." };
    regla.veces = Math.min(500, veces);
  }
  if (crudo.saltarFeriados === true) regla.saltarFeriados = true;
  if (crudo.soloHabiles === true) regla.soloHabiles = true;
  return regla;
}

/** Las fechas candidatas de una regla, en orden, desde el inicio del evento. */
function* candidatas(inicio, regla) {
  const n = regla.intervalo;
  const [anio0, mes0, dia0] = inicio.split("-").map(Number);
  if (regla.frecuencia === "diaria") {
    for (let k = 0; ; k++) yield sumarDias(inicio, k * n);
  }
  if (regla.frecuencia === "semanal") {
    // Semanas de lunes a domingo; "cada 2 semanas" cuenta desde la del inicio.
    const desdeLunes = (d) => (d + 6) % 7;
    const dias = regla.dias?.length ? regla.dias : [diaDeSemana(inicio)];
    const lunes = sumarDias(inicio, -desdeLunes(diaDeSemana(inicio)));
    for (let w = 0; ; w += n) {
      for (const d of dias) {
        const fecha = sumarDias(lunes, w * 7 + desdeLunes(d));
        if (fecha >= inicio) yield fecha;
      }
    }
  }
  if (regla.frecuencia === "mensual") {
    const semana = Math.ceil(dia0 / 7);
    const diaSemana = diaDeSemana(inicio);
    for (let k = 0; ; k += n) {
      const total = mes0 - 1 + k;
      const anio = anio0 + Math.floor(total / 12);
      const mes = total % 12;
      const largo = diasDelMes(anio, mes);
      if (regla.modoMensual === "dia") {
        if (dia0 <= largo) yield armar(anio, mes, dia0);
      } else if (regla.modoMensual === "posicion") {
        const primero = (diaSemana - diaDeSemana(armar(anio, mes, 1)) + 7) % 7 + 1;
        const dia = primero + (semana - 1) * 7;
        if (dia <= largo) yield armar(anio, mes, dia);
      } else {
        const ultimo = largo - ((diaDeSemana(armar(anio, mes, largo)) - diaSemana + 7) % 7);
        yield armar(anio, mes, ultimo);
      }
    }
  }
  if (regla.frecuencia === "anual") {
    for (let k = 0; ; k += n) {
      const anio = anio0 + k;
      if (dia0 <= diasDelMes(anio, mes0 - 1)) yield armar(anio, mes0 - 1, dia0);
    }
  }
}

/**
 * Las ocurrencias de un evento que tocan el rango [desde, hasta]. `evento` trae
 * fecha, fecha_fin y su regla ya normalizada (o null). Cada ocurrencia dice su
 * fecha original (la que identifica a la excepción), la fecha en que cae (puede
 * haberse movido) y los cambios de "solo este".
 */
export function expandir(evento, desde, hasta, { feriados = new Set(), excepciones = new Map() } = {}) {
  const duracion = evento.fecha_fin ? diasEntre(evento.fecha, evento.fecha_fin) : 0;
  const salida = [];
  const agregar = (original) => {
    const ex = excepciones.get(original);
    if (ex?.cancelada) return;
    const cambios = ex?.cambios ?? {};
    const fecha = cambios.fecha && esFechaValida(cambios.fecha) ? cambios.fecha : original;
    const fin = sumarDias(fecha, duracion);
    if (fin < desde || fecha > hasta) return;
    salida.push({ original, fecha, fechaFin: duracion ? fin : null, cambios });
  };
  const regla = evento.regla;
  if (!regla) {
    agregar(evento.fecha);
    return salida;
  }
  let contadas = 0;
  let vueltas = 0;
  for (const fecha of candidatas(evento.fecha, regla)) {
    if (++vueltas > MAX_ITERACIONES) break;
    if (regla.hasta && fecha > regla.hasta) break;
    if (fecha > hasta) break;
    if (regla.saltarFeriados && feriados.has(fecha)) continue;
    if (regla.soloHabiles && [0, 6].includes(diaDeSemana(fecha))) continue;
    contadas++;
    if (regla.veces && contadas > regla.veces) break;
    agregar(fecha);
  }
  return salida;
}

/** La última fecha de un evento (para la limpieza): null si se repite para siempre. */
export function ultimaFecha(evento, { feriados = new Set() } = {}) {
  const duracion = evento.fecha_fin ? diasEntre(evento.fecha, evento.fecha_fin) : 0;
  const regla = evento.regla;
  if (!regla) return sumarDias(evento.fecha, duracion);
  if (regla.hasta) return sumarDias(regla.hasta, duracion);
  if (!regla.veces) return null;
  const todas = expandir(evento, evento.fecha, "9999-12-31", { feriados });
  return todas.length ? sumarDias(todas[todas.length - 1].fecha, duracion) : evento.fecha;
}

const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ORDINALES = ["primer", "segundo", "tercer", "cuarto", "quinto"];
const lista = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const fechaCorta = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

/** La regla en castellano: "Cada semana los martes, hasta el 15/12/2026 · salta feriados". */
export function describirRecurrencia(regla, inicio) {
  if (!regla) return "";
  const n = regla.intervalo;
  const [, mes, dia] = inicio.split("-").map(Number);
  let texto;
  if (regla.frecuencia === "diaria") {
    texto = regla.soloHabiles ? (n === 1 ? "Todos los días hábiles" : `Cada ${n} días hábiles`) : n === 1 ? "Todos los días" : `Cada ${n} días`;
  } else if (regla.frecuencia === "semanal") {
    const dias = regla.dias?.length ? regla.dias : [diaDeSemana(inicio)];
    const habiles = dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d));
    const cuando = habiles ? "de lunes a viernes" : `los ${lista(dias.map((d) => NOMBRES_DIA[d]))}`;
    texto = `${n === 1 ? "Cada semana" : `Cada ${n} semanas`} ${cuando}`;
  } else if (regla.frecuencia === "mensual") {
    const cada = n === 1 ? "Cada mes" : `Cada ${n} meses`;
    if (regla.modoMensual === "posicion") texto = `${cada} el ${ORDINALES[Math.ceil(dia / 7) - 1]} ${NOMBRES_DIA[diaDeSemana(inicio)]}`;
    else if (regla.modoMensual === "ultimo") texto = `${cada} el último ${NOMBRES_DIA[diaDeSemana(inicio)]}`;
    else texto = `${cada} el día ${dia}`;
  } else {
    texto = `${n === 1 ? "Cada año" : `Cada ${n} años`} el ${dia} de ${NOMBRES_MES[mes - 1]}`;
  }
  if (regla.hasta) texto += `, hasta el ${fechaCorta(regla.hasta)}`;
  else if (regla.veces) texto += `, ${regla.veces} ${regla.veces === 1 ? "vez" : "veces"}`;
  if (regla.saltarFeriados) texto += " · salta feriados";
  if (regla.soloHabiles && regla.frecuencia !== "diaria") texto += " · solo días hábiles";
  return texto;
}

// ── Otras normalizaciones ────────────────────────────────────────────────────
/** Minutos antes del evento: hasta 5, de 0 a 28 días, sin repetir. */
export function normalizarRecordatorios(crudo) {
  if (!Array.isArray(crudo)) return [];
  const minutos = crudo.map((m) => Math.round(Number(m))).filter((m) => Number.isFinite(m) && m >= 0 && m <= 40320);
  return [...new Set(minutos)].sort((a, b) => a - b).slice(0, 5);
}
export const normalizarColor = (v) => (/^#[0-9a-f]{6}$/i.test(String(v ?? "")) ? String(v).toLowerCase() : null);
export function normalizarEnlace(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return ["http:", "https:"].includes(u.protocol) && t.length <= 400 ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// ── Contexto de cada persona y quién ve qué ─────────────────────────────────
export const ROLES_DE_CURSO = ["estudiante", "familia", "profesor", "preceptor"];
const TIPOS_DESTINO = ["todos", "nivel", "perfil", "curso", "persona", "familia-de"];
const MAX_DESTINOS = 200;

/** ¿Este destino alcanza a esta persona? */
export function alcanza(ctx, d) {
  switch (d.tipo) {
    case "todos": return true;
    case "nivel": return ctx.nivel.id === d.valor;
    case "perfil": return ctx.perfilClave === d.valor;
    case "curso":
      if (d.rol === "estudiante") return ctx.cursosEstudiante.has(d.curso_id);
      if (d.rol === "familia") return ctx.cursosFamilia.has(d.curso_id);
      if (d.rol === "profesor") return ctx.cursosProfesor.has(d.curso_id);
      if (d.rol === "preceptor") return ctx.cursosPreceptor.has(d.curso_id);
      return false;
    case "persona": return ctx.id === d.usuario_id;
    case "familia-de": return ctx.hijos.has(d.usuario_id);
    default: return false;
  }
}

/** Lo ve quien lo creó y quien alcance alguno de sus destinos (sin destinos = personal). */
export const loVe = (ctx, evento, destinos) => evento.creador_id === ctx.id || destinos.some((d) => alcanza(ctx, d));

export function crearAgenda(db) {
  const usuariosDe = db.prepare(
    "SELECT id, nombre, rol, perfil_clave FROM usuarios WHERE institucion_id = ? AND estado = 'activo'"
  );
  const inscripciones = db.prepare(
    "SELECT i.estudiante_id, i.curso_id FROM inscripciones i JOIN cursos c ON c.id = i.curso_id WHERE c.institucion_id = ?"
  );
  const familiares = db.prepare(
    "SELECT f.usuario_familia_id, f.estudiante_id FROM familiares f JOIN usuarios u ON u.id = f.estudiante_id WHERE u.institucion_id = ?"
  );
  const catedras = db.prepare(
    "SELECT DISTINCT ca.profesor_id, ca.curso_id FROM catedras ca JOIN cursos c ON c.id = ca.curso_id WHERE c.institucion_id = ?"
  );
  const cursos = db.prepare("SELECT id, anio, division, preceptor_id FROM cursos WHERE institucion_id = ? ORDER BY anio, division");

  /** Todo lo que hace falta de una escuela para decidir quién ve qué: personas, cursos y vínculos. */
  function escuela(institucionId) {
    const genoma = leerGenoma(db, institucionId);
    const listaCursos = cursos.all(institucionId);
    const porCurso = new Map(listaCursos.map((c) => [c.id, { ...c, nombre: `${c.anio}° ${c.division}` }]));
    const cursosDeEstudiante = new Map();
    for (const i of inscripciones.all(institucionId)) {
      if (!cursosDeEstudiante.has(i.estudiante_id)) cursosDeEstudiante.set(i.estudiante_id, new Set());
      cursosDeEstudiante.get(i.estudiante_id).add(i.curso_id);
    }
    const hijosDe = new Map();
    for (const f of familiares.all(institucionId)) {
      if (!hijosDe.has(f.usuario_familia_id)) hijosDe.set(f.usuario_familia_id, new Set());
      hijosDe.get(f.usuario_familia_id).add(f.estudiante_id);
    }
    const cursosDeProfesor = new Map();
    for (const c of catedras.all(institucionId)) {
      if (!cursosDeProfesor.has(c.profesor_id)) cursosDeProfesor.set(c.profesor_id, new Set());
      cursosDeProfesor.get(c.profesor_id).add(c.curso_id);
    }
    const cursosDePreceptor = new Map();
    for (const c of listaCursos) {
      if (c.preceptor_id === null) continue;
      if (!cursosDePreceptor.has(c.preceptor_id)) cursosDePreceptor.set(c.preceptor_id, new Set());
      cursosDePreceptor.get(c.preceptor_id).add(c.id);
    }

    const contextoDe = (u) => {
      const perfil = perfilDeUsuario(genoma, { rol: u.rol, perfilClave: u.perfil_clave ?? u.perfilClave ?? null });
      const hijos = hijosDe.get(u.id) ?? new Set();
      const cursosFamilia = new Set();
      for (const h of hijos) for (const c of cursosDeEstudiante.get(h) ?? []) cursosFamilia.add(c);
      return {
        id: u.id,
        nombre: u.nombre,
        rol: u.rol,
        perfilClave: perfil.clave,
        perfilNombre: perfil.nombre,
        nivel: nivelDePerfil(genoma, perfil.clave),
        cursosEstudiante: cursosDeEstudiante.get(u.id) ?? new Set(),
        hijos,
        cursosFamilia,
        cursosProfesor: cursosDeProfesor.get(u.id) ?? new Set(),
        cursosPreceptor: cursosDePreceptor.get(u.id) ?? new Set(),
      };
    };
    const personas = usuariosDe.all(institucionId).map(contextoDe);
    const porId = new Map(personas.map((p) => [p.id, p]));
    return { genoma, cursos: porCurso, personas, porId, contextoDe, institucionId };
  }

  return { escuela };
}

// ── Qué puede compartir cada uno (la jerarquía) ─────────────────────────────

/**
 * Lo que esta persona puede ofrecer como destino de un evento, según su nivel.
 * `e` es lo que devuelve agenda.escuela(…) y `ctx` su contexto.
 */
export function permisosDe(e, ctx) {
  const { genoma } = e;
  const { niveles } = genoma.jerarquia;
  const politica = ctx.nivel.politica;
  const puedeNivel = (indice) =>
    politica === "personal" ? false : politica === "abajo" ? indice > ctx.nivel.indice : indice >= ctx.nivel.indice;
  const nivelDe = (clave) => nivelDePerfil(genoma, clave).indice;
  const comparte = politica !== "personal";

  // Cursos: el nivel de arriba y quien no dicta ni preside cursos (biblioteca),
  // todos; quien dicta o preside, los suyos.
  const vinculado = ctx.cursosProfesor.size + ctx.cursosPreceptor.size > 0;
  const ambito = ctx.nivel.indice === 0 || !vinculado ? null : new Set([...ctx.cursosProfesor, ...ctx.cursosPreceptor]);
  const enAmbito = (cursoId) => ambito === null || ambito.has(cursoId);
  const rolesCurso = comparte ? ROLES_DE_CURSO.filter((r) => puedeNivel(nivelDe(r))) : [];

  const personas = !comparte ? [] : e.personas.filter((p) => {
    if (p.id === ctx.id || !puedeNivel(p.nivel.indice)) return false;
    if (ambito === null) return true;
    if (p.rol === "estudiante") return [...p.cursosEstudiante].some(enAmbito);
    if (p.rol === "familia") return [...p.cursosFamilia].some(enAmbito);
    return true;
  });

  return {
    politica,
    comparte,
    todos: comparte && politica === "nivel-y-abajo" && ctx.nivel.indice === 0,
    niveles: niveles.map((n, i) => ({ ...n, indice: i, permitido: puedeNivel(i) })),
    perfiles: genoma.perfiles.map((p) => ({
      clave: p.clave, nombre: p.nombre, color: p.color, icono: p.icono, arquetipo: p.arquetipo,
      nivel: genoma.jerarquia.perfiles[p.clave],
      permitido: puedeNivel(nivelDe(p.clave)),
    })),
    cursos: [...e.cursos.values()].filter((c) => enAmbito(c.id)).map((c) => ({ id: c.id, nombre: c.nombre, roles: rolesCurso })),
    personas,
    familiasDe: rolesCurso.includes("familia") ? personas.filter((p) => p.rol === "estudiante") : [],
    puedeNivel,
    enAmbito,
    rolesCurso,
  };
}

/**
 * Lee y valida la audiencia que pidió alguien. Devuelve { lista } con destinos
 * limpios (como se guardan) o { error, estado } si algo no corresponde a su nivel.
 */
export function validarAudiencia(e, ctx, cruda) {
  if (cruda === undefined || cruda === null) return { lista: [] };
  if (!Array.isArray(cruda)) return { error: "La lista de destinatarios no es válida.", estado: 400 };
  if (cruda.length > MAX_DESTINOS) return { error: `Un evento admite hasta ${MAX_DESTINOS} destinos.`, estado: 400 };
  const p = permisosDe(e, ctx);
  if (cruda.length && !p.comparte) {
    return { error: `En tu nivel («${ctx.nivel.nombre}») los eventos son personales: solo los ves vos.`, estado: 403 };
  }
  const vistos = new Set();
  const lista = [];
  const personas = new Set(p.personas.map((x) => x.id));
  for (const d of cruda) {
    const tipo = String(d?.tipo ?? "");
    if (!TIPOS_DESTINO.includes(tipo)) return { error: `Destino desconocido: «${tipo}».`, estado: 400 };
    const limpio = { tipo, valor: null, curso_id: null, rol: null, usuario_id: null };
    if (tipo === "todos") {
      if (!p.todos) return { error: "Solo el nivel de arriba de la jerarquía le muestra eventos a toda la escuela.", estado: 403 };
    } else if (tipo === "nivel") {
      const n = p.niveles.find((x) => x.id === String(d.valor ?? ""));
      if (!n) return { error: "Ese nivel no existe en la jerarquía de tu escuela.", estado: 400 };
      if (!n.permitido) return { error: `No podés mostrarle eventos a «${n.nombre}»: está por encima de tu nivel.`, estado: 403 };
      limpio.valor = n.id;
    } else if (tipo === "perfil") {
      const perfil = p.perfiles.find((x) => x.clave === String(d.valor ?? ""));
      if (!perfil) return { error: "Ese perfil no existe en tu escuela.", estado: 400 };
      if (!perfil.permitido) return { error: `No podés mostrarle eventos a «${perfil.nombre}»: está por encima de tu nivel.`, estado: 403 };
      limpio.valor = perfil.clave;
    } else if (tipo === "curso") {
      const cursoId = Number(d.cursoId ?? d.curso_id);
      const rol = String(d.rol ?? "");
      if (!e.cursos.has(cursoId)) return { error: "Ese curso no existe en tu escuela.", estado: 400 };
      if (!ROLES_DE_CURSO.includes(rol)) return { error: "Elegí a quién del curso: estudiantes, familias, profesores o preceptor.", estado: 400 };
      if (!p.enAmbito(cursoId)) return { error: "Ese curso no es tuyo: solo podés mostrarle eventos a los cursos que dictás o tenés a cargo.", estado: 403 };
      if (!p.rolesCurso.includes(rol)) return { error: "Ese grupo del curso está por encima de tu nivel.", estado: 403 };
      limpio.curso_id = cursoId;
      limpio.rol = rol;
    } else {
      const usuarioId = Number(d.usuarioId ?? d.usuario_id);
      if (tipo === "persona") {
        if (usuarioId === ctx.id) continue;
        if (!personas.has(usuarioId)) {
          const otro = e.porId.get(usuarioId);
          return {
            error: otro && otro.nivel.indice < ctx.nivel.indice
              ? `No podés mostrarle eventos a ${otro.nombre}: está por encima de tu nivel.`
              : "Esa persona no está entre las que podés invitar.",
            estado: otro ? 403 : 400,
          };
        }
      } else if (!p.familiasDe.some((x) => x.id === usuarioId)) {
        return { error: "No podés mostrarle eventos a la familia de ese estudiante.", estado: 403 };
      }
      limpio.usuario_id = usuarioId;
    }
    const clave = JSON.stringify(limpio);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    lista.push(limpio);
  }
  return { lista };
}

/** Cómo se llama un destino ("4° B · familias", "Profesores", "Familia de Julieta Rossi"). */
export function etiquetaDestino(e, d) {
  const ROL = { estudiante: "estudiantes", familia: "familias", profesor: "profesores", preceptor: "preceptor" };
  switch (d.tipo) {
    case "todos": return "Toda la escuela";
    case "nivel": return e.genoma.jerarquia.niveles.find((n) => n.id === d.valor)?.nombre ?? "Un nivel";
    case "perfil": return e.genoma.perfiles.find((p) => p.clave === d.valor)?.nombre ?? d.valor;
    case "curso": return `${e.cursos.get(d.curso_id)?.nombre ?? "Un curso"} · ${ROL[d.rol] ?? d.rol}`;
    case "persona": return e.porId.get(d.usuario_id)?.nombre ?? "Una persona";
    case "familia-de": return `Familia de ${e.porId.get(d.usuario_id)?.nombre ?? "un estudiante"}`;
    default: return "";
  }
}

/** Las personas de la escuela que ven un evento con estos destinos (para avisos y confirmaciones). */
export function audienciaDe(e, evento, destinos) {
  return e.personas.filter((p) => loVe(p, evento, destinos));
}
