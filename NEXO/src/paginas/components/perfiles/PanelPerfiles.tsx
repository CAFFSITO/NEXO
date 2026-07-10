// src/paginas/components/perfiles/PanelPerfiles.tsx
// Contenido (sin chrome: sidebar/header) de la pestaña "Perfiles académicos".
// Lógica: lista con búsqueda + filtros (rol/estado), paginación, alta/edición vía modal,
// y baja como soft delete (papelera, restaurable) según NEXO_PERFIL_ARCHITECTURE.
// Reutilizado por PerfilesAcademicosPage (standalone) y GestionInstitucionalPage (tabs).

import { useMemo, useState } from "react";
import EstadisticasPerfiles from "./EstadisticasPerfiles";
import FiltrosPerfiles, {
  type FiltroEstado,
  type FiltroRol,
} from "./FiltrosPerfiles";
import TablaPerfiles from "./TablaPerfiles";
import ModalPerfil from "./ModalPerfil";
import { META_ROL, type Perfil, type PerfilEditable } from "./tipos";

const POR_PAGINA = 5;

// Datos de ejemplo (español rioplatense) — equivalentes a las filas del HTML original.
const PERFILES_INICIALES: Perfil[] = [
  { id: "1", nombre: "Julieta Rossi", identificador: "ID: #48291", rol: "estudiante", asignacion: "4°B — Secundario", estado: "activo" },
  { id: "2", nombre: "Lucas Fernández", identificador: "ID: #48292", rol: "estudiante", asignacion: "4°B — Secundario", estado: "activo" },
  { id: "3", nombre: "Prof. García", identificador: "Matrícula: DOC-331", rol: "profesor", asignacion: "Cátedra de Matemática", estado: "activo" },
  { id: "4", nombre: "Prof. Méndez", identificador: "Matrícula: DOC-332", rol: "profesor", asignacion: "Cátedra de Biología", estado: "activo" },
  { id: "5", nombre: "Preceptora Martínez", identificador: "ID: #AUX-012", rol: "preceptor", asignacion: "4°B — Nivel Medio", estado: "activo" },
  { id: "6", nombre: "Admin Romero", identificador: "ID: #ADMIN-01", rol: "admin", asignacion: "Dirección Académica", estado: "activo" },
  { id: "7", nombre: "Sofía Giménez", identificador: "ID: #48293", rol: "estudiante", asignacion: "5°A — Secundario", estado: "inactivo" },
  { id: "8", nombre: "Prof. Lombardi", identificador: "Matrícula: DOC-333", rol: "profesor", asignacion: "Cátedra de Historia", estado: "activo" },
];

export default function PanelPerfiles() {
  const [perfiles, setPerfiles] = useState<Perfil[]>(PERFILES_INICIALES);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<FiltroRol>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [pagina, setPagina] = useState(1);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [perfilEnEdicion, setPerfilEnEdicion] = useState<Perfil | null>(null);

  // ─── Derivados ──────────────────────────────────────────

  // Para las estadísticas: todo lo que NO está en papelera.
  const perfilesVigentes = useMemo(
    () => perfiles.filter((p) => p.estado !== "papelera"),
    [perfiles],
  );

  const perfilesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return perfiles.filter((p) => {
      // Por defecto la papelera queda oculta salvo que se filtre explícitamente por ella.
      if (filtroEstado === "todos" && p.estado === "papelera") return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroRol !== "todos" && p.rol !== filtroRol) return false;
      if (q !== "" && !p.nombre.toLowerCase().includes(q) && !p.identificador.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [perfiles, busqueda, filtroRol, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(perfilesFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const perfilesPagina = perfilesFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );

  // ─── Handlers de filtros (resetean a la página 1) ───────

  const onBuscar = (texto: string) => {
    setBusqueda(texto);
    setPagina(1);
  };
  const onFiltrarRol = (rol: FiltroRol) => {
    setFiltroRol(rol);
    setPagina(1);
  };
  const onFiltrarEstado = (estado: FiltroEstado) => {
    setFiltroEstado(estado);
    setPagina(1);
  };

  // ─── CRUD ───────────────────────────────────────────────

  const abrirAlta = () => {
    setPerfilEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (perfil: Perfil) => {
    setPerfilEnEdicion(perfil);
    setModalAbierto(true);
  };

  // Genera un identificador legible según el rol (simula credenciales automáticas).
  const generarIdentificador = (perfil: PerfilEditable) => {
    const meta = META_ROL[perfil.rol];
    const numero = Math.floor(1000 + Math.random() * 9000);
    const etiqueta = perfil.rol === "profesor" ? "Matrícula" : "ID";
    return `${etiqueta}: ${meta.prefijoId}${numero}`;
  };

  const guardarPerfil = (datos: PerfilEditable, idEnEdicion: string | null) => {
    if (idEnEdicion) {
      // Edición: conserva id e identificador existentes.
      setPerfiles((prev) =>
        prev.map((p) => (p.id === idEnEdicion ? { ...p, ...datos } : p)),
      );
    } else {
      // Alta: id y credenciales autogeneradas.
      const nuevo: Perfil = {
        id: crypto.randomUUID(),
        identificador: generarIdentificador(datos),
        eliminadoEn: null,
        ...datos,
      };
      setPerfiles((prev) => [nuevo, ...prev]);
      setPagina(1);
    }
    setModalAbierto(false);
    setPerfilEnEdicion(null);
  };

  // Baja = soft delete (papelera, restaurable 7 días según arquitectura).
  const eliminarPerfil = (id: string) => {
    setPerfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, estado: "papelera", eliminadoEn: new Date().toISOString() } : p,
      ),
    );
  };

  const restaurarPerfil = (id: string) => {
    setPerfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: "activo", eliminadoEn: null } : p)),
    );
  };

  return (
    <>
      {/* Encabezado de sección + acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white font-headline tracking-tight">
            Perfiles Académicos
          </h2>
          <p className="text-slate-400 mt-1">
            Administra el acceso y roles de toda la comunidad educativa.
          </p>
        </div>
        <button
          onClick={abrirAlta}
          className="flex items-center gap-2 bg-[#C548F5] hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-[#C548F5]/20 transition-all self-start"
        >
          <span className="material-symbols-outlined text-xl">person_add</span>
          <span>Nuevo perfil</span>
        </button>
      </div>

      <EstadisticasPerfiles perfiles={perfilesVigentes} />

      <FiltrosPerfiles
        busqueda={busqueda}
        filtroRol={filtroRol}
        filtroEstado={filtroEstado}
        onBuscar={onBuscar}
        onFiltrarRol={onFiltrarRol}
        onFiltrarEstado={onFiltrarEstado}
      />

      <TablaPerfiles
        perfiles={perfilesPagina}
        totalFiltrados={perfilesFiltrados.length}
        totalGeneral={perfiles.length}
        paginaActual={paginaSegura}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPagina}
        onEditar={abrirEdicion}
        onEliminar={eliminarPerfil}
        onRestaurar={restaurarPerfil}
      />

      {/* FAB acceso rápido */}
      <button
        onClick={abrirAlta}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#C548F5] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
        <span className="absolute right-16 bg-surface-container-high px-4 py-2 rounded-xl text-sm font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none">
          Nuevo perfil rápido
        </span>
      </button>

      <ModalPerfil
        abierto={modalAbierto}
        perfilEnEdicion={perfilEnEdicion}
        onCerrar={() => {
          setModalAbierto(false);
          setPerfilEnEdicion(null);
        }}
        onGuardar={guardarPerfil}
      />
    </>
  );
}
