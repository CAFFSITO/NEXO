// src/components/shared/InputField.tsx
// Input reutilizable con soporte para label, placeholder, tipo y acción derecha

import { useId, useState } from "react";

interface InputFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
}

export default function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  disabled = false,
}: InputFieldProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-on-surface-variant ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
