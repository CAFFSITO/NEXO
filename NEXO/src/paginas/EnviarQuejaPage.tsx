import { useState } from "react";
import Sidebar from "./components/shared/Sidebar";
import { useNavegacion } from "../navegacion";
import { enviarQueja } from "../servicios/quejas";

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
    "w-full px-4 py-3 bg-[#1C1030] border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-[#C548F5] focus:outline-none transition-colors";
  const labelClase = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="flex bg-[#1C1030] min-h-screen text-on-surface">
      <Sidebar usuario={usuario} onNavegar={navegar} onCerrarSesion={cerrarSesion} />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen">
        <header className="flex items-center w-full px-8 h-16 bg-[#1C1030]/80 backdrop-blur-md border-b border-[#2D1B4E] sticky top-0 z-40">
          <h1 className="text-fuchsia-500 font-headline font-extrabold text-xl tracking-tight">
            Buzón de quejas
          </h1>
        </header>

        <section className="p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6 bg-[#2D1B4E]/40 border border-white/5 rounded-xl p-4">
            <span className="material-symbols-outlined text-[#C548F5]">lock</span>
            <p className="text-sm text-slate-300">
              Tu queja es <span className="font-bold">anónima</span>: ni el Centro de
              Estudiantes ni la dirección pueden saber quién la escribió. La base de
              datos tampoco guarda tu nombre.
            </p>
          </div>

          {enviada ? (
            <div className="bg-[#2D1B4E]/40 border border-emerald-500/20 rounded-xl p-10 text-center flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
              <p className="text-white font-bold">Tu queja fue enviada de forma anónima.</p>
              <p className="text-slate-400 text-sm">
                El Centro de Estudiantes y la dirección la van a recibir sin ningún
                dato tuyo.
              </p>
              <button
                onClick={() => setEnviada(false)}
                className="mt-2 px-6 py-2.5 bg-[#C548F5] hover:bg-[#d15aff] text-white font-bold rounded-full transition-all active:scale-95 text-sm"
              >
                Enviar otra
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="categoria" className={labelClase}>Categoría</label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={inputClase}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                className="w-full py-3 bg-[#C548F5] hover:bg-[#d15aff] text-white font-bold rounded-full transition-all active:scale-95 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
