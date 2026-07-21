// AulaVirtualEstudiantePage.tsx
// Aula Virtual (Estudiante) — Etapa 9, sección 14.3.
//
// Dos momentos en una sola página, según la dirección:
//  · sin `?clase=…`  → la LISTA de clases en vivo / próximas de mi curso, para
//    entrar (los datos salen de nexo.db: mis inscripciones, mis clases).
//  · con `?clase=ID` → la SALA en vivo de esa clase (componente SalaClase, el
//    mismo que usa el docente), que convive con el menú lateral (Error 3.B.3).
//
// El estudiante VE la clase y participa (pulso, preguntas, chat); no dibuja la
// pizarra ni marca la trayectoria (eso lo decide el servidor por su rol).

import { useSearchParams } from "react-router-dom";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import SalaClase from "./components/aula-virtual/SalaClase";
import { usarMisClases, type ClaseEstudiante } from "../servicios/aula";
import { fechaCorta } from "../servicios/fechas";

export default function AulaVirtualEstudiantePage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const [params] = useSearchParams();
  const claseActiva = params.get("clase");

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />
      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Aula Virtual" subtitle={claseActiva ? "En vivo" : undefined} />
        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-6">
          {claseActiva ? (
            <SalaClase claseId={claseActiva} onSalir={() => navegar("/aula-virtual")} />
          ) : (
            <ListaClases onEntrar={(id) => navegar(`/aula-virtual?clase=${id}`)} />
          )}
        </div>
      </main>
    </div>
  );
}

function ListaClases({ onEntrar }: { onEntrar: (id: string) => void }) {
  const { clases, cargando, error, recargar } = usarMisClases();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Clases</h1>
        <p className="text-slate-400 mt-1">Entrá a la clase en vivo o mirá cuáles vienen.</p>
      </div>

      {cargando && <Cargando que="tus clases" />}
      {error && <Fallo error={error} onReintentar={recargar} />}
      {clases && clases.length === 0 && (
        <Vacio icono="event_busy" mensaje="No hay clases en vivo ni próximas por ahora." />
      )}

      <div className="flex flex-col gap-3">
        {clases?.map((c) => (
          <TarjetaClase key={c.id} clase={c} onEntrar={onEntrar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaClase({ clase, onEntrar }: { clase: ClaseEstudiante; onEntrar: (id: string) => void }) {
  return (
    <div className="bg-surface-container-low/60 rounded-2xl border border-white/5 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold truncate">{clase.titulo}</h3>
          {clase.enVivo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
              En vivo
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          {clase.materiaCurso} · {clase.docente} · {fechaCorta(clase.fechaHora)}{" "}
          {new Date(clase.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {clase.enVivo ? (
        <button
          onClick={() => onEntrar(clase.id)}
          className="px-4 py-2 bg-red-500 text-white rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined">videocam</span>
          Entrar
        </button>
      ) : (
        <span className="text-xs text-slate-500">Aún no empezó</span>
      )}
    </div>
  );
}
