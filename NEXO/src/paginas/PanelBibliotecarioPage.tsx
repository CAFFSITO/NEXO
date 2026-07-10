import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TarjetaRecurso, { type Recurso, type TipoRecurso } from "./components/bibliotecario/TarjetaRecurso";
import ColaRevisionWidget, { type ItemCola } from "./components/bibliotecario/ColaRevisionWidget";
import EstadisticasWidget, { type EstadisticasMes } from "./components/bibliotecario/EstadisticasWidget";
import BannerCola from "./components/bibliotecario/BannerCola";

// ─── DATOS DE EJEMPLO ────────────────────────────────────

const RECURSOS_INICIALES: Recurso[] = [
    {
        id: "1",
        titulo: "Guía de ejercicios — Funciones Cuadráticas",
        materia: "Matemática",
        tipo: "PDF",
        autor: "Prof. García",
        fecha: "10/05/2025",
        votos: 12,
        votado: false,
    },
    {
        id: "2",
        titulo: "Documental: La Revolución de Mayo",
        materia: "Historia",
        tipo: "Enlace",
        autor: "Bibliotecario",
        fecha: "08/05/2025",
        votos: 8,
        votado: false,
    },
    {
        id: "3",
        titulo: "Tabla periódica interactiva",
        materia: "Química",
        tipo: "PDF",
        autor: "Lucía M. (estudiante)",
        fecha: "05/05/2025",
        votos: 19,
        votado: true,
        aprobado: true,
    },
    {
        id: "4",
        titulo: "Cien años de soledad — García Márquez",
        materia: "Lengua",
        tipo: "Libro",
        autor: "Bibliotecario",
        fecha: "01/05/2025",
        votos: 5,
        votado: false,
    },
];

const COLA_INICIAL: ItemCola[] = [
    { id: "c1", titulo: "Apuntes de Biología celular", autor: "Tomás R.", tiempo: "hace 1 día" },
    { id: "c2", titulo: "Video: Experimento de densidad", autor: "Prof. Méndez", tiempo: "hace 2 días" },
    { id: "c3", titulo: "Infografía del sistema solar", autor: "Ana S.", tiempo: "hace 4 días" },
];

const ESTADISTICAS: EstadisticasMes = {
    agregados: 8,
    enviadosComunidad: 5,
    aprobados: 3,
    rechazados: 1,
    pendientes: 1,
    masPopular: { titulo: "Tabla periódica interactiva", descargasHoy: 112 },
};

const MATERIAS = ["Matemática", "Historia", "Química", "Lengua"] as const;
const TIPOS: TipoRecurso[] = ["PDF", "Video", "Enlace", "Libro"];

// ─── PÁGINA ──────────────────────────────────────────────

export default function PanelBibliotecarioPage() {
    const [recursos, setRecursos] = useState<Recurso[]>(RECURSOS_INICIALES);
    const [cola] = useState<ItemCola[]>(COLA_INICIAL);
    const [busqueda, setBusqueda] = useState("");
    const [filtroMateria, setFiltroMateria] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");

    const usuario = {
        nombre: "María Elena Ruiz",
        rol: "bibliotecario" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MariaElena",
    };

    // Lista derivada: búsqueda por texto + filtro de materia + filtro de tipo.
    const recursosFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return recursos.filter((r) => {
            const coincideTexto =
                q === "" ||
                r.titulo.toLowerCase().includes(q) ||
                r.materia.toLowerCase().includes(q) ||
                r.autor.toLowerCase().includes(q);
            const coincideMateria = filtroMateria === "" || r.materia === filtroMateria;
            const coincideTipo = filtroTipo === "" || r.tipo === filtroTipo;
            return coincideTexto && coincideMateria && coincideTipo;
        });
    }, [recursos, busqueda, filtroMateria, filtroTipo]);

    // Voto único por usuario: alterna estado y ajusta el contador.
    const handleVotar = (id: string) => {
        setRecursos((prev) =>
            prev.map((r) =>
                r.id === id
                    ? { ...r, votado: !r.votado, votos: r.votos + (r.votado ? -1 : 1) }
                    : r,
            ),
        );
    };

    const handleAbrirMenu = (id: string) => console.log("Abrir menú de acciones del recurso:", id);
    const handleRevisarItem = (id: string) => console.log("Revisar recurso de la cola:", id);
    const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();
    const handleVerCola = () => handleNavegar("/biblioteca/cola-revision");
    const handleAgregarRecurso = () => console.log("Abrir formulario: subir nuevo recurso");
    const handleVerNacional = () => handleNavegar("/biblioteca/nacional");

    return (
        <div className="flex bg-background min-h-screen">
            <Sidebar
                usuario={usuario}
                rutaActiva="/biblioteca/panel"
                onNavegar={handleNavegar}
                onCerrarSesion={handleCerrarSesion}
            />

            <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
                {/* ── TopAppBar con búsqueda ── */}
                <header className="sticky top-0 z-40 flex justify-between items-center px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-surface-container-high">
                    <div className="flex items-center gap-4">
                        <h1 className="text-[#C548F5] font-bold text-xl tracking-tight">Panel de Control</h1>
                        <div className="relative w-72">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                                search
                            </span>
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full bg-surface-container-high/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary text-white"
                                placeholder="Buscar recursos..."
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-primary transition-all">
                            <span className="material-symbols-outlined">help_outline</span>
                        </button>
                        <button className="text-gray-400 hover:text-primary transition-all relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 bg-background">
                    {/* ── Encabezado ── */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-extrabold text-white tracking-tight font-headline">
                                Biblioteca Institucional
                            </h2>
                            <p className="text-on-surface-variant font-medium mt-1">
                                Colegio San Martín — <span className="text-[#C548F5]">{recursos.length} recursos disponibles</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleVerNacional}
                                className="bg-surface-container-high text-primary border border-primary/20 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-high/80 transition-all"
                            >
                                Ver biblioteca nacional
                            </button>
                            <button
                                onClick={handleAgregarRecurso}
                                className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl shadow-[#C548F5]/30 hover:scale-[1.02] transition-all"
                            >
                                Agregar recurso
                            </button>
                        </div>
                    </div>

                    {/* ── Banner de cola ── */}
                    <BannerCola cantidad={cola.length} onIrACola={handleVerCola} />

                    {/* ── Layout de dos columnas ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Columna izquierda: recursos */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex flex-wrap gap-4 items-center mb-4">
                                <select
                                    value={filtroMateria}
                                    onChange={(e) => setFiltroMateria(e.target.value)}
                                    className="bg-surface-container border-none text-on-surface text-sm rounded-full px-4 py-2 focus:ring-1 focus:ring-primary pr-10"
                                >
                                    <option value="">Filtrar por materia</option>
                                    {MATERIAS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={filtroTipo}
                                    onChange={(e) => setFiltroTipo(e.target.value)}
                                    className="bg-surface-container border-none text-on-surface text-sm rounded-full px-4 py-2 focus:ring-1 focus:ring-primary pr-10"
                                >
                                    <option value="">Tipo de recurso</option>
                                    {TIPOS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {recursosFiltrados.length > 0 ? (
                                <div className="grid gap-4">
                                    {recursosFiltrados.map((recurso) => (
                                        <TarjetaRecurso
                                            key={recurso.id}
                                            recurso={recurso}
                                            onVotar={handleVotar}
                                            onAbrirMenu={handleAbrirMenu}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-4">
                                        library_books
                                    </span>
                                    <p className="text-on-surface-variant">No se encontraron recursos con esos filtros</p>
                                </div>
                            )}
                        </div>

                        {/* Columna derecha: widgets */}
                        <div className="lg:col-span-4 space-y-6">
                            <ColaRevisionWidget
                                items={cola}
                                onRevisarItem={handleRevisarItem}
                                onVerCola={handleVerCola}
                            />
                            <EstadisticasWidget datos={ESTADISTICAS} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
