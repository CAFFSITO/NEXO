// Pizarron.tsx
// Área central del Aula Virtual: pizarrón con la fórmula en vivo,
// cursores de estudiantes flotantes y el indicador "EN VIVO".

export interface CursorEstudiante {
    nombre: string;
    color: string; // clase Tailwind de fondo, ej: "bg-blue-500"
    posicion: string; // clases de posición absolutas, ej: "top-1/4 left-1/4"
}

interface PizarronProps {
    cursores: CursorEstudiante[];
    enVivo: boolean;
}

export default function Pizarron({ cursores, enVivo }: PizarronProps) {
    return (
        <div className="flex-1 chalkboard-texture m-4 rounded-3xl relative flex items-center justify-center shadow-2xl ring-8 ring-[#2D1B4E]/50">
            {/* Fórmulas escritas a mano */}
            <div className="text-white/80 font-handwritten text-center space-y-12 pointer-events-none select-none">
                <div className="text-5xl md:text-7xl opacity-90 drop-shadow-[0_2px_2px_rgba(255,255,255,0.2)]">
                    f(x) = ax² + bx + c
                </div>
                <div className="text-4xl md:text-5xl opacity-80 flex flex-col items-center">
                    <span>x = </span>
                    <div className="flex flex-col items-center mt-2">
                        <span className="border-b-2 border-white/60 pb-1">-b ± √b² - 4ac</span>
                        <span className="pt-1">2a</span>
                    </div>
                </div>
            </div>

            {/* Cursores de estudiantes conectados */}
            {cursores.map((cursor) => (
                <div
                    key={cursor.nombre}
                    className={`absolute ${cursor.posicion} flex flex-col items-center gap-1 opacity-80`}
                >
                    <div
                        className={`px-2 py-0.5 ${cursor.color} text-white text-[10px] font-bold rounded-md`}
                    >
                        {cursor.nombre}
                    </div>
                    <div className={`w-3 h-3 ${cursor.color} rounded-full border-2 border-white/20`} />
                </div>
            ))}

            {/* Badge EN VIVO */}
            {enVivo && (
                <div className="absolute top-6 right-6 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-white/90">EN VIVO</span>
                </div>
            )}
        </div>
    );
}
