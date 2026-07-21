import { useEffect, useState } from "react";
import {
  traerMaterias,
  type DatosNuevaMeta,
  type MateriaConUnidades,
} from "../../../servicios/objetivos";

interface ModalNuevaMetaProps {
  /** El servidor ya validó y guardó; la página refresca al volver. */
  onGuardar: (datos: DatosNuevaMeta) => Promise<void>;
  onCerrar: () => void;
  /** Valores iniciales para editar una meta existente (Error 2.D.3). */
  inicial?: {
    titulo: string;
    categoria: string;
    materiaId: string | null;
    unidadId: string | null;
    venceEl: string;
  };
  /** En modo edición no se editan subtareas acá (van en el detalle). */
  modoEdicion?: boolean;
}

// Modal "Nueva Meta" real (Etapa 5). Los tres cambios que pedía el informe:
//   · "Vence el" es un CALENDARIO (input date), no texto "15 ABR" (Error 2.D.8).
//   · "Unidad" se elige de la lista real de la materia, traída de la base
//     (Error 2.D.8): deja de ser texto libre.
//   · Las subtareas se describen UNA POR UNA (Error 2.D.6), no como un número.
export default function ModalNuevaMeta({
  onGuardar,
  onCerrar,
  inicial,
  modoEdicion = false,
}: ModalNuevaMetaProps) {
  const [materias, setMaterias] = useState<MateriaConUnidades[]>([]);
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [categoria, setCategoria] = useState(inicial?.categoria ?? "personal");
  const [materiaId, setMateriaId] = useState<string>(inicial?.materiaId ?? "");
  const [unidadId, setUnidadId] = useState<string>(inicial?.unidadId ?? "");
  const [vence, setVence] = useState(inicial?.venceEl ?? "");
  const [subtareas, setSubtareas] = useState<string[]>([""]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    traerMaterias()
      .then((r) => setMaterias(r.materias))
      .catch(() => setMaterias([]));
  }, []);

  const materiaElegida = materias.find((m) => m.id === materiaId);

  const subtareasLimpias = subtareas.map((s) => s.trim()).filter(Boolean);
  const puedeGuardar =
    titulo.trim().length > 0 &&
    vence.trim().length > 0 &&
    (modoEdicion || subtareasLimpias.length > 0);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        titulo: titulo.trim(),
        categoria: categoria.trim() || "personal",
        materiaId: materiaId || null,
        unidadId: unidadId || null,
        venceEl: vence,
        subtareas: subtareasLimpias,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la meta.");
      setGuardando(false);
    }
  };

  const cambiarSubtarea = (i: number, valor: string) =>
    setSubtareas((prev) => prev.map((s, idx) => (idx === i ? valor : s)));
  const quitarSubtarea = (i: number) =>
    setSubtareas((prev) => prev.filter((_, idx) => idx !== i));
  const agregarSubtarea = () => setSubtareas((prev) => [...prev, ""]);

  const inputCls =
    "w-full bg-[#1C1030] text-white text-sm rounded-lg px-4 py-3 border border-purple-900/30 focus:ring-2 focus:ring-[#C548F5]/50 focus:border-[#C548F5]/50 outline-none placeholder-slate-500";
  const labelCls = "block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
        className="w-full max-w-md bg-[#2D1B4E] rounded-[20px] border border-purple-900/30 shadow-2xl p-6 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold font-headline text-white">
              {modoEdicion ? "Editar Meta" : "Nueva Meta"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Definí un objetivo y seguí tu progreso académico.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Título */}
        <div className="mb-5">
          <label htmlFor="titulo-meta" className={labelCls}>Título de la meta</label>
          <input
            id="titulo-meta"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
            placeholder="Ej: Preparar examen de Historia"
            className={inputCls}
          />
        </div>

        {/* Categoría + vencimiento (calendario real) */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="cat-meta" className={labelCls}>Categoría</label>
            <input
              id="cat-meta"
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="académica / personal"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="vence-meta" className={labelCls}>Vence el</label>
            <input
              id="vence-meta"
              type="date"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Materia + unidad (desde la base, Error 2.D.8) */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="materia-meta" className={labelCls}>Materia</label>
            <select
              id="materia-meta"
              value={materiaId}
              onChange={(e) => {
                setMateriaId(e.target.value);
                setUnidadId("");
              }}
              className={inputCls}
            >
              <option value="">Sin materia</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unidad-meta" className={labelCls}>Unidad</label>
            <select
              id="unidad-meta"
              value={unidadId}
              onChange={(e) => setUnidadId(e.target.value)}
              disabled={!materiaElegida || materiaElegida.unidades.length === 0}
              className={`${inputCls} disabled:opacity-40`}
            >
              <option value="">
                {materiaElegida ? "Sin unidad" : "Elegí materia primero"}
              </option>
              {materiaElegida?.unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.numero}. {u.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subtareas descriptas una por una (Error 2.D.6) — solo al crear */}
        {!modoEdicion && (
          <div className="mb-6">
            <label className={labelCls}>Subtareas</label>
            <div className="space-y-2">
              {subtareas.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s}
                    onChange={(e) => cambiarSubtarea(i, e.target.value)}
                    placeholder={`Subtarea ${i + 1}`}
                    className={inputCls}
                  />
                  {subtareas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarSubtarea(i)}
                      className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      aria-label="Quitar subtarea"
                    >
                      <span className="material-symbols-outlined">remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarSubtarea}
              className="mt-2 text-[#C548F5] text-xs font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Agregar subtarea
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeGuardar || guardando}
            className="px-6 py-2.5 bg-[#C548F5] hover:bg-[#b039df] text-white rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando…" : modoEdicion ? "Guardar cambios" : "Crear meta"}
          </button>
        </div>
      </form>
    </div>
  );
}
