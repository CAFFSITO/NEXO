// TrayectoriaVivo.tsx
// La trayectoria de la clase, avanzando en vivo (Error 3.B.1, sección 14.3 paso 4).
//
// Antes era un dibujo fijo: cinco etapas escritas a mano que no reflejaban nada.
// Ahora las etapas salen de `clase_etapas` y su estado se deduce de marcas reales
// (iniciada_en / completada_en). El docente marca "empecé" / "terminé" y TODOS
// ven el avance al instante (los estudiantes reciben el cambio por el mensajero).

import type { Etapa } from "../../../servicios/aula";

interface TrayectoriaVivoProps {
  etapas: Etapa[];
  /** Solo el docente ve los botones de marcar; el estudiante mira. */
  esDocente: boolean;
  onMarcar?: (etapaId: string, accion: "iniciar" | "completar") => void;
}

const ICONO: Record<Etapa["estado"], string> = {
  completado: "check_circle",
  "en-progreso": "radio_button_checked",
  pendiente: "radio_button_unchecked",
};

const COLOR: Record<Etapa["estado"], string> = {
  completado: "text-green-400",
  "en-progreso": "text-primary",
  pendiente: "text-slate-500",
};

export default function TrayectoriaVivo({ etapas, esDocente, onMarcar }: TrayectoriaVivoProps) {
  const alcanzadas = etapas.filter((e) => e.estado === "completado").length;

  return (
    <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">route</span>
          Trayectoria
        </h3>
        <span className="text-xs text-slate-400">
          {alcanzadas}/{etapas.length} etapas
        </span>
      </div>
      <ol className="flex flex-col gap-1">
        {etapas.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5"
          >
            <span className={`material-symbols-outlined text-lg ${COLOR[e.estado]}`}>
              {ICONO[e.estado]}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${e.estado === "completado" ? "text-slate-400 line-through" : "text-slate-100"}`}>
                {e.titulo}
              </p>
              {e.duracion && <p className="text-[10px] text-slate-500">{e.duracion} min</p>}
            </div>
            {esDocente && onMarcar && (
              <div className="flex gap-1">
                {e.estado !== "completado" && (
                  <>
                    {e.estado === "pendiente" && (
                      <button
                        onClick={() => onMarcar(e.id, "iniciar")}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                      >
                        Empezar
                      </button>
                    )}
                    <button
                      onClick={() => onMarcar(e.id, "completar")}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >
                      Terminar
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
