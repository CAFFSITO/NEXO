// src/paginas/components/materias/PanelMaterias.tsx
// Contenido de la pestaña "Materias" de Gestión Institucional.
// Lógica: listado con búsqueda, alta vía modal (nombre único) y alerta de materias sin profesor.

import { useMemo, useState } from "react";
import TarjetaMateria from "./TarjetaMateria";
import ModalNuevaMateria from "./ModalNuevaMateria";
import type { Materia } from "./tipos";

const MATERIAS_INICIALES: Materia[] = [
  { id: "m1", nombre: "Matemática", profesor: "Prof. García", cursos: 4, horasSemanales: 6 },
  { id: "m2", nombre: "Historia", profesor: "Prof. Lombardi", cursos: 3, horasSemanales: 4 },
  { id: "m3", nombre: "Biología", profesor: "Prof. Méndez", cursos: 3, horasSemanales: 4 },
  { id: "m4", nombre: "Lengua", profesor: "Prof. Ferrari", cursos: 4, horasSemanales: 5 },
  { id: "m5", nombre: "Inglés", profesor: null, cursos: 4, horasSemanales: 3 },
  { id: "m6", nombre: "Física", profesor: "Prof. Quiroga", cursos: 2, horasSemanales: 4 },
];

export default function PanelMaterias() {
  const [materias, setMaterias] = useState<Materia[]>(MATERIAS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  const materiasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter((m) => {
      const profesor = (m.profesor ?? "sin profesor").toLowerCase();
      return m.nombre.toLowerCase().includes(q) || profesor.includes(q);
    });
  }, [materias, busqueda]);

  const materiasSinProfesor = useMemo(
    () => materias.filter((m) => m.profesor === null).length,
    [materias],
  );

  const handleCrearMateria = (nueva: Omit<Materia, "id">) => {
    setMaterias((prev) => [...prev, { ...nueva, id: `m${Date.now()}` }]);
    setModalAbierto(false);
  };

  const handleGestionar = (id: string) => {
    console.log("Gestionar materia:", id);
  };

  return (
    <>
      {/* ── Hero header + acción ── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-headline">Materias</h2>
          <p className="text-on-surface-variant/70 mt-1">
            Plan de estudios, asignación de profesores y carga horaria.
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-[#C548F5] hover:bg-[#C548F5]/90 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 self-start md:self-auto"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nueva materia
        </button>
      </div>

      {/* ── Buscador + alerta de materias sin profesor ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por materia o profesor…"
            className="w-full bg-[#2D1B4E] border border-surface-variant rounded-full pl-10 pr-4 py-3 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none transition-colors"
          />
        </div>
        {materiasSinProfesor > 0 && (
          <div className="flex items-center gap-2 bg-error/10 text-error px-4 py-3 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-base">warning</span>
            {materiasSinProfesor} materia{materiasSinProfesor > 1 ? "s" : ""} sin profesor
          </div>
        )}
      </div>

      {/* ── Grilla de materias ── */}
      {materiasFiltradas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {materiasFiltradas.map((materia) => (
            <TarjetaMateria key={materia.id} materia={materia} onGestionar={handleGestionar} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-2 block">search_off</span>
          No se encontraron materias para “{busqueda}”.
        </div>
      )}

      <ModalNuevaMateria
        abierto={modalAbierto}
        materiasExistentes={materias}
        onCerrar={() => setModalAbierto(false)}
        onCrear={handleCrearMateria}
      />
    </>
  );
}
