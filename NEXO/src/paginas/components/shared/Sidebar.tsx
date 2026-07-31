// src/components/shared/Sidebar.tsx
// Componente NÚCLEO de navegación — presente en todas las vistas autenticadas
// Los items de navegación cambian según el rol del usuario

import { MAPA_RUTAS, seccionDeRuta, useNavegacion, type RutaPrivada } from "../../../navegacion";
import { ROL_LABELS, type Rol } from "./roles";
import { usarResumenNotificaciones } from "../../../servicios/notificaciones";

/** El globito de no leídos (Etapa 6). Nada si el número es 0 o negativo. */
function Globito({ n }: { n: number }) {
    if (!n || n <= 0) return null;
    return (
        <span className="ml-auto bg-primary text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center flex-shrink-0">
            {n > 99 ? "99+" : n}
        </span>
    );
}

// ─── TIPOS ──────────────────────────────────────────────

// El tipo `Rol` y los textos de cada rol se mudaron a `roles.ts` (no son asunto
// del menú: los usa cualquier pantalla que muestre el rol de alguien). Se
// re-exporta desde acá porque media aplicación ya lo importa de este archivo.
export type { Rol };

interface NavItem {
    label: string;
    icono: string;
    // `RutaPrivada` y no `string`: solo se puede apuntar a una dirección
    // declarada en MAPA_RUTAS. Un ítem que apunte a una pantalla inexistente ya
    // no compila (Error 12.8), en vez de ser un botón mudo. La sección del ítem
    // no se escribe acá: sale del mapa, que es la única fuente de verdad.
    ruta: RutaPrivada;
}

interface SidebarProps {
    // Opcional: es el usuario de ejemplo que todavía traen adentro las páginas
    // viejas, y que la Etapa 2 va a borrar. El menú ya no lo necesita —usa el de
    // la sesión, que sale de la base—, así que una página nueva no tiene por qué
    // inventar uno para poder dibujar el menú.
    usuario?: {
        nombre: string;
        rol: Rol;
        avatarUrl?: string;
        curso?: string;
        materia?: string;
    };
    onNavegar: (ruta: string) => void;
    onCerrarSesion: () => void;
}

// ─── ITEMS POR ROL ──────────────────────────────────────

const NAV_POR_ROL: Record<Rol, NavItem[]> = {
    estudiante: [
        { label: "Comunidad", icono: "group", ruta: "/comunidad" },
        { label: "Portafolio", icono: "school", ruta: "/portafolio/mis-cursos" },
        { label: "Objetivos", icono: "target", ruta: "/objetivos" },
        { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
        { label: "Asistencia IA", icono: "auto_awesome", ruta: "/asistencia-academica" },
        { label: "Buzón de quejas", icono: "mark_email_unread", ruta: "/quejas/enviar" },
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
        { label: "Reportes", icono: "assessment", ruta: "/reportes" },
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
    // El administrador de PLATAFORMA solo tiene lo suyo (sección 5): las
    // instituciones y la salud del sistema (con los logs). Se quitó "Actividades",
    // que reusaba el panel de la dirección y mostraba la vida interna de un
    // colegio, algo que a este perfil no le corresponde ver (Errores 5.A.8, 5.A.9).
    administrador: [
        { label: "Instituciones", icono: "domain", ruta: "/admin/instituciones" },
        { label: "Salud del Sistema", icono: "monitor_heart", ruta: "/admin/salud" },
    ],
    familia: [
        { label: "Comunicados", icono: "announcement", ruta: "/comunicados" },
        // Calendario diferenciado de la familia (Error 10.B.5): su página propia
        // —solo lectura, con las capas que le tocan— en vez del institucional
        // genérico que compartía con la dirección. El chat va al chat compartido
        // real (Error 10.C.2): no hay una copia paralela para la familia.
        { label: "Calendario", icono: "calendar_today", ruta: "/familia/calendario" },
        { label: "Chat", icono: "chat", ruta: "/chat" },
    ],
};

// ─── COMPONENTE ─────────────────────────────────────────

export default function Sidebar({ usuario, onNavegar, onCerrarSesion }: SidebarProps) {
    // El usuario logueado (sesión) manda sobre el mock que pasa cada página:
    // así el menú siempre corresponde al rol con el que se inició sesión.
    // `rutaActiva` sale del mismo lugar y por el mismo motivo: es la dirección
    // que muestra el navegador. Antes cada página le pasaba al menú, a mano, la
    // ruta que ELLA creía estar mostrando, y varias se equivocaban: la pantalla
    // de Calificaciones decía estar en "/portafolio/mis-tareas" y la de Debates
    // en "/comunidad". Una copia escrita a mano de un dato que ya existe siempre
    // termina mintiendo; el dato verdadero es uno solo y es la URL.
    const { usuario: sesion, rutaActiva } = useNavegacion();
    const u = sesion ?? usuario;

    // Los globitos de no leídos (Etapa 6): el resumen sale del servidor y se
    // actualiza solo cuando llega algo en vivo. La campana usa las notificaciones
    // sin leer; el ítem Chat, los mensajes sin leer.
    const { resumen } = usarResumenNotificaciones();

    // Sin sesión no hay menú que dibujar. No debería pasar (el menú solo existe
    // dentro de pantallas que exigen sesión), pero si pasa, un menú en blanco es
    // mejor que romper la pantalla entera.
    if (!u) return null;

    const items = NAV_POR_ROL[u.rol];
    const rolLabel = ROL_LABELS[u.rol];

    // La sección donde está parado el usuario, según el mapa de rutas. Un ítem
    // se enciende si es SU sección: ni por parecido de texto, ni por prefijo.
    // Como cada dirección declara una sola sección y cada rol no repite sección
    // en su menú, se enciende exactamente uno (Error 12.7).
    const seccionActiva = seccionDeRuta(rutaActiva);
    const esActivo = (ruta: RutaPrivada) => MAPA_RUTAS[ruta].seccion === seccionActiva;

    return (
        <nav className="fixed h-screen left-0 top-0 w-[220px] bg-[#160D28] border-r border-surface-container-high shadow-2xl shadow-purple-900/20 z-50 flex flex-col py-6">

            {/* ── Logo + campana ── */}
            <div className="px-6 mb-6 flex items-center justify-between">
                <span className="text-2xl font-black text-[#C548F5] tracking-widest font-headline">
                    NEXO
                </span>
                {/* La campana (Etapa 6, sección 14.15): acceso transversal a las
                    notificaciones desde cualquier pantalla, con su contador. */}
                <button
                    onClick={() => onNavegar("/notificaciones")}
                    className="relative p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-surface-container-highest/50 transition-colors"
                    aria-label="Notificaciones"
                >
                    <span
                        className="material-symbols-outlined text-xl"
                        style={esActivo("/notificaciones") ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                        notifications
                    </span>
                    {resumen.notificaciones > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                            {resumen.notificaciones > 99 ? "99+" : resumen.notificaciones}
                        </span>
                    )}
                </button>
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
                    // Globito del ítem: Chat suma mensajes sin leer; Notificaciones,
                    // avisos sin leer. El resto no lleva contador.
                    const badge =
                        item.ruta === "/chat"
                            ? resumen.chat
                            : item.ruta === "/notificaciones"
                                ? resumen.notificaciones
                                : 0;
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
                            <Globito n={badge} />
                        </button>
                    );
                })}
            </div>

            {/* ── Pie: Configuración y Cerrar Sesión ── */}
            {/* Configuración va acá abajo y NO en NAV_POR_ROL a propósito: la
                tienen los ocho roles por igual (Error 2.A.1), así que repetirla
                ocho veces sería ocho lugares donde después se desincroniza.
                Escrita una vez, aparece en todos los perfiles y en todas las
                pantallas, que es exactamente lo que pide el error: un acceso
                claro y permanente. */}
            <div className="mt-auto pt-2 border-t border-surface-container-high/50">
                <button
                    onClick={() => onNavegar("/configuracion")}
                    className={`
                        flex items-center gap-3 px-4 py-3 font-headline text-sm font-medium tracking-tight
                        transition-all duration-200 text-left w-full
                        ${esActivo("/configuracion")
                            ? "text-[#C548F5] border-l-4 border-[#C548F5] bg-gradient-to-r from-[#C548F5]/10 to-transparent shadow-[0_0_15px_rgba(197,72,245,0.3)]"
                            : "text-slate-400 hover:text-white hover:bg-surface-container-highest/50 border-l-4 border-transparent"
                        }
                    `}
                >
                    <span
                        className="material-symbols-outlined text-lg"
                        style={esActivo("/configuracion") ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                        settings
                    </span>
                    Configuración
                </button>

                <div className="px-4">
                    <button
                        onClick={onCerrarSesion}
                        className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-all duration-200 font-headline text-sm font-medium w-full"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </nav>
    );
}