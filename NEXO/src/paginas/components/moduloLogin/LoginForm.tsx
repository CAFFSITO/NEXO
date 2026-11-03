// src/components/login/LoginForm.tsx
// Formulario de inicio de sesión con inputs y botón CTA

import { useState } from "react";
import InputField from "../shared/InputField";

interface LoginFormProps {
  onSubmit: (email: string, contrasena: string) => void;
  onForgotPassword: () => void;
  error?: string | null;
  /** true mientras el servidor está verificando las credenciales. */
  ingresando?: boolean;
}

export default function LoginForm({
  onSubmit,
  onForgotPassword,
  error,
  ingresando = false,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingresando) return; // no mandar dos veces el mismo ingreso
    onSubmit(email, contrasena);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InputField
        label="Correo institucional"
        required
        disabled={ingresando}
        autoComplete="username"
        type="email"
        placeholder="tu@escuela.edu.ar"
        value={email}
        onChange={setEmail}
      />

      <InputField
        label="Contraseña"
        required
        disabled={ingresando}
        autoComplete="current-password"
        type="password"
        placeholder="••••••••"
        value={contrasena}
        onChange={setContrasena}
      />

      {/* Mensaje de error */}
      {error && (
        <p role="alert" className="text-sm font-medium text-error bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Olvidé mi contraseña */}
      <div className="flex justify-end -mt-2">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-primary hover:underline"
        >
          Olvidé mi contraseña
        </button>
      </div>

      {/* Botón CTA */}
      <button
        type="submit"
        disabled={ingresando}
        className="nx-btn nx-btn-primario w-full h-11 text-[15px]"
      >
        {ingresando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
