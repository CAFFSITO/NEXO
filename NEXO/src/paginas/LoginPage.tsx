// src/pages/LoginPage.tsx
// Página principal de inicio de sesión — ensambla todos los componentes

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundGlow from "./components/shared/BackgroundGlow";
import NexoLogo from "./components/shared/NexoLogo";
import LoginForm from "./components/moduloLogin/LoginForm";
import LoginFooter from "./components/moduloLogin/LoginFooter";
import { useNavegacion } from "../navegacion";

export default function LoginPage() {
  const { login } = useNavegacion();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [ingresando, setIngresando] = useState(false);

  // Ahora las credenciales viajan al servidor, así que esto tarda: hay que
  // avisar que está en curso y evitar que se apriete "Ingresar" dos veces.
  const handleLogin = async (email: string, contrasena: string) => {
    setIngresando(true);
    setError(null);

    const resultado = await login(email, contrasena);

    // Si entró, este componente desaparece de pantalla y no hay nada que apagar.
    if (!resultado.ok) {
      setError(resultado.error ?? "Correo o contraseña incorrectos.");
      setIngresando(false);
    }
  };

  // Este botón escribía una línea en la consola del navegador y nada más: para
  // el usuario, no hacía absolutamente nada (Error 12.5). Ahora abre el flujo
  // real de recuperación.
  const handleForgotPassword = () => navigate("/recuperar-contrasena");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <BackgroundGlow />

      <main className="w-full max-w-[440px] relative z-10">
        {/* Card central */}
        <div className="bg-surface-container p-8 md:p-10 rounded-[20px] border border-primary/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
          {/* Branding */}
          <div className="mb-10">
            <NexoLogo size="md" showSlogan />
          </div>

          {/* Título de sección */}
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-8">
            Iniciar sesión
          </h2>

          {/* Formulario */}
          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={handleForgotPassword}
            error={error}
            ingresando={ingresando}
          />

          {/* Separador informativo */}
          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <p className="text-xs leading-relaxed text-on-surface-variant/60 font-medium">
              Tus credenciales fueron enviadas por la administración de tu institución
            </p>
          </div>
        </div>

        {/* Ayuda de acceso. Era un <a href="#">: un enlace a ninguna parte que
            solo movía la página al tope (Error 12.5). Ahora lleva a la página
            de ayuda, que sí existe. */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/ayuda-de-acceso")}
            className="text-sm font-medium text-on-surface-variant/70 hover:text-primary transition-colors duration-200 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">help_outline</span>
            ¿Problemas para ingresar?
          </button>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}
