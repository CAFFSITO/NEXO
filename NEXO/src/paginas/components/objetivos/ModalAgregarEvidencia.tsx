import { useEffect, useRef, useState } from "react";
import type { DatosEvidencia } from "../../../servicios/objetivos";

export interface TrabajoDisponible { id: string; titulo: string; icono: string }
interface Props {
  competenciaNombre: string;
  trabajos: TrabajoDisponible[];
  onGuardar: (datos: DatosEvidencia) => Promise<void>;
  onCerrar: () => void;
}
export default function ModalAgregarEvidencia({ competenciaNombre, trabajos, onGuardar, onCerrar }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [titulo, setTitulo] = useState("");
  const [tareaId, setTareaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || !titulo.trim()) return;
    setGuardando(true); setError("");
    try { await onGuardar({ titulo: titulo.trim(), descripcion: descripcion.trim(), tareaId: tareaId || null }); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la evidencia."); }
    finally { setGuardando(false); }
  };
  return <dialog ref={dialog} className="nexo-search-dialog" aria-labelledby="evidencia-titulo" onCancel={e => { if (guardando) e.preventDefault(); else onCerrar(); }} onClose={onCerrar}>
    <form onSubmit={guardar} className="p-6 space-y-5">
      <header className="flex justify-between gap-4"><div><h2 id="evidencia-titulo" className="font-headline text-xl font-bold">Agregar evidencia</h2><p className="text-sm text-primary mt-1">{competenciaNombre}</p></div><button type="button" disabled={guardando} onClick={onCerrar} aria-label="Cerrar" className="nexo-icon-button"><span className="material-symbols-outlined">close</span></button></header>
      <label className="block text-sm">Título<input autoFocus required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="¿Qué aprendiste o lograste?" className="mt-2 block w-full bg-background border border-outline-variant/50 rounded-xl p-3" /></label>
      <label className="block text-sm">Trabajo del portafolio <span className="text-on-surface-variant/60">· opcional</span><select value={tareaId} onChange={e => { setTareaId(e.target.value); if (!titulo) setTitulo(trabajos.find(t => t.id === e.target.value)?.titulo ?? ""); }} className="mt-2 block w-full bg-background border border-outline-variant/50 rounded-xl p-3"><option value="">Evidencia de una experiencia personal</option>{trabajos.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}</select></label>
      <label className="block text-sm">Tu reflexión<textarea value={descripcion} maxLength={10000} onChange={e => setDescripcion(e.target.value)} placeholder="Contá cómo esta experiencia demuestra tu competencia." rows={4} className="mt-2 block w-full bg-background border border-outline-variant/50 rounded-xl p-3 resize-y" /></label>
      {error && <p role="alert" className="text-error text-sm">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={guardando} onClick={onCerrar} className="px-4 py-3 text-sm">Cancelar</button><button disabled={guardando || !titulo.trim()} className="bg-primary text-on-primary px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50">{guardando ? "Guardando…" : "Guardar evidencia"}</button></div>
    </form>
  </dialog>;
}
