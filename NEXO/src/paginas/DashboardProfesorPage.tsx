import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";

interface Clase {
  id: string;
  nombre: string;
  curso: string;
  hora: string;
  estudiantes: number;
}

interface Tarea {
  id: string;
  titulo: string;
  curso: string;
  fechaEntrega: string;
  entregadas: number;
  total: number;
}

export default function DashboardProfesorPage() {
  const [usuario] = useState({
    nombre: "Prof. García",
    rol: "profesor" as const,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia",
  });

  const clases: Clase[] = [
    { id: "1", nombre: "Matemática Avanzada", curso: "5to A", hora: "09:00", estudiantes: 32 },
    { id: "2", nombre: "Cálculo II", curso: "6to B", hora: "10:30", estudiantes: 28 },
    { id: "3", nombre: "Álgebra Lineal", curso: "5to C", hora: "14:00", estudiantes: 30 },
  ];

  const tareas: Tarea[] = [
    {
      id: "1",
      titulo: "Resolución de integrales - Cálculo II",
      curso: "6to B",
      fechaEntrega: "2026-05-15",
      entregadas: 24,
      total: 28,
    },
    {
      id: "2",
      titulo: "Proyecto Final - Matemática Avanzada",
      curso: "5to A",
      fechaEntrega: "2026-05-20",
      entregadas: 18,
      total: 32,
    },
    {
      id: "3",
      titulo: "Matrices y Determinantes - Álgebra",
      curso: "5to C",
      fechaEntrega: "2026-05-10",
      entregadas: 29,
      total: 30,
    },
  ];

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion } = useNavegacion();

  return (
    <div className="flex bg-[#1C1030] min-h-screen">
      <Sidebar
        usuario={usuario}
        rutaActiva="/portafolio-docente"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen">
        <TopBar title="Portafolio Docente" subtitle="Dashboard" />

        <div className="flex-1 overflow-y-auto p-8 bg-[#190d2d]">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black font-headline text-white tracking-tight mb-2">
              Bienvenido, Prof. García
            </h1>
            <p className="text-gray-400">
              Hoy tienes {clases.length} clases y {tareas.length} tareas por revisar.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-[#2D1B4E] border border-[#3b2f50] rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1C1030] rounded-lg flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">groups</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Estudiantes Totales</p>
                  <p className="text-2xl font-bold text-white">90</p>
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
                  <span className="material-symbols-outlined">assessment</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Promedio Clase</p>
                  <p className="text-2xl font-bold text-white">7.8</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clases de Hoy */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold font-headline text-white mb-4">Clases de Hoy</h2>
            <div className="space-y-3">
              {clases.map((clase) => (
                <div
                  key={clase.id}
                  className="bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-white">{clase.nombre}</h3>
                    <p className="text-sm text-gray-400">
                      {clase.curso} • {clase.hora} • {clase.estudiantes} estudiantes
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#d15aff] transition-all">
                    Ir a clase
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tareas Pendientes */}
          <div>
            <h2 className="text-2xl font-bold font-headline text-white mb-4">Tareas por Revisar</h2>
            <div className="space-y-3">
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  className="bg-[#2D1B4E] border border-[#3b2f50] hover:border-primary/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{tarea.titulo}</h3>
                      <p className="text-sm text-gray-400">{tarea.curso}</p>
                    </div>
                    <span className="text-sm text-gray-400">
                      Vencimiento: {new Date(tarea.fechaEntrega).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#1C1030] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-[#d15aff]"
                        style={{
                          width: `${(tarea.entregadas / tarea.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">
                      {tarea.entregadas}/{tarea.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
