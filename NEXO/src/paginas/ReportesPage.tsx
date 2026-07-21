import { useMemo, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import {
  usarOpcionesReportes,
  usarHistorialReportes,
  generarInstitucional,
  generarExpediente,
  descargarArchivo,
  type BloqueReporte,
} from "../servicios/reportes";

// Herramienta de Reportes de la dirección (sección 14.18, Errores 6.F.1 a 6.F.5).
// Es una herramienta REAL —no el panel del administrador reusado (Error 6.F.1)—:
// se eligen bloques CON CASILLAS (Error 6.F.3) y al generar se descarga un
// archivo de verdad con datos de nexo.db, nunca un "generando…" vacío (6.C.4).

type Modo = "institucional" | "expediente";

export default function ReportesPage() {
  const { usuario, navegar, cerrarSesion } = useNavegacion();
  const { opciones, cargando, error } = usarOpcionesReportes();
  const { reportes, recargar: recargarHistorial } = usarHistorialReportes();

  const [modo, setModo] = useState<Modo>("institucional");
  const [marcadosInst, setMarcadosInst] = useState<Record<string, boolean>>({});
  const [marcadosExp, setMarcadosExp] = useState<Record<string, boolean>>({});
  const [autorizaChats, setAutorizaChats] = useState(false);
  const [alumnoId, setAlumnoId] = useState("");
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState<string>("");
  const [avisoError, setAvisoError] = useState<string>("");

  const alumnos = opciones?.alumnos ?? [];
  const alumnoElegido = useMemo(
    () => alumnos.find((a) => a.id === alumnoId) ?? null,
    [alumnos, alumnoId]
  );

  if (!usuario) return null;

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    clave: string
  ) => setter((prev) => ({ ...prev, [clave]: !prev[clave] }));

  const handleGenerar = async () => {
    setAviso("");
    setAvisoError("");
    setGenerando(true);
    try {
      const resultado =
        modo === "institucional"
          ? await generarInstitucional(marcadosInst)
          : await generarExpediente(alumnoId, marcadosExp, autorizaChats);
      // La prueba de que NO es un "generando…" vacío: se baja el archivo.
      await descargarArchivo(resultado.archivoId, resultado.nombreArchivo);
      setAviso(`Reporte generado y descargado: ${resultado.nombreArchivo}`);
      recargarHistorial();
    } catch (fallo) {
      setAvisoError(
        fallo instanceof Error ? fallo.message : "No se pudo generar el reporte."
      );
    } finally {
      setGenerando(false);
    }
  };

  const puedeGenerar =
    modo === "institucional"
      ? Object.values(marcadosInst).some(Boolean)
      : Boolean(alumnoId) && Object.values(marcadosExp).some(Boolean);

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        <header className="flex items-center gap-3 w-full px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <span className="material-symbols-outlined text-fuchsia-500">assessment</span>
          <h1 className="text-fuchsia-500 font-headline font-extrabold text-xl tracking-tight">
            Reportes
          </h1>
        </header>

        <section className="p-8 max-w-3xl mx-auto space-y-6">
          {cargando && <p className="text-slate-400 text-sm">Cargando opciones…</p>}
          {error && <p className="text-error text-sm">{error}</p>}

          {opciones && (
            <>
              {/* Selector de tipo de reporte */}
              <div className="flex gap-2 bg-[#2D1B4E]/40 p-1.5 rounded-xl w-fit">
                <TabBtn activo={modo === "institucional"} onClick={() => setModo("institucional")}>
                  Reporte institucional
                </TabBtn>
                <TabBtn activo={modo === "expediente"} onClick={() => setModo("expediente")}>
                  Expediente de alumno
                </TabBtn>
              </div>

              {modo === "institucional" ? (
                <BloqueCasillas
                  titulo="Elegí qué incluir en el reporte"
                  bloques={opciones.bloquesInstitucional}
                  marcados={marcadosInst}
                  onToggle={(c) => toggle(setMarcadosInst, c)}
                />
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Alumno
                    </label>
                    <select
                      value={alumnoId}
                      onChange={(e) => setAlumnoId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1C1030] border border-white/10 rounded-xl text-white text-sm focus:border-[#C548F5] focus:outline-none"
                    >
                      <option value="">Elegí un alumno…</option>
                      {alumnos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} — {a.curso}
                        </option>
                      ))}
                    </select>
                  </div>

                  <BloqueCasillas
                    titulo="Elegí qué incluir en el expediente"
                    bloques={opciones.bloquesExpediente}
                    marcados={marcadosExp}
                    onToggle={(c) => toggle(setMarcadosExp, c)}
                  />

                  {marcadosExp["chats"] && (
                    <label className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autorizaChats}
                        onChange={(e) => setAutorizaChats(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-amber-500"
                      />
                      <span className="text-sm text-amber-200">
                        Confirmo que tengo <strong>autorización</strong> para exportar las
                        conversaciones privadas de este alumno. Sin esta confirmación, los
                        chats no se incluyen.
                      </span>
                    </label>
                  )}
                  {alumnoElegido && (
                    <p className="text-xs text-slate-500">
                      Expediente de {alumnoElegido.nombre} ({alumnoElegido.curso}).
                    </p>
                  )}
                </div>
              )}

              {aviso && (
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">download_done</span>
                  {aviso}
                </p>
              )}
              {avisoError && <p className="text-sm text-error">{avisoError}</p>}

              <button
                onClick={handleGenerar}
                disabled={!puedeGenerar || generando}
                className="w-full sm:w-auto px-6 py-3 bg-[#C548F5] hover:bg-[#d15aff] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">
                  {generando ? "progress_activity" : "download"}
                </span>
                {generando ? "Generando…" : "Generar y descargar"}
              </button>

              {/* Historial */}
              {reportes && reportes.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Reportes generados
                  </h2>
                  <ul className="space-y-2">
                    {reportes.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 bg-[#2D1B4E]/40 border border-white/5 rounded-lg px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">
                            {r.tipo === "institucional" ? "Institucional" : "Expediente de alumno"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {r.generadoPor} · {r.generadoEn}
                          </p>
                        </div>
                        {r.archivoId && (
                          <button
                            onClick={() =>
                              descargarArchivo(r.archivoId!, `reporte-${r.id}.txt`).catch(
                                () => setAvisoError("No se pudo descargar el archivo.")
                              )
                            }
                            className="shrink-0 text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 text-sm"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                            Bajar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function TabBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activo ? "bg-[#C548F5] text-white" : "text-slate-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function BloqueCasillas({
  titulo,
  bloques,
  marcados,
  onToggle,
}: {
  titulo: string;
  bloques: BloqueReporte[];
  marcados: Record<string, boolean>;
  onToggle: (clave: string) => void;
}) {
  return (
    <div>
      <p className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        {titulo}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {bloques.map((b) => (
          <label
            key={b.clave}
            className="flex items-center gap-3 bg-[#2D1B4E]/40 border border-white/5 rounded-xl px-4 py-3 cursor-pointer hover:border-[#C548F5]/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={marcados[b.clave] ?? false}
              onChange={() => onToggle(b.clave)}
              className="w-4 h-4 accent-[#C548F5]"
            />
            <span className="text-sm text-white">{b.etiqueta}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
