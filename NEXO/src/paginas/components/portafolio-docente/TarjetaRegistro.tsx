// src/paginas/components/portafolio-docente/TarjetaRegistro.tsx
// Tarjeta de un registro del Diario Reflexivo Docente.
// Muestra resumen de la sesión + reflexión "¿Qué funcionó?" / "¿Qué mejorar?".

import { useState } from "react";

export interface Registro {
  id: string;
  titulo: string;
  fecha: string; // ISO: "2026-03-19"
  materiaCurso: string; // "Matemática, 4° B"
  resumen: string;
  queFunciono: string;
  queMejorar: string;
}

interface TarjetaRegistroProps {
  registro: Registro;
  destacado?: boolean; // resalta el borde (registro más reciente)
  onEditar?: (id: string) => void;
}

// Formatea "2026-03-19" → "19/03"
function formatearFechaCorta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function TarjetaRegistro({ registro, destacado = false, onEditar }: TarjetaRegistroProps) {
  const [expandido, setExpandido] = useState<boolean>(false);

  return (
    <article
      className={`bg-[#2D1B4E] p-6 rounded-lg shadow-lg border-l-4 group hover:translate-x-1 transition-transform ${
        destacado ? "border-[#C548F5]" : "border-slate-600"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h4 className="text-2xl font-bold text-white font-headline">{registro.titulo}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="bg-[#1C1030] text-[#C548F5] text-xs font-bold px-3 py-1 rounded-full">
              {formatearFechaCorta(registro.fecha)}
            </span>
            <span className="text-slate-400 text-sm font-medium">{registro.materiaCurso}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEditar && (
            <button
              onClick={() => onEditar(registro.id)}
              className="flex items-center gap-1 text-slate-400 font-bold hover:text-[#C548F5] px-3 py-2 rounded-full transition-colors font-label"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          )}
          <button
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-2 text-[#C548F5] font-bold hover:bg-[#C548F5]/10 px-4 py-2 rounded-full transition-colors font-label"
          >
            {expandido ? "Ocultar" : "Ver completo"}
            <span
              className="material-symbols-outlined text-sm transition-transform"
              style={expandido ? { transform: "rotate(90deg)" } : undefined}
            >
              arrow_forward
            </span>
          </button>
        </div>
      </div>

      <p className="text-slate-300 text-sm mb-6 leading-relaxed">{registro.resumen}</p>

      {expandido && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-[#10B981] bg-[#1C1030]/50 p-4 rounded-r-lg">
            <h5 className="text-[#10B981] text-[10px] font-black uppercase tracking-widest mb-1">
              ¿Qué funcionó?
            </h5>
            <p className="text-sm text-slate-200">{registro.queFunciono}</p>
          </div>
          <div className="border-l-4 border-[#F59E0B] bg-[#1C1030]/50 p-4 rounded-r-lg">
            <h5 className="text-[#F59E0B] text-[10px] font-black uppercase tracking-widest mb-1">
              ¿Qué mejorar?
            </h5>
            <p className="text-sm text-slate-200">{registro.queMejorar}</p>
          </div>
        </div>
      )}
    </article>
  );
}
