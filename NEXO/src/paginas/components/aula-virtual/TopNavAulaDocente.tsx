// TopNavAulaDocente.tsx
// Barra superior del Aula Virtual (vista Profesor).
// Muestra la materia dictada, el estado "En línea", accesos e info del docente.

interface TopNavAulaDocenteProps {
    materiaCurso: string;
    nombreDocente: string;
    avatarUrl?: string;
    enLinea: boolean;
    onNotificaciones?: () => void;
    onAjustes?: () => void;
    onSalir?: () => void;
}

export default function TopNavAulaDocente({
    materiaCurso,
    nombreDocente,
    avatarUrl,
    enLinea,
    onNotificaciones,
    onAjustes,
    onSalir,
}: TopNavAulaDocenteProps) {
    return (
        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#1C1030] shadow-xl border-b border-white/10">
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold tracking-tight text-primary-container font-headline">
                    Nexo | Aula Virtual
                </h1>
                <div className="h-6 w-px bg-white/20" />
                <nav className="flex gap-4">
                    <span className="font-headline text-sm font-medium text-primary-container border-b-2 border-primary-container pb-1">
                        {materiaCurso}
                    </span>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                        enLinea
                            ? "bg-primary-container/10 border-primary-container/20"
                            : "bg-white/5 border-white/10"
                    }`}
                >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            enLinea ? "bg-green-400 animate-pulse" : "bg-slate-500"
                        }`}
                    />
                    <span
                        className={`text-xs font-medium ${
                            enLinea ? "text-primary" : "text-slate-400"
                        }`}
                    >
                        {enLinea ? "En línea" : "Desconectado"}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onNotificaciones}
                        className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors cursor-pointer active:scale-95"
                    >
                        notifications
                    </button>
                    <button
                        onClick={onAjustes}
                        className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors cursor-pointer active:scale-95"
                    >
                        settings
                    </button>
                    <button
                        onClick={onSalir}
                        title="Salir del aula"
                        className="material-symbols-outlined text-slate-400 hover:text-red-400 transition-colors cursor-pointer active:scale-95"
                    >
                        logout
                    </button>
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                        {avatarUrl ? (
                            <img
                                alt={nombreDocente}
                                className="w-8 h-8 rounded-full border border-primary object-cover"
                                src={avatarUrl}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full border border-primary bg-gradient-to-br from-[#d15aff] to-[#C548F5] flex items-center justify-center text-xs font-bold text-white">
                                {nombreDocente.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-xs font-semibold">{nombreDocente}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
