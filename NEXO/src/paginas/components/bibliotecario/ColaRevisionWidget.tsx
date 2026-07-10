// Widget de la cola FIFO de recursos presentados, esperando aprobación.

export interface ItemCola {
    id: string;
    titulo: string;
    autor: string;
    tiempo: string;
}

interface ColaRevisionWidgetProps {
    items: ItemCola[];
    onRevisarItem: (id: string) => void;
    onVerCola: () => void;
}

export default function ColaRevisionWidget({ items, onRevisarItem, onVerCola }: ColaRevisionWidgetProps) {
    return (
        <section className="bg-surface-container rounded-lg p-6 shadow-xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">assignment_late</span>
                    Cola de Revisión
                </h3>
                <span className="bg-primary-container text-on-primary-container text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                    {items.length}
                </span>
            </div>

            {items.length > 0 ? (
                <ul className="space-y-4 mb-6">
                    {items.map((item, i) => (
                        <li
                            key={item.id}
                            onClick={() => onRevisarItem(item.id)}
                            className={`flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                                i < items.length - 1 ? "border-b border-outline-variant/10 pb-3" : ""
                            }`}
                        >
                            <p className="text-sm font-bold text-on-surface truncate">{item.titulo}</p>
                            <div className="flex justify-between text-[11px] text-on-surface-variant">
                                <span>{item.autor}</span>
                                <span>{item.tiempo}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-on-surface-variant mb-6">No hay recursos pendientes de revisión.</p>
            )}

            <button
                onClick={onVerCola}
                className="w-full py-2.5 border border-primary/30 text-primary rounded-full text-sm font-bold hover:bg-primary/10 transition-all"
            >
                Revisar cola completa
            </button>
        </section>
    );
}
