// src/paginas/components/perfiles/TablaPerfiles.tsx
// Tabla de perfiles académicos. Presentacional: recibe la página ya filtrada/paginada
// y emite acciones por fila (editar, eliminar/restaurar). La lógica vive en la página.

import BadgePerfilRol from "./BadgePerfilRol";
import type { EstadoPerfil, Perfil } from "./tipos";

interface TablaPerfilesProps {
  perfiles: Perfil[]; // slice de la página actual
  totalFiltrados: number;
  totalGeneral: number;
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  onEditar: (perfil: Perfil) => void;
  onEliminar: (id: string) => void;
  onRestaurar: (id: string) => void;
}

const PUNTO_ESTADO: Record<EstadoPerfil, { color: string; label: string }> = {
  activo: { color: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]", label: "Activo" },
  inactivo: { color: "bg-slate-500", label: "Inactivo" },
  papelera: { color: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", label: "En papelera" },
};

export default function TablaPerfiles({
  perfiles,
  totalFiltrados,
  totalGeneral,
  paginaActual,
  totalPaginas,
  onCambiarPagina,
  onEditar,
  onEliminar,
  onRestaurar,
}: TablaPerfilesProps) {
  return (
    <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-slate-400 text-[11px] uppercase tracking-[0.2em] font-black">
              <th className="px-8 py-5">Perfil Académico</th>
              <th className="px-6 py-5">Rol Institucional</th>
              <th className="px-6 py-5">Asignación / Curso</th>
              <th className="px-6 py-5">Estado</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {perfiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">
                    person_search
                  </span>
                  No se encontraron perfiles con los filtros aplicados.
                </td>
              </tr>
            ) : (
              perfiles.map((perfil, i) => {
                const estado = PUNTO_ESTADO[perfil.estado];
                const enPapelera = perfil.estado === "papelera";
                return (
                  <tr
                    key={perfil.id}
                    className={`${i % 2 === 0 ? "bg-[#2D1B4E]" : "bg-[#1C1030]"} hover:bg-surface-bright/20 transition-colors group ${enPapelera ? "opacity-60" : ""}`}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        {perfil.avatarUrl ? (
                          <img
                            alt={perfil.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                            src={perfil.avatarUrl}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-sm font-bold text-white">
                            {perfil.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold text-sm">{perfil.nombre}</p>
                          <p className="text-slate-400 text-xs">{perfil.identificador}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <BadgePerfilRol rol={perfil.rol} />
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm font-medium">
                      {perfil.asignacion}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${estado.color}`} />
                        <span className="text-xs text-white font-medium">{estado.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {enPapelera ? (
                          <button
                            onClick={() => onRestaurar(perfil.id)}
                            title="Restaurar"
                            className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">restore</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => onEditar(perfil)}
                              title="Editar"
                              className="p-2 text-slate-400 hover:text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => onEliminar(perfil.id)}
                              title="Enviar a papelera"
                              className="p-2 text-slate-400 hover:text-error transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Paginación */}
      <div className="px-8 py-6 bg-white/5 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Mostrando {perfiles.length} de {totalFiltrados.toLocaleString("es-AR")} perfiles
          {totalFiltrados !== totalGeneral && (
            <span className="text-slate-500"> (filtrados de {totalGeneral.toLocaleString("es-AR")})</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onCambiarPagina(paginaActual - 1)}
            disabled={paginaActual <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
            <button
              key={pagina}
              onClick={() => onCambiarPagina(pagina)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                pagina === paginaActual
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {pagina}
            </button>
          ))}

          <button
            onClick={() => onCambiarPagina(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
