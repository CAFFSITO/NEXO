// PanelTrayectoriaDocente.tsx
// Panel lateral izquierdo del Aula Virtual (Profesor).
// Muestra el avance de objetivos, las etapas de la clase (navegables)
// y la cantidad de estudiantes conectados.

import type { EtapaClase } from "./PanelTrayectoria";

interface PanelTrayectoriaDocenteProps {
    objetivosAlcanzados: number;
    objetivosTotales: number;
    etapas: EtapaClase[];
    totalConectados: number;
    /** Avanza la clase hasta la etapa elegida (marca previas como completadas). */
    onSeleccionarEtapa: (id: string) => void;
}

// Ícono según el estado de cada etapa
const ICONO_ETAPA: Record<EtapaClase["estado"], string> = {
    completado: "check_circle",
    "en-progreso": "radio_button_checked",
    pendiente: "radio_button_unchecked",
};

export default function PanelTrayectoriaDocente({
    objetivosAlcanzados,
    objetivosTotales,
    etapas,
    totalConectados,
    onSeleccionarEtapa,
}: PanelTrayectoriaDocenteProps) {
    const porcentaje =
        objetivosTotales > 0 ? Math.round((objetivosAlcanzados / objetivosTotales) * 100) : 0;

    return (
        <aside className="w-[240px] flex-shrink-0 bg-surface-container-low p-4 flex flex-col gap-6 overflow-y-auto border-r border-white/5">
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                    Trayectoria de clase
                </h3>

                {/* Objetivos alcanzados */}
                <div className="bg-surface-container p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-on-surface-variant">Objetivos alcanzados</span>
                        <span className="text-primary">
                            {objetivosAlcanzados}/{objetivosTotales}
                        </span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${porcentaje}%` }}
                        />
                    </div>
                </div>

                {/* Etapas navegables */}
                <ul className="space-y-1">
                    {etapas.map((etapa) => {
                        const activa = etapa.estado === "en-progreso";
                        const completada = etapa.estado === "completado";
                        return (
                            <li key={etapa.id}>
                                <button
                                    onClick={() => onSeleccionarEtapa(etapa.id)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm text-left transition-colors ${
                                        activa
                                            ? "bg-primary/20 text-primary font-semibold border-l-4 border-primary"
                                            : completada
                                              ? "text-green-400 hover:bg-white/5"
                                              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined text-sm"
                                        style={
                                            completada ? { fontVariationSettings: "'FILL' 1" } : undefined
                                        }
                                    >
                                        {ICONO_ETAPA[etapa.estado]}
                                    </span>
                                    <span>{etapa.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">group</span>
                    <span>{totalConectados} estudiantes conectados</span>
                </div>
            </div>
        </aside>
    );
}
