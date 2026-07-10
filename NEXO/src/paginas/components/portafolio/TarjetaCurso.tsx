// Tarjeta de curso del Portafolio de Aprendizaje (Estudiante)
// Muestra materia, docente y progreso. El color se resuelve por tema para
// que Tailwind pueda detectar las clases (no usar interpolación dinámica).

export type TemaCurso = "fuchsia" | "indigo" | "emerald";

interface TemaClases {
    iconoBox: string;
    badge: string;
    progresoTexto: string;
    barra: string;
    botonHover: string;
}

const TEMAS: Record<TemaCurso, TemaClases> = {
    fuchsia: {
        iconoBox: "bg-fuchsia-500/20 text-fuchsia-500",
        badge: "bg-fuchsia-500/10 text-fuchsia-400",
        progresoTexto: "text-fuchsia-400",
        barra: "bg-gradient-to-r from-fuchsia-600 to-fuchsia-400",
        botonHover: "hover:bg-fuchsia-600",
    },
    indigo: {
        iconoBox: "bg-indigo-500/20 text-indigo-400",
        badge: "bg-indigo-500/10 text-indigo-400",
        progresoTexto: "text-indigo-400",
        barra: "bg-gradient-to-r from-indigo-600 to-indigo-400",
        botonHover: "hover:bg-indigo-600",
    },
    emerald: {
        iconoBox: "bg-emerald-500/20 text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400",
        progresoTexto: "text-emerald-400",
        barra: "bg-gradient-to-r from-emerald-600 to-emerald-400",
        botonHover: "hover:bg-emerald-600",
    },
};

export interface Curso {
    id: string;
    titulo: string;
    profesor: string;
    categoria: string;
    icono: string;
    progreso: number; // 0 - 100
    tema: TemaCurso;
    labelBoton: string;
    iconoBoton: string;
}

interface TarjetaCursoProps {
    curso: Curso;
    vista: "grid" | "lista";
    onAccion: (id: string) => void;
}

export default function TarjetaCurso({ curso, vista, onAccion }: TarjetaCursoProps) {
    const tema = TEMAS[curso.tema];
    const progreso = Math.min(100, Math.max(0, curso.progreso));

    if (vista === "lista") {
        return (
            <div className="group relative bg-surface-container rounded-lg p-4 flex items-center gap-4 hover:shadow-2xl hover:shadow-fuchsia-500/5 border border-white/5 transition-all overflow-hidden">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tema.iconoBox}`}>
                    <span className="material-symbols-outlined">{curso.icono}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{curso.titulo}</h3>
                    <p className="text-xs text-slate-400 truncate">{curso.profesor}</p>
                </div>
                <div className="hidden sm:flex flex-col gap-1 w-40">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-400">Progreso</span>
                        <span className={tema.progresoTexto}>{progreso}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${tema.barra}`} style={{ width: `${progreso}%` }} />
                    </div>
                </div>
                <button
                    onClick={() => onAccion(curso.id)}
                    className={`bg-surface-container-highest text-white px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 flex-shrink-0 ${tema.botonHover}`}
                >
                    <span>{curso.labelBoton}</span>
                    <span className="material-symbols-outlined text-sm">{curso.iconoBoton}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="group relative bg-surface-container rounded-lg p-6 flex flex-col gap-6 hover:shadow-2xl hover:shadow-fuchsia-500/5 border border-white/5 transition-all overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-fuchsia-500/20 transition-all" />
            <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tema.iconoBox}`}>
                    <span className="material-symbols-outlined">{curso.icono}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${tema.badge}`}>
                    {curso.categoria}
                </span>
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{curso.titulo}</h3>
                <p className="text-sm text-slate-400">{curso.profesor}</p>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Progreso del curso</span>
                    <span className={tema.progresoTexto}>{progreso}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tema.barra}`} style={{ width: `${progreso}%` }} />
                </div>
            </div>
            <button
                onClick={() => onAccion(curso.id)}
                className={`mt-4 w-full bg-surface-container-highest text-white py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2 ${tema.botonHover}`}
            >
                <span>{curso.labelBoton}</span>
                <span className="material-symbols-outlined text-sm">{curso.iconoBoton}</span>
            </button>
        </div>
    );
}
