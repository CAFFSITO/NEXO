import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import TarjetaCurso, { type Curso, type TemaCurso } from "./components/portafolio/TarjetaCurso";
import SubNavPortafolio from "./components/portafolio/SubNavPortafolio";
import { usarMisClases, type ClaseEstudiante } from "../servicios/aula";
import { usarPortafolio, type TareaAcademica } from "../servicios/portafolio";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { fechaCorta } from "../servicios/fechas";

// Los cursos salen del MISMO /api/portafolio que usa Mis Tareas: la materia,
// el profesor y el avance son los de las tareas reales de la cátedra. Antes
// acá vivían tres cursos escritos a mano con profesores que no existían en
// ningún otro lado ("Prof. Elena Vásquez", "Prof. Carlos Iturri" — Error 13.2).
const TEMAS: TemaCurso[] = ["fuchsia", "indigo", "emerald"];

// Se agrupa por CÁTEDRA (no por nombre de materia): así cada card lleva su
// catedraId y el clic abre el detalle de esa materia. Para un alumno hay una
// cátedra por materia (UNIQUE materia+curso), pero el id correcto es el de la
// cátedra, que es lo que pide el detalle.
function cursosDesdeTareas(tareas: TareaAcademica[]): Curso[] {
    const porCatedra = new Map<string, TareaAcademica[]>();
    for (const t of tareas) {
        const lista = porCatedra.get(t.catedraId) ?? [];
        lista.push(t);
        porCatedra.set(t.catedraId, lista);
    }
    return [...porCatedra.entries()].map(([catedraId, lista], i) => {
        const entregadas = lista.filter((t) => t.estado === "entregada").length;
        return {
            id: catedraId,
            titulo: lista[0].materia,
            profesor: lista[0].profesor,
            categoria: `${lista.length} ${lista.length === 1 ? "tarea" : "tareas"}`,
            icono: "menu_book",
            progreso: Math.round((entregadas / lista.length) * 100),
            tema: TEMAS[i % TEMAS.length],
            labelBoton: "Ver materia",
            iconoBoton: "arrow_forward",
        };
    });
}

type Vista = "grid" | "lista";

export default function MisCursosEstudiantePage() {
    const [vista, setVista] = useState<Vista>("grid");

    // El usuario del menú sale de la sesión: antes era una constante "Julieta
    // Rossi", así que el menú saludaba a Julieta entrara quien entrara.
    const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();

    // La "clase en vivo" ya no es una maqueta (Error 2.C.1): sale de nexo.db, y
    // el aula virtual real vive en su propia pantalla, adonde se entra desde acá.
    const { clases, cargando, error, recargar } = usarMisClases();

    // Misma ventanilla que Mis Tareas y Calificaciones (/api/portafolio).
    const {
        datos: portafolio,
        cargando: cargandoCursos,
        error: errorCursos,
        recargar: recargarCursos,
    } = usarPortafolio();

    const cursos = useMemo(
        () => cursosDesdeTareas(portafolio?.tareas ?? []),
        [portafolio]
    );

    if (!usuario) return null;

    // Tocar una materia abre su DETALLE (profesor, horarios, avisos, tareas),
    // no Mis Tareas. El id de la card es la cátedra, que es lo que pide el detalle.
    const handleAccionCurso = (catedraId: string) =>
        handleNavegar(`/portafolio/materia?catedra=${catedraId}`);

    return (
        <div className="flex bg-[#1C1030] min-h-screen">
            <Sidebar
                usuario={usuario}
                onNavegar={handleNavegar}
                onCerrarSesion={handleCerrarSesion}
            />

            <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
                <TopBar title="Mis Cursos & Aula Virtual" />

                {/* Sub-navegación del módulo: la misma barra que Mis Tareas y
                    Calificaciones, para poder ir y volver (antes faltaba acá). */}
                <SubNavPortafolio rutaActiva="/portafolio/mis-cursos" />

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

                            {cargandoCursos && <Cargando que="tus cursos" />}
                            {errorCursos && <Fallo error={errorCursos} onReintentar={recargarCursos} />}
                            {portafolio && cursos.length === 0 && (
                                <Vacio icono="school" mensaje="Todavía no tenés materias con tareas asignadas." />
                            )}

                            <div
                                className={
                                    vista === "grid"
                                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                        : "flex flex-col gap-4"
                                }
                            >
                                {cursos.map((curso) => (
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

                        {/* ── SECCIÓN 2: AULA VIRTUAL (real, Error 2.C.1) ── */}
                        <section className="space-y-6 pb-20" id="aula-virtual">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-black text-white">Aula Virtual</h2>
                            </div>

                            {cargando && <Cargando que="tus clases" />}
                            {error && <Fallo error={error} onReintentar={recargar} />}
                            {clases && clases.length === 0 && (
                                <Vacio icono="event_busy" mensaje="No hay clases en vivo ni próximas por ahora." />
                            )}

                            <div className="flex flex-col gap-3">
                                {clases?.map((c) => (
                                    <TarjetaClaseVivo
                                        key={c.id}
                                        clase={c}
                                        onEntrar={() => handleNavegar(`/aula-virtual?clase=${c.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

function TarjetaClaseVivo({
    clase,
    onEntrar,
}: {
    clase: ClaseEstudiante;
    onEntrar: () => void;
}) {
    return (
        <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold truncate">{clase.titulo}</h3>
                    {clase.enVivo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
                            En vivo
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                    {clase.materiaCurso} · {clase.docente} · {fechaCorta(clase.fechaHora)}{" "}
                    {new Date(clase.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
            {clase.enVivo ? (
                <button
                    onClick={onEntrar}
                    className="px-4 py-2 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
                >
                    <span className="material-symbols-outlined">videocam</span>
                    Entrar
                </button>
            ) : (
                <span className="text-xs text-slate-500">Aún no empezó</span>
            )}
        </div>
    );
}
