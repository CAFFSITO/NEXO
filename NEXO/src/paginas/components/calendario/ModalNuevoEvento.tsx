import { useState } from "react";
import { PALETA_EVENTO, type EventoCalendario, type TipoEvento } from "./tipos";

interface ModalNuevoEventoProps {
  fechaInicial: string; // ISO yyyy-MM-dd
  onGuardar: (evento: Omit<EventoCalendario, "id">) => void;
  onCerrar: () => void;
}

const TIPOS: TipoEvento[] = ["examen", "conferencia", "evento", "reunion"];

// Ícono por defecto según el tipo (se muestra en la lista de próximos eventos)
const ICONO_POR_TIPO: Record<TipoEvento, string> = {
  examen: "schedule",
  conferencia: "location_on",
  evento: "groups",
  reunion: "videocam",
};

export default function ModalNuevoEvento({ fechaInicial, onGuardar, onCerrar }: ModalNuevoEventoProps) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [tipo, setTipo] = useState<TipoEvento>("examen");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    onGuardar({
      titulo: titulo.trim(),
      fecha,
      tipo,
      horaInicio: horaInicio || undefined,
      horaFin: horaFin || undefined,
      lugar: lugar.trim() || undefined,
      icono: ICONO_POR_TIPO[tipo],
    });
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
        className="w-full max-w-md bg-secondary rounded-3xl p-6 shadow-2xl border border-white/10"
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
            <label className={labelClase}>Tipo de evento</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    tipo === t
                      ? PALETA_EVENTO[t].chip
                      : "bg-[#1C1030] border border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {PALETA_EVENTO[t].label}
                </button>
              ))}
            </div>
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
              className="flex-1 py-3 bg-[#C548F5] hover:bg-[#b03bd9] text-black font-bold rounded-full transition-all active:scale-95 text-sm"
            >
              Crear evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
