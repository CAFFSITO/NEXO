// src/paginas/components/panel-directivo/PulsoInstitucion.tsx
// Indicadores cualitativos de la institución con barras de progreso data-driven.

export interface MetricaPulso {
  id: string;
  label: string;
  valor: number; // 0-100
  valorColor: string; // clase de texto, ej: "text-fuchsia-400"
  gradiente: string; // clases del fill, ej: "from-fuchsia-600 to-tertiary-container"
}

interface PulsoInstitucionProps {
  metricas: MetricaPulso[];
}

export default function PulsoInstitucion({ metricas }: PulsoInstitucionProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[20px] p-6 border border-white/5 shadow-lg">
      <h3 className="font-headline font-bold text-xl mb-6 flex items-center">
        <span className="material-symbols-outlined mr-3 text-fuchsia-400">insights</span>
        Pulso de la institución
      </h3>
      <div className="space-y-6">
        {metricas.map((m) => (
          <div key={m.id}>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-400 uppercase tracking-tight">{m.label}</span>
              <span className={m.valorColor}>{m.valor}%</span>
            </div>
            <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${m.gradiente} rounded-full transition-[width] duration-500`}
                style={{ width: `${m.valor}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
