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

// "08:30 - 10:00" si hay rango, "08:30" si solo inicio, "" si no hay hora.
export function formatearRangoHorario(inicio?: string, fin?: string): string {
  if (inicio && fin) return `${inicio} - ${fin}`;
  return inicio ?? "";
}
