import Selector from "../Selector";
import { useState } from "react";
import { completarPersonalizacion, type Personalizacion, type FichaEvidencia } from "../../../../servicios/personalizacion";
import EditorPreferencias, { campo } from "./EditorPreferencias";

export default function PanelPersonalizacion({ valor, perfiles, algoritmos, onCambiar }: {
  valor?: Personalizacion; perfiles: { clave: string; nombre: string }[];
  algoritmos: { id: string; nombre: string }[]; onCambiar: (p: Personalizacion) => void;
}) {
  const p = completarPersonalizacion(valor);
  const [perfil, setPerfil] = useState("");
  const [seleccion, setSeleccion] = useState("");
  const opciones = [...algoritmos.map(a => ({ ...a, tipo: "algoritmo" as const })), ...Object.entries(p.extensiones).filter(([id]) => !algoritmos.some(a => a.id === id)).map(([id, e]) => ({ id, nombre: id, tipo: e.tipo }))];
  const opcion = opciones.find(a => a.id === seleccion) ?? opciones[0];
  const ficha: FichaEvidencia | null = opcion ? p.evidencias[opcion.id] ?? { version: 1, tipo: opcion.tipo, id: opcion.id, estado: "sin-evaluar", resumen: "", limites: "", fuentes: [], revisadoEn: null } : null;
  const cambiarFicha = (cambios: Partial<FichaEvidencia>) => { if (opcion && ficha) onCambiar({ ...p, evidencias: { ...p.evidencias, [opcion.id]: { ...ficha, ...cambios } } }); };
  return <div className="space-y-7 text-white max-w-4xl">
    <section className="rounded-xl border border-white/15 p-5 space-y-4">
      <h2 className="font-bold text-lg">Preferencias de lectura</h2>
      <p className="text-sm text-white/60">La cuenta puede ajustar estas preferencias. Cada perfil hereda las de su institución.</p>
      <label className="block text-sm">Aplicar a<Selector className={campo} value={perfil} onChange={e => setPerfil(e.target.value)}><option value="">Institución</option>{perfiles.map(x => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}</Selector></label>
      <EditorPreferencias valor={perfil ? p.perfiles[perfil] ?? {} : p.institucion} onCambiar={preferencias => onCambiar(perfil ? { ...p, perfiles: { ...p.perfiles, [perfil]: preferencias } } : { ...p, institucion: preferencias })} />
    </section>
    <section className="rounded-xl border border-white/15 p-5 space-y-4">
      <h2 className="font-bold text-lg">Años de la estructura académica</h2>
      <div className="grid grid-cols-2 gap-4">{(["anioMin", "anioMax"] as const).map(clave => <label key={clave} className="text-sm">{clave === "anioMin" ? "Primer año" : "Último año"}<input className={campo} type="number" min={1} max={100} step={1} value={p.academico[clave]} onChange={e => onCambiar({ ...p, academico: { ...p.academico, [clave]: Number(e.target.value) } })} /></label>)}</div>
      <p className="text-sm text-white/60">Define el rango permitido para nuevos cursos; los cursos existentes se conservan.</p>
    </section>
    <section className="rounded-xl border border-white/15 p-5 space-y-4">
      <h2 className="font-bold text-lg">Conservación de datos</h2>
      {(["historialIa", "notificacionesLeidas"] as const).map(clave => { const r = p.retencion[clave]; return <div key={clave} className="space-y-2"><label className="text-sm block">{clave === "historialIa" ? "Historial de conversaciones con IA" : "Notificaciones ya leídas"}<Selector className={campo} value={r.modo} onChange={e => onCambiar({ ...p, retencion: { ...p.retencion, [clave]: e.target.value === "conservar" ? { modo: "conservar", dias: null } : { modo: "eliminar", dias: r.dias ?? 365 } } })}><option value="conservar">Conservar sin plazo</option><option value="eliminar">Eliminar después de un plazo</option></Selector></label>{r.modo === "eliminar" && <><label className="block text-sm">Días a conservar<input type="number" min={1} max={36500} step={1} className={campo} value={r.dias ?? ""} onChange={e => onCambiar({ ...p, retencion: { ...p.retencion, [clave]: { ...r, dias: e.target.value === "" ? null : Number(e.target.value) } } })} /></label><p className="text-sm text-amber-200" role="status">Al guardar se activa la revisión automática cada hora que elimina {clave === "historialIa" ? "mensajes del historial de IA" : "notificaciones leídas"} anteriores a {r.dias ?? "…"} días. Esos registros no se recuperan restaurando una versión de configuración.</p></>}</div>; })}
    </section>
    <section className="rounded-xl border border-white/15 p-5 space-y-4">
      <h2 className="font-bold text-lg">Evidencia y límites de uso</h2>
      <p className="text-sm text-white/60">Documentá qué respalda cada función y en qué contexto. La evidencia científica es distinta de la aprobación técnica de un diseño de nodos. Sin fuentes suficientes, dejá la ficha sin evaluar.</p>
      {opcion && ficha ? <>
        <label className="block text-sm">Función<Selector className={campo} value={opcion.id} onChange={e => setSeleccion(e.target.value)}>{opciones.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</Selector></label>
        <label className="block text-sm">Estado de la evidencia<Selector className={campo} value={ficha.estado} onChange={e => cambiarFicha({ estado: e.target.value as FichaEvidencia["estado"] })}>{(["sin-evaluar", "favorable", "mixta", "insuficiente", "desfavorable"] as const).map(e => <option key={e} value={e}>{e === "sin-evaluar" ? "Sin evaluar" : e}</option>)}</Selector></label>
        <label className="block text-sm">Qué indica la evidencia<textarea className={campo} rows={3} maxLength={3000} value={ficha.resumen} onChange={e => cambiarFicha({ resumen: e.target.value })} /></label>
        <label className="block text-sm">Límites y condiciones<textarea className={campo} rows={3} maxLength={3000} value={ficha.limites} onChange={e => cambiarFicha({ limites: e.target.value })} /></label>
        {ficha.fuentes.map((fuente, i) => <div key={i} className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Título de fuente<input className={campo} value={fuente.titulo} onChange={e => cambiarFicha({ fuentes: ficha.fuentes.map((f, j) => j === i ? { ...f, titulo: e.target.value } : f) })} /></label><label className="text-sm">Enlace de fuente<input className={campo} type="url" value={fuente.url} onChange={e => cambiarFicha({ fuentes: ficha.fuentes.map((f, j) => j === i ? { ...f, url: e.target.value } : f) })} /></label><button type="button" className="text-sm text-rose-300 text-left" onClick={() => cambiarFicha({ fuentes: ficha.fuentes.filter((_, j) => j !== i) })}>Quitar fuente {i + 1}</button></div>)}
        <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={() => cambiarFicha({ fuentes: [...ficha.fuentes, { titulo: "", url: "" }] })}>Agregar fuente</button>
        <label className="block text-sm">Fecha de revisión<input type="date" className={campo} value={ficha.revisadoEn?.slice(0, 10) ?? ""} onChange={e => cambiarFicha({ revisadoEn: e.target.value || null })} /></label>
      </> : <p className="text-sm">No hay funciones registradas para evaluar.</p>}
      <p className="text-sm text-white/60">{Object.keys(p.extensiones).length} extensiones conservadas en esta configuración. Sus datos se mantienen al editar estas preferencias.</p>
    </section>
  </div>;
}
