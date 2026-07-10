// src/paginas/components/preceptor/PanelActividadReciente.tsx
// Timeline de actividad reciente de los cursos del preceptor.

export type TipoActividad = "posteo" | "bloqueo" | "cierre";

export interface ActividadPreceptor {
    id: string;
    tipo: TipoActividad;
    autor?: string;       // solo en "posteo"
    curso: string;        // "4° B"
    tiempo: string;       // "Hace 12m"
}

interface PanelActividadRecienteProps {
    actividades: ActividadPreceptor[];
}

// Config visual por tipo de actividad
const CONFIG: Record<TipoActividad, { bg: string; icono: string; fill: boolean; colorCurso: string }> = {
    posteo: { bg: "bg-[#C548F5]", icono: "person", fill: true, colorCurso: "text-[#C548F5]" },
    bloqueo: { bg: "bg-amber-500", icono: "lock", fill: false, colorCurso: "text-amber-400" },
    cierre: { bg: "bg-slate-500", icono: "close", fill: false, colorCurso: "text-white" },
};

export default function PanelActividadReciente({ actividades }: PanelActividadRecienteProps) {
    return (
        <div className="bg-[#2D1B4E] rounded-lg p-6 border border-white/5">
            <h4 className="text-sm font-black font-headline text-white uppercase tracking-widest mb-6">
                Actividad Reciente
            </h4>
            <div className="space-y-6">
                {actividades.map((act, i) => {
                    const cfg = CONFIG[act.tipo];
                    const esUltima = i === actividades.length - 1;
                    return (
                        <div key={act.id} className="flex gap-3 relative">
                            {/* Conector vertical entre ítems */}
                            {!esUltima && (
                                <div className="absolute left-[9px] top-6 bottom-[-24px] w-[1px] bg-[#3b2f50]" />
                            )}
                            <div
                                className={`w-5 h-5 rounded-full ${cfg.bg} flex-shrink-0 flex items-center justify-center z-10`}
                            >
                                <span
                                    className="material-symbols-outlined text-[10px] text-white"
                                    style={cfg.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                    {cfg.icono}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-white">
                                    {act.tipo === "posteo" && (
                                        <>
                                            <span className="font-bold">{act.autor}</span> publicó en{" "}
                                            <span className={`${cfg.colorCurso} font-semibold`}>{act.curso}</span>
                                        </>
                                    )}
                                    {act.tipo === "bloqueo" && (
                                        <>
                                            Comunidad{" "}
                                            <span className={`${cfg.colorCurso} font-semibold`}>{act.curso}</span>{" "}
                                            bloqueada
                                        </>
                                    )}
                                    {act.tipo === "cierre" && (
                                        <>
                                            Debate cerrado en{" "}
                                            <span className="font-semibold">{act.curso}</span>
                                        </>
                                    )}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase">{act.tiempo}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
