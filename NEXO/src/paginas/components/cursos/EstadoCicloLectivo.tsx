// src/paginas/components/cursos/EstadoCicloLectivo.tsx
// Panel resumen del ciclo lectivo: avance del cronograma + métricas globales.
//
// Los cuatro números eran inventados: el progreso era la constante 65, los
// docentes eran 86 (el colegio tiene 4) y las "Aulas" se calculaban como
// `cursos × 6`, una cuenta que no representaba nada — no hay aulas en la base.
// Ahora los cuatro vienen contados de la base (ver `servidor/perfiles.js`).

interface EstadoCicloLectivoProps {
  /** Qué parte de las tareas del colegio ya pasó su fecha límite (0..100). */
  avanceCronograma: number;
  inscripciones: number;
  docentes: number;
  materias: number;
}

export default function EstadoCicloLectivo({
  avanceCronograma,
  inscripciones,
  docentes,
  materias,
}: EstadoCicloLectivoProps) {
  const avance = Math.max(0, Math.min(100, avanceCronograma));

  return (
    <div className="lg:col-span-2 bg-[#2D1B4E]/40 backdrop-blur-sm p-8 rounded-lg border border-surface-variant">
      <h3 className="text-xl font-bold text-white font-headline mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">trending_up</span>
        Estado del Ciclo Lectivo
      </h3>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          {/* Antes decía "Progreso Académico General", que sonaba a cuánto
              aprendieron los chicos y era un 65 escrito a mano. Esto dice lo
              que de verdad se está midiendo: cuánto del trabajo planificado ya
              venció. Es menos ambicioso y es cierto. */}
          <span className="text-on-surface-variant font-medium">Avance del cronograma de tareas</span>
          <span className="text-primary font-bold">{avance}%</span>
        </div>
        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
          <div
            className="bg-[#C548F5] h-full rounded-full transition-all duration-500"
            style={{ width: `${avance}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metrica label="Inscripciones" valor={inscripciones.toLocaleString("es-AR")} />
        <Metrica label="Docentes" valor={docentes.toString()} />
        <Metrica label="Materias" valor={materias.toString()} />
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
