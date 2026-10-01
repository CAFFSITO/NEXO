import { useState } from "react";
import type { Curso } from "./TarjetaCurso";
import { useOpcionesGestionAcademica, type DatosCurso } from "../../../servicios/gestionAcademica";
import { Cargando, Fallo } from "../shared/EstadoCarga";

interface Props {
  abierto: boolean;
  cursosExistentes: Curso[];
  onCerrar: () => void;
  onCrear: (curso: DatosCurso) => Promise<void>;
}
export default function ModalNuevoCurso({ abierto, cursosExistentes, onCerrar, onCrear }: Props) {
  const { datos, cargando, error: errorCarga, recargar } = useOpcionesGestionAcademica();
  const [anio, setAnio] = useState(1);
  const [division, setDivision] = useState("A");
  const [preceptorId, setPreceptorId] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  if (!abierto) return null;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    const letra = division.trim().toUpperCase();
    if (!letra) return;
    if (cursosExistentes.some((c) => c.anio === anio && c.division.toUpperCase() === letra)) {
      setError(`El curso ${anio}°${letra} ya existe.`);
      return;
    }
    setGuardando(true);
    setError("");
    try { await onCrear({ anio, division: letra, preceptorId: preceptorId || null }); }
    catch (fallo) { setError(fallo instanceof Error ? fallo.message : "No se pudo crear el curso."); }
    finally { setGuardando(false); }
  };
  const cerrar = () => { if (!guardando) onCerrar(); };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={cerrar}>
      <form role="dialog" aria-modal="true" aria-labelledby="nuevo-curso-titulo" onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[#2D1B4E] rounded-2xl border border-white/10 p-7 shadow-2xl">
        <div className="flex justify-between gap-4 mb-6">
          <div><h2 id="nuevo-curso-titulo" className="text-2xl font-bold text-white">Crear un curso</h2><p className="text-sm text-slate-400 mt-1">Después podés inscribir estudiantes y asignar docentes.</p></div>
          <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar" className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        {cargando ? <Cargando que="las opciones académicas" /> : errorCarga ? <Fallo error={errorCarga} onReintentar={recargar} /> : <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="text-sm text-slate-300">Año<select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="mt-2 block w-full bg-[#1C1030] rounded-xl px-4 py-3 text-white">{[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n}° año</option>)}</select></label>
            <label className="text-sm text-slate-300">División<input required maxLength={10} value={division} onChange={(e) => setDivision(e.target.value.toUpperCase())} className="mt-2 block w-full bg-[#1C1030] rounded-xl px-4 py-3 text-white" /></label>
          </div>
          <label className="block text-sm text-slate-300">Preceptor<select value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)} className="mt-2 block w-full bg-[#1C1030] rounded-xl px-4 py-3 text-white"><option value="">Asignar más adelante</option>{datos?.preceptores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
          {error && <p role="alert" className="text-rose-300 text-sm mt-4">{error}</p>}
          <div className="flex justify-end gap-3 mt-7"><button type="button" disabled={guardando} onClick={cerrar} className="px-4 py-2 text-slate-300">Cancelar</button><button disabled={guardando || !division.trim()} className="rounded-xl bg-[#C548F5] px-6 py-3 text-white font-bold disabled:opacity-40">{guardando ? "Creando…" : "Crear curso"}</button></div>
        </>}
      </form>
    </div>
  );
}
