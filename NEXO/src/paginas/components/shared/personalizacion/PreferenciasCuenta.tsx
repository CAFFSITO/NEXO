import { useState } from "react";
import { ErrorDeApi, useDatos } from "../../../../servicios/api";
import { useInstancia } from "../../../../servicios/instancia";
import { guardarPreferencias, type PreferenciasCuenta as DatosCuenta } from "../../../../servicios/personalizacion";
import EditorPreferencias from "./EditorPreferencias";

export default function PreferenciasCuenta() {
  const { datos, cargando, error, recargar } = useDatos<DatosCuenta>("/api/cuenta/preferencias");
  return <section className="bg-fondo border border-acento/20 rounded-2xl p-6 space-y-4">
    <h2 className="font-headline text-lg font-bold text-white">Mi experiencia de lectura</h2>
    <p className="text-sm text-white/60">Podés ajustar tu cuenta o heredar la configuración de tu perfil e institución. Tus cambios no afectan a otras personas.</p>
    {cargando ? <p role="status">Cargando preferencias…</p> : error || !datos ? <div><p role="alert">{error ?? "No se pudieron cargar las preferencias."}</p><button type="button" onClick={recargar} className="mt-2 text-primary">Reintentar</button></div> : <Formulario key={datos.version} datos={datos} recargar={recargar} />}
  </section>;
}

function Formulario({ datos, recargar }: { datos: DatosCuenta; recargar: () => void }) {
  const { recargar: recargarInstancia } = useInstancia();
  const [guardadas, setGuardadas] = useState(datos);
  const [preferencias, setPreferencias] = useState(datos.preferencias);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [conflicto, setConflicto] = useState(false);
  const [listo, setListo] = useState(false);
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || conflicto) return;
    setGuardando(true); setError(""); setListo(false);
    try {
      const resultado = await guardarPreferencias(preferencias, guardadas.version);
      setGuardadas(resultado); setPreferencias(resultado.preferencias);
      setListo(true); recargarInstancia();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudieron guardar las preferencias.");
      setConflicto(fallo instanceof ErrorDeApi && fallo.estado === 409);
    } finally { setGuardando(false); }
  };
  return <form onSubmit={guardar} className="space-y-4">
    <fieldset disabled={guardando || conflicto}>
      <EditorPreferencias valor={preferencias} onCambiar={p => { setPreferencias(p); setListo(false); }} />
      <button type="button" onClick={() => { setPreferencias({}); setListo(false); }} className="mt-3 text-sm text-primary">Heredar todas las preferencias</button>
    </fieldset>
    <p className="text-sm text-white/60">Configuración guardada efectiva: densidad {guardadas.efectivas.densidad === "compacta" ? "compacta" : "cómoda"}, movimiento {guardadas.efectivas.movimiento === "sistema" ? "según el dispositivo" : guardadas.efectivas.movimiento}, texto {guardadas.efectivas.tamanoTexto}%.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {conflicto && <button type="button" onClick={recargar} className="text-sm text-primary">Cargar la última versión y descartar este borrador</button>}
    {listo && <p role="status" className="text-sm text-emerald-300">Preferencias guardadas.</p>}
    <button type="submit" disabled={guardando || conflicto} className="bg-acento text-white px-6 py-2.5 rounded-full font-bold disabled:opacity-60">{guardando ? "Guardando…" : "Guardar preferencias"}</button>
  </form>;
}
