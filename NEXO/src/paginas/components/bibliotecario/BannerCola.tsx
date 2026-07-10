// Banner de aviso: recursos esperando aprobación en la cola de revisión.

interface BannerColaProps {
    cantidad: number;
    onIrACola: () => void;
}

export default function BannerCola({ cantidad, onIrACola }: BannerColaProps) {
    if (cantidad === 0) return null;

    return (
        <div
            onClick={onIrACola}
            className="mb-8 bg-surface-container-low border-l-4 border-[#C548F5] p-4 rounded-r-xl flex items-center justify-between group cursor-pointer hover:bg-surface-container-high transition-all"
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">📥</span>
                <p className="text-on-surface font-medium">
                    Tenés <span className="font-bold">{cantidad} recurso{cantidad !== 1 ? "s" : ""}</span> en cola de
                    revisión esperando aprobación
                </p>
            </div>
            <button className="text-[#C548F5] font-bold text-sm underline flex items-center gap-1">
                Ir a cola de revisión
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
        </div>
    );
}
