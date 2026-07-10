// AulaVirtualProfesorPage.tsx
// Vista: Aula Virtual (Profesor) — clase en vivo desde el rol docente.
// Layout inmersivo: TopNav + panel de trayectoria + pizarrón + panel de pulso
// + preguntas pendientes + barra de controles.

import { useEffect, useMemo, useState } from "react";
import TopNavAulaDocente from "./components/aula-virtual/TopNavAulaDocente";
import { useNavegacion } from "../navegacion";
import PanelTrayectoriaDocente from "./components/aula-virtual/PanelTrayectoriaDocente";
import PizarronDocente, {
    type AvatarEstudiante,
} from "./components/aula-virtual/PizarronDocente";
import PulsoAula, { type PulsoAulaData } from "./components/aula-virtual/PulsoAula";
import PreguntasPendientes, {
    type PreguntaAlumno,
} from "./components/aula-virtual/PreguntasPendientes";
import BarraControlesDocente from "./components/aula-virtual/BarraControlesDocente";
import type { EtapaClase } from "./components/aula-virtual/PanelTrayectoria";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const DOCENTE = {
    nombre: "Prof. García",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia",
};

const ETAPAS_INICIALES: EtapaClase[] = [
    { id: "intro", label: "Introducción", estado: "completado" },
    { id: "vertice", label: "Vértice y Raíces", estado: "completado" },
    { id: "cuadratica", label: "Ec. Cuadrática", estado: "en-progreso" },
    { id: "practica", label: "Práctica Guiada", estado: "pendiente" },
    { id: "evaluacion", label: "Evaluación Final", estado: "pendiente" },
];

const AVATARES: AvatarEstudiante[] = [
    { iniciales: "AM", nombre: "Ana M.", color: "bg-blue-500/80", posicion: "top-[20%] left-[15%]" },
    { iniciales: "LC", nombre: "Luis C.", color: "bg-orange-500/80", posicion: "bottom-[30%] right-[20%]" },
    { iniciales: "JP", nombre: "Juan P.", color: "bg-green-500/80", posicion: "top-[60%] left-[40%]" },
];

const PULSO_INICIAL: PulsoAulaData = {
    entiendo: 18,
    masOMenos: 5,
    perdido: 2,
};

const PREGUNTAS_INICIALES: PreguntaAlumno[] = [
    { id: "q1", autor: "Sofía V.", minutos: 2, texto: "¿Qué pasa si el discriminante es negativo?" },
    { id: "q2", autor: "Mateo R.", minutos: 5, texto: "¿La fórmula sirve para cualquier ecuación?" },
    { id: "q3", autor: "Valentina G.", minutos: 7, texto: "¿Cómo saco el vértice a partir de las raíces?" },
];

const TOTAL_CONECTADOS = 25;

export default function AulaVirtualProfesorPage() {
    const { navegar } = useNavegacion();
    const [etapas, setEtapas] = useState<EtapaClase[]>(ETAPAS_INICIALES);
    const [pulso] = useState<PulsoAulaData>(PULSO_INICIAL);
    const [preguntas, setPreguntas] = useState<PreguntaAlumno[]>(PREGUNTAS_INICIALES);
    const [alertaVisible, setAlertaVisible] = useState<boolean>(true);

    // Controles de la clase
    const [micActivo, setMicActivo] = useState<boolean>(true);
    const [camaraActiva, setCamaraActiva] = useState<boolean>(true);
    const [presentando, setPresentando] = useState<boolean>(false);
    const [mensajesSinLeer, setMensajesSinLeer] = useState<number>(1);
    const [claseFinalizada, setClaseFinalizada] = useState<boolean>(false);
    const [aviso, setAviso] = useState<string | null>(null);

    // El aviso flotante se oculta solo
    useEffect(() => {
        if (!aviso) return;
        const t = setTimeout(() => setAviso(null), 2500);
        return () => clearTimeout(t);
    }, [aviso]);

    // Objetivos alcanzados = etapas completadas
    const objetivosAlcanzados = useMemo(
        () => etapas.filter((e) => e.estado === "completado").length,
        [etapas],
    );

    // Al elegir una etapa, las previas quedan completadas, esa en progreso y las siguientes pendientes
    const seleccionarEtapa = (id: string) => {
        const indice = etapas.findIndex((e) => e.id === id);
        if (indice === -1) return;
        setEtapas((prev) =>
            prev.map((e, i) => ({
                ...e,
                estado: i < indice ? "completado" : i === indice ? "en-progreso" : "pendiente",
            })),
        );
    };

    const resolverPregunta = (id: string) => {
        setPreguntas((prev) => prev.filter((p) => p.id !== id));
    };

    const abrirChat = () => {
        setMensajesSinLeer(0);
        setAviso("Chat de la clase abierto");
    };

    const finalizarClase = () => {
        const confirmar = window.confirm(
            "¿Seguro que querés finalizar la clase para todos los estudiantes?",
        );
        if (confirmar) setClaseFinalizada(true);
    };

    if (claseFinalizada) {
        return (
            <div className="h-screen bg-background text-on-surface font-body flex flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-primary text-6xl">waving_hand</span>
                <h2 className="text-2xl font-headline font-bold">La clase finalizó</h2>
                <p className="text-on-surface-variant">
                    Se cerró la sesión en vivo de Matemática 4°B.
                </p>
                <button
                    onClick={() => setClaseFinalizada(false)}
                    className="mt-2 px-6 py-2 bg-primary-container text-white rounded-full font-bold hover:shadow-[0_0_15px_rgba(197,72,245,0.4)] transition-all active:scale-95"
                >
                    Reanudar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-surface font-body overflow-hidden h-screen flex flex-col">
            <TopNavAulaDocente
                materiaCurso="Matemática 4°B"
                nombreDocente={DOCENTE.nombre}
                avatarUrl={DOCENTE.avatarUrl}
                enLinea
                onNotificaciones={() => console.log("Notificaciones")}
                onAjustes={() => console.log("Ajustes")}
                onSalir={() => navegar("/portafolio-docente")}
            />

            <main className="flex-1 mt-16 mb-20 flex overflow-hidden relative">
                <PanelTrayectoriaDocente
                    objetivosAlcanzados={objetivosAlcanzados}
                    objetivosTotales={etapas.length}
                    etapas={etapas}
                    totalConectados={TOTAL_CONECTADOS}
                    onSeleccionarEtapa={seleccionarEtapa}
                />

                <PizarronDocente avatares={AVATARES} />

                {/* Panel derecho: pulso + alerta + preguntas */}
                <aside className="w-[260px] flex-shrink-0 bg-surface-container-low p-4 flex flex-col gap-4 overflow-y-auto border-l border-white/5">
                    <PulsoAula data={pulso} />

                    {alertaVisible && (
                        <div className="bg-error-container/20 border border-error/20 p-3 rounded-xl flex items-start gap-3">
                            <span
                                className="material-symbols-outlined text-error"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                warning
                            </span>
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-error">¡Alerta de ritmo!</h4>
                                <p className="text-[10px] text-error/80 mt-1">
                                    El 20% de la clase está demorando más en el ejercicio 3.
                                </p>
                            </div>
                            <button
                                onClick={() => setAlertaVisible(false)}
                                className="text-error/60 hover:text-error transition-colors"
                                aria-label="Descartar alerta"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}

                    <PreguntasPendientes preguntas={preguntas} onResolver={resolverPregunta} />
                </aside>

                {/* Aviso flotante */}
                {aviso && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#2D1B4E] border border-primary-container/40 rounded-full shadow-lg">
                        <span className="material-symbols-outlined text-primary-container text-base">
                            check_circle
                        </span>
                        <span className="text-sm text-white/90">{aviso}</span>
                    </div>
                )}
            </main>

            <BarraControlesDocente
                micActivo={micActivo}
                camaraActiva={camaraActiva}
                presentando={presentando}
                mensajesSinLeer={mensajesSinLeer}
                onToggleMic={() => setMicActivo((v) => !v)}
                onToggleCamara={() => setCamaraActiva((v) => !v)}
                onTogglePresentar={() => setPresentando((v) => !v)}
                onAbrirChat={abrirChat}
                onFinalizarClase={finalizarClase}
            />
        </div>
    );
}
