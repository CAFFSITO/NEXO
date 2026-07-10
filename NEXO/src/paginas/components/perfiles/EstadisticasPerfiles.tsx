// src/paginas/components/perfiles/EstadisticasPerfiles.tsx
// Bento de métricas. Se calculan a partir de la lista real de perfiles (no hardcodeadas).

import type { Perfil } from "./tipos";

interface EstadisticasPerfilesProps {
  perfiles: Perfil[]; // lista completa (sin filtrar) excluyendo papelera
}

export default function EstadisticasPerfiles({ perfiles }: EstadisticasPerfilesProps) {
  const total = perfiles.length;
  const docentes = perfiles.filter((p) => p.rol === "profesor").length;
  const estudiantes = perfiles.filter((p) => p.rol === "estudiante").length;
  const activos = perfiles.filter((p) => p.estado === "activo").length;
  const actividad = total === 0 ? 0 : Math.round((activos / total) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-surface-container rounded-3xl p-6 border border-white/5 hover:border-primary/20 transition-all">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Total Usuarios
          </span>
          <span className="material-symbols-outlined text-primary">group</span>
        </div>
        <div className="text-3xl font-black text-white">{total.toLocaleString("es-AR")}</div>
      </div>

      <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Docentes
          </span>
          <span className="material-symbols-outlined text-secondary">school</span>
        </div>
        <div className="text-3xl font-black text-white">{docentes}</div>
      </div>

      <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Estudiantes
          </span>
          <span className="material-symbols-outlined text-tertiary">face</span>
        </div>
        <div className="text-3xl font-black text-white">
          {estudiantes.toLocaleString("es-AR")}
        </div>
      </div>

      <div className="bg-surface-container rounded-3xl p-6 border border-white/5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Actividad
          </span>
          <span className="material-symbols-outlined text-primary">bolt</span>
        </div>
        <div className="text-3xl font-black text-white">{actividad}%</div>
        <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-primary h-full transition-all" style={{ width: `${actividad}%` }} />
        </div>
      </div>
    </div>
  );
}
