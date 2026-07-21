// src/paginas/ConfiguracionCuentaPage.tsx
// Configuración de la cuenta propia (Errores 2.A.1 y 12.5).
//
// Hasta ahora ningún perfil tenía dónde configurar nada, y una vez adentro no
// existía forma de cambiar la contraseña que te había dado la escuela. Esta es
// la pantalla, y la ven los ocho roles: todos tienen una cuenta.
//
// Todo lo que se muestra sale de la base a través de /api/cuenta. Acá no hay ni
// un nombre, ni un correo, ni un curso escrito a mano.

import { useEffect, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { ROL_LABELS } from "./components/shared/roles";
import TopBar from "./components/shared/TopBar";
import InputField from "./components/shared/InputField";
import { useNavegacion } from "../navegacion";
import { miCuenta, cambiarContrasena, type Cuenta } from "../servicios/cuenta";

// ─── DATO DE LA CUENTA (una fila del recuadro de arriba) ────────────────────

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-white/40">
        {etiqueta}
      </span>
      <span className="text-sm font-medium text-white">{valor}</span>
    </div>
  );
}

// ─── PÁGINA ─────────────────────────────────────────────────────────────────

export default function ConfiguracionCuentaPage() {
  const { navegar, cerrarSesion } = useNavegacion();

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    miCuenta().then((datos) => {
      if (!vigente) return;
      setCuenta(datos);
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const guardarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    setError(null);
    setExito(null);

    // Lo único que se comprueba en la pantalla es que las dos copias de la
    // contraseña nueva coincidan, porque el servidor recibe una sola y no puede
    // saberlo. El largo, la contraseña actual y todo lo demás los decide él: la
    // vidriera no tiene con qué decidirlo, ni debe.
    if (nueva !== repetida) {
      setError("La contraseña nueva y su repetición no coinciden.");
      return;
    }

    setGuardando(true);
    const resultado = await cambiarContrasena(actual, nueva);
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo cambiar la contraseña.");
      return;
    }

    setExito(resultado.mensaje ?? "Tu contraseña cambió.");
    setActual("");
    setNueva("");
    setRepetida("");
  };

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] flex flex-col min-h-screen relative">
        <TopBar title="Configuración" subtitle="Mi cuenta" />

        <div className="flex-1 overflow-y-auto bg-[#190d2d] p-8">
          <section className="max-w-3xl w-full mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-black font-headline text-white tracking-tight">
                Configuración de mi cuenta
              </h1>
              <p className="text-white/60 mt-1">
                Tus datos y tu contraseña.
              </p>
            </div>

            {/* ── Mis datos ── */}
            <div className="bg-[#1C1030] border border-[#C548F5]/20 rounded-2xl p-6">
              <h2 className="font-headline text-lg font-bold text-white mb-5">
                Mis datos
              </h2>

              {cargando ? (
                <p className="text-sm text-white/40">Cargando tus datos...</p>
              ) : !cuenta ? (
                <p className="text-sm text-red-400">
                  No se pudieron leer tus datos. ¿Está encendido el servidor de NEXO?
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    {cuenta.avatarUrl ? (
                      <img
                        src={cuenta.avatarUrl}
                        alt={cuenta.nombre}
                        className="w-16 h-16 rounded-full border-2 border-primary/30 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {cuenta.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xl font-bold text-white">{cuenta.nombre}</p>
                      <p className="text-sm text-white/50">{ROL_LABELS[cuenta.rol]}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Dato etiqueta="Correo institucional" valor={cuenta.email} />
                    {cuenta.institucion && (
                      <Dato etiqueta="Institución" valor={cuenta.institucion} />
                    )}
                    {cuenta.curso && <Dato etiqueta="Curso" valor={cuenta.curso} />}
                    {cuenta.materia && <Dato etiqueta="Materias" valor={cuenta.materia} />}
                  </div>

                  <p className="text-xs text-white/40 mt-6 pt-5 border-t border-white/5">
                    Estos datos los administra tu institución. Si algo está mal, pedile
                    la corrección a la administración de tu escuela.
                  </p>
                </>
              )}
            </div>

            {/* ── Cambiar contraseña ── */}
            <div className="bg-[#1C1030] border border-[#C548F5]/20 rounded-2xl p-6">
              <h2 className="font-headline text-lg font-bold text-white mb-1">
                Cambiar mi contraseña
              </h2>
              <p className="text-sm text-white/50 mb-6">
                Para cambiarla hay que saber la actual. Al cambiarla se cierran las
                sesiones abiertas en otros dispositivos.
              </p>

              <form onSubmit={guardarContrasena} className="space-y-5">
                <InputField
                  label="Contraseña actual"
                  type="password"
                  placeholder="••••••••"
                  value={actual}
                  onChange={setActual}
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
                {exito && (
                  <p className="text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                    {exito}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => navegar("/recuperar-contrasena")}
                    className="text-sm font-medium text-primary hover:text-primary-container transition-colors"
                  >
                    No me acuerdo mi contraseña actual
                  </button>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="bg-[#C548F5] text-white px-6 py-2.5 rounded-full font-bold hover:brightness-110 transition-all shadow-lg shadow-[#C548F5]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {guardando ? "Guardando..." : "Cambiar contraseña"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
