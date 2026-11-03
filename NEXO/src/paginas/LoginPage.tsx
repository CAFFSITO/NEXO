import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginForm from "./components/moduloLogin/LoginForm";
import LoginFooter from "./components/moduloLogin/LoginFooter";
import { useNavegacion } from "../navegacion";

export default function LoginPage() {
  const { login } = useNavegacion();
  const navigate = useNavigate();
  const location = useLocation();
  const sesionVencida = (location.state as { sesionVencida?: boolean } | null)?.sesionVencida;
  const [error, setError] = useState<string | null>(null);
  const [ingresando, setIngresando] = useState(false);
  const handleLogin = async (email: string, contrasena: string) => {
    if (ingresando) return;
    setIngresando(true);
    setError(null);
    try {
      const resultado = await login(email.trim(), contrasena);
      if (!resultado.ok) setError(resultado.error ?? "Correo o contraseña incorrectos.");
    } catch {
      setError("No pudimos conectar con NEXO. Volvé a intentarlo.");
    } finally { setIngresando(false); }
  };
  return <div className="nexo-login">
    <section className="nexo-login-form-panel">
      <div className="nexo-login-marca"><span className="material-symbols-outlined" aria-hidden="true">hub</span>NEXO</div>
      <main>
        <h1 className="text-[28px] font-bold tracking-tight text-on-surface">Iniciá sesión</h1>
        <p className="mt-2 mb-8 text-[15px] text-on-surface-variant">Usá el correo y la contraseña que te dio tu institución.</p>
        {sesionVencida && <p role="status" className="mb-5 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">Tu sesión venció. Ingresá de nuevo para continuar.</p>}
        <LoginForm onSubmit={handleLogin} onForgotPassword={() => navigate("/recuperar-contrasena")} error={error} ingresando={ingresando} />
        <p className="mt-8 text-sm text-on-surface-variant">
          ¿Problemas para entrar?{" "}
          <button type="button" onClick={() => navigate("/ayuda-de-acceso")} className="font-semibold text-primary hover:underline">Pedí ayuda</button>
        </p>
      </main>
      <LoginFooter />
    </section>
    <section className="nexo-login-story" aria-label="Qué es NEXO">
      <h2>Toda tu escuela, en un solo lugar.</h2>
      <p>Clases, tareas, mensajes, avisos y calendario: la comunidad educativa conectada, desde la computadora o el celular.</p>
      <div className="nexo-login-features">
        <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">school</span><h3>Aprendizaje</h3><p>Cursos, tareas y progreso en tu espacio.</p></div>
        <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">forum</span><h3>Comunicación</h3><p>Mensajes y avisos que llegan a tiempo.</p></div>
        <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">verified_user</span><h3>Institucional</h3><p>Tu escuela administra quién accede.</p></div>
      </div>
    </section>
  </div>;
}
