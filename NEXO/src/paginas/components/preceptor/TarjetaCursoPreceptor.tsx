// src/paginas/components/preceptor/TarjetaCursoPreceptor.tsx
// Tarjeta de un curso a cargo del preceptor.
// Muestra estado de la comunidad (activa / bloqueada), pendientes de moderación
// y dispara la acción de moderar.

export type EstadoComunidad = "activa" | "bloqueada";

export interface Curso {
    id: string;
    nombre: string;               // "4° B"
    cantidadEstudiantes: number;
    estadoComunidad: EstadoComunidad;
    ultimoPosteo?: string;        // "hace 12 min" — solo si activa
    horaDesbloqueo?: string;      // "10:45" — solo si bloqueada
    posteosPendientes?: number;   // > 0 resalta la tarjeta
}

interface TarjetaCursoPreceptorProps {
    curso: Curso;
    onModerar: (cursoId: string) => void;
}

export default function TarjetaCursoPreceptor({ curso, onModerar }: TarjetaCursoPreceptorProps) {
    const tienePendientes = (curso.posteosPendientes ?? 0) > 0;
    const activa = curso.estadoComunidad === "activa";

    return (
        <div
            className={`bg-[#2D1B4E] p-6 rounded-lg border transition-all relative overflow-hidden group ${
                tienePendientes
                    ? "border-white/5"
                    : "border-white/5 hover:border-[#C548F5]/30"
            }`}
        >
            {/* Badge de pendientes (esquina) */}
            {tienePendientes && (
                <div className="absolute top-0 right-0 w-12 h-12 bg-red-500 flex items-center justify-center rounded-bl-3xl">
                    <span className="text-white font-bold">{curso.posteosPendientes}</span>
                </div>
            )}

            {/* Encabezado */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white font-headline">{curso.nombre}</h3>
                    <p className="text-slate-400 text-sm">{curso.cantidadEstudiantes} estudiantes</p>
                </div>

                {activa ? (
                    <div
                        className={`flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full ${
                            tienePendientes ? "mr-12" : ""
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                            Comunidad activa
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full text-right">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                            Comunidad bloqueada
                        </span>
                    </div>
                )}
            </div>

            {/* Línea de detalle */}
            {tienePendientes ? (
                <div className="flex items-center gap-2 text-[#C548F5] mb-8">
                    <span className="material-symbols-outlined text-sm">pending_actions</span>
                    <p className="text-xs font-semibold">
                        {curso.posteosPendientes} posteos pendientes de revisión
                    </p>
                </div>
            ) : activa ? (
                <div className="flex items-center gap-2 text-slate-400 mb-8">
                    <span className="material-symbols-outlined text-sm">history</span>
                    <p className="text-xs">Último posteo {curso.ultimoPosteo}</p>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-slate-400 mb-8">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <p className="text-xs">Se desbloquea a las {curso.horaDesbloqueo}</p>
                </div>
            )}

            {/* Acción */}
            <button
                onClick={() => onModerar(curso.id)}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    tienePendientes
                        ? "bg-[#C548F5] text-white hover:bg-opacity-90"
                        : "bg-white/5 hover:bg-[#C548F5] text-white"
                }`}
            >
                Moderar curso
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
        </div>
    );
}
