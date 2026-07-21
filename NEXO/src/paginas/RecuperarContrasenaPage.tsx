// src/paginas/RecuperarContrasenaPage.tsx
// Flujo de "olvidé mi contraseña" (Error 12.5). Antes, ese enlace del login no
// producía ningún efecto: escribía una línea invisible en la consola.
//
// Son dos pasos, y la pantalla no decide nada en ninguno de los dos: el código
// lo genera, lo guarda cifrado y lo verifica el servidor (servidor/cuenta.js).
//   1. Escribís tu correo  → el servidor genera un código de un solo uso.
//   2. Escribís el código y tu contraseña nueva → el servidor la cambia.
//
// Se llega sin sesión, obviamente: es la pantalla de quien no puede entrar.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundGlow from "./components/shared/BackgroundGlow";
import NexoLogo from "./components/shared/NexoLogo";
import InputField from "./components/shared/InputField";
import LoginFooter from "./components/moduloLogin/LoginFooter";
import { useNavegacion } from "../navegacion";
import { pedirCodigo, confirmarRecuperacion } from "../servicios/cuenta";

type Paso = "pedir-codigo" | "confirmar" | "listo";

export default function RecuperarContrasenaPage() {
  const navigate = useNavigate();

  // A esta pantalla se puede llegar con sesión abierta: desde Configuración, si
  // no te acordás la contraseña actual. Y recuperar la contraseña cierra TODAS
  // las sesiones, incluida esa. Si de acá se saliera con un `navigate` pelado,
  // la aplicación seguiría creyendo que estás adentro y te dejaría entrar a una
  // pantalla que el servidor ya no te va a servir. Salir por `cerrarSesion`
  // deja las dos partes de acuerdo. Sin sesión abierta no hace nada: sirve para
  // los dos casos.
  const { cerrarSesion: salirAlLogin } = useNavegacion();

  const [paso, setPaso] = useState<Paso>("pedir-codigo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // ── Paso 1: pedir el código ───────────────────────────────────────────────
  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    setError(null);
    setEnviando(true);
    const resultado = await pedirCodigo(email);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo pedir el código.");
      return;
    }

    // El servidor contesta lo mismo exista o no la cuenta, así que la pantalla
    // tampoco puede afirmar que el código "se envió": solo repite lo que dijo.
    setAviso(resultado.mensaje ?? null);
    setPaso("confirmar");
  };

  // ── Paso 2: canjear el código ─────────────────────────────────────────────
  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    setError(null);

    if (nueva !== repetida) {
      setError("La contraseña nueva y su repetición no coinciden.");
      return;
    }

    setEnviando(true);
    const resultado = await confirmarRecuperacion(email, codigo, nueva);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo cambiar la contraseña.");
      return;
    }

    setAviso(resultado.mensaje ?? null);
    setPaso("listo");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <BackgroundGlow />

      <main className="w-full max-w-[440px] relative z-10">
        <div className="bg-surface-container p-8 md:p-10 rounded-[20px] border border-primary/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          <div className="mb-10">
            <NexoLogo size="md" showSlogan />
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Recuperar mi contraseña
          </h2>

          {/* ── Paso 1 ── */}
          {paso === "pedir-codigo" && (
            <>
              <p className="text-sm text-on-surface-variant/70 mb-8">
                Escribí tu correo institucional y generamos un código de un solo uso
                para que puedas definir una contraseña nueva.
              </p>

              <form onSubmit={solicitar} className="space-y-6">
                <InputField
                  label="Correo institucional"
                  type="email"
                  placeholder="tu@escuela.edu.ar"
                  value={email}
                  onChange={setEmail}
                />

                {error && (
                  <p className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-primary hover:bg-primary-container text-surface-container-lowest font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviando ? "Generando..." : "Generar código"}
                </button>
              </form>
            </>
          )}

          {/* ── Paso 2 ── */}
          {paso === "confirmar" && (
            <>
              {aviso && (
                <p className="text-sm font-medium text-on-surface-variant bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-6">
                  {aviso}
                </p>
              )}

              {/* Mientras NEXO no tenga envío de correos, el código sale por la
                  terminal del servidor. Decirlo es más honesto que un "revisá tu
                  correo" que hoy sería mentira. */}
              <p className="text-xs text-on-surface-variant/50 mb-6 leading-relaxed">
                NEXO todavía no envía correos: el código aparece en la terminal donde
                corre el servidor. Si no lo tenés a mano, pedíselo a quien opera NEXO
                en tu institución.
              </p>

              <form onSubmit={confirmar} className="space-y-6">
                <InputField
                  label="Código de un solo uso"
                  type="text"
                  placeholder="6 dígitos"
                  value={codigo}
                  onChange={setCodigo}
                />
                <InputField
                  label="Contraseña nueva"
                  type="password"
                  placeholder="Al menos 8 caracteres"
                  value={nueva}
                  onChange={setNueva}
                />
                <InputField
                  label="Repetir la contraseña nueva"
                  type="password"
                  placeholder="••••••••"
                  value={repetida}
                  onChange={setRepetida}
                />

                {error && (
                  <p className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-primary hover:bg-primary-container text-surface-container-lowest font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviando ? "Cambiando..." : "Cambiar mi contraseña"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaso("pedir-codigo");
                    setCodigo("");
                    setError(null);
                    setAviso(null);
                  }}
                  className="w-full text-sm font-medium text-on-surface-variant/70 hover:text-primary transition-colors"
                >
                  Usar otro correo o pedir un código nuevo
                </button>
              </form>
            </>
          )}

          {/* ── Listo ── */}
          {paso === "listo" && (
            <>
              <p className="text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 my-6">
                {aviso ?? "Tu contraseña quedó cambiada."}
              </p>
              <button
                onClick={salirAlLogin}
                className="w-full bg-primary hover:bg-primary-container text-surface-container-lowest font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200"
              >
                Ir a iniciar sesión
              </button>
            </>
          )}

          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <button
              onClick={salirAlLogin}
              className="text-sm font-medium text-on-surface-variant/70 hover:text-primary transition-colors"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>

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
