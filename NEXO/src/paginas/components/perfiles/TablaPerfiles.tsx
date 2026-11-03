// src/paginas/components/perfiles/TablaPerfiles.tsx
// Tabla de perfiles académicos. Presentacional: recibe la página ya filtrada/paginada
// y emite acciones por fila (editar, eliminar/restaurar). La lógica vive en la página.

import BadgePerfilRol from "./BadgePerfilRol";
import type { EstadoPerfil, Perfil } from "./tipos";
import type { PerfilDeLaEscuela } from "../../../servicios/instancia";

interface TablaPerfilesProps {
  perfiles: Perfil[]; // slice de la página actual
  totalFiltrados: number;
  totalGeneral: number;
  paginaActual: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  onEditar: (perfil: Perfil) => void;
  onEliminar: (perfil: Perfil) => void;
  onRestaurar: (id: string) => void;
  /** Solo para los que están en la papelera: borrar para siempre. */
  onBorrarDefinitivo: (perfil: Perfil) => void;
  /** Plazo de la papelera de esta escuela (genoma); null = no se purga sola. */
  diasPapelera: number | null;
  /** Los perfiles de la escuela, para mostrar el nombre del perfil diseñado. */
  perfilesEscuela: PerfilDeLaEscuela[];
}

const BOTON_FILA =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors";

const PUNTO_ESTADO: Record<EstadoPerfil, { color: string; label: string }> = {
  activo: { color: "bg-green-500", label: "Activo" },
  inactivo: { color: "bg-slate-500", label: "Inactivo" },
  papelera: { color: "bg-amber-500", label: "En papelera" },
};

// Cuántos días le quedan a un perfil en la papelera antes del borrado definitivo
// (sección 14.17). El plazo lo dice el servidor: es el del genoma de la escuela.
function diasRestantes(eliminadoEn: string | null | undefined, plazo: number | null): number | null {
  if (!eliminadoEn || plazo === null) return null;
  const borrado = new Date(eliminadoEn).getTime();
  if (Number.isNaN(borrado)) return null;
  const transcurridos = (Date.now() - borrado) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(plazo - transcurridos));
}

function textoPapelera(eliminadoEn: string | null | undefined, plazo: number | null): string {
  if (plazo === null) return "En papelera · sin purga automática";
  const dias = diasRestantes(eliminadoEn, plazo);
  if (dias === null) return "En papelera";
  if (dias === 0) return "En papelera · se borra hoy";
  return `En papelera · ${dias} ${dias === 1 ? "día" : "días"}`;
}

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
  onBorrarDefinitivo,
  diasPapelera,
  perfilesEscuela,
}: TablaPerfilesProps) {
  return (
    <div className="nx-tarjeta overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-slate-400 text-[11px] uppercase tracking-[0.2em] font-black">
              <th className="px-8 py-5">Perfil académico</th>
              <th className="px-6 py-5">Rol institucional</th>
              <th className="px-6 py-5">Asignación / Curso</th>
              <th className="px-6 py-5">Estado</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {perfiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mx-auto mb-2 opacity-50">
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
                    className={`${i % 2 === 0 ? "bg-lienzo" : "bg-fondo"} hover:bg-surface-bright/20 transition-colors group ${enPapelera ? "opacity-60" : ""}`}
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
                      <PerfilDisenado clave={perfil.perfilClave} perfiles={perfilesEscuela} />
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm font-medium">
                      {perfil.asignacion}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${estado.color}`} />
                        <span className="text-xs text-white font-medium">
                          {enPapelera ? textoPapelera(perfil.eliminadoEn, diasPapelera) : estado.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {/* Siempre a la vista y con su nombre escrito: un ícono suelto
                          que aparece solo al pasar el mouse no lo encuentra quien no
                          está acostumbrado a la computadora. */}
                      <div className="flex flex-wrap justify-end gap-2">
                        {enPapelera ? (
                          <>
                            <button
                              onClick={() => onRestaurar(perfil.id)}
                              title="Restaurar"
                              className={`${BOTON_FILA} border-green-500/30 text-green-300 hover:bg-green-500/10`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">restore</span>
                              Restaurar
                            </button>
                            <button
                              onClick={() => onBorrarDefinitivo(perfil)}
                              title="Borrar definitivamente"
                              className={`${BOTON_FILA} border-red-500/30 text-red-300 hover:bg-red-500/10`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">delete_forever</span>
                              Borrar para siempre
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onEditar(perfil)}
                              title="Editar"
                              className={`${BOTON_FILA} border-white/15 text-slate-200 hover:bg-white/5`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => onEliminar(perfil)}
                              title="Enviar a papelera"
                              className={`${BOTON_FILA} border-red-500/30 text-red-300 hover:bg-red-500/10`}
                            >
                              <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                              Eliminar
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

/** El perfil diseñado por el Maestro que tiene asignado la persona, si tiene uno. */
function PerfilDisenado({ clave, perfiles }: { clave?: string | null; perfiles: PerfilDeLaEscuela[] }) {
  const disenado = clave ? perfiles.find((p) => p.clave === clave) : null;
  if (!disenado) return null;
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant/80">
      <span className="nexo-perfil-punto" style={{ background: disenado.color }} aria-hidden="true" />
      {disenado.nombre}
    </span>
  );
}
