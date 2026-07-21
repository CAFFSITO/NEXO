import { useMemo, useState } from "react";
import {
  usarDestinosCalendario,
  type DatosNuevoEvento,
  type Visibilidad,
} from "../../../servicios/calendario";

interface ModalNuevoEventoProps {
  fechaInicial: string; // ISO yyyy-MM-dd
  /** Crea el evento en el servidor. Debe lanzar si falla (para mostrar el error). */
  onGuardar: (datos: DatosNuevoEvento, visibilidades: Visibilidad[]) => Promise<void>;
  onCerrar: () => void;
}

export default function ModalNuevoEvento({ fechaInicial, onGuardar, onCerrar }: ModalNuevoEventoProps) {
  // El tipo es texto libre (Error 6.E.4): un campo de texto, no cuatro botones
  // fijos. Sugerencias rápidas para no arrancar de cero, pero se puede escribir
  // cualquier cosa.
  const SUGERENCIAS_TIPO = ["Evento institucional", "Reunión", "Acto", "Examen", "Salida"];

  // Los destinos posibles los decide el servidor según el rol (dirección ve
  // todas las capas; el preceptor, solo su curso; el centro, "todos").
  const { destinos, cargando: cargandoDestinos } = usarDestinosCalendario();

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [tipo, setTipo] = useState("Evento institucional");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [alcance, setAlcance] = useState<Visibilidad["alcance"] | "">("");
  const [cursoId, setCursoId] = useState<string>("");
  const [estudianteId, setEstudianteId] = useState<string>("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // La capa elegida y qué dato extra pide (un curso, un alumno, o nada).
  const opcionElegida = useMemo(
    () => destinos?.alcances.find((o) => o.alcance === alcance) ?? null,
    [destinos, alcance],
  );
  const requiere = opcionElegida?.requiere ?? null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    if (!alcance) {
      setError("Elegí quién puede ver el evento.");
      return;
    }
    if (requiere === "curso" && !cursoId) {
      setError("Elegí el curso.");
      return;
    }
    if (requiere === "estudiante" && !estudianteId) {
      setError("Elegí el alumno.");
      return;
    }

    // La capa de visibilidad, con el dato extra que corresponda. El servidor la
    // revalida igual (validarVisibilidad en calendario.js): no se esconde nada.
    const visibilidad: Visibilidad = { alcance: alcance as Visibilidad["alcance"] };
    if (requiere === "curso") visibilidad.cursoId = Number(cursoId);
    if (requiere === "estudiante") visibilidad.estudianteId = Number(estudianteId);

    setError("");
    setEnviando(true);
    try {
      await onGuardar(
        {
          titulo: titulo.trim(),
          fecha,
          tipo: tipo.trim() || "Evento institucional",
          descripcion: descripcion.trim() || undefined,
          lugar: lugar.trim() || undefined,
          horaInicio: horaInicio || undefined,
          horaFin: horaFin || undefined,
        },
        [visibilidad],
      );
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo crear el evento.");
      setEnviando(false);
    }
  };

  const inputClase =
    "w-full px-4 py-2.5 bg-[#1C1030] border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-[#C548F5] focus:outline-none transition-colors";
  const labelClase = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-secondary rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white font-headline">Nuevo evento</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="titulo" className={labelClase}>Título</label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Parciales Matemática 4°B"
              className={inputClase}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="tipo" className={labelClase}>Tipo de evento</label>
            <input
              id="tipo"
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ej: Feria, Acto, Reunión…"
              className={inputClase}
              list="sugerencias-tipo"
            />
            {/* Texto libre (Error 6.E.4): las sugerencias son solo ayudas. */}
            <datalist id="sugerencias-tipo">
              {SUGERENCIAS_TIPO.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="fecha" className={labelClase}>Fecha</label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="horaInicio" className={labelClase}>Hora inicio</label>
              <input
                id="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={inputClase}
              />
            </div>
            <div>
              <label htmlFor="horaFin" className={labelClase}>Hora fin</label>
              <input
                id="horaFin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className={inputClase}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lugar" className={labelClase}>Lugar (opcional)</label>
            <input
              id="lugar"
              type="text"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Ej: Auditorio Central"
              className={inputClase}
            />
          </div>

          <div>
            <label htmlFor="descripcion" className={labelClase}>Descripción (opcional)</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Detalle del evento…"
              className={`${inputClase} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="visibilidad" className={labelClase}>¿Quién puede verlo?</label>
            <select
              id="visibilidad"
              value={alcance}
              onChange={(e) => {
                setAlcance(e.target.value as Visibilidad["alcance"]);
                setCursoId("");
                setEstudianteId("");
              }}
              className={inputClase}
              disabled={cargandoDestinos || !destinos}
            >
              <option value="" disabled>
                {cargandoDestinos ? "Cargando opciones…" : "Elegí un destino"}
              </option>
              {destinos?.alcances.map((o) => (
                <option key={o.alcance} value={o.alcance}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Segundo paso: si la capa elegida pide un curso o un alumno, se
              muestra el desplegable correspondiente con datos reales del
              servidor (nada de listas inventadas). */}
          {requiere === "curso" && (
            <div>
              <label htmlFor="curso" className={labelClase}>Curso</label>
              <select
                id="curso"
                value={cursoId}
                onChange={(e) => setCursoId(e.target.value)}
                className={inputClase}
              >
                <option value="" disabled>Elegí un curso</option>
                {destinos?.cursos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {requiere === "estudiante" && (
            <div>
              <label htmlFor="estudiante" className={labelClase}>Alumno</label>
              <select
                id="estudiante"
                value={estudianteId}
                onChange={(e) => setEstudianteId(e.target.value)}
                className={inputClase}
              >
                <option value="" disabled>Elegí un alumno</option>
                {destinos?.estudiantes.map((al) => (
                  <option key={al.id} value={al.id}>{al.nombre} — {al.curso}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-3 border border-white/10 text-slate-300 font-bold rounded-full hover:bg-white/5 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 py-3 bg-[#C548F5] hover:bg-[#b03bd9] text-black font-bold rounded-full transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? "Creando…" : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
