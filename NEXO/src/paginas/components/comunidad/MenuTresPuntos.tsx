import { useState } from "react";
import type { Rol } from "../shared/roles";
import { puedeEliminar, type ObjetoVotable } from "../../../servicios/comunidad";

interface MenuTresPuntosProps {
  rol: Rol;
  objetoTipo: ObjetoVotable;
  objetoId: string;
  /** ¿El que mira es el autor del contenido? Decide si puede eliminar lo suyo. */
  esAutor: boolean;
  onDenunciar: (tipo: ObjetoVotable, id: string) => void;
  onEliminar: (tipo: ObjetoVotable, id: string) => void;
  /** "horiz" (feed/debate) o "vert" (comentarios). Solo cambia el ícono. */
  orientacion?: "horiz" | "vert";
}

// El ÚNICO menú de tres puntos de la comunidad (sección 1.4 y 14.4.4). Recibe el
// rol y el objeto, y muestra las acciones permitidas: estudiante y profesor
// denuncian; la dirección, el preceptor y el centro (en debates) —y el autor
// sobre lo suyo— eliminan. Ocultar una acción es solo cortesía: el servidor
// vuelve a validar cada una (regla de oro 4).
export default function MenuTresPuntos({
  rol,
  objetoTipo,
  objetoId,
  esAutor,
  onDenunciar,
  onEliminar,
  orientacion = "horiz",
}: MenuTresPuntosProps) {
  const [abierto, setAbierto] = useState(false);
  const eliminar = puedeEliminar(rol, objetoTipo, esAutor);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        className="text-white/40 hover:text-white transition-colors"
        aria-label="Más acciones"
      >
        <span className="material-symbols-outlined">
          {orientacion === "vert" ? "more_vert" : "more_horiz"}
        </span>
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar tocando afuera. */}
          <div className="fixed inset-0 z-[60]" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-8 z-[61] w-44 bg-[#241338] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
            {!esAutor && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierto(false);
                  onDenunciar(objetoTipo, objetoId);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-orange-300 hover:bg-orange-500/10 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
                Denunciar
              </button>
            )}
            {eliminar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierto(false);
                  onEliminar(objetoTipo, objetoId);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Eliminar
              </button>
            )}
            {esAutor && !eliminar && (
              <div className="px-4 py-2.5 text-xs text-white/40">Sin acciones disponibles</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
