// Widget de estadísticas del mes + recurso más popular.

export interface EstadisticasMes {
    agregados: number;
    enviadosComunidad: number;
    aprobados: number;
    rechazados: number;
    pendientes: number;
    masPopular: {
        titulo: string;
        descargasHoy: number;
    };
}

interface EstadisticasWidgetProps {
    datos: EstadisticasMes;
}

// Filas de métricas: label + valor + color de texto.
function Fila({ label, valor, color }: { label: string; valor: number; color: string }) {
    return (
        <div className={`flex justify-between items-center text-sm ${color}`}>
            <span className={color === "" ? "text-on-surface-variant" : "opacity-80"}>{label}</span>
            <span className={color === "" ? "text-white font-bold" : "font-bold"}>{valor}</span>
        </div>
    );
}

export default function EstadisticasWidget({ datos }: EstadisticasWidgetProps) {
    return (
        <section className="bg-surface-container rounded-lg p-6 shadow-xl border border-outline-variant/10">
            <h3 className="font-headline font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Estadísticas del Mes
            </h3>

            <div className="space-y-3">
                <Fila label="Agregados" valor={datos.agregados} color="" />
                <Fila label="Enviados comunidad" valor={datos.enviadosComunidad} color="" />
                <Fila label="Aprobados" valor={datos.aprobados} color="text-[#14B8A6]" />
                <Fila label="Rechazados" valor={datos.rechazados} color="text-error" />
                <Fila label="Pendientes" valor={datos.pendientes} color="text-primary" />
            </div>

            <div className="mt-6 pt-6 border-t border-outline-variant/10">
                <p className="text-xs text-on-surface-variant uppercase font-black tracking-widest mb-2">
                    Más Popular
                </p>
                <div className="bg-surface-container-high p-3 rounded-xl border border-primary/20">
                    <p className="text-sm font-bold text-white">{datos.masPopular.titulo}</p>
                    <p className="text-[10px] text-primary mt-1">
                        {datos.masPopular.descargasHoy} descargas hoy
                    </p>
                </div>
            </div>
        </section>
    );
}
