// src/components/login/LoginForm.tsx
// Formulario de inicio de sesión con inputs y botón CTA

import { useState } from "react";
import InputField from "../shared/InputField";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  onForgotPassword: () => void;
  error?: string | null;
}

export default function LoginForm({ onSubmit, onForgotPassword, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <InputField
        label="Correo institucional"
        type="email"
        placeholder="tu@escuela.edu.ar"
        value={email}
        onChange={setEmail}
      />

      <InputField
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
      />

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Olvidé mi contraseña */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-primary hover:text-primary-container transition-colors duration-200"
        >
          Olvidé mi contraseña
        </button>
      </div>

      {/* Botón CTA */}
      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary-container text-surface-container-lowest font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200"
      >
        Ingresar
      </button>
    </form>
  );
}
