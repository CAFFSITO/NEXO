// Helpers de fechas para el calendario. Semana arranca en Lunes (convención AR).

export const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const ABREV_MES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");

// Formatea a ISO yyyy-MM-dd sin pasar por UTC (evita corrimientos de zona horaria).
export function toISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${pad(mes + 1)}-${pad(dia)}`;
}

export interface CeldaDia {
  dia: number;
  fechaISO: string;
  esDelMes: boolean; // false = relleno del mes anterior/siguiente
}

// Construye la grilla mensual completa (semanas completas, Lunes a Domingo).
export function construirGrillaMes(anio: number, mes: number): CeldaDia[] {
  const celdas: CeldaDia[] = [];

  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7; // 0 = Lunes
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(anio, mes, 0).getDate();

  // Relleno inicial con días del mes anterior
  const mesAnt = mes === 0 ? 11 : mes - 1;
  const anioAnt = mes === 0 ? anio - 1 : anio;
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    const dia = diasMesAnterior - i;
    celdas.push({ dia, fechaISO: toISO(anioAnt, mesAnt, dia), esDelMes: false });
  }

  // Días del mes actual
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push({ dia: d, fechaISO: toISO(anio, mes, d), esDelMes: true });
  }

  // Relleno final hasta completar semanas
  const mesSig = mes === 11 ? 0 : mes + 1;
  const anioSig = mes === 11 ? anio + 1 : anio;
  let diaSig = 1;
  while (celdas.length % 7 !== 0) {
    celdas.push({ dia: diaSig, fechaISO: toISO(anioSig, mesSig, diaSig), esDelMes: false });
    diaSig++;
  }

  return celdas;
}

// Los 7 días (Lunes a Domingo) de la semana que contiene a `fechaISO`.
// Se calcula con fechas locales (new Date(y,m,d)) para no cruzar por UTC.
export function construirSemana(fechaISO: string): CeldaDia[] {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(a, m - 1, d);
  const offsetALunes = (base.getDay() + 6) % 7; // 0 = ya es lunes
  const lunes = new Date(a, m - 1, d - offsetALunes);

  const dias: CeldaDia[] = [];
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    dias.push({
      dia: fecha.getDate(),
      fechaISO: toISO(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
      esDelMes: true,
    });
  }
  return dias;
}

// Corre una fecha ISO N días (positivo o negativo), respetando fin/inicio de mes.
export function sumarDiasISO(fechaISO: string, dias: number): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(a, m - 1, d + dias);
  return toISO(f.getFullYear(), f.getMonth(), f.getDate());
}

// La hora de un evento como número entero (para ubicarlo en la fila horaria).
// "08:30" → 8. Sin hora → null (va a la franja "sin horario").
export function horaEntera(hora?: string): number | null {
  if (!hora) return null;
  const n = Number(hora.split(":")[0]);
  return Number.isInteger(n) ? n : null;
}

// "08:30 - 10:00" si hay rango, "08:30" si solo inicio, "" si no hay hora.
export function formatearRangoHorario(inicio?: string, fin?: string): string {
  if (inicio && fin) return `${inicio} - ${fin}`;
  return inicio ?? "";
}
