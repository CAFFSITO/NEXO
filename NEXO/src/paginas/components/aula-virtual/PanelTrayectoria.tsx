// PanelTrayectoria.tsx
// Panel lateral izquierdo del Aula Virtual (Estudiante).
// Muestra el progreso de la unidad, las etapas de la clase y los conectados.

export type EstadoEtapa = "completado" | "en-progreso" | "pendiente";

export interface EtapaClase {
    id: string;
    label: string;
    estado: EstadoEtapa;
}

export interface EstudianteConectado {
    inicial: string;
    color: string; // clase Tailwind de fondo, ej: "bg-blue-500"
}

interface PanelTrayectoriaProps {
    unidad: string;
    objetivosAlcanzados: number;
    objetivosTotales: number;
    etapas: EtapaClase[];
    conectados: EstudianteConectado[];
    totalConectados: number;
}

// Ícono + estilos según el estado de cada etapa
const ESTILOS_ETAPA: Record<
    EstadoEtapa,
    { contenedor: string; icono: string; iconoClase: string; textoClase: string; fill: boolean }
> = {
    completado: {
        contenedor: "bg-green-500/10 text-green-400",
        icono: "check_circle",
        iconoClase: "text-sm",
        textoClase: "text-sm font-medium",
        fill: true,
    },
    "en-progreso": {
        contenedor: "bg-[#C548F5]/20 text-[#C548F5] ring-1 ring-[#C548F5]/30",
        icono: "radio_button_checked",
        iconoClase: "text-sm animate-pulse",
        textoClase: "text-sm font-bold",
        fill: false,
    },
    pendiente: {
        contenedor: "text-white/40",
        icono: "radio_button_unchecked",
        iconoClase: "text-sm",
        textoClase: "text-sm font-medium",
        fill: false,
    },
};

export default function PanelTrayectoria({
    unidad,
    objetivosAlcanzados,
    objetivosTotales,
    etapas,
    conectados,
    totalConectados,
}: PanelTrayectoriaProps) {
    const porcentaje =
        objetivosTotales > 0 ? Math.round((objetivosAlcanzados / objetivosTotales) * 100) : 0;

    return (
        <aside className="w-[240px] bg-[#1C1030] border-r border-[#2D1B4E] flex flex-col shrink-0">
            <div className="p-5 flex-1">
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#C548F5] uppercase mb-6">
                    Trayectoria de clase
                </p>

                {/* Progreso de la unidad */}
                <div className="mb-8">
                    <h3 className="text-white font-headline font-bold text-base mb-2">{unidad}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-white/60">
                            <span>Objetivos alcanzados</span>
                            <span>
                                {objetivosAlcanzados}/{objetivosTotales}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#2D1B4E] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#C548F5] rounded-full transition-all duration-500"
                                style={{ width: `${porcentaje}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Etapas de la clase */}
                <nav className="space-y-1">
                    {etapas.map((etapa) => {
                        const estilo = ESTILOS_ETAPA[etapa.estado];
                        return (
                            <div
                                key={etapa.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${estilo.contenedor}`}
                            >
                                <span
                                    className={`material-symbols-outlined ${estilo.iconoClase}`}
                                    style={estilo.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                    {estilo.icono}
                                </span>
                                <span className={estilo.textoClase}>{etapa.label}</span>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Footer: conectados */}
            <div className="p-5 border-t border-[#2D1B4E] bg-[#1C1030]">
                <div className="flex items-center gap-3 text-white/60">
                    <div className="flex -space-x-2">
                        {conectados.map((e, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full ${e.color} border border-[#1C1030] flex items-center justify-center text-[10px] font-bold text-white`}
                            >
                                {e.inicial}
                            </div>
                        ))}
                    </div>
                    <span className="text-[11px] font-medium">
                        {totalConectados} estudiantes conectados
                    </span>
                </div>
            </div>
        </aside>
    );
}
