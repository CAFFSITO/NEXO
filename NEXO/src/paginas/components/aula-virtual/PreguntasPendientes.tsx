// PreguntasPendientes.tsx
// Panel derecho del Aula Virtual (Profesor): preguntas que los estudiantes
// enviaron durante la clase y que el docente todavía no respondió.

export interface PreguntaAlumno {
    id: string;
    autor: string;
    minutos: number;
    texto: string;
}

interface PreguntasPendientesProps {
    preguntas: PreguntaAlumno[];
    onResolver: (id: string) => void;
}

export default function PreguntasPendientes({
    preguntas,
    onResolver,
}: PreguntasPendientesProps) {
    return (
        <div className="flex-1 space-y-3 mt-2">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                    Preguntas pendientes
                </h3>
                <span className="bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {preguntas.length}
                </span>
            </div>

            {preguntas.length === 0 ? (
                <div className="p-4 bg-surface rounded-lg border border-white/5 text-center">
                    <span className="material-symbols-outlined text-green-400 text-2xl">
                        task_alt
                    </span>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                        No hay preguntas sin responder
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {preguntas.map((p) => (
                        <div key={p.id} className="p-2 bg-surface rounded-lg border border-white/5 group">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-secondary">{p.autor}</span>
                                <span className="text-[9px] text-slate-500">{p.minutos} min</span>
                            </div>
                            <p className="text-xs text-on-surface-variant">{p.texto}</p>
                            <button
                                onClick={() => onResolver(p.id)}
                                className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary/20 rounded-md py-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xs">done</span>
                                Marcar resuelta
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
