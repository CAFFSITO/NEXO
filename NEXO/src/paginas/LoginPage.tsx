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
    <section className="nexo-login-story" aria-label="Bienvenida a NEXO">
      <div className="nexo-brand-row" style={{ padding: 0 }}><span className="nexo-brand-icon material-symbols-outlined" aria-hidden="true">hub</span><span className="nexo-wordmark">nexo<span>.</span></span></div>
      <div className="nexo-login-heading">
        <span className="nexo-eyebrow">Aprender nos conecta</span>
        <h1>Tu comunidad.<br />Tu camino.<br /><span>Todo en un lugar.</span></h1>
        <p>Un espacio para aprender, compartir ideas y acompañar cada paso de tu vida educativa.</p>
        <div className="nexo-login-features">
          <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">school</span><div><h2>El aprendizaje, conectado</h2><p>Cursos, tareas y progreso en tu propio espacio.</p></div></div>
          <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">forum</span><div><h2>Una comunidad cerca tuyo</h2><p>Conversaciones que continúan fuera del aula.</p></div></div>
          <div className="nexo-login-feature"><span className="material-symbols-outlined" aria-hidden="true">auto_stories</span><div><h2>Más oportunidades para crecer</h2><p>Recursos, objetivos e ideas para seguir aprendiendo.</p></div></div>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant/50">Un lugar para cada persona de tu institución.</p>
    </section>
    <section className="nexo-login-form-panel">
      <main>
        <p className="nexo-eyebrow mb-5">Acceso institucional</p>
        <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Qué bueno verte.</h2>
        <p className="text-sm leading-relaxed text-on-surface-variant/70 mb-9">Ingresá a tu cuenta para continuar donde lo dejaste.</p>
        {sesionVencida && <p role="status" className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">Tu sesión venció. Ingresá de nuevo para continuar.</p>}
        <LoginForm onSubmit={handleLogin} onForgotPassword={() => navigate("/recuperar-contrasena")} error={error} ingresando={ingresando} />
        <div className="mt-8 border-t border-outline-variant/40 pt-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary/70 text-xl" aria-hidden="true">verified_user</span>
          <p className="text-xs leading-relaxed text-on-surface-variant/65">Tu institución administra el acceso. Usá el correo y la contraseña que te compartieron.</p>
        </div>
        <button onClick={() => navigate("/ayuda-de-acceso")} className="mt-6 text-sm text-primary hover:underline">¿Necesitás ayuda para ingresar? <span aria-hidden="true">↗</span></button>
      </main>
      <LoginFooter />
    </section>
  </div>;
}
