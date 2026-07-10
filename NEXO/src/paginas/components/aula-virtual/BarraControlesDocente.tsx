// BarraControlesDocente.tsx
// Barra inferior del Aula Virtual (Profesor): controles de mic, cámara,
// pantalla compartida, chat y botón para finalizar la clase.

interface BarraControlesDocenteProps {
    micActivo: boolean;
    camaraActiva: boolean;
    presentando: boolean;
    mensajesSinLeer: number;
    onToggleMic: () => void;
    onToggleCamara: () => void;
    onTogglePresentar: () => void;
    onAbrirChat: () => void;
    onFinalizarClase: () => void;
}

interface ControlToggle {
    activo: boolean;
    iconoOn: string;
    iconoOff: string;
    labelOn: string;
    labelOff: string;
    onClick: () => void;
}

export default function BarraControlesDocente({
    micActivo,
    camaraActiva,
    presentando,
    mensajesSinLeer,
    onToggleMic,
    onToggleCamara,
    onTogglePresentar,
    onAbrirChat,
    onFinalizarClase,
}: BarraControlesDocenteProps) {
    const controles: ControlToggle[] = [
        {
            activo: micActivo,
            iconoOn: "mic",
            iconoOff: "mic_off",
            labelOn: "Mic",
            labelOff: "Mic",
            onClick: onToggleMic,
        },
        {
            activo: camaraActiva,
            iconoOn: "videocam",
            iconoOff: "videocam_off",
            labelOn: "Cámara",
            labelOff: "Cámara",
            onClick: onToggleCamara,
        },
        {
            activo: presentando,
            iconoOn: "present_to_all",
            iconoOff: "cancel_presentation",
            labelOn: "Presentando",
            labelOff: "Presentar",
            onClick: onTogglePresentar,
        },
    ];

    return (
        <nav className="fixed bottom-0 w-full z-50 flex justify-center gap-8 items-center px-8 py-4 bg-[#2D1B4E]/90 backdrop-blur-md rounded-t-3xl border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex gap-4">
                {controles.map((c) => (
                    <button
                        key={c.labelOff}
                        onClick={c.onClick}
                        aria-pressed={c.activo}
                        className={`flex flex-col items-center justify-center p-3 rounded-full transition-all active:scale-90 group ${
                            c.activo
                                ? "text-slate-300 hover:bg-white/10"
                                : "bg-error/20 text-error hover:bg-error/30"
                        }`}
                    >
                        <span className="material-symbols-outlined duration-150">
                            {c.activo ? c.iconoOn : c.iconoOff}
                        </span>
                        <span className="text-[10px] font-bold uppercase mt-1">
                            {c.activo ? c.labelOn : c.labelOff}
                        </span>
                    </button>
                ))}

                {/* Chat */}
                <button
                    onClick={onAbrirChat}
                    className="flex flex-col items-center justify-center bg-primary-container text-white rounded-full p-3 shadow-lg shadow-primary/30 relative transition-all active:scale-90"
                >
                    <span className="material-symbols-outlined">chat</span>
                    <span className="text-[10px] font-bold uppercase mt-1">Chat</span>
                    {mensajesSinLeer > 0 && (
                        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-error rounded-full border-2 border-[#2D1B4E]">
                            {mensajesSinLeer}
                        </span>
                    )}
                </button>
            </div>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
                onClick={onFinalizarClase}
                className="flex items-center gap-3 bg-error/10 border border-error/30 hover:bg-error/20 text-error px-6 py-3 rounded-full transition-all group"
            >
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
                    call_end
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Finalizar clase</span>
            </button>
        </nav>
    );
}
