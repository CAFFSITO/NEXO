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
        iconoBox: "bg-primary/20 text-primary",
        badge: "bg-primary/10 text-primary",
        progresoTexto: "text-primary",
        barra: "bg-acento",
        botonHover: "hover:bg-acento",
    },
    indigo: {
        iconoBox: "bg-indigo-500/20 text-indigo-400",
        badge: "bg-indigo-500/10 text-indigo-400",
        progresoTexto: "text-indigo-400",
        barra: "bg-indigo-500",
        botonHover: "hover:bg-indigo-600",
    },
    emerald: {
        iconoBox: "bg-emerald-500/20 text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400",
        progresoTexto: "text-emerald-400",
        barra: "bg-emerald-500",
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
            <div className="nx-tarjeta group relative flex items-center gap-4 p-4">
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
                    className="nx-btn nx-btn-secundario shrink-0"
                >
                    <span>{curso.labelBoton}</span>
                    <span className="material-symbols-outlined text-sm">{curso.iconoBoton}</span>
                </button>
            </div>
        );
    }

    return (
        <article className="nx-tarjeta group relative flex flex-col overflow-hidden transition-colors hover:border-outline-variant">
            <div className={`h-1 w-full ${tema.barra}`} aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tema.iconoBox}`}>
                        <span className="material-symbols-outlined" aria-hidden="true">{curso.icono}</span>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tema.badge}`}>{curso.categoria}</span>
                </div>
                <div>
                    <h3 className="text-[17px] font-semibold leading-snug text-on-surface">{curso.titulo}</h3>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{curso.profesor}</p>
                </div>
                <div className="mt-auto space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">Progreso</span>
                        <span className="font-semibold tabular-nums text-on-surface">{progreso}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso en ${curso.titulo}`}>
                        <div className={`h-full rounded-full ${tema.barra}`} style={{ width: `${progreso}%` }} />
                    </div>
                </div>
            </div>
            <div className="border-t border-linea px-5 py-3">
                <button type="button" onClick={() => onAccion(curso.id)} className="nx-btn nx-btn-secundario w-full">
                    {curso.labelBoton}
                    <span className="material-symbols-outlined" aria-hidden="true">{curso.iconoBoton}</span>
                </button>
            </div>
        </article>
    );
}
