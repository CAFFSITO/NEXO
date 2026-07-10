import { useMemo, useState } from "react";
import Sidebar, { type Rol } from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import SearchAndFilter from "./components/biblioteca/SearchAndFilter";
import ResourceCard, { type EstadoRecurso } from "./components/biblioteca/ResourceCard";

type Ambito = "nacional" | "institucional";

interface Resource {
  id: string;
  title: string;
  category: string;
  icon: string;
  author?: string;
  authorIcon?: string;
  authorFallbackIcon?: string;
  fileType: string;
  fileSize: string;
  estado?: EstadoRecurso;
  ambito: Ambito;
}

const RESOURCES: Resource[] = [
  {
    id: "1",
    title: "Reglamento institucional 2025",
    category: "General",
    icon: "description",
    author: "Dirección Académica",
    authorFallbackIcon: "account_balance",
    fileType: "PDF",
    fileSize: "2.4 MB",
    estado: "verificado",
    ambito: "institucional",
  },
  {
    id: "2",
    title: "Guía de estudio: Parcial de Historia",
    category: "Historia",
    icon: "menu_book",
    author: "Prof. Méndez",
    fileType: "DOCX",
    fileSize: "1.1 MB",
    estado: "verificado",
    ambito: "institucional",
  },
  {
    id: "3",
    title: "Canal de YouTube del departamento de Ciencias",
    category: "Biología",
    icon: "link",
    author: "Depto. de Ciencias",
    authorFallbackIcon: "labs",
    fileType: "LINK",
    fileSize: "N/A",
    estado: "revision",
    ambito: "institucional",
  },
  {
    id: "4",
    title: "Banco Nacional de Lecturas - Lengua",
    category: "Lengua",
    icon: "auto_stories",
    author: "Ministerio de Educación",
    authorFallbackIcon: "public",
    fileType: "PDF",
    fileSize: "5.8 MB",
    estado: "verificado",
    ambito: "nacional",
  },
  {
    id: "5",
    title: "Simulaciones interactivas de Física",
    category: "Física",
    icon: "link",
    author: "Red Federal de Recursos",
    authorFallbackIcon: "public",
    fileType: "LINK",
    fileSize: "N/A",
    estado: "verificado",
    ambito: "nacional",
  },
];

export default function BibliotecaPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol: Rol = usuario?.rol ?? "estudiante";

  // Permisos del módulo Biblioteca (arquitectura NEXO):
  //  • Admin Académica y Bibliotecario suben recursos directo.
  //  • Estudiantes y Profesores los presentan para aprobación (cola FIFO).
  const puedeSubir = rol === "admin-academico" || rol === "bibliotecario";
  const puedePresentar = rol === "estudiante" || rol === "profesor";

  const [ambito, setAmbito] = useState<Ambito>("institucional");
  const [query, setQuery] = useState("");

  // Filtra por ámbito (tab) + texto de búsqueda
  const recursosVisibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter((r) => r.ambito === ambito).filter((r) => {
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.author?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [ambito, query]);

  const handlePresentarRecurso = () => console.log("Abrir formulario: presentar recurso para aprobación");
  const handleSubirArchivo = () => console.log("Abrir formulario: subir nuevo archivo");
  const handleAccionRecurso = (r: Resource) => console.log("Acción sobre recurso:", r.title);

  const tabs: { id: Ambito; label: string }[] = [
    { id: "nacional", label: "Nacional" },
    { id: "institucional", label: "Institucional" },
  ];

  return (
    <div className="bg-[#190d2d] min-h-screen text-on-surface font-body">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
        rutaActiva="/biblioteca/institucional"
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      {/* Top App Bar: tabs Nacional / Institucional */}
      <header className="fixed top-0 left-[220px] right-0 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] px-8 py-4 flex justify-between items-center z-40">
        <nav className="flex gap-6 font-headline font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAmbito(tab.id)}
              className={`pb-2 transition-all cursor-pointer ${
                ambito === tab.id
                  ? "text-[#C548F5] border-b-2 border-[#C548F5]"
                  : "text-gray-400 hover:text-[#C548F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-[#C548F5] transition-all p-2">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-gray-400 hover:text-[#C548F5] transition-all p-2">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-24 p-8 min-h-screen">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-xs text-gray-500 font-label mb-2">
              <span>{ambito === "institucional" ? "Institución" : "Nacional"}</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-[#C548F5]">Biblioteca</span>
            </nav>
            <h1 className="text-4xl font-black font-headline text-white tracking-tight">
              {ambito === "institucional"
                ? "Biblioteca · Colegio San Martín"
                : "Biblioteca Digital Nacional"}
            </h1>
            <p className="text-gray-400 font-body max-w-2xl">
              {ambito === "institucional"
                ? "Accede a recursos compartidos, guías de estudio y reglamentación oficial de tu institución."
                : "Explorá recursos educativos compartidos por instituciones de todo el país."}
            </p>
          </div>
          {puedeSubir ? (
            <button
              onClick={handleSubirArchivo}
              className="flex items-center gap-2 px-6 py-3 bg-[#C548F5] text-white rounded-full font-bold hover:bg-[#d15aff] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              <span>Agregar recurso</span>
            </button>
          ) : puedePresentar ? (
            <button
              onClick={handlePresentarRecurso}
              className="flex items-center gap-2 px-6 py-3 border-2 border-[#C548F5] text-[#C548F5] rounded-full font-bold hover:bg-[#C548F5] hover:text-white transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              <span>Presentar recurso</span>
            </button>
          ) : null}
        </div>

        {/* Filter & Search Bar */}
        <SearchAndFilter onSearch={setQuery} onFilter={() => console.log("Abrir filtros avanzados")} />

        {/* Resource Cards Grid */}
        {recursosVisibles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recursosVisibles.map((r) => (
              <ResourceCard
                key={r.id}
                title={r.title}
                category={r.category}
                icon={r.icon}
                author={r.author}
                authorIcon={r.authorIcon}
                authorFallbackIcon={r.authorFallbackIcon}
                fileType={r.fileType}
                fileSize={r.fileSize}
                estado={r.estado}
                onAction={() => handleAccionRecurso(r)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-gray-400 block mb-4">library_books</span>
            <p className="text-gray-400">No se encontraron recursos</p>
          </div>
        )}

        {/* Empty State Suggestion / Footer */}
        <div className="mt-16 p-8 border border-dashed border-[#2D1B4E] rounded-lg text-center flex flex-col items-center gap-4 bg-[#1C1030]/30">
          <div className="w-16 h-16 rounded-full bg-[#2D1B4E] flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-500 text-3xl">upload_file</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-headline">¿No encuentras lo que buscas?</h4>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {puedeSubir
                ? "Sumá recursos verificados a la biblioteca del Colegio San Martín."
                : puedePresentar
                  ? "Colaborá presentando tus apuntes o recursos: la biblioteca los revisa antes de publicarlos."
                  : "Explorá los recursos disponibles compartidos por tu institución."}
            </p>
          </div>
          {puedeSubir ? (
            <button
              onClick={handleSubirArchivo}
              className="text-[#C548F5] text-sm font-bold bg-[#C548F5]/10 px-6 py-2 rounded-full hover:bg-[#C548F5]/20 transition-colors"
            >
              Subir nuevo recurso
            </button>
          ) : puedePresentar ? (
            <button
              onClick={handlePresentarRecurso}
              className="text-[#C548F5] text-sm font-bold bg-[#C548F5]/10 px-6 py-2 rounded-full hover:bg-[#C548F5]/20 transition-colors"
            >
              Presentar recurso
            </button>
          ) : null}
        </div>
      </main>

      {/* Botón flotante contextual (ayuda IA) */}
      <button
        onClick={() => console.log("Abrir asistente contextual")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#C548F5] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        aria-label="Asistente"
      >
        <span className="material-symbols-outlined text-2xl">question_answer</span>
      </button>
    </div>
  );
}
