// PizarronDocente.tsx
// Área central del Aula Virtual (Profesor): pizarrón con la fórmula de la clase,
// barra flotante de herramientas de dibujo y avatares de estudiantes activos.

import { useState } from "react";

export interface AvatarEstudiante {
    iniciales: string;
    nombre: string;
    color: string; // clase Tailwind de fondo, ej: "bg-blue-500/80"
    posicion: string; // clases de posición absolutas, ej: "top-[20%] left-[15%]"
}

export type Herramienta = "lapiz" | "rectangulo" | "triangulo" | "texto";

interface HerramientaBoton {
    tipo: Herramienta;
    icono: string;
}

const HERRAMIENTAS: HerramientaBoton[] = [
    { tipo: "lapiz", icono: "edit" },
    { tipo: "rectangulo", icono: "rectangle" },
    { tipo: "triangulo", icono: "change_history" },
    { tipo: "texto", icono: "title" },
];

interface PizarronDocenteProps {
    avatares: AvatarEstudiante[];
}

export default function PizarronDocente({ avatares }: PizarronDocenteProps) {
    const [herramienta, setHerramienta] = useState<Herramienta | null>("lapiz");

    return (
        <section className="flex-1 relative bg-[#160D28] whiteboard-grid flex items-center justify-center p-8">
            {/* Fórmula de la clase */}
            <div className="max-w-3xl w-full space-y-8 pointer-events-none opacity-90">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-headline font-bold text-white">Fórmula de Bhaskara</h2>
                    <div className="bg-surface-container-high/40 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
                        <p className="text-5xl font-mono text-primary tracking-widest">
                            x ={" "}
                            <span className="border-t border-primary pt-2 inline-block">
                                -b ± √b² - 4ac
                                <span className="block border-t border-primary/20 mt-2 text-3xl">2a</span>
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-12">
                    <div className="p-4 bg-surface-container-lowest/50 rounded-lg border border-white/5 italic text-secondary/80">
                        Discriminante: Δ = b² - 4ac
                    </div>
                    <div className="p-4 bg-surface-container-lowest/50 rounded-lg border border-white/5 italic text-secondary/80">
                        Si Δ &gt; 0: Dos raíces reales
                    </div>
                </div>
            </div>

            {/* Barra flotante de herramientas */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-surface-container-highest/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex gap-4 shadow-2xl">
                {HERRAMIENTAS.map((h) => {
                    const activa = herramienta === h.tipo;
                    return (
                        <button
                            key={h.tipo}
                            onClick={() => setHerramienta(h.tipo)}
                            aria-pressed={activa}
                            className={`p-2 rounded-full transition-colors ${
                                activa ? "text-primary bg-white/10" : "text-slate-300 hover:bg-white/10"
                            }`}
                        >
                            <span className="material-symbols-outlined">{h.icono}</span>
                        </button>
                    );
                })}
                <div className="w-px bg-white/10 h-6 self-center" />
                <button
                    onClick={() => setHerramienta(null)}
                    title="Soltar herramienta"
                    className="p-2 text-error hover:bg-error/10 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Avatares de estudiantes activos sobre el pizarrón */}
            <div className="absolute inset-0 pointer-events-none">
                {avatares.map((a) => (
                    <div
                        key={a.nombre}
                        className={`absolute ${a.posicion} flex flex-col items-center`}
                    >
                        <div
                            className={`w-10 h-10 rounded-full ${a.color} border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg`}
                        >
                            {a.iniciales}
                        </div>
                        <span className="text-[10px] mt-1 text-white/50">{a.nombre}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
