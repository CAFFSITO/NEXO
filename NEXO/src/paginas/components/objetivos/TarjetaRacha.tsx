import type { Habito } from "../../../servicios/objetivos";

interface TarjetaRachaProps {
  habito: Habito;
  onToggle: (id: string) => void;
}

// La versión chica del hábito, para la tarjeta "Mis rachas" del Dashboard.
//
// Dibuja el MISMO hábito que la sección Hábitos, con los mismos datos: es la
// misma fila de la base vista en chico (Errores 13.5 y 2.D.1). Los puntos son
// el historial real de los últimos días, no una barra proporcional a la racha:
// antes pintaba `min(racha, diasVisibles)` puntos seguidos, que dibujaba una
// racha perfecta aunque los días reales tuvieran huecos.
export default function TarjetaRacha({ habito, onToggle }: TarjetaRachaProps) {
  const { nombre, rachaDias, cumplidoHoy, historial } = habito;
  const sinRacha = rachaDias === 0;

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
            {sinRacha ? "0 días" : `🔥 ${rachaDias} ${rachaDias === 1 ? "día" : "días"}`}
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
      <div className="flex space-x-1.5">
        {historial.map((dia) => (
          <div
            key={dia.fecha}
            title={dia.fecha}
            className={`w-2.5 h-2.5 rounded-full ${
              dia.cumplido ? "bg-[#C548F5]" : "bg-surface-container-highest"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
