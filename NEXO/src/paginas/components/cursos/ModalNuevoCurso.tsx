import { useState } from "react";
import type { Curso } from "./TarjetaCurso";
import SelectorTurno from "./SelectorTurno";
import SelectorEspecialidad from "./SelectorEspecialidad";
import { useListasCurso } from "./useListasCurso";
import { useOpcionesGestionAcademica, type DatosCurso } from "../../../servicios/gestionAcademica";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import Selector from "../shared/Selector";
import { useFuncion } from "../../../servicios/instancia";

interface Props {
  abierto: boolean;
  cursosExistentes: Curso[];
  onCerrar: () => void;
  onCrear: (curso: DatosCurso) => Promise<void>;
}
export default function ModalNuevoCurso({ abierto, cursosExistentes, onCerrar, onCrear }: Props) {
  const { datos, cargando, error: errorCarga, recargar } = useOpcionesGestionAcademica();
  // Sin "Cátedras e inscripciones", la escuela no usa alumnos ni docentes en los cursos.
  const conAlumnos = useFuncion("cursos.organizar");
  const [anio, setAnio] = useState(1);
  const [division, setDivision] = useState("A");
  // El turno no trae uno elegido de antemano: que la dirección lo marque a
  // conciencia, en vez de guardar "mañana" sin haberlo mirado.
  const [turno, setTurno] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Turnos y especialidades de la escuela, más los que se sumen desde acá.
  const listas = useListasCurso(datos);
  if (!abierto) return null;
  // El servidor de antes mandaba turnos fijos ("manana"); el de ahora, la lista
  // de la escuela con ids numéricos. Si quedó el viejo, se avisa.
  const servidorViejo = Boolean(datos && (!datos.turnos || datos.turnos.some((t) => !/^\d+$/.test(t.id))));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    const letra = division.trim().toUpperCase();
    if (!letra) return;
    if (cursosExistentes.some((c) => c.anio === anio && c.division.toUpperCase() === letra)) {
      setError(`El curso ${anio}°${letra} ya existe.`);
      return;
    }
    if (!turno) {
      setError("Elegí el turno del curso.");
      return;
    }
    setGuardando(true);
    setError("");
    try { await onCrear({ anio, division: letra, preceptorId: preceptorId || null, turnoId: turno, especialidadId: especialidad || null }); }
    catch (fallo) { setError(fallo instanceof Error ? fallo.message : "No se pudo crear el curso."); }
    finally { setGuardando(false); }
  };
  const cerrar = () => { if (!guardando) onCerrar(); };
  const campo = "mt-2 block w-full bg-fondo rounded-xl px-4 py-3 text-white";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={cerrar}>
      <form role="dialog" aria-modal="true" aria-labelledby="nuevo-curso-titulo" onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-lienzo rounded-2xl border border-white/10 p-7 shadow-2xl">
        <div className="flex justify-between gap-4 mb-6">
          <div><h2 id="nuevo-curso-titulo" className="text-2xl font-bold text-white">Crear un curso</h2><p className="text-sm text-slate-400 mt-1">{conAlumnos ? "Después podés inscribir estudiantes y asignar docentes." : "Elegí el turno y, si ya lo sabés, su preceptor."}</p></div>
          <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar" className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        {cargando ? <Cargando que="las opciones académicas" /> : errorCarga ? <Fallo error={errorCarga} onReintentar={recargar} /> : servidorViejo ? <ServidorDesactualizado onCerrar={cerrar} /> : <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="text-sm text-slate-300">Año<Selector value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={campo}>{[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n}° año</option>)}</Selector></label>
            <label className="text-sm text-slate-300">División<input required maxLength={10} value={division} onChange={(e) => setDivision(e.target.value.toUpperCase())} className={campo} /></label>
          </div>
          <div className="mb-5">
            <p className="text-sm text-slate-300 mb-2">Turno</p>
            <SelectorTurno turnos={listas.turnos} valor={turno} onCambiar={(t) => { setTurno(t); setError(""); }} onCrear={listas.agregarTurno} disabled={guardando} />
          </div>
          <div className="mb-5">
            <p className="text-sm text-slate-300">Especialidad <span className="text-slate-500">(opcional)</span></p>
            <SelectorEspecialidad especialidades={listas.especialidades} valor={especialidad} onCambiar={setEspecialidad} onCrear={listas.agregarEspecialidad} className={campo} disabled={guardando} />
          </div>
          <label className="block text-sm text-slate-300">Preceptor<Selector value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)} className={campo}><option value="">Asignar más adelante</option>{datos?.preceptores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Selector></label>
          {error && <p role="alert" className="text-rose-300 text-sm mt-4">{error}</p>}
          <div className="flex justify-end gap-3 mt-7"><button type="button" disabled={guardando} onClick={cerrar} className="px-4 py-2 text-slate-300">Cancelar</button><button disabled={guardando || !division.trim()} className="rounded-xl bg-acento px-6 py-3 text-white font-bold disabled:opacity-40">{guardando ? "Creando…" : "Crear curso"}</button></div>
        </>}
      </form>
    </div>
  );
}

/**
 * La pantalla se actualizó pero el servidor todavía corre la versión anterior
 * (no trae turnos): en vez de romperse, se dice qué hacer.
 */
function ServidorDesactualizado({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div role="alert" className="rounded-xl bg-amber-500/10 p-5 text-amber-200">
      <p className="font-bold text-white">Falta reiniciar el servidor de NEXO</p>
      <p className="mt-2 text-sm">
        NEXO se actualizó, pero el servidor sigue con la versión anterior y todavía no sabe guardar el
        turno y la especialidad de los cursos. Quien administra NEXO tiene que reiniciarlo; después,
        volvé a intentar.
      </p>
      <button type="button" onClick={onCerrar} className="mt-4 rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white">Entendido</button>
    </div>
  );
}
