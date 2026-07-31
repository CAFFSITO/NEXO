import { useNavegacion } from "../../../navegacion";

// Sub-navegación compartida del módulo Portafolio (estudiante): la barra
// "Mis Cursos / Mis Tareas / Calificaciones" que va debajo del TopBar en las
// tres sub-pantallas. Antes vivía copiada dentro de MisTareas y Calificaciones
// (y le faltaba a Mis Cursos, que quedaba sin forma de volver). Ahora es una
// sola pieza: las tres páginas la montan igual, con el mismo aspecto y las
// mismas rutas. Las tres direcciones son la MISMA sección de menú
// ("portafolio-estudiante"), así que "Portafolio" queda encendido en todas.
const SUBNAV = [
  { label: "Mis Cursos", ruta: "/portafolio/mis-cursos" },
  { label: "Mis Tareas", ruta: "/portafolio/mis-tareas" },
  { label: "Calificaciones", ruta: "/portafolio/calificaciones" },
];

interface SubNavPortafolioProps {
  /** La dirección de la pantalla actual, para marcar su pestaña como activa. */
  rutaActiva: string;
}

export default function SubNavPortafolio({ rutaActiva }: SubNavPortafolioProps) {
  const { navegar } = useNavegacion();

  return (
    <div className="flex gap-6 items-center px-8 h-12 border-b border-purple-900/20 bg-[#1C1030]/60">
      {SUBNAV.map((tab) => {
        const activa = tab.ruta === rutaActiva;
        return (
          <button
            key={tab.ruta}
            onClick={() => navegar(tab.ruta)}
            className={`pb-1 font-headline text-sm font-medium transition-all ${
              activa
                ? "text-[#C548F5] border-b-2 border-[#C548F5] font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
