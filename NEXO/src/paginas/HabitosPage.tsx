import { useMemo } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import TopBar from "./components/shared/TopBar";
import { PESTANAS_OBJETIVOS } from "./components/shared/pestanasModulos";
import TarjetaHabito from "./components/objetivos/TarjetaHabito";
import ModalNuevoHabito from "./components/objetivos/ModalNuevoHabito";
import { useState } from "react";
import {
  useObjetivos,
  registrarHabito,
  crearHabito,
  editarHabito,
  archivarHabito,
} from "../servicios/objetivos";
import { Cargando, Fallo } from "./components/shared/EstadoCarga";

// Se fueron los cuatro hábitos inventados. Eran, además, distintos de los tres
// que mostraba el Dashboard: la misma "Lectura diaria" tenía racha 8 acá y 7
// allá (Error 13.5). Ahora las dos pantallas piden `/api/objetivos` y muestran
// lo mismo.

// ─── PÁGINA ─────────────────────────────────────────────

export default function HabitosPage() {
  const { datos, cargando, error, recargar } = useObjetivos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const { navegar: handleNavegar, cerrarSesion: handleCerrarSesion, usuario } =
    useNavegacion();

  const habitos = useMemo(() => datos?.habitos ?? [], [datos]);

  // Cuántos hábitos se registraron de verdad esta semana. La tarjeta del pie
  // decía "mantuviste N hábitos activos esta semana" contando hábitos con racha
  // mayor a cero, sin mirar ninguna semana: un hábito con una racha vieja
  // contaba igual (Error 2.D.16). Ahora cuenta los que tienen al menos un
  // registro en los últimos 7 días, que es lo que la frase promete.
  const habitosDeLaSemana = useMemo(
    () => habitos.filter((h) => h.registrosUltimaSemana > 0).length,
    [habitos]
  );

  const [aviso, setAviso] = useState<string | null>(null);

  // ── Acciones (Etapa 5, 14.9) ──
  // Marcar el hábito de hoy inserta/borra el registro de hoy; la racha se
  // recalcula sola de `habito_registros`. Dashboard y Hábitos leen la misma
  // tabla, así que ya no se contradicen (Error 13.5).
  const toggleHabito = async (id: string) => {
    if (ocupado) return;
    const h = habitos.find((x) => x.id === id);
    if (!h) return;
    setOcupado(id); setAviso(null);
    try {
      await registrarHabito(id, !h.cumplidoHoy);
      recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo registrar el hábito.");
    } finally { setOcupado(null); }
  };

  const agregarHabito = async (nombre: string, frecuencia: "diario" | "semanal") => {
      if (editando) await editarHabito(editando, nombre, frecuencia);
      else await crearHabito(nombre, frecuencia);
      setModalAbierto(false);
      setEditando(null);
      recargar();
  };

  const archivar = async (id: string) => {
    if (ocupado || !window.confirm("¿Archivar este hábito? Se conservará su historial.")) return;
    setOcupado(id); setAviso(null);
    try { await archivarHabito(id); recargar(); }
    catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo archivar."); }
    finally { setOcupado(null); }
  };

  if (!usuario) return null;

  return (
    <div className="flex bg-fondo min-h-screen text-on-surface">
      <Sidebar
        usuario={usuario}
        onNavegar={handleNavegar}
        onCerrarSesion={handleCerrarSesion}
      />

      <main id="contenido-principal" tabIndex={-1} className="app-content flex flex-col min-h-screen relative">
        <TopBar title="Objetivos personales" pestanas={PESTANAS_OBJETIVOS} />

        <div className="flex-1 overflow-y-auto bg-background p-8">
          <section className="max-w-5xl w-full mx-auto space-y-8">
            {/* Encabezado de la vista */}
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black font-headline text-white tracking-tight">
                  Mis hábitos de estudio
                </h1>
                <p className="text-white/60 mt-1">
                  Mantené la constancia y alcanzá tus metas académicas.
                </p>
              </div>
              <button
                onClick={() => { setEditando(null); setModalAbierto(true); }}
                className="bg-acento text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nuevo hábito
              </button>
            </div>

            {aviso && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {aviso}
              </div>
            )}

            {/* Grilla de hábitos */}
            {cargando ? (
              <Cargando que="tus hábitos" />
            ) : error ? (
              <Fallo error={error} onReintentar={recargar} />
            ) : habitos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {habitos.map((habito) => (
                  <TarjetaHabito key={habito.id} habito={habito} onToggle={toggleHabito} ocupado={ocupado !== null} onEditar={id => { setEditando(id); setModalAbierto(true); }} onArchivar={archivar} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-white/40">
                Todavía no tenés hábitos. Creá el primero con “Nuevo hábito”.
              </div>
            )}

            {/* Tarjeta de insight (pie): ahora el texto y el número coinciden.
                Cuenta los hábitos con al menos un registro en los últimos 7
                días — de verdad "esta semana" (Error 2.D.16). */}
            {!cargando && !error && habitos.length > 0 && (
              <footer className="mt-12">
                <div className="bg-fondo border border-acento/20 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-acento/20 flex items-center justify-center text-acento shrink-0">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                  <p className="text-white/80 font-medium">
                    Registraste{" "}
                    <span className="text-acento font-bold">
                      {habitosDeLaSemana}{" "}
                      {habitosDeLaSemana === 1 ? "hábito" : "hábitos"}
                    </span>{" "}
                    esta semana. {habitosDeLaSemana > 0 ? "¡Vas muy bien!" : "¡Empezá hoy!"}
                  </p>
                </div>
              </footer>
            )}
          </section>
        </div>
      </main>

      {modalAbierto && (
        <ModalNuevoHabito inicial={habitos.find(h => h.id === editando)} onGuardar={agregarHabito} onCerrar={() => setModalAbierto(false)} />
      )}
    </div>
  );
}
