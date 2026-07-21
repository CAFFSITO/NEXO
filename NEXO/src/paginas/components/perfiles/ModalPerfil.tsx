// src/paginas/components/perfiles/ModalPerfil.tsx
// Modal de alta y edición de perfil. Recoge nombre, rol (los siete que la
// dirección administra, incluidos Familia y Bibliotecario), correo y estado.
//
// El correo es la cuenta con la que la persona entra, así que es obligatorio
// (Error 6.B.3). La "asignación" (curso, cátedra) no se escribe acá: se deriva
// de la base, y aparece sola en la tabla una vez que la persona está inscripta.
//
// `onGuardar` es asíncrono y devuelve un mensaje de error del servidor (o null
// si salió bien): así una alta rechazada —por ejemplo un correo repetido— deja
// el modal abierto mostrando el motivo, en vez de tragarse el problema.

import { useEffect, useState } from "react";
import { META_ROL, ROLES, type Perfil, type PerfilEditable, type Rol } from "./tipos";

interface ModalPerfilProps {
  abierto: boolean;
  // Si se pasa un perfil, el modal entra en modo edición; si es null, modo alta.
  perfilEnEdicion: Perfil | null;
  onCerrar: () => void;
  onGuardar: (datos: PerfilEditable, idEnEdicion: string | null) => Promise<string | null>;
}

const VACIO: PerfilEditable = {
  nombre: "",
  rol: "estudiante",
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
  const [guardando, setGuardando] = useState(false);

  // Precarga el formulario al abrir en modo edición; lo resetea en modo alta.
  useEffect(() => {
    if (perfilEnEdicion) {
      setDatos({
        nombre: perfilEnEdicion.nombre,
        rol: perfilEnEdicion.rol,
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (datos.nombre.trim() === "") {
      setError("El nombre es obligatorio.");
      return;
    }
    // El correo es la cuenta: sin él la persona no puede entrar (Error 6.B.3).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
      setError("Escribí un correo válido: es la cuenta con la que la persona va a entrar.");
      return;
    }

    setGuardando(true);
    const fallo = await onGuardar(
      { ...datos, nombre: datos.nombre.trim(), email: datos.email.trim().toLowerCase() },
      perfilEnEdicion?.id ?? null,
    );
    setGuardando(false);
    // Si el servidor rechazó (correo repetido, etc.), se muestra y el modal
    // sigue abierto. Si salió bien, la página cierra el modal.
    if (fallo) setError(fallo);
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
                : "Al crear se genera una contraseña inicial para entregarle a la persona."}
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
              onChange={(e) => actualizar("rol", e.target.value as Rol)}
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

        {/* Correo — la cuenta con la que entra */}
        <label className="flex flex-col gap-1 mb-2">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Correo (cuenta de acceso)
          </span>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizar("email", e.target.value)}
            placeholder="nombre@colegio.edu.ar"
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-white placeholder:text-on-surface-variant/50 focus:border-primary outline-none"
          />
          <span className="text-[11px] text-on-surface-variant/60">
            El {meta.labelAsignacion.toLowerCase()} se asigna después, desde Gestión de Cursos.
          </span>
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
            disabled={guardando}
            className="flex-1 bg-[#C548F5] hover:bg-[#C548F5]/90 text-white py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
