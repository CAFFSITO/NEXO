import type { Habito } from "./tiposDashboard";

interface TarjetaRachaProps {
  habito: Habito;
  onToggle: (id: string) => void;
}

// Hábito con contador de racha, check-in diario y visual de puntos cumplidos.
export default function TarjetaRacha({ habito, onToggle }: TarjetaRachaProps) {
  const { nombre, rachaDias, cumplidoHoy, diasVisibles } = habito;
  const sinRacha = rachaDias === 0;
  const activos = Math.min(rachaDias, diasVisibles);

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className={`text-sm font-semibold ${sinRacha ? "text-slate-400" : ""}`}>
            {nombre}
          </p>
          <p
            className={`text-[10px] font-bold uppercase ${
              sinRacha ? "text-slate-500" : "text-orange-400"
            }`}
          >
            {sinRacha ? "0 días" : `🔥 ${rachaDias} días`}
          </p>
        </div>
        <input
          type="checkbox"
          checked={cumplidoHoy}
          onChange={() => onToggle(habito.id)}
          aria-label={`Registrar ${nombre}`}
          className={`w-5 h-5 rounded cursor-pointer focus:ring-0 focus:ring-offset-0 ${
            cumplidoHoy
              ? "border-none bg-[#C548F5]"
              : "border-2 border-slate-700 bg-transparent"
          }`}
        />
      </div>
      <div className={`flex space-x-1.5 ${sinRacha ? "opacity-30" : ""}`}>
        {Array.from({ length: diasVisibles }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              i < activos ? "bg-[#C548F5]" : "bg-surface-container-highest"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
