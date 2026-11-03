import { useState } from "react";
import { enviar, ErrorDeApi, useDatos } from "../../../servicios/api";

type Equipo = { id: string; nombre: string; miembros: { estudianteId: string; nombre: string }[] };

export default function EquiposTarea({ tareaId, alumnos, onCambio }: { tareaId: string; alumnos: { estudianteId: string; nombre: string }[]; onCambio: () => void }) {
  const { datos, recargar } = useDatos<{ equipos: Equipo[] }>(`/api/tareas/${tareaId}/equipos`);
  const [nombre, setNombre] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const ocupados = new Set(datos?.equipos.flatMap(e => e.miembros.map(m => m.estudianteId)) ?? []);
  async function crear() {
    setGuardando(true); setError("");
    try { await enviar(`/api/tareas/${tareaId}/equipos`, "POST", { nombre: nombre.trim(), estudiantes: seleccion }); setNombre(""); setSeleccion([]); recargar(); onCambio(); }
    catch (e) { setError(e instanceof ErrorDeApi ? e.message : "No se pudo crear el equipo."); }
    finally { setGuardando(false); }
  }
  async function borrar(id: string) {
    setError("");
    try { await enviar(`/api/tareas/${tareaId}/equipos/${id}`, "DELETE"); recargar(); onCambio(); }
    catch (e) { setError(e instanceof ErrorDeApi ? e.message : "No se pudo quitar el equipo."); }
  }
  return <section className="mb-4 rounded-xl border border-white/10 bg-fondo p-4 space-y-3"><h4 className="font-bold text-white">Equipos de esta tarea</h4>
    {datos?.equipos.map(e => <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-lienzo p-3 text-sm"><div><strong className="text-white">{e.nombre}</strong><p className="text-slate-400">{e.miembros.map(m => m.nombre).join(", ")}</p></div><button type="button" onClick={() => borrar(e.id)} className="text-rose-300 text-xs">Quitar</button></div>)}
    <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={100} placeholder="Nombre del equipo" className="w-full rounded-lg border border-white/10 bg-lienzo p-2 text-sm text-white" />
    <div className="grid grid-cols-2 gap-2">{alumnos.filter(a => !ocupados.has(a.estudianteId)).map(a => <label key={a.estudianteId} className="text-sm text-slate-300"><input type="checkbox" checked={seleccion.includes(a.estudianteId)} onChange={e => setSeleccion(ids => e.target.checked ? [...ids,a.estudianteId] : ids.filter(id => id !== a.estudianteId))} className="mr-2"/>{a.nombre}</label>)}</div>
    <button type="button" onClick={crear} disabled={guardando || !nombre.trim() || seleccion.length < 2} className="rounded-lg bg-acento px-4 py-2 text-sm font-bold text-black disabled:opacity-40">Crear equipo</button>
    {error && <p role="alert" className="text-rose-400 text-xs">{error}</p>}
  </section>;
}
