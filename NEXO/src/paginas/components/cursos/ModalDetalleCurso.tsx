import { useState } from "react";
import { useDatos } from "../../../servicios/api";
import type { DetalleCurso } from "../../../servicios/perfiles";
import { editarCurso, estadoCupo, ESTADOS_CUPO, guardarInscripciones, textoCupo, useOpcionesGestionAcademica } from "../../../servicios/gestionAcademica";
import { nombreMateria } from "../../../servicios/materias";
import MateriasDelCurso from "./MateriasDelCurso";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import Selector from "../shared/Selector";
import SelectorTurno from "./SelectorTurno";
import SelectorEspecialidad from "./SelectorEspecialidad";
import { useListasCurso } from "./useListasCurso";
import { useFuncion } from "../../../servicios/instancia";

type DetalleGestion = Omit<DetalleCurso, "alumnos" | "catedras"> & {
  preceptorId: string | null;
  alumnos: (DetalleCurso["alumnos"][number] & { id: string })[];
  catedras: (DetalleCurso["catedras"][number] & { id: string; materiaId: string; profesorId: string; materiaAnio?: number | null })[];
};
interface Props { cursoId: string | null; onCerrar: () => void; onCambio?: () => void }
export default function ModalDetalleCurso({ cursoId, onCerrar, onCambio }: Props) {
  const { datos, cargando, error, recargar } = useDatos<DetalleGestion>(cursoId ? `/api/cursos/${cursoId}/detalle` : null);
  const [pestana, setPestana] = useState<"resumen" | "gestion">("resumen");
  // Una escuela que usa los cursos solo para ordenar a los preceptores apaga
  // "Cátedras e inscripciones" (Modo edición): entonces no se ven alumnos ni
  // materias, solo lo que importa (turno, especialidad y preceptor).
  const conAlumnos = useFuncion("cursos.organizar");
  if (!cursoId) return null;
  const refrescar = () => { recargar(); onCambio?.(); };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-curso-titulo" onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-lienzo p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-between items-start gap-4 mb-6"><div><h2 id="detalle-curso-titulo" className="text-2xl text-white font-bold">{datos ? `${datos.curso.anio}°${datos.curso.division}` : "Curso"}</h2><p className="text-sm text-slate-400 mt-1">{datos && (datos.curso.turno || datos.curso.especialidad) ? [datos.curso.turno && `Turno ${datos.curso.turno.nombre.toLowerCase()}`, datos.curso.especialidad?.nombre].filter(Boolean).join(" · ") : "Estudiantes, docentes y actividad del curso."}</p></div><button aria-label="Cerrar detalle" onClick={onCerrar} className="text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
        {conAlumnos && <nav className="flex gap-2 mb-6">{([['resumen','Resumen'],['gestion','Organizar curso']] as const).map(([id,label]) => <button key={id} onClick={() => setPestana(id)} className={`px-4 py-2 rounded-lg text-sm font-bold ${pestana === id ? 'bg-acento/20 text-acento' : 'text-slate-400'}`}>{label}</button>)}</nav>}
        {cargando && !datos ? <Cargando que="el curso" /> : error ? <Fallo error={error} onReintentar={recargar} /> : datos && (!conAlumnos || pestana === "gestion" ? <GestionCurso detalle={datos} onCambio={refrescar} onCerrar={onCerrar} conAlumnos={conAlumnos} /> : <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <section className="rounded-xl bg-fondo p-4"><p className="text-xs uppercase text-slate-400 mb-1">Preceptor</p><p className="text-white">{datos.preceptor ?? "Sin preceptor asignado"}</p></section>
            <section className="rounded-xl bg-fondo p-4"><p className="text-xs uppercase text-slate-400 mb-1">Estudiantes</p><p className="text-white">{textoCupo({ estudiantes: datos.alumnos.length, cupoMinimo: datos.curso.cupoMinimo, cupoMaximo: datos.curso.cupoMaximo })}</p><p className="mt-1 text-xs text-on-surface-variant">{ESTADOS_CUPO[estadoCupo({ estudiantes: datos.alumnos.length, cupoMinimo: datos.curso.cupoMinimo, cupoMaximo: datos.curso.cupoMaximo })].etiqueta}</p></section>
            <section className="rounded-xl bg-fondo p-4"><p className="text-xs uppercase text-slate-400 mb-1">Aula</p><p className="text-white">{datos.curso.aula ?? "Sin aula asignada"}</p></section>
          </div>
          <section><h3 className="text-white font-bold mb-3">Materias · {datos.catedras.length}</h3>{datos.catedras.length ? <div className="space-y-2">{datos.catedras.map((c) => <div key={c.id ?? c.materia} className="flex flex-wrap justify-between gap-2 rounded-xl bg-fondo p-3"><span className="text-white text-sm">{nombreMateria({ nombre: c.materia, anio: c.materiaAnio ?? null })}</span><span className="text-slate-400 text-sm">{c.profesor}</span></div>)}</div> : <p className="text-sm text-slate-400">Asigná la primera materia en Organizar curso.</p>}</section>
          <section><h3 className="text-white font-bold mb-3">Estudiantes · {datos.alumnos.length}</h3>{datos.alumnos.length ? <div className="grid sm:grid-cols-2 gap-2">{datos.alumnos.map((a) => <div key={a.id ?? a.email} className="rounded-xl bg-fondo p-3"><p className="text-sm text-white">{a.nombre}</p><p className="text-xs text-slate-400 break-all">{a.email}</p></div>)}</div> : <p className="text-sm text-slate-400">Todavía no hay estudiantes inscriptos.</p>}</section>
          <section><h3 className="text-white font-bold mb-3">Tareas · {datos.tareas.length}</h3>{datos.tareas.length ? <div className="space-y-2">{datos.tareas.map((t,i) => <div key={i} className="flex justify-between gap-4 rounded-xl bg-fondo p-3"><div><p className="text-sm text-white">{t.titulo}</p><p className="text-xs text-slate-400">{t.materia}</p></div><div className="text-right text-xs text-slate-400"><p>{t.fechaLimite}</p><p>{t.cantidadEntregas} entregas</p></div></div>)}</div> : <p className="text-sm text-slate-400">Los docentes todavía no asignaron tareas.</p>}</section>
        </div>)}
      </div>
    </div>
  );
}

function GestionCurso({ detalle, onCambio, onCerrar, conAlumnos }: { detalle: DetalleGestion; onCambio: () => void; onCerrar: () => void; conAlumnos: boolean }) {
  const { datos: opciones, cargando, error, recargar } = useOpcionesGestionAcademica();
  const listas = useListasCurso(opciones);
  const [preceptorId, setPreceptorId] = useState(detalle.preceptorId ?? "");
  const [turno, setTurno] = useState(detalle.curso.turno?.id ?? "");
  const [especialidad, setEspecialidad] = useState(detalle.curso.especialidad?.id ?? "");
  const [cupoMinimo, setCupoMinimo] = useState(detalle.curso.cupoMinimo == null ? "" : String(detalle.curso.cupoMinimo));
  const [cupoMaximo, setCupoMaximo] = useState(detalle.curso.cupoMaximo == null ? "" : String(detalle.curso.cupoMaximo));
  const [aula, setAula] = useState(detalle.curso.aula ?? "");
  const [seleccionados, setSeleccionados] = useState<string[]>(detalle.alumnos.map((a) => a.id));
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState("");
  const guardar = async (accion: string, operacion: () => Promise<unknown>) => {
    if (guardando) return;
    setGuardando(accion); setAviso(""); setFallo("");
    try {
      await operacion();
      onCambio();
      if (accion === "preceptor") { onCerrar(); return; }
      setAviso("Cambios guardados.");
      recargar();
    }
    catch (e) { setFallo(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(null); }
  };
  if (cargando && !opciones) return <Cargando que="las personas del curso" />;
  if (error) return <Fallo error={error} onReintentar={recargar} />;
  if (!opciones) return null;
  const disponibles = opciones.estudiantes.filter((e) => (!e.cursoId || e.cursoId === detalle.curso.id) && e.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const input = "w-full rounded-xl bg-fondo text-white px-4 py-3 text-sm border border-white/10";
  const boton = "rounded-xl bg-acento px-4 py-2.5 font-bold text-sm text-white disabled:opacity-40";
  return <div className="space-y-7">
    {aviso && <p role="status" className="text-emerald-300 bg-emerald-500/10 rounded-xl p-3 text-sm">{aviso}</p>}
    {fallo && <p role="alert" className="text-rose-300 bg-rose-500/10 rounded-xl p-3 text-sm">{fallo}</p>}
    <section><h3 className="text-white font-bold mb-1">Turno y especialidad</h3>{!detalle.curso.turno && <p className="text-sm text-amber-300 mb-3">Este curso todavía no tiene turno: elegilo y guardá.</p>}<div className="space-y-3 mt-3"><SelectorTurno turnos={listas.turnos} valor={turno} onCambiar={setTurno} onCrear={listas.agregarTurno} disabled={!!guardando} /><SelectorEspecialidad especialidades={listas.especialidades} valor={especialidad} onCambiar={setEspecialidad} onCrear={listas.agregarEspecialidad} className={input} disabled={!!guardando} /></div><button disabled={!!guardando || !turno} className={`${boton} mt-3`} onClick={() => void guardar("turno", () => editarCurso(detalle.curso.id, { anio: detalle.curso.anio, division: detalle.curso.division, preceptorId: detalle.preceptorId, turnoId: turno, especialidadId: especialidad || null }))}>{guardando === "turno" ? "Guardando…" : "Guardar turno y especialidad"}</button></section>
    <section><h3 className="text-white font-bold mb-1">Cupo y aula</h3><p className="text-sm text-on-surface-variant mb-3">Con un mínimo y un máximo, el panel avisa si el curso queda excedido o le faltan estudiantes. Dejalos vacíos para no fijar límite.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {conAlumnos && <label className="text-sm font-medium text-on-surface">Cupo mínimo<input type="number" min={0} max={500} inputMode="numeric" className="nx-campo mt-1.5" value={cupoMinimo} onChange={(e) => setCupoMinimo(e.target.value)} placeholder="Sin mínimo" /></label>}
        {conAlumnos && <label className="text-sm font-medium text-on-surface">Cupo máximo<input type="number" min={0} max={500} inputMode="numeric" className="nx-campo mt-1.5" value={cupoMaximo} onChange={(e) => setCupoMaximo(e.target.value)} placeholder="Sin máximo" /></label>}
        <label className="text-sm font-medium text-on-surface">Aula<input maxLength={40} className="nx-campo mt-1.5" value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ej.: Aula 12" /></label>
      </div>
      <button disabled={!!guardando} className={`${boton} mt-3`} onClick={() => void guardar("cupo", () => editarCurso(detalle.curso.id, { anio: detalle.curso.anio, division: detalle.curso.division, preceptorId: detalle.preceptorId, cupoMinimo: cupoMinimo === "" ? null : Number(cupoMinimo), cupoMaximo: cupoMaximo === "" ? null : Number(cupoMaximo), aula: aula.trim() || null }))}>{guardando === "cupo" ? "Guardando…" : "Guardar cupo y aula"}</button>
    </section>
    <section><h3 className="text-white font-bold mb-3">Preceptor a cargo</h3><div className="flex gap-3 flex-wrap"><Selector aria-label="Preceptor del curso" className={`${input} flex-1 min-w-40`} value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)}><option value="">Sin preceptor</option>{opciones.preceptores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Selector><button disabled={!!guardando} className={boton} onClick={() => void guardar("preceptor", () => editarCurso(detalle.curso.id, { anio: detalle.curso.anio, division: detalle.curso.division, preceptorId: preceptorId || null }))}>{guardando === "preceptor" ? "Guardando…" : "Guardar preceptor"}</button></div></section>
    {conAlumnos && <MateriasDelCurso curso={detalle.curso} catedras={detalle.catedras} onCambio={onCambio} />}
    {conAlumnos && <section><h3 className="text-white font-bold mb-1">Inscripciones · {seleccionados.length} seleccionados</h3><p className="text-sm text-slate-400 mb-4">Se muestran estudiantes de este curso y quienes todavía no tienen uno. Desmarcar un estudiante lo retira de la nómina.</p><input aria-label="Buscar estudiante" className={input} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" /><div className="mt-3 max-h-64 overflow-y-auto space-y-2">{disponibles.map((e) => <label key={e.id} className="flex items-center gap-3 rounded-lg bg-fondo p-3 text-sm text-white"><input type="checkbox" className="accent-acento w-4 h-4" checked={seleccionados.includes(e.id)} onChange={(event) => setSeleccionados((prev) => event.target.checked ? [...prev,e.id] : prev.filter((id) => id !== e.id))} />{e.nombre}<span className="ml-auto text-xs text-slate-400">{e.cursoId ? "Inscripto" : "Sin curso"}</span></label>)}{!disponibles.length && <p className="text-sm text-slate-400 py-3">No hay estudiantes disponibles para esta búsqueda.</p>}</div><button disabled={!!guardando} className={`${boton} mt-4`} onClick={() => void guardar("estudiantes", () => guardarInscripciones(detalle.curso.id, seleccionados))}>{guardando === "estudiantes" ? "Guardando…" : "Guardar nómina"}</button></section>}
  </div>;
}
