// src/paginas/SaludSistemaPage.tsx
// VISTA: Salud del Sistema — acceso Administrador de PLATAFORMA (ruta /admin/salud).
// Es el inicio de "nosotros" (sección 5). Muestra SOLO lo que le corresponde a
// quien opera la plataforma: totales del sistema y los logs (logs_sistema). Nada
// de la vida interna de una escuela: ni alumnos, ni notas, ni comunidad.
//
// Reemplaza el panel que este perfil compartía con la dirección y que le mostraba
// "342 estudiantes", "clase iniciada en 5to B", etc. — datos de un colegio puntual
// que a este rol no le corresponde ver (Errores 5.A.2, 5.A.4, 5.A.9).

import Sidebar from "./components/shared/Sidebar";
import TarjetaMetrica from "./components/panel-directivo/TarjetaMetrica";
import { useNavegacion } from "../navegacion";
import { usarPlataforma, type LogSistema } from "../servicios/plataforma";
import { textoRelativo } from "../servicios/fechas";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";

// Color e ícono de cada log según su nivel. La base solo acepta estos tres.
const ESTILO_NIVEL: Record<LogSistema["nivel"], { color: string; icono: string }> = {
  info: { color: "text-sky-400", icono: "info" },
  aviso: { color: "text-amber-400", icono: "warning" },
  error: { color: "text-red-400", icono: "error" },
};

export default function SaludSistemaPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();
  const { datos, cargando, error, recargar } = usarPlataforma();

  if (!usuario) return null;

  const salud = datos?.salud;

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-background">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <header className="flex justify-between items-center px-10 h-16 sticky top-0 bg-[#1C1030]/80 backdrop-blur-md border-b border-fuchsia-900/10 z-40">
          <h1 className="text-fuchsia-500 font-headline font-bold">Salud del Sistema</h1>
          <span className="text-xs text-slate-400">Administración de Plataforma · NEXO</span>
        </header>

        <section className="flex-1 px-10 pt-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <h2 className="text-3xl font-headline font-extrabold text-white leading-tight">
                Estado de la plataforma
              </h2>
              <p className="text-slate-400 font-medium">
                Totales del sistema y registro técnico. Sin datos internos de las escuelas.
              </p>
            </header>

            {cargando && <Cargando que="el estado de la plataforma" />}
            {error && <Fallo error={error} onReintentar={recargar} />}

            {!cargando && !error && salud && (
              <>
                {/* Indicadores de salud — totales de toda la plataforma */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <TarjetaMetrica
                    icono="domain"
                    iconoColor="text-fuchsia-400"
                    valor={String(salud.instituciones)}
                    etiqueta="Instituciones"
                  />
                  <TarjetaMetrica
                    icono="group"
                    iconoColor="text-sky-400"
                    valor={String(salud.usuarios)}
                    etiqueta="Usuarios activos"
                  />
                  <TarjetaMetrica
                    icono="wifi_tethering"
                    iconoColor="text-green-400"
                    valor={String(salud.sesionesActivas)}
                    etiqueta="Sesiones abiertas"
                  />
                  <TarjetaMetrica
                    icono="database"
                    iconoColor={salud.baseConectada ? "text-green-400" : "text-red-400"}
                    valor={salud.baseConectada ? "OK" : "Caída"}
                    etiqueta="Base de datos"
                  />
                </div>

                {/* Logs del sistema — lo ÚNICO que va en "Actividad" (Error 5.A.2) */}
                <div className="bg-[#2D1B4E] rounded-[20px] border border-white/5 shadow-xl shadow-black/20 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="text-white font-headline font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-fuchsia-400">terminal</span>
                      Logs del sistema
                    </h3>
                  </div>

                  {datos && datos.logs.length === 0 ? (
                    <div className="p-6">
                      <Vacio icono="inbox" mensaje="Todavía no hay registros del sistema." />
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {datos?.logs.map((log, i) => {
                        const estilo = ESTILO_NIVEL[log.nivel];
                        return (
                          <li key={i} className="px-6 py-4 flex items-start gap-3">
                            <span className={`material-symbols-outlined text-lg ${estilo.color}`}>
                              {estilo.icono}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm">{log.mensaje}</p>
                              <p className="text-slate-500 text-xs mt-0.5">
                                {log.contexto} · {textoRelativo(log.creadoEn)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
