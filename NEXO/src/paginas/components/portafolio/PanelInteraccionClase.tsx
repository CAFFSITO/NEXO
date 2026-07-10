// Panel de interacción del estudiante durante la clase en vivo.
// Feedback de comprensión ("mood") + envío de preguntas al docente.

import { useState } from "react";

export type Comprension = "bien" | "regular" | "perdido";

const MOODS: {
    valor: Comprension;
    icono: string;
    label: string;
    activo: string;
    inactivo: string;
}[] = [
    {
        valor: "bien",
        icono: "mood",
        label: "Lo entiendo",
        activo: "bg-emerald-500/30 border-emerald-500/50 text-emerald-300",
        inactivo: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
    },
    {
        valor: "regular",
        icono: "sentiment_neutral",
        label: "Más o menos",
        activo: "bg-amber-500/30 border-amber-500/50 text-amber-300",
        inactivo: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
    },
    {
        valor: "perdido",
        icono: "sentiment_very_dissatisfied",
        label: "Me perdí",
        activo: "bg-red-500/30 border-red-500/50 text-red-300",
        inactivo: "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20",
    },
];

interface PanelInteraccionClaseProps {
    onComprension?: (valor: Comprension) => void;
    onPregunta?: (texto: string) => void;
}

export default function PanelInteraccionClase({ onComprension, onPregunta }: PanelInteraccionClaseProps) {
    const [comprension, setComprension] = useState<Comprension | null>(null);
    const [pregunta, setPregunta] = useState("");
    const [enviada, setEnviada] = useState(false);

    const seleccionarMood = (valor: Comprension) => {
        setComprension(valor);
        onComprension?.(valor);
    };

    const enviarPregunta = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const texto = pregunta.trim();
        if (!texto) return;
        onPregunta?.(texto);
        setPregunta("");
        setEnviada(true);
        window.setTimeout(() => setEnviada(false), 3000);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feedback de comprensión */}
            <div className="bg-surface-container rounded-lg p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    ¿Cómo vas con la explicación?
                </h4>
                <div className="flex gap-3">
                    {MOODS.map((mood) => {
                        const activo = comprension === mood.valor;
                        return (
                            <button
                                key={mood.valor}
                                onClick={() => seleccionarMood(mood.valor)}
                                aria-pressed={activo}
                                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                    activo ? mood.activo : mood.inactivo
                                }`}
                            >
                                <span className="material-symbols-outlined">{mood.icono}</span>
                                <span className="text-[10px] font-bold">{mood.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preguntas al docente */}
            <div className="bg-surface-container rounded-lg p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preguntas al docente</h4>
                <form onSubmit={enviarPregunta} className="relative">
                    <input
                        value={pregunta}
                        onChange={(e) => setPregunta(e.target.value)}
                        className="w-full bg-slate-900 border-none rounded-full py-4 px-6 text-sm text-on-surface focus:ring-2 focus:ring-fuchsia-500"
                        placeholder="Escribe tu duda aquí..."
                        type="text"
                    />
                    <button
                        type="submit"
                        disabled={!pregunta.trim()}
                        aria-label="Enviar pregunta"
                        className="absolute right-2 top-2 bottom-2 w-10 bg-fuchsia-600 rounded-full flex items-center justify-center text-white hover:bg-fuchsia-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                </form>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <p className="text-[10px] text-slate-500">
                        {enviada ? "¡Pregunta enviada al docente!" : "El docente responderá en el bloque de Q&A"}
                    </p>
                </div>
            </div>
        </div>
    );
}
