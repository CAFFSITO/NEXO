import { useMemo, useState } from "react";

export interface EventoCentro {
  dia: number;
  titulo: string;
  detalle: string;
}

interface CalendarioWidgetProps {
  anioInicial?: number;
  mesInicial?: number; // 0-11
  eventos: EventoCentro[];
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function CalendarioWidget({
  anioInicial = 2025,
  mesInicial = 4, // Mayo
  eventos,
}: CalendarioWidgetProps) {
  const [anio, setAnio] = useState(anioInicial);
  const [mes, setMes] = useState(mesInicial);

  const diasConEvento = useMemo(
    () => new Set(eventos.map((e) => e.dia)),
    [eventos]
  );

  // Celdas del calendario: huecos previos + días del mes
  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1).getDay(); // 0=Dom
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    const huecos = Array.from({ length: primerDia }, () => null);
    const dias = Array.from({ length: totalDias }, (_, i) => i + 1);
    return [...huecos, ...dias];
  }, [anio, mes]);

  const cambiarMes = (delta: number) => {
    const nuevo = mes + delta;
    if (nuevo < 0) {
      setMes(11);
      setAnio((a) => a - 1);
    } else if (nuevo > 11) {
      setMes(0);
      setAnio((a) => a + 1);
    } else {
      setMes(nuevo);
    }
  };

  return (
    <section className="bg-[#2D1B4E] rounded-lg p-6 border border-white/5">
      <h3 className="text-lg font-headline font-bold text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#F97316]">calendar_today</span>
        Calendario del Centro
      </h3>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-sm font-bold text-on-surface">
            {MESES[mes]} {anio}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => cambiarMes(-1)}
              className="material-symbols-outlined text-sm cursor-pointer text-on-surface-variant hover:text-white"
            >
              chevron_left
            </button>
            <button
              onClick={() => cambiarMes(1)}
              className="material-symbols-outlined text-sm cursor-pointer text-on-surface-variant hover:text-white"
            >
              chevron_right
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-on-surface-variant font-bold mb-2">
          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {celdas.map((dia, i) =>
            dia === null ? (
              <span key={`h-${i}`} className="py-1 text-xs opacity-20" />
            ) : (
              <span key={dia} className="py-1 text-xs text-white relative">
                {dia}
                {diasConEvento.has(dia) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#F97316] rounded-full" />
                )}
              </span>
            )
          )}
        </div>
      </div>
      <ul className="space-y-3">
        {eventos.map((evento) => (
          <li key={`${evento.dia}-${evento.titulo}`} className="flex gap-3 items-start group">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] mt-2 group-hover:scale-125 transition-transform" />
            <div>
              <p className="text-xs font-bold text-white">{evento.titulo}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">{evento.detalle}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
