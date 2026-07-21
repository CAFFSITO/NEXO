// src/servicios/fechas.ts
// El ÚNICO calculador de fechas de NEXO.
//
// Por qué existe: hoy cada pantalla trae el suyo, y por eso la MISMA fecha se
// lee distinto según dónde se la mire (Error 13.6). Mis Tareas daba una meta
// por vencida y Mis Metas, con la misma fecha, decía "quedan 286 días", porque
// cuando la fecha ya pasó suponía que era del año que viene (Error 2.D.14).
// Los dos cálculos no pueden tener razón. Acá hay uno solo.
//
// Regla de fondo: las fechas llegan de la base en ISO ("2026-07-10"), con año.
// Nadie tiene que adivinar el año, que era la causa de todo (Error 2.C.9).

// ─── Lectura de fechas ──────────────────────────────────

/**
 * Convierte "2026-07-10" a una fecha local a medianoche.
 *
 * A mano y no con `new Date(texto)` a propósito: pasarle una fecha ISO sin hora
 * al constructor la interpreta en UTC, así que al oeste de Greenwich (toda la
 * Argentina) "2026-07-10" se convierte en las 21:00 del 9 de julio y la fecha
 * aparece un día antes. Devuelve null si el texto no es una fecha.
 */
export function aFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const partes = iso.slice(0, 10).split("-");
  if (partes.length !== 3) return null;

  const [anio, mes, dia] = partes.map(Number);
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    return null;
  }

  const fecha = new Date(anio, mes - 1, dia);
  // Rechaza fechas imposibles ("2026-02-31" desbordaría a marzo sin avisar).
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1) return null;
  return fecha;
}

/** Hoy, a medianoche: el punto de comparación de todo este archivo. */
export function hoy(): Date {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

/**
 * Días desde hoy hasta `iso`. Negativo = ya venció. null = no hay fecha.
 * Nunca "corrige" una fecha pasada al año siguiente: si venció, venció.
 */
export function diasHasta(iso: string | null | undefined): number | null {
  const objetivo = aFecha(iso);
  if (!objetivo) return null;
  return Math.round((objetivo.getTime() - hoy().getTime()) / 86_400_000);
}

/** ¿Esta fecha ya pasó? Un vencimiento de hoy todavía no está vencido. */
export function estaVencida(iso: string | null | undefined): boolean {
  const dias = diasHasta(iso);
  return dias !== null && dias < 0;
}

// ─── Escritura para pantalla ────────────────────────────

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "10 jul" — y suma el año si la fecha no cae en el año en curso. */
export function fechaCorta(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  if (!fecha) return "Sin fecha";

  const texto = `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  const anioActual = new Date().getFullYear();
  return fecha.getFullYear() === anioActual
    ? texto
    : `${texto} ${fecha.getFullYear()}`;
}

const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** "Vence en 5 días" / "Vence hoy" / "Vencida hace 3 días". */
export function textoVencimiento(iso: string | null | undefined): string {
  const dias = diasHasta(iso);
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `Vencida hace ${plural(Math.abs(dias), "día", "días")}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${plural(dias, "día", "días")}`;
}

/** Color del vencimiento según urgencia: rojo <3 días, naranja hasta 7, verde. */
export function colorVencimiento(iso: string | null | undefined): string {
  const dias = diasHasta(iso);
  if (dias === null) return "text-slate-400";
  if (dias < 3) return "text-red-500";
  if (dias <= 7) return "text-orange-400";
  return "text-green-500";
}

/** "Hoy" / "Ayer" / "Hace 3 días" / "Hace 2 semanas". Para lo que ya ocurrió. */
export function textoRelativo(iso: string | null | undefined): string {
  const dias = diasHasta(iso);
  if (dias === null) return "Sin fecha";
  if (dias > 0) return `En ${plural(dias, "día", "días")}`;

  const pasados = Math.abs(dias);
  if (pasados === 0) return "Hoy";
  if (pasados === 1) return "Ayer";
  if (pasados < 7) return `Hace ${pasados} días`;
  if (pasados < 30) return `Hace ${plural(Math.floor(pasados / 7), "semana", "semanas")}`;
  if (pasados < 365) return `Hace ${plural(Math.floor(pasados / 30), "mes", "meses")}`;
  return `Hace ${plural(Math.floor(pasados / 365), "año", "años")}`;
}

// ─── El saludo del panel diario (Error 2.D.13) ──────────

const DIAS_SEMANA = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

/** El día de la semana de verdad. La pantalla decía "martes" todos los días. */
export function diaDeHoy(): string {
  return DIAS_SEMANA[new Date().getDay()];
}

/**
 * "Buenos días" / "Buenas tardes" / "Buenas noches", según la hora real.
 * La pantalla decía "Buenos días" también a las diez de la noche.
 */
export function saludoSegunLaHora(): string {
  const hora = new Date().getHours();
  if (hora < 6) return "Buenas noches";
  if (hora < 13) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}
