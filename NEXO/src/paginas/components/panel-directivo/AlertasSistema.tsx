// src/paginas/components/panel-directivo/AlertasSistema.tsx
// Lista de alertas operativas, derivadas de datos reales del servidor.
// Antes el botón decía "Avisar" y solo hacía un console.log (botón muerto,
// Error 12.8): no existe un mecanismo de "avisar" detrás. Ahora la acción es
// real: "Ver" navega a la pantalla donde ese problema se resuelve.

export interface Alerta {
  id: string;
  icono: string;
  mensaje: string;
  /** Adónde se va a resolver el problema. Sin ruta, la alerta es informativa. */
  ruta?: string;
}

interface AlertasSistemaProps {
  alertas: Alerta[];
  onIr: (ruta: string) => void;
}

export default function AlertasSistema({ alertas, onIr }: AlertasSistemaProps) {
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
              className="flex items-center p-4 bg-slate-900/30 rounded-xl border-l-4 border-[#FACC15]"
            >
              <span className="material-symbols-outlined text-[#FACC15] mr-4">{alerta.icono}</span>
              <p className="text-sm font-medium text-slate-200">{alerta.mensaje}</p>
              {alerta.ruta && (
                <button
                  onClick={() => onIr(alerta.ruta!)}
                  className="ml-auto text-xs font-bold text-fuchsia-400 hover:underline whitespace-nowrap"
                >
                  Ver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
