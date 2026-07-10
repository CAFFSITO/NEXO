// src/paginas/components/cursos/EstadoCicloLectivo.tsx
// Panel resumen del ciclo lectivo: progreso académico + métricas globales.

interface EstadoCicloLectivoProps {
  progreso: number; // 0..100
  inscripciones: number;
  docentes: number;
  aulas: number;
}

export default function EstadoCicloLectivo({
  progreso,
  inscripciones,
  docentes,
  aulas,
}: EstadoCicloLectivoProps) {
  const progresoClamp = Math.max(0, Math.min(100, progreso));

  return (
    <div className="lg:col-span-2 bg-[#2D1B4E]/40 backdrop-blur-sm p-8 rounded-lg border border-surface-variant">
      <h3 className="text-xl font-bold text-white font-headline mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">trending_up</span>
        Estado del Ciclo Lectivo
      </h3>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-on-surface-variant font-medium">Progreso Académico General</span>
          <span className="text-primary font-bold">{progresoClamp}%</span>
        </div>
        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
          <div
            className="bg-[#C548F5] h-full rounded-full transition-all duration-500"
            style={{ width: `${progresoClamp}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metrica label="Inscripciones" valor={inscripciones.toLocaleString("es-AR")} />
        <Metrica label="Docentes" valor={docentes.toString()} />
        <Metrica label="Aulas" valor={aulas.toString()} />
      </div>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/30">
      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{valor}</p>
    </div>
  );
}
