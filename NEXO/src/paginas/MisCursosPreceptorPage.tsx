// src/paginas/MisCursosPreceptorPage.tsx
// Vista "Mis Cursos" del Preceptor.
// Lista los cursos a cargo con su estado de comunidad + panel lateral de
// actividad reciente y próximos eventos.

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import TarjetaCursoPreceptor, { type Curso } from "./components/preceptor/TarjetaCursoPreceptor";
import PanelActividadReciente, { type ActividadPreceptor } from "./components/preceptor/PanelActividadReciente";
import PanelProximosEventos, { type EventoPreceptor } from "./components/preceptor/PanelProximosEventos";
import { useNavegacion } from "../navegacion";

// ─── DATOS DE EJEMPLO ──────────────────────────────────

const CURSOS_INICIALES: Curso[] = [
    {
        id: "4b",
        nombre: "4° B",
        cantidadEstudiantes: 28,
        estadoComunidad: "activa",
        ultimoPosteo: "hace 12 min",
    },
    {
        id: "4a",
        nombre: "4° A",
        cantidadEstudiantes: 25,
        estadoComunidad: "bloqueada",
        horaDesbloqueo: "10:45",
    },
    {
        id: "3b",
        nombre: "3° B",
        cantidadEstudiantes: 30,
        estadoComunidad: "activa",
        posteosPendientes: 2,
    },
];

const ACTIVIDADES: ActividadPreceptor[] = [
    { id: "a1", tipo: "posteo", autor: "Lucía M.", curso: "4° B", tiempo: "Hace 12m" },
    { id: "a2", tipo: "bloqueo", curso: "4° A", tiempo: "Hace 25m" },
    { id: "a3", tipo: "posteo", autor: "Tomás R.", curso: "3° B", tiempo: "Hace 1h" },
    { id: "a4", tipo: "cierre", curso: "4° B", tiempo: "Hace 3h" },
];

const EVENTOS: EventoPreceptor[] = [
    {
        id: "e1",
        titulo: "Acto 25 de Mayo",
        cursos: ["4° A", "4° B", "3° B"],
        fecha: "25 de Mayo, 08:30hs",
        icono: "schedule",
        destacado: true,
    },
    {
        id: "e2",
        titulo: "Reunión de padres 4° B",
        fecha: "28 de Mayo, 17:00hs",
        icono: "event",
    },
];

// ─── PÁGINA ────────────────────────────────────────────

export default function MisCursosPreceptorPage() {
    const [usuario] = useState({
        nombre: "Carlos Pereyra",
        rol: "preceptor" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pereyra",
    });

    const [cursos] = useState<Curso[]>(CURSOS_INICIALES);
    const { navegar, cerrarSesion } = useNavegacion();

    const handleModerar = (cursoId: string) => {
        console.log("Moderar curso:", cursoId);
    };

    const handleAsignarCurso = () => {
        console.log("Asignar nuevo curso");
    };

    const handleVerCalendario = () => navegar("/comunidad/calendario");

    return (
        <div className="flex bg-[#190d2d] min-h-screen text-on-background">
            <Sidebar
                usuario={usuario}
                rutaActiva="/comunidad/curso"
                onNavegar={navegar}
                onCerrarSesion={cerrarSesion}
            />

            <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
                <TopBar title="Colegio San Martín" />

                <div className="flex-1 overflow-y-auto p-8 flex gap-8">
                    {/* Centro: grilla de cursos */}
                    <section className="flex-1 space-y-8">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black font-headline text-white tracking-tight">
                                Mis Cursos
                            </h1>
                            <p className="text-slate-400 font-medium">Ciclo 2025 — Colegio San Martín</p>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {cursos.map((curso) => (
                                <TarjetaCursoPreceptor
                                    key={curso.id}
                                    curso={curso}
                                    onModerar={handleModerar}
                                />
                            ))}

                            {/* Placeholder: asignar nuevo curso */}
                            <button
                                onClick={handleAsignarCurso}
                                className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 gap-4 hover:border-white/20 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-4xl">add_circle</span>
                                <p className="text-sm font-bold uppercase tracking-widest">
                                    Asignar nuevo curso
                                </p>
                            </button>
                        </div>
                    </section>

                    {/* Panel lateral derecho */}
                    <aside className="w-[320px] space-y-6">
                        <PanelActividadReciente actividades={ACTIVIDADES} />
                        <PanelProximosEventos eventos={EVENTOS} onVerCalendario={handleVerCalendario} />
                    </aside>
                </div>
            </main>
        </div>
    );
}
