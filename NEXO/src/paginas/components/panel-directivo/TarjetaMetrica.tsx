// src/paginas/components/panel-directivo/TarjetaMetrica.tsx
// Tarjeta de métrica del panel institucional: ícono + valor grande + etiqueta + delta opcional.

interface TarjetaMetricaProps {
  icono: string;
  iconoColor: string; // clase de color Tailwind, ej: "text-fuchsia-400"
  valor: string;
  etiqueta: string;
  delta?: string; // ej: "+12%"
}

export default function TarjetaMetrica({ icono, iconoColor, valor, etiqueta, delta }: TarjetaMetricaProps) {
  return (
    <div className="bg-[#2D1B4E] p-6 rounded-[20px] border border-white/5 shadow-xl shadow-black/20">
      <div className="flex justify-between items-start mb-4">
        <span className={`material-symbols-outlined ${iconoColor}`}>{icono}</span>
        {delta && (
          <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full font-bold">
            {delta}
          </span>
        )}
      </div>
      <p className="text-4xl font-headline font-bold text-white mb-1">{valor}</p>
      <p className="text-slate-400 text-sm font-medium">{etiqueta}</p>
    </div>
  );
}
