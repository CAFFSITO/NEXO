import { useState } from "react";
import { useDialogo } from "../../../servicios/useDialogo";
import type { RecurrenciaPersonal } from "../../../servicios/portafolio";
import Selector from "../shared/Selector";

interface ModalNuevaTareaPersonalProps {
  /** Si viene con texto, el modal está editando una tarea existente (2.C.8). */
  tituloInicial?: string;
  descripcionInicial?: string;
  fechaInicial?: string | null;
  recurrenciaInicial?: RecurrenciaPersonal | null;
  onGuardar: (titulo: string, descripcion: string, fecha: string | null, recurrencia:RecurrenciaPersonal|null) => Promise<void>;
  onCerrar: () => void;
}

// Modal para crear o editar una tarea personal (recordatorio del estudiante).
export default function ModalNuevaTareaPersonal({
  tituloInicial = "",
  descripcionInicial = "",
  fechaInicial = "",
  recurrenciaInicial = null,
  onGuardar,
  onCerrar,
}: ModalNuevaTareaPersonalProps) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);
  const [titulo, setTitulo] = useState<string>(tituloInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [fecha, setFecha] = useState(fechaInicial ?? "");
  const [frecuencia,setFrecuencia]=useState<RecurrenciaPersonal['frecuencia']|''>(recurrenciaInicial?.frecuencia??'');
  const [intervalo,setIntervalo]=useState(recurrenciaInicial?.intervalo??1);
  const [veces,setVeces]=useState(recurrenciaInicial?.veces?.toString()??'');
  const [hasta,setHasta]=useState(recurrenciaInicial?.hasta??'');
  const [soloHabiles,setSoloHabiles]=useState(recurrenciaInicial?.soloHabiles??false);
  const [saltarFeriados,setSaltarFeriados]=useState(recurrenciaInicial?.saltarFeriados??false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const editando = tituloInicial.length > 0;

  const puedeGuardar = titulo.trim().length > 0 && (!frecuencia || Boolean(fecha));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar || guardando) return;
    setGuardando(true); setError("");
    try { await onGuardar(titulo.trim(), descripcion.trim(), fecha || null,frecuencia?{
      frecuencia,intervalo:Math.max(1,Math.min(99,Math.round(intervalo)||1)),
      ...(veces?{veces:Number(veces)}:{}),...(hasta?{hasta}:{}),
      ...(soloHabiles?{soloHabiles:true}:{}),...(saltarFeriados?{saltarFeriados:true}:{}),
      ...(recurrenciaInicial?.frecuencia===frecuencia&&recurrenciaInicial.dias?{dias:recurrenciaInicial.dias}:{}),
      ...(recurrenciaInicial?.frecuencia===frecuencia&&recurrenciaInicial.modoMensual?{modoMensual:recurrenciaInicial.modoMensual}:{})
    }:null); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la tarea."); }
    finally { setGuardando(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="titulo-modal-personal"
        ref={dialogo}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-lienzo border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id="titulo-modal-personal" className="text-xl font-extrabold text-white font-headline">
            {editando ? "Editar tarea personal" : "Nueva tarea personal"}
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="titulo-tarea-personal"
            className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
          >
            ¿Qué querés recordar?
          </label>
          <input
            id="titulo-tarea-personal"
            type="text"
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Repasar vocabulario Inglés"
            className="w-full bg-fondo border-none rounded-[10px] py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-acento transition-all mb-6"
          />

          <label className="block text-sm mb-4">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={10000} rows={3} className="block w-full bg-background rounded-xl p-3 mt-2" /></label>
          <label className="block text-sm mb-5">Fecha límite · opcional<input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="block w-full bg-background rounded-xl p-3 mt-2" /></label>
          <label className="block text-sm mb-3">Repetición<Selector value={frecuencia} onChange={e=>setFrecuencia(e.target.value as typeof frecuencia)} className="block w-full bg-background rounded-xl p-3 mt-2"><option value="">No se repite</option><option value="diaria">Cada día</option><option value="semanal">Cada semana</option><option value="mensual">Cada mes</option><option value="anual">Cada año</option></Selector></label>
          {frecuencia&&<div className="mb-5 space-y-3 text-sm"><p className="text-slate-400">La siguiente tarea aparece cuando completás la actual. Elegí una fecha límite inicial.</p><label className="block">Cada cuántos períodos<input type="number" min="1" max="99" value={intervalo} onChange={e=>setIntervalo(Number(e.target.value))} className="block w-full bg-background rounded-xl p-3 mt-1"/></label><label className="block">Cantidad total de veces · opcional<input type="number" min="1" max="500" value={veces} onChange={e=>setVeces(e.target.value)} className="block w-full bg-background rounded-xl p-3 mt-1"/></label><label className="block">Repetir hasta · opcional<input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} className="block w-full bg-background rounded-xl p-3 mt-1"/></label><label className="flex gap-2"><input type="checkbox" checked={soloHabiles} onChange={e=>setSoloHabiles(e.target.checked)}/>Sólo días hábiles</label><label className="flex gap-2"><input type="checkbox" checked={saltarFeriados} onChange={e=>setSaltarFeriados(e.target.checked)}/>Saltar feriados del calendario institucional</label></div>}
          {error && <p role="alert" className="text-error text-sm mb-4">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="px-5 py-2.5 text-slate-300 font-semibold hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeGuardar || guardando}
              className="px-6 py-2.5 bg-acento text-white font-bold rounded-lg hover:bg-acento-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando…" : editando ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
