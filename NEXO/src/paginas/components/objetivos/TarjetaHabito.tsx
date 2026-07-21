import { FRECUENCIA_LABELS } from "./tiposDashboard";
import type { Habito } from "../../../servicios/objetivos";

interface TarjetaHabitoProps {
  habito: Habito;
  onToggle: (id: string) => void;
}

// Tarjeta de hábito de la vista "Mis Hábitos de Estudio".
// Muestra nombre, frecuencia, visual de los últimos días, contador de racha
// y un check grande para registrar el cumplimiento de hoy.
export default function TarjetaHabito({ habito, onToggle }: TarjetaHabitoProps) {
  const { id, nombre, frecuencia, rachaDias, cumplidoHoy, historial } = habito;
  const sinRacha = rachaDias === 0;

  return (
    <div
      className={`bg-[#2D1B4E] p-6 rounded-[14px] flex justify-between items-center group hover:ring-1 ring-[#C548F5]/30 transition-all ${
        sinRacha ? "opacity-80" : ""
      }`}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">{nombre}</h3>
          <span className="text-sm text-white/40">{FRECUENCIA_LABELS[frecuencia]}</span>
        </div>

        {/* Historial de cumplimiento (últimos días). Cada punto es un día real
            y lleva su fecha: son los días que hay en `habito_registros`. */}
        <div className="flex gap-1.5">
          {historial.map((dia) => (
            <div
              key={dia.fecha}
              title={dia.fecha}
              className={`w-2.5 h-2.5 rounded-full ${
                dia.cumplido ? "bg-emerald-500" : "bg-[#1C1030]"
              }`}
            />
          ))}
        </div>

        {/* Contador de racha */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit ${
            sinRacha ? "bg-white/5" : "bg-orange-500/10"
          }`}
        >
          <span className={`text-sm ${sinRacha ? "text-white/40" : "text-orange-500"}`}>🔥</span>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              sinRacha ? "text-white/40" : "text-orange-500"
            }`}
          >
            {rachaDias} {rachaDias === 1 ? "día seguido" : "días seguidos"}
          </span>
        </div>
      </div>

      {/* Check-in diario */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={cumplidoHoy}
          onChange={() => onToggle(id)}
          aria-label={`Registrar ${nombre} hoy`}
        />
        <div className="w-14 h-14 bg-[#1C1030] rounded-2xl flex items-center justify-center border border-white/5 peer-checked:bg-[#C548F5] transition-all group-hover:border-[#C548F5]/40">
          <span className="material-symbols-outlined text-white/20 peer-checked:text-white">
            check
          </span>
        </div>
      </label>
    </div>
  );
}
