// src/paginas/MisCursosPreceptorPage.tsx
// Vista "Mi Curso" del Preceptor.
//
// Etapa 6: los cursos ya no son ejemplos escritos a mano; salen de la base a
// través del servidor (los que tienen a este preceptor a cargo). "Moderar curso"
// —que antes solo hacía un console.log (Error 7.A.3)— ahora abre la moderación
// real: la comunidad del curso (grupo de WhatsApp del curso, Error 7.A.5) y las
// charlas entre estudiantes de ese curso, para leerlas como regla de convivencia
// (sección 14.2, paso 6). Las charlas familia–preceptor NO aparecen: son privadas.
//
// Los paneles laterales (actividad reciente y próximos eventos) siguen con datos
// de ejemplo: pertenecen al módulo del preceptor, no a esta etapa de chat.

import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import ChatWindow from "./components/chat/ChatWindow";
import TarjetaCursoPreceptor, { type Curso } from "./components/preceptor/TarjetaCursoPreceptor";
import PanelActividadReciente, { type ActividadPreceptor } from "./components/preceptor/PanelActividadReciente";
import PanelProximosEventos, { type EventoPreceptor } from "./components/preceptor/PanelProximosEventos";
import { useNavegacion } from "../navegacion";
import { subtituloInstitucional, usarInstitucion } from "../servicios/institucion";
import {
    usarCursosPreceptor,
    conversacionesAModerar,
    mensajesModerados,
    type ConversacionModerable,
    type Mensaje,
} from "../servicios/chat";

// ─── DATOS DE EJEMPLO (paneles laterales, fuera del alcance de la Etapa 6) ──

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
    const { navegar, cerrarSesion, usuario } = useNavegacion();
    const { institucion } = usarInstitucion();
    const { cursos, cargando, error } = usarCursosPreceptor();

    // Moderación: qué curso se está moderando, sus conversaciones y el hilo abierto.
    const [moderando, setModerando] = useState<{ id: string; nombre: string } | null>(null);
    const [convsModerar, setConvsModerar] = useState<ConversacionModerable[]>([]);
    const [convAbierta, setConvAbierta] = useState<ConversacionModerable | null>(null);
    const [hilo, setHilo] = useState<Mensaje[]>([]);
    const [errorMod, setErrorMod] = useState<string | null>(null);

    if (!usuario) return null;

    const abrirModeracion = async (cursoId: string, nombre: string) => {
        setModerando({ id: cursoId, nombre });
        setConvAbierta(null);
        setHilo([]);
        setErrorMod(null);
        try {
            setConvsModerar(await conversacionesAModerar(cursoId));
        } catch (e) {
            setErrorMod(e instanceof Error ? e.message : "No se pudo cargar la moderación.");
        }
    };

    const abrirHilo = async (conv: ConversacionModerable) => {
        if (!moderando) return;
        setConvAbierta(conv);
        setHilo([]);
        try {
            setHilo(await mensajesModerados(moderando.id, conv.id));
        } catch (e) {
            setErrorMod(e instanceof Error ? e.message : "No se pudo abrir la conversación.");
        }
    };

    const cerrarModeracion = () => {
        setModerando(null);
        setConvsModerar([]);
        setConvAbierta(null);
        setHilo([]);
    };

    // Los cursos reales, adaptados a la tarjeta existente (se reutiliza la pieza).
    const cursosTarjeta: Curso[] = (cursos ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        cantidadEstudiantes: c.estudiantes,
        estadoComunidad: "activa",
    }));

    return (
        <div className="flex bg-[#190d2d] min-h-screen text-on-background">
            <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

            <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
                <TopBar title={institucion?.nombre ?? "Mis Cursos"} />

                <div className="flex-1 overflow-y-auto p-8 flex gap-8">
                    {/* Centro: grilla de cursos */}
                    <section className="flex-1 space-y-8">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black font-headline text-white tracking-tight">
                                Mis Cursos
                            </h1>
                            <p className="text-slate-400 font-medium">{subtituloInstitucional(institucion)}</p>
                        </div>

                        {cargando && <p className="text-slate-400">Cargando cursos…</p>}
                        {error && <p className="text-red-400">{error}</p>}
                        {cursos && cursos.length === 0 && (
                            <p className="text-slate-400">No tenés cursos a cargo.</p>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {cursosTarjeta.map((curso) => (
                                <TarjetaCursoPreceptor
                                    key={curso.id}
                                    curso={curso}
                                    onModerar={() => abrirModeracion(curso.id, curso.nombre)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Panel lateral derecho */}
                    <aside className="w-[320px] space-y-6">
                        <PanelActividadReciente actividades={ACTIVIDADES} />
                        <PanelProximosEventos eventos={EVENTOS} onVerCalendario={() => navegar("/comunidad/calendario")} />
                    </aside>
                </div>
            </main>

            {/* ── Modal de moderación (Error 7.A.3) ── */}
            {moderando && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
                    <div className="bg-[#1C1030] rounded-xl w-full max-w-4xl h-[80vh] flex overflow-hidden border border-[#3b2f50]">
                        {/* Lista de conversaciones del curso */}
                        <div className="w-72 border-r border-[#3b2f50] flex flex-col">
                            <div className="p-4 border-b border-[#3b2f50] flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-white">Moderar {moderando.nombre}</h2>
                                    <p className="text-xs text-slate-400">Convivencia del curso</p>
                                </div>
                                <button
                                    onClick={cerrarModeracion}
                                    className="text-slate-400 hover:text-white"
                                    aria-label="Cerrar"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {errorMod && <p className="text-red-400 text-xs p-2">{errorMod}</p>}
                                {convsModerar.length === 0 && !errorMod && (
                                    <p className="text-slate-500 text-xs p-2">Sin conversaciones para moderar.</p>
                                )}
                                {convsModerar.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => abrirHilo(conv)}
                                        className={`w-full text-left p-3 rounded-lg transition ${
                                            convAbierta?.id === conv.id
                                                ? "bg-primary/20 border-l-4 border-primary"
                                                : "hover:bg-[#2D1B4E]/50"
                                        }`}
                                    >
                                        <p className="font-bold text-white text-sm truncate flex items-center gap-1">
                                            {conv.tipo === "grupo-curso" && (
                                                <span className="material-symbols-outlined text-base">groups</span>
                                            )}
                                            {conv.nombre || "Conversación"}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{conv.ultimoMensaje}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hilo seleccionado, en solo lectura */}
                        <div className="flex-1 flex flex-col">
                            {convAbierta ? (
                                <ChatWindow
                                    nombreContacto={convAbierta.nombre || "Conversación"}
                                    soloLectura
                                    messages={hilo.map((m) => ({
                                        id: m.id,
                                        sender: "other",
                                        // Al moderar interesa QUIÉN dijo qué: se antepone el autor.
                                        contenido: `${m.autor}: ${m.archivo ? `📎 ${m.archivo}` : m.contenido}`,
                                        timestamp: new Date(m.enviadoEn).toLocaleTimeString("es-AR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }),
                                    }))}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 bg-[#190d2d]">
                                    <p>Elegí una conversación para moderar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
