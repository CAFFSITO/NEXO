// src/paginas/DashboardProfesorPage.tsx
// VISTA: Portafolio Docente (home del profesor).
// Todo sale del servidor: las cátedras (/api/tareas/catedras), las tareas con
// su conteo real de entregas (/api/tareas/docente) y las clases planificadas
// (/api/aula/clases). Antes esta pantalla tenía un usuario fijo "Prof. García",
// tres clases y tres tareas escritas a mano y un "promedio 7.8" inventado
// (Errores 13.2 y tema transversal 2): nada de eso venía de la base.

import { useMemo } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import { usarDatos } from "../servicios/api";
import { usarClasesPlanificadas } from "../servicios/aula";
import type { Catedra, TareaDocente } from "../servicios/tareas";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { fechaCorta } from "../servicios/fechas";

export default function DashboardProfesorPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();

  const catedrasEstado = usarDatos<{ catedras: Catedra[] }>("/api/tareas/catedras");
  const tareasEstado = usarDatos<{ tareas: TareaDocente[] }>("/api/tareas/docente");
  const { clases, cargando: cargandoClases, error: errorClases } = usarClasesPlanificadas();

  const catedras = catedrasEstado.datos?.catedras ?? [];
  const tareas = tareasEstado.datos?.tareas ?? [];

  // Alumnos totales = suma de los cursos de mis cátedras (dato real del padrón).
  const alumnosTotales = useMemo(
    () => catedras.reduce((acc, c) => acc + c.alumnos, 0),
    [catedras]
  );

  // Clases que todavía no terminaron: las que le importan al docente al entrar.
  const clasesActivas = useMemo(
    () => (clases ?? []).filter((c) => c.estado === "planificada" || c.estado === "en-vivo"),
    [clases]
  );
  const proximasClases = clasesActivas.slice(0, 3);

  const cargando = catedrasEstado.cargando || tareasEstado.cargando;
  const error = catedrasEstado.error ?? tareasEstado.error;

  if (!usuario) return null;

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Portafolio Docente" subtitle="Dashboard" />

        <div className="flex-1 overflow-y-auto p-8 bg-[#190d2d]">
          {/* Header: el nombre sale de la sesión, no de una constante. */}
          <div className="mb-10">
            <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-2">
              Bienvenido, {usuario.nombre}
            </h1>
            <p className="text-gray-400">
              Tenés {catedras.length} {catedras.length === 1 ? "cátedra" : "cátedras"} y{" "}
              {tareas.length} {tareas.length === 1 ? "tarea asignada" : "tareas asignadas"}.
            </p>
          </div>

          {cargando && <Cargando que="tu portafolio" />}
          {error && <Fallo error={error} onReintentar={() => { catedrasEstado.recargar(); tareasEstado.recargar(); }} />}

          {!cargando && !error && (
            <>
              {/* Stats reales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1C1030] rounded-lg flex items-center justify-center text-blue-400">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Alumnos en mis cátedras</p>
                      <p className="text-2xl font-bold text-white">{alumnosTotales}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1C1030] rounded-lg flex items-center justify-center text-green-400">
                      <span className="material-symbols-outlined">assignment_turned_in</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Tareas Asignadas</p>
                      <p className="text-2xl font-bold text-white">{tareas.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1C1030] rounded-lg flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">cast_for_education</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Clases planificadas</p>
                      <p className="text-2xl font-bold text-white">{clasesActivas.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Próximas clases (reales, de /api/aula/clases) */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold font-headline text-white mb-4">Próximas Clases</h2>
                {cargandoClases && <Cargando que="tus clases" />}
                {errorClases && <Fallo error={errorClases} />}
                {proximasClases.length === 0 && !cargandoClases && !errorClases && (
                  <Vacio icono="event_busy" mensaje="No tenés clases planificadas. Podés crearlas desde el Aula Virtual." />
                )}
                <div className="space-y-3">
                  {proximasClases.map((clase) => (
                    <div
                      key={clase.id}
                      className="bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-white">{clase.titulo}</h3>
                        <p className="text-sm text-gray-400">
                          {clase.materiaCurso} • {fechaCorta(clase.fechaHora)}{" "}
                          {new Date(clase.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          {clase.enVivo && <span className="ml-2 text-red-400 font-bold">EN VIVO</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNavegar("/portafolio-docente/aula-virtual")}
                        className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#d15aff] transition-all"
                      >
                        Ir al aula
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tareas por revisar (conteos reales de entregas) */}
              <div>
                <h2 className="text-2xl font-bold font-headline text-white mb-4">Tareas por Revisar</h2>
                {tareas.length === 0 && (
                  <Vacio icono="assignment" mensaje="No tenés tareas asignadas. Podés crearlas desde Gestión de Tareas." />
                )}
                <div className="space-y-3">
                  {tareas.map((tarea) => {
                    const total = tarea.alDia + tarea.tarde + tarea.pendiente;
                    const entregadas = tarea.alDia + tarea.tarde;
                    return (
                      <button
                        key={tarea.id}
                        onClick={() => handleNavegar("/portafolio/gestion")}
                        className="w-full text-left bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-white">{tarea.titulo}</h3>
                            <p className="text-sm text-gray-400">{tarea.materia} · {tarea.curso}</p>
                          </div>
                          <span className="text-sm text-gray-400">
                            Vencimiento: {fechaCorta(tarea.fechaLimite)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-[#1C1030] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-[#d15aff]"
                              style={{ width: total > 0 ? `${(entregadas / total) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">
                            {entregadas}/{total}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
