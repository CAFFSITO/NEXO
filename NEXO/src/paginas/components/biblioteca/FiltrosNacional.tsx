import { LABEL_POR_TIPO, type TipoRecurso } from "./tiposNacional";

// Estado de los filtros. "todos" = sin filtrar.
export interface EstadoFiltros {
  query: string;
  materia: string;
  tipo: TipoRecurso | "todos";
  escuela: string;
  fecha: "todos" | "recientes" | "mes" | "historico";
}

export const FILTROS_INICIALES: EstadoFiltros = {
  query: "",
  materia: "todos",
  tipo: "todos",
  escuela: "todos",
  fecha: "todos",
};

interface FiltrosNacionalProps {
  filtros: EstadoFiltros;
  materias: string[];
  escuelas: string[];
  onChange: (filtros: EstadoFiltros) => void;
}

const SELECT_CLASS =
  "appearance-none bg-[#25193a] border border-fuchsia-900/20 rounded-full py-2 pl-4 pr-10 text-sm text-slate-300 focus:outline-none hover:border-fuchsia-500/30 transition-all cursor-pointer";

export default function FiltrosNacional({ filtros, materias, escuelas, onChange }: FiltrosNacionalProps) {
  // Helper genérico para actualizar un solo campo del estado de filtros
  const set = <K extends keyof EstadoFiltros>(campo: K, valor: EstadoFiltros[K]) =>
    onChange({ ...filtros, [campo]: valor });

  const tipos = Object.keys(LABEL_POR_TIPO) as TipoRecurso[];

  return (
    <div className="mb-8 space-y-4">
      {/* Buscador de texto libre */}
      <div className="relative max-w-2xl">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          search
        </span>
        <input
          type="text"
          value={filtros.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Buscar recursos educativos..."
          className="w-full bg-[#25193a] border border-fuchsia-900/20 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
        />
      </div>

      {/* Filtros desplegables */}
      <div className="flex flex-wrap gap-3">
        <FiltroSelect value={filtros.materia} onChange={(v) => set("materia", v)} placeholder="Materia">
          {materias.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </FiltroSelect>

        <FiltroSelect
          value={filtros.tipo}
          onChange={(v) => set("tipo", v as TipoRecurso | "todos")}
          placeholder="Tipo de recurso"
        >
          {tipos.map((t) => (
            <option key={t} value={t}>
              {LABEL_POR_TIPO[t]}
            </option>
          ))}
        </FiltroSelect>

        <FiltroSelect value={filtros.escuela} onChange={(v) => set("escuela", v)} placeholder="Escuela">
          {escuelas.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </FiltroSelect>

        <FiltroSelect
          value={filtros.fecha}
          onChange={(v) => set("fecha", v as EstadoFiltros["fecha"])}
          placeholder="Fecha"
        >
          <option value="recientes">Recientes</option>
          <option value="mes">Este mes</option>
          <option value="historico">Histórico</option>
        </FiltroSelect>
      </div>
    </div>
  );
}

// Select estilizado reutilizable. value "todos" muestra el placeholder.
interface FiltroSelectProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FiltroSelect({ value, placeholder, onChange, children }: FiltroSelectProps) {
  return (
    <div className="relative">
      <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="todos">{placeholder}</option>
        {children}
      </select>
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">
        expand_more
      </span>
    </div>
  );
}
