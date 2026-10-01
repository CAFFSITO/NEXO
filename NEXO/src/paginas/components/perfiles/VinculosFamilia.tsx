import { useState } from "react";
import { useDatos } from "../../../servicios/api";
import { guardarVinculosFamilia, useOpcionesGestionAcademica } from "../../../servicios/gestionAcademica";
import { Cargando, Fallo } from "../shared/EstadoCarga";

type Vinculo = { id: string; parentesco: string };
export default function VinculosFamilia({ familiaId }: { familiaId: string }) {
  const estado = useDatos<{ estudiantes: Vinculo[] }>(`/api/perfiles/${familiaId}/vinculos`);
  const opciones = useOpcionesGestionAcademica();
  const [cambios, setCambios] = useState<Vinculo[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const seleccionados = cambios ?? estado.datos?.estudiantes ?? [];
  const guardar = async () => {
    if (guardando) return;
    setGuardando(true); setError(""); setAviso("");
    try { await guardarVinculosFamilia(familiaId, seleccionados); estado.recargar(); setAviso("Vínculos familiares guardados."); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron guardar los vínculos."); }
    finally { setGuardando(false); }
  };
  return <section className="mt-6 pt-5 border-t border-white/10">
    <h4 className="font-bold text-white">Estudiantes a cargo</h4>
    <p className="text-xs text-slate-400 mt-1 mb-4">Estos vínculos determinan los comunicados y eventos que recibe la familia. Se guardan con el botón de esta sección.</p>
    {estado.cargando || opciones.cargando ? <Cargando que="los vínculos" /> : estado.error || opciones.error ? <Fallo error={estado.error ?? opciones.error!} onReintentar={() => { estado.recargar(); opciones.recargar(); }} /> : <>
      <div className="max-h-52 overflow-y-auto space-y-2">{opciones.datos?.estudiantes.map(estudiante => {
        const seleccionado = seleccionados.find(e => e.id === estudiante.id);
        return <div key={estudiante.id} className="p-3 bg-background rounded-xl">
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={guardando} checked={!!seleccionado} onChange={e => setCambios(e.target.checked ? [...seleccionados, { id: estudiante.id, parentesco: "madre/padre" }] : seleccionados.filter(s => s.id !== estudiante.id))} />{estudiante.nombre}</label>
          {seleccionado && <input aria-label={`Parentesco con ${estudiante.nombre}`} maxLength={80} value={seleccionado.parentesco} onChange={e => setCambios(seleccionados.map(s => s.id === estudiante.id ? { ...s, parentesco: e.target.value } : s))} className="mt-2 w-full text-xs bg-surface-container border border-white/10 p-2 rounded-lg" />}
        </div>;
      })}</div>
      <button type="button" onClick={guardar} disabled={guardando} className="mt-3 px-4 py-2 border border-primary/40 rounded-xl text-sm text-primary disabled:opacity-50">{guardando ? "Guardando…" : "Guardar vínculos"}</button>
    </>}
    {aviso && <p role="status" className="text-emerald-300 text-xs mt-3">{aviso}</p>}
    {error && <p role="alert" className="text-error text-xs mt-3">{error}</p>}
  </section>;
}
