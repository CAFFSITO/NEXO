// Tarjeta horizontal de recurso para el panel del Bibliotecario.
// Muestra ícono por tipo, materia, autor/fecha, menú de acciones y voto.

export type TipoRecurso = "PDF" | "Video" | "Enlace" | "Libro";

export interface Recurso {
    id: string;
    titulo: string;
    materia: string;
    tipo: TipoRecurso;
    autor: string;
    fecha: string;
    votos: number;
    votado: boolean;
    aprobado?: boolean;
}

interface TarjetaRecursoProps {
    recurso: Recurso;
    onVotar: (id: string) => void;
    onAbrirMenu: (id: string) => void;
}

// Ícono + color de contenedor según el tipo de recurso.
const ESTILO_POR_TIPO: Record<TipoRecurso, { icono: string; clases: string }> = {
    PDF: { icono: "picture_as_pdf", clases: "bg-error/10 text-error" },
    Video: { icono: "smart_display", clases: "bg-[#14B8A6]/10 text-[#14B8A6]" },
    Enlace: { icono: "link", clases: "bg-primary/10 text-primary" },
    Libro: { icono: "book", clases: "bg-tertiary-container/10 text-tertiary-container" },
};

export default function TarjetaRecurso({ recurso, onVotar, onAbrirMenu }: TarjetaRecursoProps) {
    const estilo = ESTILO_POR_TIPO[recurso.tipo];

    return (
        <div className="bg-surface p-4 rounded-lg flex items-center gap-4 hover:ring-1 hover:ring-primary/40 transition-all border border-outline-variant/10">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${estilo.clases}`}>
                <span className="material-symbols-outlined">{estilo.icono}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold truncate">{recurso.titulo}</h3>
                    {recurso.aprobado && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#14B8A6]/20 text-[#14B8A6] rounded-full font-bold shrink-0">
                            Aprobado
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">
                        {recurso.materia}
                    </span>
                    <span className="text-xs text-on-surface-variant truncate">
                        {recurso.autor} · {recurso.fecha}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                    onClick={() => onAbrirMenu(recurso.id)}
                    className="text-on-surface-variant hover:text-white transition-colors"
                    aria-label="Más acciones"
                >
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
                <button
                    onClick={() => onVotar(recurso.id)}
                    className={`flex items-center gap-1 text-sm font-bold transition-colors ${
                        recurso.votado ? "text-primary" : "text-on-surface-variant hover:text-primary"
                    }`}
                    aria-pressed={recurso.votado}
                >
                    <span
                        className="material-symbols-outlined text-sm"
                        style={recurso.votado ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                        thumb_up
                    </span>
                    {recurso.votos}
                </button>
            </div>
        </div>
    );
}
