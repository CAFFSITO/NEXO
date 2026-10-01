import { useState } from "react";
import { useDatos } from "../../../servicios/api";
import type { DetalleCurso } from "../../../servicios/perfiles";
import { crearMateria, editarCurso, guardarCatedra, guardarInscripciones, useOpcionesGestionAcademica } from "../../../servicios/gestionAcademica";
import { Cargando, Fallo } from "../shared/EstadoCarga";

type DetalleGestion = Omit<DetalleCurso, "alumnos" | "catedras"> & {
  preceptorId: string | null;
  alumnos: (DetalleCurso["alumnos"][number] & { id: string })[];
  catedras: (DetalleCurso["catedras"][number] & { id: string; materiaId: string; profesorId: string })[];
};
interface Props { cursoId: string | null; onCerrar: () => void; onCambio?: () => void }
export default function ModalDetalleCurso({ cursoId, onCerrar, onCambio }: Props) {
  const { datos, cargando, error, recargar } = useDatos<DetalleGestion>(cursoId ? `/api/cursos/${cursoId}/detalle` : null);
  const [pestana, setPestana] = useState<"resumen" | "gestion">("resumen");
  if (!cursoId) return null;
  const refrescar = () => { recargar(); onCambio?.(); };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-curso-titulo" onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#2D1B4E] p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-between items-start gap-4 mb-6"><div><h2 id="detalle-curso-titulo" className="text-2xl text-white font-bold">{datos ? `${datos.curso.anio}°${datos.curso.division}` : "Curso"}</h2><p className="text-sm text-slate-400 mt-1">Estudiantes, docentes y actividad del curso.</p></div><button aria-label="Cerrar detalle" onClick={onCerrar} className="text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
        <nav className="flex gap-2 mb-6 border-b border-white/10 pb-3">{([['resumen','Resumen'],['gestion','Organizar curso']] as const).map(([id,label]) => <button key={id} onClick={() => setPestana(id)} className={`px-4 py-2 rounded-lg text-sm font-bold ${pestana === id ? 'bg-[#C548F5]/20 text-[#C548F5]' : 'text-slate-400'}`}>{label}</button>)}</nav>
        {cargando && !datos ? <Cargando que="el curso" /> : error ? <Fallo error={error} onReintentar={recargar} /> : datos && (pestana === "gestion" ? <GestionCurso detalle={datos} onCambio={refrescar} /> : <div className="space-y-6">
          <section className="rounded-xl bg-[#1C1030] p-4"><p className="text-xs uppercase text-slate-400 mb-1">Preceptor</p><p className="text-white">{datos.preceptor ?? "Sin preceptor asignado"}</p></section>
          <section><h3 className="text-white font-bold mb-3">Materias · {datos.catedras.length}</h3>{datos.catedras.length ? <div className="space-y-2">{datos.catedras.map((c) => <div key={c.id ?? c.materia} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#1C1030] p-3"><span className="text-white text-sm">{c.materia}</span><span className="text-slate-400 text-sm">{c.profesor}</span></div>)}</div> : <p className="text-sm text-slate-400">Asigná la primera materia en Organizar curso.</p>}</section>
          <section><h3 className="text-white font-bold mb-3">Estudiantes · {datos.alumnos.length}</h3>{datos.alumnos.length ? <div className="grid sm:grid-cols-2 gap-2">{datos.alumnos.map((a) => <div key={a.id ?? a.email} className="rounded-xl bg-[#1C1030] p-3"><p className="text-sm text-white">{a.nombre}</p><p className="text-xs text-slate-400 break-all">{a.email}</p></div>)}</div> : <p className="text-sm text-slate-400">Todavía no hay estudiantes inscriptos.</p>}</section>
          <section><h3 className="text-white font-bold mb-3">Tareas · {datos.tareas.length}</h3>{datos.tareas.length ? <div className="space-y-2">{datos.tareas.map((t,i) => <div key={i} className="flex justify-between gap-4 rounded-xl bg-[#1C1030] p-3"><div><p className="text-sm text-white">{t.titulo}</p><p className="text-xs text-slate-400">{t.materia}</p></div><div className="text-right text-xs text-slate-400"><p>{t.fechaLimite}</p><p>{t.cantidadEntregas} entregas</p></div></div>)}</div> : <p className="text-sm text-slate-400">Los docentes todavía no asignaron tareas.</p>}</section>
        </div>)}
      </div>
    </div>
  );
}

function GestionCurso({ detalle, onCambio }: { detalle: DetalleGestion; onCambio: () => void }) {
  const { datos: opciones, cargando, error, recargar } = useOpcionesGestionAcademica();
  const [preceptorId, setPreceptorId] = useState(detalle.preceptorId ?? "");
  const [seleccionados, setSeleccionados] = useState<string[]>(detalle.alumnos.map((a) => a.id));
  const [materiaId, setMateriaId] = useState("");
  const [nuevaMateria, setNuevaMateria] = useState("");
  const [profesorId, setProfesorId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState("");
  const guardar = async (accion: string, operacion: () => Promise<unknown>) => {
    if (guardando) return;
    setGuardando(accion); setAviso(""); setFallo("");
    try { await operacion(); setAviso("Cambios guardados."); onCambio(); recargar(); }
    catch (e) { setFallo(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(null); }
  };
  if (cargando && !opciones) return <Cargando que="las personas y materias" />;
  if (error) return <Fallo error={error} onReintentar={recargar} />;
  if (!opciones) return null;
  const disponibles = opciones.estudiantes.filter((e) => (!e.cursoId || e.cursoId === detalle.curso.id) && e.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const input = "w-full rounded-xl bg-[#1C1030] text-white px-4 py-3 text-sm border border-white/10";
  const boton = "rounded-xl bg-[#C548F5] px-4 py-2.5 font-bold text-sm text-white disabled:opacity-40";
  return <div className="space-y-7">
    {aviso && <p role="status" className="text-emerald-300 bg-emerald-500/10 rounded-xl p-3 text-sm">{aviso}</p>}
    {fallo && <p role="alert" className="text-rose-300 bg-rose-500/10 rounded-xl p-3 text-sm">{fallo}</p>}
    <section><h3 className="text-white font-bold mb-2">Agregar una materia al catálogo</h3><p className="text-sm text-slate-400 mb-3">Creá una materia y luego asignale un docente en este curso.</p><div className="flex flex-wrap gap-3"><input aria-label="Nombre de la nueva materia" maxLength={100} value={nuevaMateria} onChange={e => setNuevaMateria(e.target.value)} className={`${input} flex-1 min-w-40`} placeholder="Ej: Educación artística" /><button className={boton} disabled={!!guardando || !nuevaMateria.trim()} onClick={() => void guardar("nueva-materia", async () => { const materia = await crearMateria(nuevaMateria.trim()); setMateriaId(materia.id); setNuevaMateria(""); })}>{guardando === "nueva-materia" ? "Creando…" : "Crear materia"}</button></div></section>
    <section><h3 className="text-white font-bold mb-3">Preceptor a cargo</h3><div className="flex gap-3 flex-wrap"><select aria-label="Preceptor del curso" className={`${input} flex-1 min-w-40`} value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)}><option value="">Sin preceptor</option>{opciones.preceptores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select><button disabled={!!guardando} className={boton} onClick={() => void guardar("preceptor", () => editarCurso(detalle.curso.id, { anio: detalle.curso.anio, division: detalle.curso.division, preceptorId: preceptorId || null }))}>{guardando === "preceptor" ? "Guardando…" : "Guardar preceptor"}</button></div></section>
    <section className="border-t border-white/10 pt-6"><h3 className="text-white font-bold mb-1">Materias y docentes</h3><p className="text-sm text-slate-400 mb-4">Elegí una materia para asignarla al curso o cambiar su profesor.</p><div className="grid sm:grid-cols-2 gap-3"><select aria-label="Materia" className={input} value={materiaId} onChange={(e) => { setMateriaId(e.target.value); setProfesorId(detalle.catedras.find((c) => c.materiaId === e.target.value)?.profesorId ?? ""); }}><option value="">Seleccioná una materia</option>{opciones.materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select><select aria-label="Profesor" className={input} value={profesorId} onChange={(e) => setProfesorId(e.target.value)}><option value="">Seleccioná un profesor</option>{opciones.profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div><button disabled={!!guardando || !materiaId || !profesorId} className={`${boton} mt-3`} onClick={() => void guardar("materia", () => guardarCatedra(detalle.curso.id, materiaId, profesorId))}>{guardando === "materia" ? "Guardando…" : "Asignar materia y docente"}</button></section>
    <section className="border-t border-white/10 pt-6"><h3 className="text-white font-bold mb-1">Inscripciones · {seleccionados.length} seleccionados</h3><p className="text-sm text-slate-400 mb-4">Se muestran estudiantes de este curso y quienes todavía no tienen uno. Desmarcar un estudiante lo retira de la nómina.</p><input aria-label="Buscar estudiante" className={input} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" /><div className="mt-3 max-h-64 overflow-y-auto space-y-2">{disponibles.map((e) => <label key={e.id} className="flex items-center gap-3 rounded-lg bg-[#1C1030] p-3 text-sm text-white"><input type="checkbox" className="accent-[#C548F5] w-4 h-4" checked={seleccionados.includes(e.id)} onChange={(event) => setSeleccionados((prev) => event.target.checked ? [...prev,e.id] : prev.filter((id) => id !== e.id))} />{e.nombre}<span className="ml-auto text-xs text-slate-400">{e.cursoId ? "Inscripto" : "Sin curso"}</span></label>)}{!disponibles.length && <p className="text-sm text-slate-400 py-3">No hay estudiantes disponibles para esta búsqueda.</p>}</div><button disabled={!!guardando} className={`${boton} mt-4`} onClick={() => void guardar("estudiantes", () => guardarInscripciones(detalle.curso.id, seleccionados))}>{guardando === "estudiantes" ? "Guardando…" : "Guardar nómina"}</button></section>
  </div>;
}
