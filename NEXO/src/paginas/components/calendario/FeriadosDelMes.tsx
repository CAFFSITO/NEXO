import { ABREV_MES } from "./fechas";
import type { Feriado } from "./tipos";

interface FeriadosDelMesProps {
  feriados: Feriado[];
}

export default function FeriadosDelMes({ feriados }: FeriadosDelMesProps) {
  return (
    <div className="bg-[#1C1030] rounded-3xl p-6 border border-white/5 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 font-headline">Feriados del mes</h3>
      <div className="space-y-3">
        {feriados.length === 0 && (
          <p className="text-sm text-slate-400">No hay feriados este mes.</p>
        )}
        {feriados.map((f) => {
          const [, mesStr, diaStr] = f.fecha.split("-");
          return (
            <div
              key={f.fecha}
              className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-sm font-black text-[#C548F5] font-headline w-12">
                {Number(diaStr)} {ABREV_MES[Number(mesStr) - 1].charAt(0) + ABREV_MES[Number(mesStr) - 1].slice(1).toLowerCase()}
              </span>
              <span className="text-sm text-slate-300">{f.nombre}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
