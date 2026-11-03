import { useState } from "react";
import type { Curso } from "../../../servicios/perfiles";
import SelectorTurno from "./SelectorTurno";
import SelectorEspecialidad from "./SelectorEspecialidad";
import { useListasCurso } from "./useListasCurso";
import { useOpcionesGestionAcademica, type DatosCurso } from "../../../servicios/gestionAcademica";
import { Cargando, Fallo } from "../shared/EstadoCarga";
import Selector from "../shared/Selector";
import { useFuncion, useInstancia } from "../../../servicios/instancia";

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
  const { instancia } = useInstancia();
  const rango = instancia?.academico ?? { anioMin: 1, anioMax: 7 };
  const [anioElegido, setAnio] = useState<number | null>(null);
  const anio = anioElegido !== null && anioElegido >= rango.anioMin && anioElegido <= rango.anioMax ? anioElegido : rango.anioMin;
  const anios = Array.from({ length: rango.anioMax - rango.anioMin + 1 }, (_, i) => rango.anioMin + i);
  const [division, setDivision] = useState("A");
  // El turno no trae uno elegido de antemano: que la dirección lo marque a
  // conciencia, en vez de guardar "mañana" sin haberlo mirado.
  const [turno, setTurno] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [cupoMinimo, setCupoMinimo] = useState("");
  const [cupoMaximo, setCupoMaximo] = useState("");
  const [aula, setAula] = useState("");
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
    const minimo = cupoMinimo === "" ? null : Number(cupoMinimo);
    const maximo = cupoMaximo === "" ? null : Number(cupoMaximo);
    if (minimo != null && maximo != null && minimo > maximo) {
      setError("El cupo mínimo no puede ser mayor que el máximo.");
      return;
    }
    setGuardando(true);
    setError("");
    try { await onCrear({ anio, division: letra, preceptorId: preceptorId || null, turnoId: turno, especialidadId: especialidad || null, cupoMinimo: minimo, cupoMaximo: maximo, aula: aula.trim() || null }); }
    catch (fallo) { setError(fallo instanceof Error ? fallo.message : "No se pudo crear el curso."); }
    finally { setGuardando(false); }
  };
  const cerrar = () => { if (!guardando) onCerrar(); };
  const campo = "nx-campo mt-1.5";
  const etiqueta = "block text-sm font-medium text-on-surface";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={cerrar}>
      <form role="dialog" aria-modal="true" aria-labelledby="nuevo-curso-titulo" onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
          <div className="min-w-0">
            <h2 id="nuevo-curso-titulo" className="text-lg font-semibold text-on-surface">Nuevo curso</h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">{conAlumnos ? "Después podés inscribir estudiantes y asignar docentes." : "Elegí el turno y, si ya lo sabés, su preceptor."}</p>
          </div>
          <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar" className="nexo-icon-button"><span className="material-symbols-outlined">close</span></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cargando ? <Cargando que="las opciones académicas" /> : errorCarga ? <Fallo error={errorCarga} onReintentar={recargar} /> : servidorViejo ? <ServidorDesactualizado onCerrar={cerrar} /> : <div className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Identificación</legend>
              <div className="grid grid-cols-2 gap-4">
                <label className={etiqueta}>Año<Selector value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={campo}>{anios.map((n) => <option key={n} value={n}>{n}° año</option>)}</Selector></label>
                <label className={etiqueta}>División<input required maxLength={10} value={division} onChange={(e) => setDivision(e.target.value.toUpperCase())} className={campo} placeholder="A" /></label>
              </div>
              <div>
                <p className={`${etiqueta} mb-1.5`}>Turno</p>
                <SelectorTurno turnos={listas.turnos} valor={turno} onCambiar={(t) => { setTurno(t); setError(""); }} onCrear={listas.agregarTurno} disabled={guardando} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={etiqueta}>Especialidad <span className="font-normal text-on-surface-variant">(opcional)</span></p>
                  <SelectorEspecialidad especialidades={listas.especialidades} valor={especialidad} onCambiar={setEspecialidad} onCrear={listas.agregarEspecialidad} className={campo} disabled={guardando} />
                </div>
                <label className={etiqueta}>Aula <span className="font-normal text-on-surface-variant">(opcional)</span><input maxLength={40} value={aula} onChange={(e) => setAula(e.target.value)} className={campo} placeholder="Ej.: Aula 12, Laboratorio" /></label>
              </div>
            </fieldset>
            {conAlumnos && <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Cupo de estudiantes</legend>
              <div className="grid grid-cols-2 gap-4">
                <label className={etiqueta}>Mínimo<input type="number" min={0} max={500} inputMode="numeric" value={cupoMinimo} onChange={(e) => setCupoMinimo(e.target.value)} className={campo} placeholder="Sin mínimo" /></label>
                <label className={etiqueta}>Máximo<input type="number" min={0} max={500} inputMode="numeric" value={cupoMaximo} onChange={(e) => setCupoMaximo(e.target.value)} className={campo} placeholder="Sin máximo" /></label>
              </div>
              <p className="text-[13px] text-on-surface-variant">El panel de la dirección avisa si el curso queda excedido, por debajo del mínimo o dentro del estándar.</p>
            </fieldset>}
            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Responsable</legend>
              <label className={etiqueta}>Preceptor<Selector value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)} className={campo}><option value="">Asignar más adelante</option>{datos?.preceptores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Selector></label>
            </fieldset>
            {error && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
          </div>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-linea bg-surface-container px-6 py-3">
          <button type="button" disabled={guardando} onClick={cerrar} className="nx-btn nx-btn-secundario">Cancelar</button>
          <button type="submit" disabled={guardando || !division.trim() || cargando || Boolean(errorCarga) || servidorViejo} className="nx-btn nx-btn-primario">{guardando ? "Creando…" : "Crear curso"}</button>
        </footer>
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
