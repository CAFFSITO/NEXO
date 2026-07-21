// src/paginas/components/perfiles/FiltrosPerfiles.tsx
// Barra de búsqueda + filtros por rol y estado. Componente controlado: el estado
// vive en la página, acá solo se emiten cambios.

import { META_ROL, ROLES, type EstadoPerfil, type Rol } from "./tipos";

export type FiltroRol = Rol | "todos";
export type FiltroEstado = EstadoPerfil | "todos";

interface FiltrosPerfilesProps {
  busqueda: string;
  filtroRol: FiltroRol;
  filtroEstado: FiltroEstado;
  onBuscar: (texto: string) => void;
  onFiltrarRol: (rol: FiltroRol) => void;
  onFiltrarEstado: (estado: FiltroEstado) => void;
}

const ESTADOS: { valor: FiltroEstado; label: string }[] = [
  { valor: "todos", label: "Todos los estados" },
  { valor: "activo", label: "Activos" },
  { valor: "inactivo", label: "Inactivos" },
  { valor: "papelera", label: "Papelera" },
];

export default function FiltrosPerfiles({
  busqueda,
  filtroRol,
  filtroEstado,
  onBuscar,
  onFiltrarRol,
  onFiltrarEstado,
}: FiltrosPerfilesProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      {/* Buscador */}
      <div className="relative flex-1">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          search
        </span>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder="Buscar por nombre o identificador..."
          className="w-full bg-surface-container border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-slate-500 focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Filtro por rol */}
      <select
        value={filtroRol}
        onChange={(e) => onFiltrarRol(e.target.value as FiltroRol)}
        className="bg-surface-container border border-white/5 rounded-full px-4 py-2.5 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
      >
        <option value="todos">Todos los roles</option>
        {ROLES.map((rol) => (
          <option key={rol} value={rol}>
            {META_ROL[rol].label}
          </option>
        ))}
      </select>

      {/* Filtro por estado */}
      <select
        value={filtroEstado}
        onChange={(e) => onFiltrarEstado(e.target.value as FiltroEstado)}
        className="bg-surface-container border border-white/5 rounded-full px-4 py-2.5 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
      >
        {ESTADOS.map((e) => (
          <option key={e.valor} value={e.valor}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
