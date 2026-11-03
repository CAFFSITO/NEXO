import { useState } from "react";
import { enviar, ErrorDeApi, useDatos } from "../../../servicios/api";
import { tamanoLegible, urlDescarga } from "../../../servicios/archivos";
import Selector from "../shared/Selector";

type Revision = { id: string; revisorId: string; revisor: string; comentario: string | null; respondidaEn: string | null };
type Pendiente = { id: string; titulo: string; comentario: string | null };
type Trabajo = { titulo: string; consigna: string; comentario: string; archivos: { id: string; nombre: string; tamanoBytes: number }[] };

export function AsignacionRevisionPares({ entregaId, candidatos }: { entregaId: string; candidatos: { estudianteId: string; nombre: string }[] }) {
  const { datos, recargar } = useDatos<{ revisiones: Revision[] }>(`/api/entregas/${entregaId}/revisiones-pares`);
  const [revisorId, setRevisorId] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const disponibles = candidatos.filter(c => !datos?.revisiones.some(r => r.revisorId === c.estudianteId));
  async function asignar() {
    if (!revisorId) return;
    setGuardando(true); setAviso("");
    try {
      await enviar(`/api/entregas/${entregaId}/revisores`, "POST", { revisorId });
      setRevisorId(""); recargar();
    } catch (e) { setAviso(e instanceof ErrorDeApi ? e.message : "No se pudo asignar la revisión."); }
    finally { setGuardando(false); }
  }
  return <section className="rounded-lg border border-white/10 bg-lienzo p-4 space-y-3">
    <h4 className="font-bold text-sm text-white">Revisión entre pares</h4>
    <p className="text-xs text-slate-400">Un compañero del curso lee la entrega y aporta una devolución descriptiva. La nota sigue a cargo del profesor.</p>
    {datos?.revisiones.map(r => <p key={r.id} className="text-sm text-slate-300"><strong>{r.revisor}</strong>: {r.comentario || "Pendiente de respuesta"}</p>)}
    {disponibles.length > 0 && <div className="flex gap-2"><Selector value={revisorId} onChange={e => setRevisorId(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-fondo border border-white/10 text-white p-2 text-sm"><option value="">Elegir compañero</option>{disponibles.map(c => <option key={c.estudianteId} value={c.estudianteId}>{c.nombre}</option>)}</Selector><button type="button" onClick={asignar} disabled={!revisorId || guardando} className="rounded-lg bg-acento px-3 text-sm font-bold text-black disabled:opacity-40">Asignar</button></div>}
    {aviso && <p role="alert" className="text-rose-400 text-xs">{aviso}</p>}
  </section>;
}

export function OpinionesPares({ entregaId }: { entregaId: string }) {
  const { datos } = useDatos<{ revisiones: Revision[] }>(`/api/entregas/${entregaId}/revisiones-pares`);
  const respuestas = datos?.revisiones.filter(r => r.comentario) ?? [];
  if (!respuestas.length) return null;
  return <section className="rounded-xl bg-fondo p-4 space-y-2"><h4 className="font-bold text-sm">Devoluciones de compañeros</h4>{respuestas.map(r => <p key={r.id} className="text-sm text-slate-300 whitespace-pre-wrap"><strong>{r.revisor}:</strong> {r.comentario}</p>)}</section>;
}

export function MisRevisionesPares() {
  const { datos, recargar } = useDatos<{ revisiones: Pendiente[] }>("/api/revisiones-pares/pendientes");
  const pendientes = datos?.revisiones.filter(r => !r.comentario) ?? [];
  if (!pendientes.length) return null;
  return <section className="mb-6 rounded-2xl border border-acento/30 bg-acento/5 p-5 space-y-3"><h2 className="font-bold text-lg text-white">Revisiones de compañeros pendientes</h2><p className="text-sm text-slate-400">Leé el trabajo y escribí qué funciona y qué podría mejorar. No asignás una calificación.</p>{pendientes.map(r => <RevisionPendiente key={r.id} revision={r} onRespondida={recargar} />)}</section>;
}

function RevisionPendiente({ revision, onRespondida }: { revision: Pendiente; onRespondida: () => void }) {
  const { datos: trabajo, error } = useDatos<Trabajo>(`/api/revisiones-pares/${revision.id}/entrega`);
  const [comentario, setComentario] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  async function responder() {
    setGuardando(true); setAviso("");
    try { await enviar(`/api/revisiones-pares/${revision.id}`, "PUT", { comentario: comentario.trim() }); onRespondida(); }
    catch (e) { setAviso(e instanceof ErrorDeApi ? e.message : "No se pudo enviar la devolución."); }
    finally { setGuardando(false); }
  }
  return <article className="rounded-xl bg-fondo border border-white/10 p-4 space-y-3"><h3 className="font-semibold text-white">{revision.titulo}</h3>{error && <p role="alert" className="text-sm text-rose-400">{error}</p>}{trabajo && <><p className="text-xs text-slate-400 whitespace-pre-wrap">Consigna: {trabajo.consigna}</p><p className="text-sm text-slate-200 whitespace-pre-wrap">{trabajo.comentario || "La entrega contiene archivos adjuntos."}</p>{trabajo.archivos.map(a => <a key={a.id} href={urlDescarga(a.id)} className="block text-sm text-acento hover:underline">{a.nombre} · {tamanoLegible(a.tamanoBytes)}</a>)}<textarea value={comentario} onChange={e => setComentario(e.target.value)} maxLength={3000} rows={3} placeholder="Qué está logrado y qué puede mejorar..." className="w-full rounded-lg bg-lienzo border border-white/10 p-3 text-sm text-white"/><button type="button" onClick={responder} disabled={!comentario.trim() || guardando} className="rounded-lg bg-acento px-4 py-2 text-sm font-bold text-black disabled:opacity-40">Enviar devolución</button></>}{aviso && <p role="alert" className="text-rose-400 text-sm">{aviso}</p>}</article>;
}
