// src/paginas/components/shared/EstadoCarga.tsx
// Los dos carteles que ahora necesita cualquier pantalla que pida datos:
// "esperando" y "no se pudo". Antes ninguna los necesitaba, porque ninguna
// pedía nada: los datos ya estaban escritos adentro y aparecían instantáneos.
//
// Están acá y no en cada pantalla por lo de siempre (sección 1.4): si cada una
// escribe su propio cartel de error, el error se ve distinto en cada sección y
// la aplicación se siente como diecisiete aplicaciones pegadas (Error 2.A.2).

interface CargandoProps {
  /** Qué se está trayendo. Ej: "tus tareas". */
  que: string;
}

export function Cargando({ que }: CargandoProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
      <p className="text-sm">Trayendo {que}…</p>
    </div>
  );
}

interface FalloProps {
  /** El motivo, con las palabras del servidor. */
  error: string;
  /** Volver a intentar. Si no se pasa, no se muestra el botón. */
  onReintentar?: () => void;
}

export function Fallo({ error, onReintentar }: FalloProps) {
  return (
    <div className="bg-[#2D1B4E]/40 border border-red-500/20 rounded-[14px] p-10 text-center flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-4xl text-red-400">cloud_off</span>
      {/* El texto del servidor tal cual: "no tenés permiso" y "la cocina está
          apagada" son problemas distintos y quien lee tiene que poder
          distinguirlos (Error 12.6). */}
      <p className="text-slate-300 text-sm max-w-md">{error}</p>
      {onReintentar && (
        <button
          onClick={onReintentar}
          className="mt-2 px-5 py-2 rounded-full border border-[#C548F5] text-[#C548F5] text-sm font-bold hover:bg-[#C548F5]/10 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

interface VacioProps {
  icono: string;
  mensaje: string;
}

/** No hay nada que mostrar, y no es un error: la lista está vacía de verdad. */
export function Vacio({ icono, mensaje }: VacioProps) {
  return (
    <div className="bg-[#2D1B4E]/40 border border-white/5 rounded-[14px] p-12 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-500 mb-2 block">
        {icono}
      </span>
      <p className="text-slate-400 text-sm">{mensaje}</p>
    </div>
  );
}
