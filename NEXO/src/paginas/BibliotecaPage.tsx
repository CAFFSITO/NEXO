import { useMemo, useState } from "react";
import Sidebar, { type Rol } from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import SearchAndFilter from "./components/biblioteca/SearchAndFilter";
import ResourceCard from "./components/biblioteca/ResourceCard";
import ModalPresentarRecurso from "./components/biblioteca/ModalPresentarRecurso";
import {
  normalizar,
  usarBiblioteca,
  type AmbitoBiblioteca,
  type Recurso,
} from "../servicios/biblioteca";
import { Cargando, Fallo, Vacio } from "./components/shared/EstadoCarga";
import { usarInstitucion } from "../servicios/institucion";
import { urlDescarga } from "../servicios/archivos";

// Ícono por tipo de recurso. Decoración, no un dato de la base.
const ICONO_TIPO: Record<Recurso["tipo"], string> = {
  documento: "description",
  guia: "menu_book",
  video: "smart_display",
  enlace: "link",
  libro: "auto_stories",
};

export default function BibliotecaPage() {
  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } = useNavegacion();
  const rol: Rol = usuario?.rol ?? "estudiante";

  // Permisos del módulo Biblioteca (arquitectura NEXO):
  //  • Admin Académica y Bibliotecario suben recursos directo.
  //  • Estudiantes y Profesores los presentan para aprobación (cola FIFO).
  const puedeSubir = rol === "admin-academico" || rol === "bibliotecario";
  const puedePresentar = rol === "estudiante" || rol === "profesor";

  const [ambito, setAmbito] = useState<AmbitoBiblioteca>("institucional");
  const [query, setQuery] = useState("");
  const [modalPresentar, setModalPresentar] = useState(false);
  const { institucion } = usarInstitucion();

  // Los recursos inventados ("Reglamento institucional 2025", "Simulaciones de
  // Física" del "Ministerio de Educación") se fueron: cada pestaña pide a la
  // base los recursos de su ámbito.
  const { recursos, cargando, error, recargar } = usarBiblioteca(ambito);

  // La búsqueda ya no distingue tildes ni mayúsculas (Error 2.E.3): "cancion"
  // encuentra "canción". Antes solo tomaba coincidencias exactas.
  const recursosVisibles = useMemo(() => {
    const q = normalizar(query.trim());
    if (!recursos) return [];
    if (!q) return recursos;
    return recursos.filter(
      (r) =>
        normalizar(r.titulo).includes(q) ||
        normalizar(r.categoria).includes(q) ||
        normalizar(r.autor).includes(q)
    );
  }, [recursos, query]);

  // "Presentar recurso" y "Agregar recurso" abren el mismo flujo (Etapa 7): un
  // recurso nuevo entra a la cola de revisión (Error 2.E.2). El bibliotecario y
  // la dirección lo presentan igual que un estudiante; el circuito editorial es
  // uno solo (14.11), así que no hay dos formularios distintos.
  const handlePresentarRecurso = () => setModalPresentar(true);
  // Descargar descarga y Ver guía abre (Error 2.E.4): un enlace se abre tal
  // cual; un archivo se baja por /api/archivos/:id, donde el servidor valida
  // el permiso antes de entregar un byte.
  const handleAccionRecurso = (r: Recurso) => {
    if (r.enlaceUrl) window.open(r.enlaceUrl, "_blank", "noopener");
    else if (r.archivoId) window.open(urlDescarga(r.archivoId), "_blank");
  };

  const tabs: { id: AmbitoBiblioteca; label: string }[] = [
    { id: "nacional", label: "Nacional" },
    { id: "institucional", label: "Institucional" },
  ];

  return (
    <div className="bg-[#190d2d] min-h-screen text-on-surface font-body">
      <Sidebar
        usuario={usuario ?? { nombre: "", rol }}
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
            {/* El nombre del colegio salía escrito a mano ("Colegio San
                Martín"). Sale de la base. */}
            <h1 className="text-4xl font-black font-headline text-white tracking-tight">
              {ambito === "institucional"
                ? `Biblioteca · ${institucion?.nombre ?? ""}`
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
              onClick={handlePresentarRecurso}
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
        {cargando ? (
          <Cargando que="los recursos de la biblioteca" />
        ) : error ? (
          <Fallo error={error} onReintentar={recargar} />
        ) : recursosVisibles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recursosVisibles.map((r) => (
              <ResourceCard
                key={r.id}
                title={r.titulo}
                category={r.categoria}
                icon={ICONO_TIPO[r.tipo]}
                author={r.autor}
                authorIcon={r.autorAvatar}
                fileType={r.etiquetaArchivo}
                fileSize={r.tamano ?? "N/A"}
                // La tarjeta habla de "verificado"/"revision"; la base, de
                // "aprobado"/"en-revision". Es la misma cosa; se traduce acá.
                estado={r.estado === "aprobado" ? "verificado" : "revision"}
                onAction={() => handleAccionRecurso(r)}
              />
            ))}
          </div>
        ) : (
          <Vacio
            icono="library_books"
            mensaje={query ? "No se encontraron recursos para tu búsqueda." : "Todavía no hay recursos en esta biblioteca."}
          />
        )}

        {/* Antes había, además del botón de arriba, un segundo "Presentar
            recurso" en un bloque al pie: el mismo acceso aparecía dos veces
            (Error 2.E.6). Se deja uno solo, el del encabezado. */}
      </main>

      {/* Botón flotante de ayuda: abre la Asistencia IA real. Solo lo ve el
          estudiante, que es el único rol con acceso a esa pantalla (los
          permisos los valida el servidor; acá solo no se ofrece un botón que
          terminaría rebotando — Error 12.6). */}
      {rol === "estudiante" && (
        <button
          onClick={() => handleNavegar("/asistencia-academica")}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#C548F5] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
          aria-label="Asistente"
        >
          <span className="material-symbols-outlined text-2xl">question_answer</span>
        </button>
      )}

      {modalPresentar && (
        <ModalPresentarRecurso
          onCerrar={() => setModalPresentar(false)}
          onPresentado={() => {
            setModalPresentar(false);
            // El recurso queda "en revisión" y aparece en la sección propia
            // (Error 2.E.1): se recarga para que se vea sin refrescar la página.
            recargar();
          }}
        />
      )}
    </div>
  );
}
