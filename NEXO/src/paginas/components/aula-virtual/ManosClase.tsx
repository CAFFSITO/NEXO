import { useCallback, useEffect, useState } from "react";
import { atenderMano, levantarMano, manosDeClase, type ManoClase } from "../../../servicios/aula";
import { useTiempoReal } from "../../../servicios/tiempoReal";

export default function ManosClase({ claseId, esDocente }: { claseId: string; esDocente: boolean }) {
  const [manos, setManos] = useState<ManoClase[]>([]);
  const [levantada, setLevantada] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cargar = useCallback(() => { void manosDeClase(claseId).then(d => { setManos(d.manos); setLevantada(d.levantada); }).catch(() => setError("No se pudo consultar la palabra.")); }, [claseId]);
  useTiempoReal(useCallback(evento => { if ((evento.tipo === "aula-manos" || evento.tipo === "conectado") && (!evento.claseId || evento.claseId === claseId)) cargar(); }, [cargar, claseId]));
  useEffect(() => { cargar(); const timer = window.setInterval(cargar, 10000); return () => window.clearInterval(timer); }, [cargar]);
  const cambiar = async () => { setOcupado(true); setError(""); try { await levantarMano(claseId,!levantada); cargar(); } catch(e) { setError(e instanceof Error ? e.message : "No se pudo cambiar la solicitud."); } finally { setOcupado(false); } };
  const atender = async (id: number) => { setOcupado(true); setError(""); try { await atenderMano(claseId,id); cargar(); } catch(e) { setError(e instanceof Error ? e.message : "No se pudo atender la solicitud."); } finally { setOcupado(false); } };
  return <section className="rounded-xl border border-white/10 p-3 space-y-2 text-sm">
    <h3 className="font-bold text-white">Solicitudes de palabra</h3>
    {esDocente ? manos.length ? <ul className="space-y-2">{manos.map(m => <li key={m.id} className="flex justify-between gap-2"><span>{m.nombre}</span><button type="button" disabled={ocupado} className="text-primary" onClick={() => void atender(m.id)}>Atendida</button></li>)}</ul> : <p className="text-slate-400">Nadie solicitó la palabra.</p>
      : <button type="button" disabled={ocupado} onClick={() => void cambiar()} className="text-primary">{levantada ? "Bajar la mano" : "Pedir la palabra"}</button>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
  </section>;
}
