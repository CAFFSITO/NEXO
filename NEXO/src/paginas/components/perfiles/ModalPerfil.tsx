// src/paginas/components/perfiles/ModalPerfil.tsx
// Modal de alta y edición de perfil. El campo "asignación" cambia de label/placeholder
// según el rol (un estudiante necesita curso, un profesor una cátedra, etc.).
// Valida campos obligatorios antes de emitir. La generación de credenciales/ID la hace
// la página (lógica de negocio).

import { useEffect, useState } from "react";
import { META_ROL, ROLES, type Perfil, type PerfilEditable, type RolPerfil } from "./tipos";

interface ModalPerfilProps {
  abierto: boolean;
  // Si se pasa un perfil, el modal entra en modo edición; si es null, modo alta.
  perfilEnEdicion: Perfil | null;
  onCerrar: () => void;
  onGuardar: (datos: PerfilEditable, idEnEdicion: string | null) => void;
}

const VACIO: PerfilEditable = {
  nombre: "",
  rol: "estudiante",
  asignacion: "",
  email: "",
  estado: "activo",
};

export default function ModalPerfil({
  abierto,
  perfilEnEdicion,
  onCerrar,
  onGuardar,
}: ModalPerfilProps) {
  const [datos, setDatos] = useState<PerfilEditable>(VACIO);
  const [error, setError] = useState("");

  // Precarga el formulario al abrir en modo edición; lo resetea en modo alta.
  useEffect(() => {
    if (perfilEnEdicion) {
      setDatos({
        nombre: perfilEnEdicion.nombre,
        rol: perfilEnEdicion.rol,
        asignacion: perfilEnEdicion.asignacion,
        email: perfilEnEdicion.email ?? "",
        estado: perfilEnEdicion.estado === "papelera" ? "activo" : perfilEnEdicion.estado,
      });
    } else {
      setDatos(VACIO);
    }
    setError("");
  }, [perfilEnEdicion, abierto]);

  if (!abierto) return null;

  const meta = META_ROL[datos.rol];
  const esEdicion = perfilEnEdicion !== null;

  const actualizar = <K extends keyof PerfilEditable>(campo: K, valor: PerfilEditable[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (datos.nombre.trim() === "") {
      setError("El nombre es obligatorio.");
      return;
    }
    // Para estudiantes no se puede crear sin curso asignado (regla de arquitectura).
    if (datos.asignacion.trim() === "") {
      setError(`Debés completar el campo "${meta.labelAsignacion}".`);
      return;
    }
    if (datos.email && datos.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
      setError("El email no tiene un formato válido.");
      return;
    }
    onGuardar(
      {
        ...datos,
        nombre: datos.nombre.trim(),
        asignacion: datos.asignacion.trim(),
        email: datos.email?.trim() ?? "",
      },
      perfilEnEdicion?.id ?? null,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-[#2D1B4E] border border-surface-variant rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-headline">
              {esEdicion ? "Editar perfil" : "Nuevo perfil"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {esEdicion
                ? "Modificá los datos del perfil académico."
                : "Al crear, se generan credenciales de acceso automáticamente."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nombre */}
        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Nombre y apellido
          </span>
          <input
            type="text"
            value={datos.nombre}
            onChange={(e) => actualizar("nombre", e.target.value)}
            placeholder="Ej: Julieta Rossi"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Rol */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Rol</span>
            <select
              value={datos.rol}
              onChange={(e) => actualizar("rol", e.target.value as RolPerfil)}
              className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
            >
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {META_ROL[rol].label}
                </option>
              ))}
            </select>
          </label>

          {/* Estado */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">Estado</span>
            <select
              value={datos.estado}
              onChange={(e) => actualizar("estado", e.target.value as "activo" | "inactivo")}
              className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        </div>

        {/* Asignación (label dinámico por rol) */}
        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            {meta.labelAsignacion}
          </span>
          <input
            type="text"
            value={datos.asignacion}
            onChange={(e) => actualizar("asignacion", e.target.value)}
            placeholder={meta.placeholderAsignacion}
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        {/* Email */}
        <label className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Email (opcional)
          </span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizar("email", e.target.value)}
            placeholder="nombre@colegio.edu.ar"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
        </label>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-medium hover:bg-primary/5 transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#C548F5] hover:bg-[#C548F5]/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95"
          >
            {esEdicion ? "Guardar cambios" : "Crear perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
