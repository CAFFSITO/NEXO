import { useState } from "react";
import type { Meta } from "../../../servicios/objetivos";
import {
  agregarSubtarea,
  editarSubtarea,
  eliminarSubtarea,
} from "../../../servicios/objetivos";
import { progresoDeMeta } from "./tiposDashboard";
import { fechaCorta, textoVencimiento, colorVencimiento } from "../../../servicios/fechas";

interface Props {
  meta: Meta;
  onCambio: () => void;
  onCerrar: () => void;
  onEditar: () => void;
  onArchivar: () => void;
}

// Detalle de una meta con sus subtareas, editables y completables UNA POR UNA,
// con la naturalidad de Todoist (Errores 2.D.6 y 2.D.7). El progreso se cuenta
// de las subtareas hechas; no hay número inventado (Error 2.D.15).
export default function ModalDetalleMeta({ meta, onCambio, onCerrar, onEditar, onArchivar }: Props) {
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const conError = (accion: Promise<unknown>) =>
    accion.then(onCambio).catch((e) =>
      setError(e instanceof Error ? e.message : "No se pudo actualizar la subtarea.")
    );

  const toggle = (id: string, completada: boolean) =>
    conError(editarSubtarea(id, { completada }));

  const agregar = async () => {
    if (!nueva.trim()) return;
    await conError(agregarSubtarea(meta.id, nueva.trim()));
    setNueva("");
  };

  const guardarEdicion = async (id: string) => {
    if (!textoEdit.trim()) return;
    await conError(editarSubtarea(id, { titulo: textoEdit.trim() }));
    setEditando(null);
  };

  const progreso = progresoDeMeta(meta);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg bg-[#2D1B4E] rounded-[20px] border border-purple-900/30 shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-bold font-headline text-white pr-4">{meta.titulo}</h2>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEditar}
                title="Editar meta"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button
                onClick={onArchivar}
                title="Archivar meta"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">archive</span>
              </button>
              <button
                onClick={onCerrar}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {meta.materia && <span className="text-slate-400">{meta.materia}</span>}
            {meta.unidad && <span className="text-slate-500">· {meta.unidad}</span>}
            <span className={colorVencimiento(meta.venceEl)}>
              {textoVencimiento(meta.venceEl)} ({fechaCorta(meta.venceEl)})
            </span>
          </div>
          {/* Progreso derivado */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">
                {meta.subtareasHechas}/{meta.subtareasTotal} subtareas
              </span>
              <span className="text-[#C548F5] font-bold">{progreso}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C548F5] transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subtareas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {meta.subtareas.length === 0 && (
            <p className="text-slate-400 text-sm">Esta meta todavía no tiene subtareas.</p>
          )}
          {meta.subtareas.map((s) => (
            <div key={s.id} className="flex items-center gap-3 group">
              <button
                onClick={() => toggle(s.id, !s.completada)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  s.completada
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-500 hover:border-[#C548F5]"
                }`}
              >
                {s.completada && (
                  <span className="material-symbols-outlined text-white text-[14px]">check</span>
                )}
              </button>
              {editando === s.id ? (
                <input
                  autoFocus
                  value={textoEdit}
                  onChange={(e) => setTextoEdit(e.target.value)}
                  onBlur={() => guardarEdicion(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && guardarEdicion(s.id)}
                  className="flex-1 bg-[#1C1030] text-white text-sm rounded px-2 py-1 border border-[#C548F5]/50 outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditando(s.id);
                    setTextoEdit(s.titulo);
                  }}
                  className={`flex-1 text-left text-sm ${
                    s.completada ? "text-slate-500 line-through" : "text-white"
                  }`}
                >
                  {s.titulo}
                </button>
              )}
              <button
                onClick={() => conError(eliminarSubtarea(s.id))}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                aria-label="Borrar subtarea"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}

          {/* Nueva subtarea */}
          <div className="flex items-center gap-2 pt-2">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">add</span>
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar()}
              placeholder="Agregar subtarea…"
              className="flex-1 bg-transparent text-white text-sm border-b border-white/10 focus:border-[#C548F5] outline-none py-1 placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
