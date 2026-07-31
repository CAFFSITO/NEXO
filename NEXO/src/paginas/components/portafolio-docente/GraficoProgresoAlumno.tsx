import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { fechaCorta } from "../../../servicios/fechas";
import type { PuntoProgreso } from "../../../servicios/materia";

// Gráfico del progreso de un alumno en una materia (SOLO vista del profesor).
// La serie sale de la tabla `correcciones` real (nota + corregido_en): sin notas
// no se dibuja nada inventado, se muestra un estado vacío honesto.
//
// Dos lecturas de los MISMOS datos reales:
//   · Línea  → evolución de la nota en el tiempo (por fecha de corrección).
//   · Barras → nota por tarea corregida.

const FUCSIA = "#C548F5";
const APROBACION = 6; // escala 1–10, criterio argentino

// Verde si aprobó, ámbar si no: color por barra, del dato real (no decorativo).
const colorNota = (nota: number) => (nota >= APROBACION ? "#4ade80" : "#f59e0b");

interface Props {
  serie: PuntoProgreso[];
}

export default function GraficoProgresoAlumno({ serie }: Props) {
  const [modo, setModo] = useState<"linea" | "barras">("linea");

  if (serie.length === 0) {
    return (
      <div className="bg-[#1C1030] border border-white/5 rounded-[14px] p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">show_chart</span>
        <p className="text-slate-400 text-sm">
          Todavía no hay notas corregidas de este alumno en la materia.
        </p>
      </div>
    );
  }

  // Se numeran las tareas para el eje de barras (títulos largos no entran); el
  // nombre completo va en el tooltip.
  const datos = serie.map((p, i) => ({
    ...p,
    fechaLabel: fechaCorta(p.fecha),
    tareaLabel: `T${i + 1}`,
  }));

  const promedio =
    Math.round((serie.reduce((a, p) => a + p.nota, 0) / serie.length) * 10) / 10;

  return (
    <div className="bg-[#1C1030] border border-white/5 rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Promedio</span>
          <span className="text-2xl font-black text-white">{promedio}</span>
          <span className="text-slate-500 text-xs">/ 10 · {serie.length} corregidas</span>
        </div>
        <div className="flex bg-[#2D1B4E] rounded-full p-1">
          {(["linea", "barras"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                modo === m ? "bg-[#C548F5] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === "linea" ? "Evolución" : "Por tarea"}
            </button>
          ))}
        </div>
      </div>

      {/* ResponsiveContainer: el gráfico se adapta al ancho, sin scroll horizontal. */}
      <ResponsiveContainer width="100%" height={260}>
        {modo === "linea" ? (
          <LineChart data={datos} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
            <XAxis dataKey="fechaLabel" stroke="#94a3b8" fontSize={11} tickMargin={8} />
            <YAxis domain={[1, 10]} ticks={[1, 4, 6, 8, 10]} stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#2D1B4E", border: "1px solid #ffffff20", borderRadius: 12, color: "#fff" }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(v: number, _n, item) => [`${v} / 10`, item?.payload?.tarea ?? "Nota"]}
            />
            <Line
              type="monotone"
              dataKey="nota"
              stroke={FUCSIA}
              strokeWidth={2.5}
              dot={{ r: 4, fill: FUCSIA }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : (
          <BarChart data={datos} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
            <XAxis dataKey="tareaLabel" stroke="#94a3b8" fontSize={11} tickMargin={8} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} stroke="#94a3b8" fontSize={11} />
            <Tooltip
              cursor={{ fill: "#ffffff0a" }}
              contentStyle={{ background: "#2D1B4E", border: "1px solid #ffffff20", borderRadius: 12, color: "#fff" }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(v: number, _n, item) => [`${v} / 10`, item?.payload?.tarea ?? "Nota"]}
            />
            <Bar dataKey="nota" radius={[6, 6, 0, 0]}>
              {datos.map((p, i) => (
                <Cell key={i} fill={colorNota(p.nota)} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
