// src/paginas/ConfiguracionCuentaPage.tsx
// Configuración de la cuenta propia (Errores 2.A.1 y 12.5).
//
// Hasta ahora ningún perfil tenía dónde configurar nada, y una vez adentro no
// existía forma de cambiar la contraseña que te había dado la escuela. Esta es
// la pantalla, y la ven los ocho roles: todos tienen una cuenta.
//
// Todo lo que se muestra sale de la base a través de /api/cuenta. Acá no hay ni
// un nombre, ni un correo, ni un curso escrito a mano.
//
// PRIMER INGRESO: una cuenta recién creada entra con una contraseña sencilla
// (su nombre y unos números) y lo primero que ve es esta misma pantalla en modo
// bienvenida: sin menú, con la opción de elegir otra contraseña sin tener que
// volver a tipear la actual, y un botón para seguir con la que le dieron. Quien
// la usa muchas veces es un adulto de la dirección: cada paso tiene que decir
// con todas las letras qué pasa.

import { useEffect, useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { ROL_LABELS } from "./components/shared/roles";
import TopBar from "./components/shared/TopBar";
import InputField from "./components/shared/InputField";
import { inicioPara } from "./components/shared/navegacionItems";
import { useNavegacion } from "../navegacion";
import { useInstancia } from "../servicios/instancia";
import {
  miCuenta,
  cambiarContrasena,
  cambiarMiNombre,
  elegirContrasenaPrimerIngreso,
  seguirConContrasenaInicial,
  type Cuenta,
} from "../servicios/cuenta";

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

// ─── MIS DATOS (los muestran los dos modos) ─────────────────────────────────

function useMiCuenta() {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);

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

  return { cuenta, cargando, setCuenta };
}

/**
 * Cambiar el propio nombre: un botón al lado del nombre que lo vuelve un campo
 * para escribir. SOLO el nombre; el correo lo administra la escuela.
 */
function NombreEditable({ cuenta, onCambiado }: { cuenta: Cuenta; onCambiado: (nombre: string) => void }) {
  const { actualizarUsuario } = useNavegacion();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  const guardar = async () => {
    if (guardando) return;
    const limpio = nombre.replace(/\s+/g, " ").trim();
    if (!limpio) {
      setError("Escribí tu nombre.");
      return;
    }
    setGuardando(true);
    setError("");
    const resultado = await cambiarMiNombre(limpio);
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo cambiar el nombre.");
      return;
    }
    onCambiado(limpio);
    actualizarUsuario({ nombre: limpio });
    setEditando(false);
    setListo(resultado.mensaje ?? "Listo, tu nombre quedó cambiado.");
  };

  if (!editando) {
    return (
      <div className="min-w-0">
        <p className="text-xl font-bold text-white">{cuenta.nombre}</p>
        <p className="text-sm text-white/50">{ROL_LABELS[cuenta.rol]}</p>
        <button
          type="button"
          onClick={() => { setNombre(cuenta.nombre); setListo(""); setEditando(true); }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">edit</span>
          Cambiar mi nombre
        </button>
        {listo && <p role="status" className="mt-1 text-sm text-emerald-300">{listo}</p>}
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor="mi-nombre" className="mb-1.5 block text-sm font-medium text-white/70">Tu nombre</label>
      <div className="flex flex-wrap gap-2">
        <input
          id="mi-nombre"
          autoFocus
          maxLength={80}
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void guardar(); }
            if (e.key === "Escape") { e.preventDefault(); setEditando(false); }
          }}
          className="min-w-0 flex-1 rounded-xl bg-surface-container-lowest px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="button" onClick={() => void guardar()} disabled={guardando} className="rounded-full bg-acento px-5 py-3 font-bold text-white disabled:opacity-60">
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className="rounded-full px-4 py-3 font-semibold text-white/70 hover:bg-white/5">
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function TarjetaMisDatos({ cuenta, cargando, onNombre }: { cuenta: Cuenta | null; cargando: boolean; onNombre: (nombre: string) => void }) {
  return (
    <div className="bg-fondo border border-acento/20 rounded-2xl p-6">
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
            <NombreEditable cuenta={cuenta} onCambiado={onNombre} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Dato etiqueta="Correo institucional" valor={cuenta.email} />
            {cuenta.institucion && (
              <Dato etiqueta="Institución" valor={cuenta.institucion} />
            )}
            {cuenta.curso && <Dato etiqueta="Curso" valor={cuenta.curso} />}
            {cuenta.materia && <Dato etiqueta="Materias" valor={cuenta.materia} />}
          </div>

          <p className="text-xs text-white/40 mt-6">
            Tu nombre lo podés cambiar vos. El correo y el resto de los datos los
            administra tu institución: si algo está mal, pedile la corrección.
          </p>
        </>
      )}
    </div>
  );
}

// ─── PRIMER INGRESO: LA BIENVENIDA ──────────────────────────────────────────

function BienvenidaPrimerIngreso() {
  const { usuario, navegar, cerrarSesion, terminarPrimerIngreso } = useNavegacion();
  const { instancia } = useInstancia();
  const { cuenta, cargando, setCuenta } = useMiCuenta();

  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Las dos salidas terminan igual: el servidor ya anotó que la persona pasó
  // por acá, y la app la lleva a su inicio de siempre.
  const entrar = () => {
    if (!usuario) return;
    terminarPrimerIngreso();
    navegar(inicioPara(usuario.rol, instancia));
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setError(null);

    if (!nueva) {
      setError("Escribí la contraseña nueva que querés usar.");
      return;
    }
    if (nueva !== repetida) {
      setError("Las dos contraseñas no son iguales. Escribí la misma en los dos casilleros.");
      return;
    }

    setEnviando(true);
    const resultado = await elegirContrasenaPrimerIngreso(nueva);
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo guardar la contraseña.");
      return;
    }
    setGuardada(true);
  };

  const seguir = async () => {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    const resultado = await seguirConContrasenaInicial();
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo continuar. Probá de nuevo.");
      return;
    }
    entrar();
  };

  return (
    <div className="min-h-dvh bg-background text-on-surface flex justify-center px-6 py-10">
      <main id="contenido-principal" tabIndex={-1} className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-5xl text-acento" aria-hidden="true">
            waving_hand
          </span>
          <h1 className="text-3xl font-black font-headline text-white tracking-tight">
            ¡Te damos la bienvenida a NEXO!
          </h1>
          {cuenta?.institucion && (
            <p className="text-lg font-semibold text-white/80">{cuenta.institucion}</p>
          )}
          <p className="text-white/60 max-w-xl mx-auto">
            Es la primera vez que entrás. Si querés, podés cambiar la contraseña que
            te dieron por una que te resulte más fácil de recordar. No es obligatorio:
            también podés seguir con la que ya tenés.
          </p>
        </div>

        {/* ── Elegir contraseña (opcional) ── */}
        <div className="bg-fondo border border-acento/30 rounded-2xl p-6">
          {guardada ? (
            <div className="text-center space-y-4 py-2">
              <span className="material-symbols-outlined text-5xl text-emerald-300" aria-hidden="true">
                check_circle
              </span>
              <p className="text-lg font-bold text-white">
                Listo, tu contraseña nueva quedó guardada.
              </p>
              <p className="text-sm text-white/60">
                La próxima vez que entres a NEXO, usá la contraseña nueva.
              </p>
              <button
                type="button"
                onClick={entrar}
                className="bg-acento text-white px-8 py-3 rounded-full font-bold text-base hover:brightness-110 transition-all shadow-lg shadow-acento/20"
              >
                Entrar a NEXO
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-headline text-lg font-bold text-white">
                  Elegí tu contraseña
                </h2>
                <span className="nexo-pill">Opcional</span>
              </div>
              <p className="text-sm text-white/50 mb-6">
                Tiene que tener al menos 8 caracteres. Elegí algo que no te olvides.
              </p>

              <form onSubmit={guardar} className="space-y-5">
                <InputField
                  label="Contraseña nueva"
                  type="password"
                  value={nueva}
                  onChange={setNueva}
                  autoComplete="new-password"
                />
                <InputField
                  label="Escribila otra vez"
                  type="password"
                  placeholder="La misma de arriba"
                  value={repetida}
                  onChange={setRepetida}
                  autoComplete="new-password"
                />

                {error && (
                  <p role="alert" className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full bg-acento text-white px-6 py-3.5 rounded-full font-bold text-base hover:brightness-110 transition-all shadow-lg shadow-acento/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {enviando ? "Guardando..." : "Guardar mi contraseña nueva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void seguir()}
                    disabled={enviando}
                    className="w-full px-6 py-3.5 rounded-full font-semibold text-base text-white/80 border border-white/15 hover:bg-white/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    No, seguir con la contraseña que me dieron
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <TarjetaMisDatos cuenta={cuenta} cargando={cargando} onNombre={(nombre) => setCuenta((c) => (c ? { ...c, nombre } : c))} />

        <div className="flex flex-col items-center gap-3 text-center pb-6">
          <p className="text-xs text-white/40">
            Más adelante podés cambiar tu contraseña cuando quieras, desde
            "Configuración" en el menú.
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </main>
    </div>
  );
}

// ─── PÁGINA ─────────────────────────────────────────────────────────────────

export default function ConfiguracionCuentaPage() {
  const { usuario } = useNavegacion();
  return usuario?.primerIngreso ? <BienvenidaPrimerIngreso /> : <ConfiguracionHabitual />;
}

function ConfiguracionHabitual() {
  const { navegar, cerrarSesion } = useNavegacion();
  const { cuenta, cargando, setCuenta } = useMiCuenta();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
    <div className="flex bg-fondo min-h-screen text-on-surface">
      <Sidebar onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen relative">
        <TopBar title="Configuración" subtitle="Mi cuenta" />

        <div className="flex-1 overflow-y-auto bg-background p-8">
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
            <TarjetaMisDatos cuenta={cuenta} cargando={cargando} onNombre={(nombre) => setCuenta((c) => (c ? { ...c, nombre } : c))} />

            {/* ── Cambiar contraseña ── */}
            <div className="bg-fondo border border-acento/20 rounded-2xl p-6">
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
                    className="bg-acento text-white px-6 py-2.5 rounded-full font-bold hover:brightness-110 transition-all shadow-lg shadow-acento/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
