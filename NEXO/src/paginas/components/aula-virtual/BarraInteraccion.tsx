// BarraInteraccion.tsx
// Barra inferior del Aula Virtual: botones de comprensión (feedback en vivo)
// y campo para enviar preguntas al docente.

import { useState } from "react";

export type Reaccion = "entiendo" | "mas-o-menos" | "perdido";

interface BotonReaccion {
    tipo: Reaccion;
    icono: string;
    label: string;
    base: string; // color en estado normal
    activo: string; // color cuando está seleccionada
}

const BOTONES: BotonReaccion[] = [
    {
        tipo: "entiendo",
        icono: "sentiment_satisfied",
        label: "Lo entiendo",
        base: "bg-green-500/10 hover:bg-green-500/20 text-green-400",
        activo: "bg-green-500/30 text-green-300 ring-2 ring-green-400",
    },
    {
        tipo: "mas-o-menos",
        icono: "sentiment_neutral",
        label: "Más o menos",
        base: "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400",
        activo: "bg-yellow-500/30 text-yellow-300 ring-2 ring-yellow-400",
    },
    {
        tipo: "perdido",
        icono: "sentiment_dissatisfied",
        label: "Me perdí",
        base: "bg-red-500/10 hover:bg-red-500/20 text-red-400",
        activo: "bg-red-500/30 text-red-300 ring-2 ring-red-400",
    },
];

interface BarraInteraccionProps {
    reaccionActiva: Reaccion | null;
    onReaccionar: (reaccion: Reaccion) => void;
    onEnviarPregunta: (texto: string) => void;
}

export default function BarraInteraccion({
    reaccionActiva,
    onReaccionar,
    onEnviarPregunta,
}: BarraInteraccionProps) {
    const [pregunta, setPregunta] = useState<string>("");

    const enviar = () => {
        const texto = pregunta.trim();
        if (!texto) return;
        onEnviarPregunta(texto);
        setPregunta("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            enviar();
        }
    };

    return (
        <div className="px-4 pb-4">
            <div className="bg-[#2D1B4E] rounded-3xl p-4 shadow-xl border border-white/5">
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                    {/* Botones de comprensión */}
                    <div className="flex gap-2 shrink-0">
                        {BOTONES.map((boton) => {
                            const activo = reaccionActiva === boton.tipo;
                            return (
                                <button
                                    key={boton.tipo}
                                    onClick={() => onReaccionar(boton.tipo)}
                                    aria-pressed={activo}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl transition-all active:scale-95 group ${
                                        activo ? boton.activo : boton.base
                                    }`}
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
                                        {boton.icono}
                                    </span>
                                    <span className="font-headline font-bold text-sm">{boton.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Campo de pregunta */}
                    <div className="flex-1 relative">
                        <input
                            value={pregunta}
                            onChange={(e) => setPregunta(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full h-full bg-[#1C1030] border-none rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:ring-2 focus:ring-[#C548F5] transition-all"
                            placeholder="Hacé una pregunta al docente..."
                            type="text"
                        />
                        <button
                            onClick={enviar}
                            disabled={!pregunta.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#C548F5] text-white rounded-xl flex items-center justify-center hover:shadow-[0_0_15px_rgba(197,72,245,0.4)] transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
