import { useEffect, useState } from 'react';
import { catalogoApps, instalacionesApps, instalarApp, cambiarInstanciaApp, type AppPublica, type InstanciaApp } from '../../../servicios/appsPublicas';

export default function PanelAppsPublicas() {
  const [catalogo, setCatalogo] = useState<AppPublica[]>([]);
  const [instancias, setInstancias] = useState<InstanciaApp[]>([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const recargar = async () => { const [c, i] = await Promise.all([catalogoApps(), instalacionesApps()]); setCatalogo(c); setInstancias(i); };
  useEffect(() => { Promise.all([catalogoApps(), instalacionesApps()]).then(([c, i]) => { setCatalogo(c); setInstancias(i); }).catch(e => setError(e.message)); }, []);
  const actuar = async (fn: () => Promise<unknown>, exito: string) => {
    setOcupado(true); setError(''); setMensaje('');
    try { await fn(); await recargar(); setMensaje(exito); } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  };
  return <section className="space-y-6" aria-label="Apps públicas de la institución">
    <div className="e-panel p-5"><h2 className="text-xl font-semibold">Catálogo público y gratuito</h2><p className="mt-1 text-sm text-white/60">Instalá tantas copias como necesites. Cada una mantiene sus propios ajustes y avances.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{catalogo.map(a => <article key={a.id} className="rounded-xl border border-white/15 p-4"><h3 className="font-semibold">{a.nombre} <span className="text-xs text-white/50">v{a.versionActual}</span></h3><p className="mt-1 text-sm text-white/65">{a.descripcion}</p><p className="mt-2 text-xs text-amber-200">Evidencia científica: sin evaluación registrada. Revisá su utilidad pedagógica antes de aplicarla.</p><button disabled={ocupado} type="button" className="e-boton mt-3" onClick={() => actuar(() => instalarApp(a.id), `${a.nombre} instalada.`)}>+ Instalar</button></article>)}</div>
      {!catalogo.length && <p className="mt-3 text-sm text-white/60">Todavía no hay apps publicadas.</p>}
    </div>
    <div><h2 className="mb-3 text-xl font-semibold">Instaladas en esta institución</h2><div className="space-y-4">{instancias.map(i => {
      const publicada = catalogo.find(a => a.id === i.appId);
      return <article className="e-panel p-5" key={i.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{i.nombre} <span className="text-xs text-white/50">#{i.id} · v{i.version}</span></h3><p className="text-sm text-white/60">{i.definicion.descripcion}</p></div>
        <div className="flex flex-wrap gap-2">{publicada && publicada.versionActual > i.version && <button disabled={ocupado} type="button" className="e-boton" onClick={() => actuar(() => cambiarInstanciaApp(i, 'version', { version: publicada.versionActual }), 'App actualizada; tus datos y ajustes permanecen.')}>Actualizar a v{publicada.versionActual}</button>}
          {i.version > 1 && <button disabled={ocupado} type="button" className="e-boton" onClick={() => actuar(() => cambiarInstanciaApp(i, 'version', { version: i.version - 1 }), 'Versión anterior restaurada; tus datos y ajustes permanecen.')}>Volver a v{i.version - 1}</button>}</div></div>
        <label className="mt-4 block max-w-sm text-sm">Nombre en esta institución<input className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={i.nombre} onChange={e => setInstancias(actual => actual.map(x => x.id === i.id ? { ...x, nombre: e.target.value } : x))} onBlur={() => { if (i.nombre.trim()) actuar(() => cambiarInstanciaApp(i, 'configuracion', { configuracion: { nombre: i.nombre } }), 'Nombre guardado.'); }} /></label>
        <div className="mt-4 space-y-3">{i.definicion.bloques.map(b => <div className="rounded-xl border border-white/10 p-3" key={b.id}>{b.tipo === 'accionable' ? <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={Boolean(i.datos[b.id])} onChange={e => actuar(() => cambiarInstanciaApp(i, 'datos', { datos: { ...i.datos, [b.id]: e.target.checked } }), 'Accionable guardado.')} /><span><strong>{b.titulo}</strong><span className="block text-sm text-white/65">{b.contenido}</span></span></label> : <><h4 className="font-medium">{b.titulo}</h4><p className="text-sm text-white/65">{b.contenido}</p>{b.tipo === 'enlace' && <a className="mt-2 inline-block text-violet-300 underline" href={b.ruta}>Abrir en NEXO</a>}</>}</div>)}</div>
      </article>;
    })}</div>{!instancias.length && <p className="text-sm text-white/60">Todavía no hay apps instaladas.</p>}</div>
    {error && <p role="alert" className="text-red-300">{error}</p>}{mensaje && <p role="status" className="text-emerald-300">{mensaje}</p>}
  </section>;
}
