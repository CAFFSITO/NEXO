// Ayudas del calendario con jerarquía: fechas, repeticiones en castellano,
// recordatorios y cómo repartir las ocurrencias por día. El servidor es el que
// expande y valida; esto solo dibuja.

import type { EventoServidor, Recurrencia } from "../../../servicios/calendario";
import { sumarDiasISO, toISO } from "../calendario/fechas";

export { sumarDiasISO, toISO };

export const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Lunes primero (convención argentina), con el número de día de JS (0 = domingo). */
export const SEMANA = [
  { dia: 1, corto: "L", nombre: "Lun" }, { dia: 2, corto: "M", nombre: "Mar" }, { dia: 3, corto: "M", nombre: "Mié" },
  { dia: 4, corto: "J", nombre: "Jue" }, { dia: 5, corto: "V", nombre: "Vie" }, { dia: 6, corto: "S", nombre: "Sáb" },
  { dia: 0, corto: "D", nombre: "Dom" },
];
const ORDINALES = ["primer", "segundo", "tercer", "cuarto", "quinto"];

const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];
export const diaSemana = (iso: string) => { const [a, m, d] = partes(iso); return new Date(a, m - 1, d).getDay(); };
export const hoyISO = () => { const h = new Date(); return toISO(h.getFullYear(), h.getMonth(), h.getDate()); };
export const diasEntre = (a: string, b: string) => {
  const [y1, m1, d1] = partes(a);
  const [y2, m2, d2] = partes(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
};

/** "martes 18 de noviembre" (con el año si no es el actual). */
export function fechaLarga(iso: string, conAnio = false) {
  const [a, m, d] = partes(iso);
  const anio = conAnio || a !== new Date().getFullYear() ? ` de ${a}` : "";
  return `${NOMBRES_DIA[diaSemana(iso)]} ${d} de ${NOMBRES_MES[m - 1]}${anio}`;
}
/** La primera letra en mayúscula (sin tocar el resto: "martes 3 de noviembre" → "Martes 3 de noviembre"). */
export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fechaCorta = (iso: string) => { const [, m, d] = partes(iso); return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`; };

/** "10:00 – 11:00", "Todo el día", "18:00 del 26/11 – 12:00 del 28/11". */
export function cuandoEvento(ev: Pick<EventoServidor, "fecha" | "fechaFin" | "horaInicio" | "horaFin" | "todoElDia">) {
  if (ev.fechaFin && ev.fechaFin !== ev.fecha) {
    if (ev.todoElDia) return `Del ${fechaCorta(ev.fecha)} al ${fechaCorta(ev.fechaFin)}`;
    return `${ev.horaInicio} del ${fechaCorta(ev.fecha)} – ${ev.horaFin ?? ev.horaInicio} del ${fechaCorta(ev.fechaFin)}`;
  }
  if (ev.todoElDia) return "Todo el día";
  return ev.horaFin ? `${ev.horaInicio} – ${ev.horaFin}` : `${ev.horaInicio}`;
}

/** Las fechas que ocupa una ocurrencia (más de una si dura varios días). */
export function diasDe(ev: Pick<EventoServidor, "fecha" | "fechaFin">): string[] {
  if (!ev.fechaFin || ev.fechaFin === ev.fecha) return [ev.fecha];
  const total = Math.min(diasEntre(ev.fecha, ev.fechaFin), 366);
  return Array.from({ length: total + 1 }, (_, i) => sumarDiasISO(ev.fecha, i));
}

/** Las ocurrencias repartidas por día: las de todo el día y las de varios días primero. */
export function porDia(eventos: EventoServidor[]): Map<string, EventoServidor[]> {
  const mapa = new Map<string, EventoServidor[]>();
  for (const ev of eventos) for (const d of diasDe(ev)) {
    if (!mapa.has(d)) mapa.set(d, []);
    mapa.get(d)!.push(ev);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) =>
      Number(!a.todoElDia && !a.fechaFin) - Number(!b.todoElDia && !b.fechaFin) ||
      (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "") ||
      (a.nivel?.indice ?? 9) - (b.nivel?.indice ?? 9));
  }
  return mapa;
}

/** El ícono del origen de un evento en la jerarquía. */
export function iconoOrigen(ev: Pick<EventoServidor, "personal" | "nivel">) {
  if (ev.personal) return "lock";
  const i = ev.nivel?.indice ?? 9;
  return i === 0 ? "account_balance" : i === 1 ? "groups" : "diversity_3";
}

// ── Repeticiones ─────────────────────────────────────────
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

/** La regla en castellano (la misma que arma el servidor). */
export function describirRecurrencia(regla: Recurrencia | null, inicio: string) {
  if (!regla) return "No se repite";
  const n = regla.intervalo || 1;
  const [, mes, dia] = partes(inicio);
  let texto: string;
  if (regla.frecuencia === "diaria") {
    texto = regla.soloHabiles ? (n === 1 ? "Todos los días hábiles" : `Cada ${n} días hábiles`) : n === 1 ? "Todos los días" : `Cada ${n} días`;
  } else if (regla.frecuencia === "semanal") {
    const dias = regla.dias?.length ? regla.dias : [diaSemana(inicio)];
    const habiles = dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d));
    const ordenados = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    texto = `${n === 1 ? "Cada semana" : `Cada ${n} semanas`} ${habiles ? "de lunes a viernes" : `los ${lista(ordenados.map((d) => NOMBRES_DIA[d]))}`}`;
  } else if (regla.frecuencia === "mensual") {
    const cada = n === 1 ? "Cada mes" : `Cada ${n} meses`;
    if (regla.modoMensual === "posicion") texto = `${cada} el ${ORDINALES[Math.ceil(dia / 7) - 1]} ${NOMBRES_DIA[diaSemana(inicio)]}`;
    else if (regla.modoMensual === "ultimo") texto = `${cada} el último ${NOMBRES_DIA[diaSemana(inicio)]}`;
    else texto = `${cada} el día ${dia}`;
  } else {
    texto = `${n === 1 ? "Cada año" : `Cada ${n} años`} el ${dia} de ${NOMBRES_MES[mes - 1]}`;
  }
  if (regla.hasta) { const [a, m, d] = partes(regla.hasta); texto += `, hasta el ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`; }
  else if (regla.veces) texto += `, ${regla.veces} ${regla.veces === 1 ? "vez" : "veces"}`;
  if (regla.saltarFeriados) texto += " · salta feriados";
  return texto;
}

/** Las repeticiones de un toque, como en cualquier calendario (más la de días hábiles). */
export function presetsRepeticion(inicio: string): { id: string; etiqueta: string; regla: Recurrencia | null }[] {
  const d = diaSemana(inicio);
  const [, , dia] = partes(inicio);
  const ultimaSemana = dia + 7 > new Date(partes(inicio)[0], partes(inicio)[1], 0).getDate();
  const presets: { id: string; etiqueta: string; regla: Recurrencia | null }[] = [
    { id: "no", etiqueta: "No se repite", regla: null },
    { id: "diaria", etiqueta: "Todos los días", regla: { frecuencia: "diaria", intervalo: 1 } },
    { id: "habiles", etiqueta: "Días de clase (lunes a viernes)", regla: { frecuencia: "semanal", intervalo: 1, dias: [1, 2, 3, 4, 5], saltarFeriados: true } },
    { id: "semanal", etiqueta: `Cada semana, los ${NOMBRES_DIA[d]}`, regla: { frecuencia: "semanal", intervalo: 1, dias: [d] } },
    { id: "quincenal", etiqueta: `Cada 2 semanas, los ${NOMBRES_DIA[d]}`, regla: { frecuencia: "semanal", intervalo: 2, dias: [d] } },
    { id: "mensual-dia", etiqueta: `Cada mes, el día ${dia}`, regla: { frecuencia: "mensual", intervalo: 1, modoMensual: "dia" } },
    { id: "mensual-pos", etiqueta: `Cada mes, el ${ORDINALES[Math.ceil(dia / 7) - 1]} ${NOMBRES_DIA[d]}`, regla: { frecuencia: "mensual", intervalo: 1, modoMensual: "posicion" } },
  ];
  if (ultimaSemana) presets.push({ id: "mensual-ult", etiqueta: `Cada mes, el último ${NOMBRES_DIA[d]}`, regla: { frecuencia: "mensual", intervalo: 1, modoMensual: "ultimo" } });
  presets.push({ id: "anual", etiqueta: `Cada año, el ${dia} de ${NOMBRES_MES[partes(inicio)[1] - 1]}`, regla: { frecuencia: "anual", intervalo: 1 } });
  return presets;
}

// ── Recordatorios ────────────────────────────────────────
export const OPCIONES_RECORDATORIO = [0, 10, 15, 30, 60, 120, 1440, 2880, 10080];

export function etiquetaRecordatorio(min: number) {
  if (min === 0) return "En el momento";
  if (min < 60) return `${min} min antes`;
  if (min < 1440) return `${min / 60} h antes`;
  if (min % 10080 === 0) return min === 10080 ? "1 semana antes" : `${min / 10080} semanas antes`;
  return min === 1440 ? "1 día antes" : `${Math.round(min / 1440)} días antes`;
}

export const COLORES_EVENTO = ["#fb923c", "#f472b6", "#38bdf8", "#facc15", "#a78bfa", "#34d399", "#c084fc", "#f87171", "#2dd4bf", "#94a3b8"];
