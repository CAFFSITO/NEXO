// AulaVirtualEstudiantePage.tsx
// Vista: Aula Virtual (Estudiante) — clase en vivo.
// Layout inmersivo: TopNav + panel de trayectoria + pizarrón + barra de interacción.

import { useEffect, useState } from "react";
import TopNavAula from "./components/aula-virtual/TopNavAula";
import PanelTrayectoria, {
    type EtapaClase,
    type EstudianteConectado,
} from "./components/aula-virtual/PanelTrayectoria";
import Pizarron, { type CursorEstudiante } from "./components/aula-virtual/Pizarron";
import BarraInteraccion, { type Reaccion } from "./components/aula-virtual/BarraInteraccion";
import { useNavegacion } from "../navegacion";

// ─── DATOS DE EJEMPLO ───────────────────────────────────

const USUARIO = {
    nombre: "Julieta",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
};

const ETAPAS: EtapaClase[] = [
    { id: "intro", label: "Introducción", estado: "completado" },
    { id: "vertice", label: "Vértice y Raíces", estado: "completado" },
    { id: "cuadratica", label: "Ec. Cuadrática", estado: "en-progreso" },
    { id: "practica", label: "Práctica Guiada", estado: "pendiente" },
    { id: "evaluacion", label: "Evaluación Final", estado: "pendiente" },
];

const CONECTADOS: EstudianteConectado[] = [
    { inicial: "M", color: "bg-blue-500" },
    { inicial: "S", color: "bg-orange-500" },
    { inicial: "+", color: "bg-purple-500" },
];

const CURSORES: CursorEstudiante[] = [
    { nombre: "Mateo", color: "bg-blue-500", posicion: "top-1/4 left-1/4" },
    { nombre: "Santi", color: "bg-orange-500", posicion: "bottom-1/3 right-1/4" },
    { nombre: "Luz", color: "bg-pink-500", posicion: "top-1/2 right-1/3" },
];

interface PreguntaEnviada {
    id: string;
    texto: string;
}

export default function AulaVirtualEstudiantePage() {
    const { navegar } = useNavegacion();
    const [reaccionActiva, setReaccionActiva] = useState<Reaccion | null>(null);
    const [preguntas, setPreguntas] = useState<PreguntaEnviada[]>([]);
    const [aviso, setAviso] = useState<string | null>(null);

    // El aviso se oculta solo después de 2.5s
    useEffect(() => {
        if (!aviso) return;
        const t = setTimeout(() => setAviso(null), 2500);
        return () => clearTimeout(t);
    }, [aviso]);

    // Toggle: volver a tocar la reacción activa la deselecciona
    const handleReaccionar = (reaccion: Reaccion) => {
        setReaccionActiva((actual) => (actual === reaccion ? null : reaccion));
    };

    const handleEnviarPregunta = (texto: string) => {
        setPreguntas((prev) => [...prev, { id: Date.now().toString(), texto }]);
        setAviso("Tu pregunta fue enviada al docente");
    };

    return (
        <div className="bg-background text-on-surface font-body overflow-hidden">
            <TopNavAula
                materiaCurso="Matemática 4°B"
                nombreUsuario={USUARIO.nombre}
                avatarUrl={USUARIO.avatarUrl}
                onNotificaciones={() => console.log("Notificaciones")}
                onAjustes={() => console.log("Ajustes")}
                onSalir={() => navegar("/comunidad")}
            />

            <main className="flex h-screen pt-16">
                <PanelTrayectoria
                    unidad="Unidad 3: Funciones"
                    objetivosAlcanzados={2}
                    objetivosTotales={4}
                    etapas={ETAPAS}
                    conectados={CONECTADOS}
                    totalConectados={25}
                />

                <section className="flex-1 flex flex-col bg-[#190d2d] relative">
                    <Pizarron cursores={CURSORES} enVivo />

                    <BarraInteraccion
                        reaccionActiva={reaccionActiva}
                        onReaccionar={handleReaccionar}
                        onEnviarPregunta={handleEnviarPregunta}
                    />

                    {/* Aviso flotante al enviar una pregunta */}
                    {aviso && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#2D1B4E] border border-[#C548F5]/40 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-[#C548F5] text-base">
                                check_circle
                            </span>
                            <span className="text-sm text-white/90">{aviso}</span>
                        </div>
                    )}

                    {/* Contador de preguntas enviadas */}
                    {preguntas.length > 0 && (
                        <div className="absolute bottom-32 right-8 flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white/70">
                            <span className="material-symbols-outlined text-sm">forum</span>
                            <span className="text-xs font-medium">
                                {preguntas.length} pregunta{preguntas.length !== 1 ? "s" : ""} enviada
                                {preguntas.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
