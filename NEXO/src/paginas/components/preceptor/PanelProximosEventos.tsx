// src/paginas/components/preceptor/PanelProximosEventos.tsx
// Panel lateral de próximos eventos de los cursos del preceptor.

export interface EventoPreceptor {
    id: string;
    titulo: string;
    cursos?: string[];    // pills de cursos involucrados
    fecha: string;        // "25 de Mayo, 08:30hs"
    icono: string;        // material symbol para la fecha
    destacado?: boolean;  // borde tertiary vs slate
}

interface PanelProximosEventosProps {
    eventos: EventoPreceptor[];
    onVerCalendario: () => void;
}

export default function PanelProximosEventos({ eventos, onVerCalendario }: PanelProximosEventosProps) {
    return (
        <div className="bg-[#2D1B4E] rounded-lg p-6 border border-white/5">
            <h4 className="text-sm font-black font-headline text-white uppercase tracking-widest mb-6">
                Próximos Eventos
            </h4>
            <div className="space-y-6">
                {eventos.map((evento) => (
                    <div
                        key={evento.id}
                        className={`p-4 bg-[#1C1030]/50 rounded-lg border-l-4 ${
                            evento.destacado ? "border-tertiary" : "border-slate-500"
                        }`}
                    >
                        <p className="text-xs font-bold text-white mb-2">{evento.titulo}</p>
                        {evento.cursos && evento.cursos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {evento.cursos.map((curso) => (
                                    <span
                                        key={curso}
                                        className="px-2 py-0.5 bg-[#C548F5]/10 text-[#C548F5] text-[10px] font-bold rounded"
                                    >
                                        {curso}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">{evento.icono}</span>
                            {evento.fecha}
                        </p>
                    </div>
                ))}
            </div>
            <button
                onClick={onVerCalendario}
                className="w-full mt-6 py-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest border border-white/5 rounded-lg transition-all"
            >
                Ver calendario completo
            </button>
        </div>
    );
}
