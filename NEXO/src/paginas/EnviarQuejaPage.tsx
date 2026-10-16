import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import TopBar from "./components/shared/TopBar";
import { useNavegacion } from "../navegacion";
import { enviarQueja } from "../servicios/quejas";
import Selector from "./components/shared/Selector";

// Buzón de quejas anónimas del estudiante (sección 14.14, Error 8.B.1).
// El anonimato es estructural: al enviar NO viaja quién la escribió, y la base
// no guarda ningún rastro de autoría. Acá solo se manda categoría + contenido.

const CATEGORIAS = ["Metodología", "Convivencia", "Infraestructura", "Otro"];

export default function EnviarQuejaPage() {
  const { navegar, cerrarSesion, usuario } = useNavegacion();

  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contenido.trim()) {
      setError("Escribí tu queja antes de enviarla.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      await enviarQueja({ contenido: contenido.trim(), categoria });
      setEnviada(true);
      setContenido("");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo enviar la queja.");
    } finally {
      setEnviando(false);
    }
  };

  if (!usuario) return null;

  const inputClase =
    "w-full px-4 py-3 bg-fondo border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-acento focus:outline-none transition-colors";
  const labelClase = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="flex bg-fondo min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main id="contenido-principal" tabIndex={-1} className="app-content min-h-screen">
        <TopBar title="Buzón de quejas" />

        <section className="p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6 bg-lienzo/40 border border-white/5 rounded-xl p-4">
            <span className="material-symbols-outlined text-acento">lock</span>
            <p className="text-sm text-slate-300">
              Tu queja es <span className="font-bold">anónima</span>: ni el Centro de
              Estudiantes ni la dirección pueden saber quién la escribió. La base de
              datos tampoco guarda tu nombre.
            </p>
          </div>

          {enviada ? (
            <div className="bg-lienzo/40 border border-emerald-500/20 rounded-xl p-10 text-center flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
              <p className="text-white font-bold">Tu queja fue enviada de forma anónima.</p>
              <p className="text-slate-400 text-sm">
                El Centro de Estudiantes y la dirección la van a recibir sin ningún
                dato tuyo.
              </p>
              <button
                onClick={() => setEnviada(false)}
                className="mt-2 px-6 py-2.5 bg-acento hover:bg-[#d15aff] text-white font-bold rounded-full transition-all active:scale-95 text-sm"
              >
                Enviar otra
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="categoria" className={labelClase}>Categoría</label>
                <Selector
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={inputClase}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Selector>
              </div>

              <div>
                <label htmlFor="contenido" className={labelClase}>Tu queja</label>
                <textarea
                  id="contenido"
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  rows={6}
                  placeholder="Contá qué pasó y qué te gustaría que cambie…"
                  className={`${inputClase} resize-none`}
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3 bg-acento hover:bg-[#d15aff] text-white font-bold rounded-full transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {enviando ? "Enviando…" : "Enviar de forma anónima"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
