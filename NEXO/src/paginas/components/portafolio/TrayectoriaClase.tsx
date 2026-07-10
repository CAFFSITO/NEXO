// Trayectoria de la clase en vivo: pasos (completado/activo/pendiente) + recursos.

export type EstadoPaso = "completado" | "activo" | "pendiente";

export interface PasoClase {
    id: string;
    titulo: string;
    descripcion: string;
    estado: EstadoPaso;
    objetivo?: string; // Solo el paso activo suele tener objetivo actual
}

export interface RecursoClase {
    id: string;
    label: string;
    icono: string;
    bloqueado?: boolean;
}

interface TrayectoriaClaseProps {
    pasos: PasoClase[];
    recursos: RecursoClase[];
    onRecurso: (id: string) => void;
}

export default function TrayectoriaClase({ pasos, recursos, onRecurso }: TrayectoriaClaseProps) {
    return (
        <div className="bg-surface-container rounded-lg p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6">Trayectoria de Clase</h3>

            <div className="space-y-6 flex-1">
                {pasos.map((paso, i) => {
                    const esUltimo = i === pasos.length - 1;
                    return (
                        <div
                            key={paso.id}
                            className={`relative pl-8 ${esUltimo ? "" : "pb-6"} border-l-2 ${
                                paso.estado === "pendiente" ? "border-transparent" : "border-slate-800"
                            }`}
                        >
                            {paso.estado === "completado" && (
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[10px] text-white">check</span>
                                </div>
                            )}
                            {paso.estado === "activo" && (
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-fuchsia-500 ring-4 ring-fuchsia-500/20 animate-pulse" />
                            )}
                            {paso.estado === "pendiente" && (
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700" />
                            )}

                            <h4
                                className={`text-sm font-bold ${
                                    paso.estado === "activo"
                                        ? "text-fuchsia-400"
                                        : paso.estado === "pendiente"
                                          ? "text-slate-500"
                                          : "text-white"
                                }`}
                            >
                                {paso.titulo}
                            </h4>
                            <p className={`text-xs mt-1 ${paso.estado === "pendiente" ? "text-slate-600" : "text-slate-400"}`}>
                                {paso.descripcion}
                            </p>

                            {paso.objetivo && (
                                <div className="mt-4 bg-fuchsia-500/5 rounded-lg p-3 border border-fuchsia-500/20">
                                    <p className="text-[10px] font-bold text-fuchsia-300 uppercase">Objetivo Actual</p>
                                    <p className="text-xs text-on-surface mt-1 italic">"{paso.objetivo}"</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-10 space-y-4">
                {recursos.map((recurso) => (
                    <button
                        key={recurso.id}
                        onClick={() => !recurso.bloqueado && onRecurso(recurso.id)}
                        disabled={recurso.bloqueado}
                        className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:bg-slate-900 transition-all disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">{recurso.icono}</span>
                            <span className="text-xs font-bold text-on-surface">{recurso.label}</span>
                        </div>
                        {recurso.bloqueado ? (
                            <span className="text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-400 px-2 py-1 rounded">
                                BLOQUEADO
                            </span>
                        ) : (
                            <span className="material-symbols-outlined text-sm text-fuchsia-500">download</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
