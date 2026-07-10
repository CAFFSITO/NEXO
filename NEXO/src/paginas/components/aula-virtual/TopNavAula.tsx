// TopNavAula.tsx
// Barra superior del Aula Virtual (layout inmersivo tipo docente).

interface TopNavAulaProps {
    materiaCurso: string;
    nombreUsuario: string;
    avatarUrl?: string;
    onNotificaciones?: () => void;
    onAjustes?: () => void;
    onSalir?: () => void;
}

export default function TopNavAula({
    materiaCurso,
    nombreUsuario,
    avatarUrl,
    onNotificaciones,
    onAjustes,
    onSalir,
}: TopNavAulaProps) {
    return (
        <nav className="flex justify-between items-center w-full px-6 py-3 h-16 fixed top-0 z-50 bg-[#1C1030] border-b border-[#2D1B4E] shadow-sm">
            <div className="flex items-center gap-6">
                <span className="text-xl font-black text-[#C548F5] font-headline">
                    Nexo | Aula Virtual
                </span>
                <div className="h-6 w-px bg-[#2D1B4E]" />
                <span className="font-headline font-bold text-lg text-white">{materiaCurso}</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={onNotificaciones}
                        className="p-2 text-white/70 hover:bg-[#2D1B4E] transition-colors rounded-full cursor-pointer active:scale-95"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button
                        onClick={onAjustes}
                        className="p-2 text-white/70 hover:bg-[#2D1B4E] transition-colors rounded-full cursor-pointer active:scale-95"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <button
                        onClick={onSalir}
                        title="Salir del aula"
                        className="p-2 text-white/70 hover:text-red-400 hover:bg-[#2D1B4E] transition-colors rounded-full cursor-pointer active:scale-95"
                    >
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-[#2D1B4E]">
                    <span className="text-sm font-medium text-white/90">{nombreUsuario}</span>
                    {avatarUrl ? (
                        <img
                            alt={nombreUsuario}
                            className="w-10 h-10 rounded-full border-2 border-[#C548F5] object-cover"
                            src={avatarUrl}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-[#C548F5] bg-gradient-to-br from-[#d15aff] to-[#C548F5] flex items-center justify-center text-sm font-bold text-white">
                            {nombreUsuario.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
