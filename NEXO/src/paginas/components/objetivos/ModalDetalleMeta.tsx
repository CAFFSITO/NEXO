import { useState } from "react";
import type { Meta, Subtarea } from "../../../servicios/objetivos";
import {
  agregarSubtarea,
  editarSubtarea,
  eliminarSubtarea,
} from "../../../servicios/objetivos";
import { progresoDeMeta } from "./tiposDashboard";
import { fechaCorta, textoVencimiento, colorVencimiento } from "../../../servicios/fechas";
import BotonConversacionContextual from "../shared/BotonConversacionContextual";
import Selector from "../shared/Selector";
import { subirArchivo, urlDescarga } from "../../../servicios/archivos";
import { useDatos } from "../../../servicios/api";

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
  const [padreNuevo, setPadreNuevo] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [detallePaso, setDetallePaso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conError = (accion: Promise<unknown>) =>
    accion.then(onCambio).catch((e) =>
      setError(e instanceof Error ? e.message : "No se pudo actualizar la subtarea.")
    );

  const toggle = (id: string, completada: boolean) =>
    conError(editarSubtarea(id, { completada }));

  const agregar = async () => {
    if (!nueva.trim()) return;
    await conError(agregarSubtarea(meta.id, nueva.trim(), padreNuevo));
    setNueva("");
    setPadreNuevo(null);
  };

  const guardarEdicion = async (id: string) => {
    if (!textoEdit.trim()) return;
    await conError(editarSubtarea(id, { titulo: textoEdit.trim() }));
    setEditando(null);
  };

  const progreso = progresoDeMeta(meta);
  const porPadre = new Map<string | null, Subtarea[]>();
  const ids = new Set(meta.subtareas.map(s => s.id));
  for (const s of meta.subtareas) {
    const padre = s.padreId && ids.has(s.padreId) ? s.padreId : null;
    porPadre.set(padre, [...(porPadre.get(padre) ?? []), s]);
  }
  const subtareasJerarquicas: { subtarea: Subtarea; nivel: number }[] = [];
  const visitados = new Set<string>();
  const visitar = (padre: string | null, nivel: number) => {
    for (const s of porPadre.get(padre) ?? []) {
      if (visitados.has(s.id)) continue;
      visitados.add(s.id);
      subtareasJerarquicas.push({ subtarea: s, nivel });
      visitar(s.id, nivel + 1);
    }
  };
  visitar(null, 0);
  for (const s of meta.subtareas) if (!visitados.has(s.id)) visitar(s.padreId, 0);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg bg-lienzo rounded-[20px] border border-purple-900/30 shadow-2xl max-h-[88vh] flex flex-col"
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
          <div className="mt-4"><BotonConversacionContextual tipo="meta" id={meta.id} etiqueta="Conversación de la meta" /></div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">
                {meta.subtareasHechas}/{meta.subtareasTotal} subtareas
              </span>
              <span className="text-acento font-bold">{progreso}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-acento transition-all"
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
          {subtareasJerarquicas.map(({ subtarea: s, nivel }) => (
            <div key={s.id} style={{ paddingLeft: Math.min(nivel, 6) * 20 }}><div className="flex items-center gap-3 group">
              <button
                onClick={() => toggle(s.id, !s.completada)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  s.completada
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-500 hover:border-acento"
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
                  className="flex-1 bg-fondo text-white text-sm rounded px-2 py-1 border border-acento/50 outline-none"
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
                onClick={() => setPadreNuevo(s.id)} aria-label={`Agregar paso dentro de ${s.titulo}`}
                className="text-slate-400 hover:text-acento shrink-0"
              ><span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span></button>
              <button onClick={() => setDetallePaso(detallePaso === s.id ? null : s.id)} aria-label={`Detalles de ${s.titulo}`} className="text-slate-400 hover:text-acento shrink-0"><span aria-hidden="true" className="material-symbols-outlined text-[18px]">tune</span></button>
              <button
                onClick={() => conError(eliminarSubtarea(s.id))}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                aria-label="Borrar subtarea"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
              </div>
              {detallePaso === s.id && <DetallesSubtarea subtarea={s} pasos={meta.subtareas} onCambio={onCambio} />}
            </div>
          ))}

          {/* Nueva subtarea */}
          {padreNuevo && <p className="text-xs text-acento">Nuevo paso dentro de {meta.subtareas.find(s => s.id === padreNuevo)?.titulo}. <button onClick={() => setPadreNuevo(null)} className="underline">Quitar relación</button></p>}
          <div className="flex items-center gap-2 pt-2">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">add</span>
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar()}
              placeholder="Agregar subtarea…"
              className="flex-1 bg-transparent text-white text-sm border-b border-white/10 focus:border-acento outline-none py-1 placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetallesSubtarea({ subtarea, pasos, onCambio }: { subtarea: Subtarea; pasos: Subtarea[]; onCambio: () => void }) {
  const {datos:responsables}=useDatos<{personas:{id:string;nombre:string;rol:string}[]}>('/api/objetivos/responsables');
  const [evidencia, setEvidencia] = useState(subtarea.evidencia);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  async function guardar(cambios: { evidencia?: string; dependeDeId?: string | null; archivoId?: string | null; responsableId?: string | null }) {
    setGuardando(true); setError("");
    try { await editarSubtarea(subtarea.id, cambios); onCambio(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el paso."); }
    finally { setGuardando(false); }
  }
  return <div className="ml-8 mt-2 mb-3 rounded-lg border border-white/10 bg-fondo p-3 space-y-2 text-xs">
    <label className="block text-slate-300">Responsable de este paso
      <Selector value={subtarea.responsableId??''} onChange={e=>void guardar({responsableId:e.target.value||null})} disabled={guardando} className="block mt-1 w-full rounded bg-lienzo border border-white/10 p-2 text-white"><option value="">Yo</option>{responsables?.personas.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.rol}</option>)}</Selector>
    </label>
    <label className="block text-slate-300">Depende de
      <Selector value={subtarea.dependeDeId ?? ""} onChange={e => guardar({ dependeDeId: e.target.value || null })} disabled={guardando} className="block mt-1 w-full rounded bg-lienzo border border-white/10 p-2 text-white"><option value="">Ningún paso previo</option>{pasos.filter(s => s.id !== subtarea.id).map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}</Selector>
    </label>
    <label className="block text-slate-300">Evidencia o resultado observable
      <textarea value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={3000} rows={2} className="block mt-1 w-full rounded bg-lienzo border border-white/10 p-2 text-white" placeholder="Enlace, descripción, resultado o criterio de comprobación" />
    </label>
    <button type="button" onClick={() => guardar({ evidencia })} disabled={guardando || evidencia === subtarea.evidencia} className="text-acento font-semibold disabled:opacity-40">Guardar evidencia</button>
    <label className="block text-slate-300">Archivo de evidencia
      <input type="file" disabled={guardando} className="block mt-1" onChange={async e => { const archivo=e.target.files?.[0]; if(!archivo)return; setGuardando(true);setError("");try{const subido=await subirArchivo(archivo);await editarSubtarea(subtarea.id,{archivoId:subido.id});onCambio();}catch(error){setError(error instanceof Error?error.message:"No se pudo adjuntar la evidencia.");}finally{setGuardando(false);e.target.value="";} }} />
    </label>
    {subtarea.archivoId&&<div className="flex gap-3"><a href={urlDescarga(subtarea.archivoId)} className="text-acento underline">Descargar evidencia</a><button type="button" disabled={guardando} onClick={()=>void guardar({archivoId:null})} className="text-rose-300">Quitar archivo</button></div>}
    {error && <p role="alert" className="text-rose-400">{error}</p>}
  </div>;
}
