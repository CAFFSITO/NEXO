// src/paginas/components/panel-directivo/AlertasSistema.tsx
// Lista de alertas operativas. Lógica: al pulsar "Avisar" se marca la alerta como
// notificada (queda visualmente atenuada) vía callback hacia la página.

export interface Alerta {
  id: string;
  icono: string;
  mensaje: string;
  avisada: boolean;
}

interface AlertasSistemaProps {
  alertas: Alerta[];
  onAvisar: (id: string) => void;
}

export default function AlertasSistema({ alertas, onAvisar }: AlertasSistemaProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[20px] p-6 border border-white/5 shadow-lg">
      <h3 className="font-headline font-bold text-xl mb-4 flex items-center">
        <span className="material-symbols-outlined mr-3 text-[#FACC15]">warning</span>
        Alertas del sistema
      </h3>

      {alertas.length === 0 ? (
        <p className="text-sm text-slate-400">No hay alertas pendientes.</p>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`flex items-center p-4 bg-slate-900/30 rounded-xl border-l-4 border-[#FACC15] transition-opacity ${
                alerta.avisada ? "opacity-50" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[#FACC15] mr-4">{alerta.icono}</span>
              <p className="text-sm font-medium text-slate-200">{alerta.mensaje}</p>
              <button
                onClick={() => onAvisar(alerta.id)}
                disabled={alerta.avisada}
                className="ml-auto text-xs font-bold text-fuchsia-400 hover:underline disabled:no-underline disabled:text-slate-500 whitespace-nowrap"
              >
                {alerta.avisada ? "Avisado" : "Avisar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
