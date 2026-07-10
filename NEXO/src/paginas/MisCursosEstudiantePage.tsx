import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCurso, { type Curso } from "./components/portafolio/TarjetaCurso";
import ReproductorClaseVivo from "./components/portafolio/ReproductorClaseVivo";
import PanelInteraccionClase, { type Comprension } from "./components/portafolio/PanelInteraccionClase";
import TrayectoriaClase, {
    type PasoClase,
    type RecursoClase,
} from "./components/portafolio/TrayectoriaClase";

const CURSOS: Curso[] = [
    {
        id: "mate",
        titulo: "Matemática Avanzada",
        profesor: "Prof. Dr. Ricardo Méndez",
        categoria: "Ciencias Exactas",
        icono: "functions",
        progreso: 75,
        tema: "fuchsia",
        labelBoton: "Continuar",
        iconoBoton: "arrow_forward",
    },
    {
        id: "historia",
        titulo: "Historia Universal",
        profesor: "Prof. Elena Vásquez",
        categoria: "Humanidades",
        icono: "history_edu",
        progreso: 32,
        tema: "indigo",
        labelBoton: "Ver unidad",
        iconoBoton: "visibility",
    },
    {
        id: "biologia",
        titulo: "Biología Celular",
        profesor: "Prof. Carlos Iturri",
        categoria: "Biología",
        icono: "biotech",
        progreso: 58,
        tema: "emerald",
        labelBoton: "Continuar",
        iconoBoton: "arrow_forward",
    },
];

const PASOS_CLASE: PasoClase[] = [
    {
        id: "p1",
        titulo: "Introducción a Integrales",
        descripcion: "Conceptos básicos y áreas bajo la curva.",
        estado: "completado",
    },
    {
        id: "p2",
        titulo: "Métodos de Integración",
        descripcion: "Sustitución y fracciones parciales.",
        estado: "activo",
        objetivo: "Resolver 3 ejercicios prácticos de integración por partes",
    },
    {
        id: "p3",
        titulo: "Práctica Dirigida",
        descripcion: "Resolución de dudas en vivo.",
        estado: "pendiente",
    },
];

const RECURSOS_CLASE: RecursoClase[] = [
    { id: "material", label: "Material de Clase.pdf", icono: "description" },
    { id: "quiz", label: "Quiz Rápido #4", icono: "quiz", bloqueado: true },
];

const USUARIO = {
    nombre: "Julieta Rossi",
    rol: "estudiante" as const,
    curso: "4° B",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
};

type Vista = "grid" | "lista";

export default function MisCursosEstudiantePage() {
    const [vista, setVista] = useState<Vista>("grid");

    const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

    const handleAccionCurso = (id: string) => console.log("Abrir curso:", id);
    const handleComprension = (valor: Comprension) => console.log("Comprensión:", valor);
    const handlePregunta = (texto: string) => console.log("Pregunta al docente:", texto);
    const handleRecurso = (id: string) => console.log("Abrir recurso:", id);

    return (
        <div className="flex bg-[#1C1030] min-h-screen">
            <Sidebar
                usuario={USUARIO}
                rutaActiva="/portafolio/mis-tareas"
                onNavegar={handleNavegar}
                onCerrarSesion={handleCerrarSesion}
            />

            <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
                <TopBar title="Mis Cursos & Aula Virtual" />

                <div className="flex-1 overflow-y-auto bg-[#190d2d]">
                    <div className="p-8 max-w-7xl mx-auto w-full space-y-16">
                        {/* ── SECCIÓN 1: MIS CURSOS ── */}
                        <section className="space-y-8" id="mis-cursos">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight">Mis Cursos</h1>
                                    <p className="text-slate-400 mt-2">
                                        Continuá donde lo dejaste en tu ruta de aprendizaje.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setVista("grid")}
                                        aria-pressed={vista === "grid"}
                                        className={`p-2 rounded-lg transition-colors ${
                                            vista === "grid"
                                                ? "bg-surface-container text-fuchsia-400 hover:bg-surface-container-high"
                                                : "bg-transparent text-slate-500 hover:bg-surface-container"
                                        }`}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={vista === "grid" ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                        >
                                            grid_view
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setVista("lista")}
                                        aria-pressed={vista === "lista"}
                                        className={`p-2 rounded-lg transition-colors ${
                                            vista === "lista"
                                                ? "bg-surface-container text-fuchsia-400 hover:bg-surface-container-high"
                                                : "bg-transparent text-slate-500 hover:bg-surface-container"
                                        }`}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={vista === "lista" ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                        >
                                            view_list
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div
                                className={
                                    vista === "grid"
                                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                        : "flex flex-col gap-4"
                                }
                            >
                                {CURSOS.map((curso) => (
                                    <TarjetaCurso
                                        key={curso.id}
                                        curso={curso}
                                        vista={vista}
                                        onAccion={handleAccionCurso}
                                    />
                                ))}
                            </div>
                        </section>

                        <hr className="border-slate-800" />

                        {/* ── SECCIÓN 2: AULA VIRTUAL ── */}
                        <section className="space-y-8 pb-20" id="aula-virtual">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                    EN VIVO
                                </div>
                                <h2 className="text-3xl font-black text-white">Clase en Vivo ahora</h2>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                                <div className="xl:col-span-3 space-y-6">
                                    <ReproductorClaseVivo
                                        titulo="Unidad 4: Derivadas e Integrales Complejas"
                                        profesor="Prof. Dr. Ricardo Méndez"
                                        espectadores={124}
                                        progreso={66}
                                    />
                                    <PanelInteraccionClase
                                        onComprension={handleComprension}
                                        onPregunta={handlePregunta}
                                    />
                                </div>

                                <div className="xl:col-span-1 space-y-6">
                                    <TrayectoriaClase
                                        pasos={PASOS_CLASE}
                                        recursos={RECURSOS_CLASE}
                                        onRecurso={handleRecurso}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Botón flotante de soporte */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    aria-label="Soporte"
                    className="w-14 h-14 bg-fuchsia-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">support_agent</span>
                </button>
            </div>
        </div>
    );
}
