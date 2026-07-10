// PulsoAula.tsx
// Panel derecho del Aula Virtual (Profesor): feedback en vivo de la clase.
// Muestra cuántos estudiantes entienden, van "más o menos" o se perdieron.

export interface PulsoAulaData {
    entiendo: number;
    masOMenos: number;
    perdido: number;
}

interface PulsoAulaProps {
    data: PulsoAulaData;
}

interface FilaPulso {
    clave: keyof PulsoAulaData;
    label: string;
    textoClase: string;
    barraClase: string;
}

const FILAS: FilaPulso[] = [
    {
        clave: "entiendo",
        label: "Lo entiendo",
        textoClase: "text-green-400",
        barraClase: "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]",
    },
    {
        clave: "masOMenos",
        label: "Más o menos",
        textoClase: "text-yellow-400",
        barraClase: "bg-yellow-400",
    },
    {
        clave: "perdido",
        label: "Me perdí",
        textoClase: "text-error",
        barraClase: "bg-error",
    },
];

export default function PulsoAula({ data }: PulsoAulaProps) {
    const total = data.entiendo + data.masOMenos + data.perdido;

    return (
        <div className="bg-surface-container p-4 rounded-xl space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase font-label">
                Pulso del aula
            </h3>
            <div className="space-y-3">
                {FILAS.map((fila) => {
                    const valor = data[fila.clave];
                    const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
                    return (
                        <div key={fila.clave} className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className={fila.textoClase}>{fila.label}</span>
                                <span className="font-bold">{valor}</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`${fila.barraClase} h-full rounded-full transition-all duration-500`}
                                    style={{ width: `${porcentaje}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
