// Reproductor de la clase en vivo del Aula Virtual (Estudiante).
// Maneja play/pausa localmente (mockup) y muestra overlays de info.

import { useState } from "react";

interface ReproductorClaseVivoProps {
    titulo: string;
    profesor: string;
    espectadores: number;
    progreso: number; // 0 - 100
}

export default function ReproductorClaseVivo({
    titulo,
    profesor,
    espectadores,
    progreso,
}: ReproductorClaseVivoProps) {
    const [reproduciendo, setReproduciendo] = useState(false);

    return (
        <div className="aspect-video bg-slate-950 rounded-2xl relative overflow-hidden group border border-white/5 ring-4 ring-fuchsia-500/10">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <button
                    onClick={() => setReproduciendo((v) => !v)}
                    aria-label={reproduciendo ? "Pausar clase" : "Reproducir clase"}
                    className="absolute w-20 h-20 bg-fuchsia-600/90 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                >
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {reproduciendo ? "pause" : "play_arrow"}
                    </span>
                </button>
            </div>

            {/* Overlay superior: info de la unidad + espectadores */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                    <h4 className="text-white font-bold text-sm">{titulo}</h4>
                    <p className="text-xs text-slate-300">{profesor}</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    {espectadores} estudiantes
                </div>
            </div>

            {/* Overlay inferior: barra de progreso + controles */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4 bg-gradient-to-t from-black/90 to-transparent">
                <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-500" style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }} />
                </div>
                <div className="flex gap-4 text-white/80">
                    <span className="material-symbols-outlined cursor-pointer hover:text-white">volume_up</span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-white">settings</span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-white">fullscreen</span>
                </div>
            </div>
        </div>
    );
}
