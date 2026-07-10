// src/components/shared/Sidebar.tsx
// Componente NÚCLEO de navegación — presente en todas las vistas autenticadas
// Los items de navegación cambian según el rol del usuario

import { useNavegacion } from "../../../navegacion";

// ─── TIPOS ──────────────────────────────────────────────

export type Rol =
    | "estudiante"
    | "profesor"
    | "admin-academico"
    | "preceptor"
    | "centro-estudiantes"
    | "bibliotecario"
    | "administrador"
    | "familia";

interface NavItem {
    label: string;
    icono: string;
    ruta: string;
}

interface SidebarProps {
    usuario: {
        nombre: string;
        rol: Rol;
        avatarUrl?: string;
        curso?: string;
        materia?: string;
    };
    rutaActiva: string;
    onNavegar: (ruta: string) => void;
    onCerrarSesion: () => void;
}

// ─── ITEMS POR ROL ──────────────────────────────────────

const NAV_POR_ROL: Record<Rol, NavItem[]> = {
    estudiante: [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Portafolio", icono: "school", ruta: "/portafolio/mis-tareas" },
        { label: "Objetivos", icono: "target", ruta: "/objetivos" },
        { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
        { label: "Asistencia IA", icono: "auto_awesome", ruta: "/asistencia-academica" },
    ],
    profesor: [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Aula Virtual", icono: "cast_for_education", ruta: "/portafolio-docente/aula-virtual" },
        { label: "Gestión de Tareas", icono: "assignment", ruta: "/portafolio/gestion" },
        { label: "Mi Portafolio", icono: "menu_book", ruta: "/portafolio-docente" },
        { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
    ],
    "admin-academico": [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Gestión de Perfiles", icono: "manage_accounts", ruta: "/admin/perfiles" },
        { label: "Gestión de Cursos", icono: "class", ruta: "/admin/cursos" },
        { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
        { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
        { label: "Reportes", icono: "assessment", ruta: "/comunidad/reportes-auditoria" },
    ],
    preceptor: [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Mi Curso", icono: "groups", ruta: "/comunidad/curso" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
        { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    ],
    "centro-estudiantes": [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Nuestro Portal", icono: "campaign", ruta: "/centro-estudiantes" },
        { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    ],
    bibliotecario: [
        { label: "Inicio", icono: "dashboard", ruta: "/biblioteca/panel" },
        { label: "Cola de Revisión", icono: "assignment_late", ruta: "/biblioteca/cola-revision" },
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
        { label: "Notificaciones", icono: "notifications", ruta: "/notificaciones" },
    ],
    administrador: [
        { label: "Instituciones", icono: "domain", ruta: "/admin/instituciones" },
        { label: "Salud del Sistema", icono: "monitor_heart", ruta: "/admin/salud" },
        { label: "Actividades", icono: "analytics", ruta: "/admin/actividades" },
    ],
    familia: [
        { label: "Comunicados", icono: "announcement", ruta: "/comunicados" },
        { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
    ],
};

// ─── LABELS DE ROL PARA MOSTRAR ─────────────────────────

const ROL_LABELS: Record<Rol, string> = {
    estudiante: "Estudiante",
    profesor: "Profesor",
    "admin-academico": "Admin. Académica",
    preceptor: "Preceptor",
    "centro-estudiantes": "Centro de Estudiantes",
    bibliotecario: "Bibliotecario",
    administrador: "Administrador",
    familia: "Familia · Ciclo 2025",
};

// ─── COMPONENTE ─────────────────────────────────────────

export default function Sidebar({ usuario, rutaActiva, onNavegar, onCerrarSesion }: SidebarProps) {
    // El usuario logueado (sesión) manda sobre el mock que pasa cada página:
    // así el menú siempre corresponde al rol con el que se inició sesión.
    const { usuario: sesion } = useNavegacion();
    const u = sesion ?? usuario;

    const items = NAV_POR_ROL[u.rol];
    const rolLabel = ROL_LABELS[u.rol];

    // Determina si un item está activo comparando el inicio de la ruta
    const esActivo = (ruta: string) => rutaActiva.startsWith(ruta);

    return (
        <nav className="fixed h-screen left-0 top-0 w-[220px] bg-[#160D28] border-r border-surface-container-high shadow-2xl shadow-purple-900/20 z-50 flex flex-col py-6">

            {/* ── Logo ── */}
            <div className="px-6 mb-6">
                <span className="text-2xl font-black text-[#C548F5] tracking-widest font-headline">
                    NEXO
                </span>
            </div>

            {/* ── Avatar + Info usuario ── */}
            <div className="px-4 mb-8">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-container-highest/30">
                    {u.avatarUrl ? (
                        <img
                            src={u.avatarUrl}
                            alt={u.nombre}
                            className="w-10 h-10 rounded-full border-2 border-primary/30 object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                                {u.nombre.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{u.nombre}</p>
                        <p className="text-xs text-slate-400 truncate">{rolLabel}</p>
                    </div>
                </div>
            </div>

            {/* ── Navegación ── */}
            <div className="flex flex-col gap-1 flex-1">
                {items.map((item) => {
                    const activo = esActivo(item.ruta);
                    return (
                        <button
                            key={item.ruta}
                            onClick={() => onNavegar(item.ruta)}
                            className={`
                flex items-center gap-3 px-4 py-3 font-headline text-sm font-medium tracking-tight
                transition-all duration-200 text-left w-full
                ${activo
                                    ? "text-[#C548F5] border-l-4 border-[#C548F5] bg-gradient-to-r from-[#C548F5]/10 to-transparent shadow-[0_0_15px_rgba(197,72,245,0.3)]"
                                    : "text-slate-400 hover:text-white hover:bg-surface-container-highest/50 border-l-4 border-transparent"
                                }
              `}
                        >
                            <span
                                className="material-symbols-outlined text-lg"
                                style={activo ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                                {item.icono}
                            </span>
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Cerrar Sesión ── */}
            <div className="px-4 mt-auto">
                <button
                    onClick={onCerrarSesion}
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-all duration-200 font-headline text-sm font-medium w-full"
                >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Cerrar Sesión
                </button>
            </div>
        </nav>
    );
}