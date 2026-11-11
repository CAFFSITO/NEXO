import FichaEvidenciaApp from './FichaEvidenciaApp';
import { capacidadesApp, capacidadesNativasApp } from '../../../servicios/appsPublicas';
import { useEffect, useState } from 'react';
import { appsMaestro, crearApp, nuevaVersionApp, publicarApp, type AppPublica, type BloqueApp, type DefinicionApp } from '../../../servicios/appsPublicas';
import Selector from '../shared/Selector';

const vacia = (): DefinicionApp => ({ nombre: '', descripcion: '', bloques: [{ id: 'bloque-1', tipo: 'texto', titulo: '', contenido: '' }] });

export default function AppsPublicasMaestro() {
  const [apps, setApps] = useState<AppPublica[]>([]);
  const [elegida, setElegida] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<DefinicionApp>(vacia);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const recargar = () => appsMaestro().then(setApps).catch(e => setError(e.message));
  useEffect(() => { recargar(); }, []);
  const editar = (a: AppPublica | null) => { setElegida(a?.id ?? null); setBorrador(a ? structuredClone(a.definicion) : vacia()); setMensaje(''); setError(''); };
  const bloque = (id: string, cambio: Partial<BloqueApp>) => setBorrador(d => ({ ...d, bloques: d.bloques.map(b => b.id === id ? { ...b, ...cambio } : b) }));
  const ejecutar = async (fn: () => Promise<unknown>, mensajeExito: string) => {
    setOcupado(true); setError(''); setMensaje('');
    try { await fn(); await recargar(); setMensaje(mensajeExito); } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  };
  return <section className="rounded-3xl border border-white/15 bg-black/40 p-5 text-white" aria-label="Apps públicas">
    <h2 className="text-2xl font-semibold">Apps públicas</h2>
    <p className="mt-2 text-sm text-white/70">Publicá bloques educativos gratuitos. Cada escuela instala una copia independiente; las actualizaciones conservan sus datos y ajustes.</p>
    <p className="mt-1 text-xs text-amber-200">Toda app se mostrará como «sin evaluación científica registrada» hasta contar con una evaluación verificable.</p>
    <div className="mt-5 grid gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="space-y-2"><button type="button" className="rounded-xl bg-violet-600 px-4 py-2" onClick={() => editar(null)}>+ Crear app</button>
        {apps.map(a => <button type="button" key={a.id} onClick={() => editar(a)} className={`block w-full rounded-xl border p-3 text-left ${elegida === a.id ? 'border-violet-400' : 'border-white/15'}`}>
          <strong>{a.nombre}</strong><span className="ml-2 text-xs text-white/60">v{a.versionActual} · {a.publicada ? 'Pública' : 'Borrador'}</span>
        </button>)}
      </aside>
      <div className="space-y-4">
        <label className="block text-sm">Nombre<input className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={borrador.nombre} onChange={e => setBorrador(d => ({ ...d, nombre: e.target.value }))} /></label>
        <label className="block text-sm">Descripción<textarea className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={borrador.descripcion} onChange={e => setBorrador(d => ({ ...d, descripcion: e.target.value }))} /></label>
        <div className="space-y-3">{borrador.bloques.map((b, index) => <div key={b.id} className="rounded-xl border border-white/15 p-3">
          <div className="flex items-center justify-between gap-2"><strong>Bloque {index + 1}</strong><button type="button" disabled={borrador.bloques.length === 1} onClick={() => setBorrador(d => ({ ...d, bloques: d.bloques.filter(x => x.id !== b.id) }))}>Quitar</button></div>
          <Selector aria-label={`Tipo del bloque ${index + 1}`} className="mt-2 rounded-lg bg-slate-800 p-2" value={b.tipo} onChange={e => bloque(b.id, { tipo: e.target.value as BloqueApp['tipo'], ...((capacidadesNativasApp as readonly string[]).includes(e.target.value)?{dependeDe:undefined}:{}), ...(e.target.value==='reserva'?{capacidad:b.capacidad??1}:{}) })}><option value="texto">Texto</option><option value="enlace">Enlace a función de NEXO</option><option value="accionable">Accionable</option><option value="embed">Página embebida</option><option value="encuesta">Encuesta</option><option value="juego">Juego de preguntas</option><option value="bienvenida">Bienvenida</option><option value="reserva">Reserva de turnos o cupos</option>{capacidadesApp.map(t=><option key={t} value={t}>{t === "chat" ? "Chat nativo independiente" : t === "foro" ? "Foro nativo independiente" : t === "documento" ? "Documento nativo independiente" : t === "formulario" ? "Formulario nativo independiente" : t === "curso" ? "Curso de la institución" : t}</option>)}</Selector>
          <input aria-label={`Título del bloque ${index + 1}`} placeholder="Título" className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={b.titulo} onChange={e => bloque(b.id, { titulo: e.target.value })} />
          <textarea aria-label={`Contenido del bloque ${index + 1}`} placeholder="Explicación o instrucción" className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={b.contenido} onChange={e => bloque(b.id, { contenido: e.target.value })} />
          {b.tipo === 'enlace' && <><Selector aria-label={`Capacidad NEXO del bloque ${index + 1}`} value={b.ruta ?? ''} onChange={e => bloque(b.id, { ruta: e.target.value })}><option value="">Elegí una capacidad</option><option value="/chat?espacios=1">Canales, foros, ayuda y sugerencias</option><option value="/comunidad">Comunidad</option><option value="/biblioteca/institucional">Biblioteca y archivos</option><option value="/comunidad/calendario">Eventos y calendario</option><option value="/objetivos">Objetivos</option><option value="/portafolio/mis-cursos">Cursos</option></Selector><input aria-label={`Ruta del bloque ${index + 1}`} placeholder="/ruta-de-nexo" className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={b.ruta ?? ''} onChange={e => bloque(b.id, { ruta: e.target.value })} /></>}
          {b.tipo === 'embed' && <input aria-label={`Sitio HTTPS del bloque ${index + 1}`} placeholder="https://ejemplo.org" className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={b.ruta ?? ''} onChange={e => bloque(b.id, { ruta: e.target.value })} />}
          {['encuesta','juego','reserva'].includes(b.tipo) && <><textarea aria-label={`Opciones del bloque ${index + 1}`} placeholder={b.tipo==='reserva'?'Un turno por línea':'Una opción por línea'} className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 p-2" value={(b.opciones ?? []).join('\n')} onChange={e => bloque(b.id, { opciones: e.target.value.split('\n') })} />{b.tipo === 'juego' && <label className="block text-sm">Número de la opción correcta (1–8)<input type="number" min="1" max="8" className="mt-1 w-20 rounded-lg bg-white/10 p-2" value={(b.correcta ?? 0) + 1} onChange={e => bloque(b.id, { correcta: Number(e.target.value) - 1 })} /></label>}{b.tipo==='reserva'&&<label className="block text-sm">Cupos por turno<input type="number" min="1" max="1000" className="mt-1 w-24 rounded-lg bg-white/10 p-2" value={b.capacidad??1} onChange={e=>bloque(b.id,{capacidad:Number(e.target.value)})}/></label>}</>}
          {index > 0 && !(capacidadesNativasApp as readonly string[]).includes(b.tipo) && <label className="mt-2 block text-sm">Mostrar después de completar<Selector value={b.dependeDe ?? ''} onChange={e => bloque(b.id, { dependeDe: e.target.value })}><option value="">Siempre</option>{borrador.bloques.slice(0,index).map(prev => <option key={prev.id} value={prev.id}>{prev.titulo || prev.id}</option>)}</Selector></label>}
          {(capacidadesNativasApp as readonly string[]).includes(b.tipo)&&<p className="mt-2 text-xs text-white/60">Esta herramienta conserva sus propios permisos de acceso. Cada institución configura su contenido después de instalarla.</p>}
          <FichaEvidenciaApp key={`${elegida ?? "nuevo"}:${b.id}`} valor={b.evidencia} cambiar={evidencia=>bloque(b.id,{evidencia})}/>
        </div>)}</div>
        <button type="button" className="rounded-xl border border-white/20 px-4 py-2" onClick={() => setBorrador(d => ({ ...d, bloques: [...d.bloques, { id: `bloque-${Date.now()}`, tipo: 'texto', titulo: '', contenido: '' }] }))}>+ Bloque</button>
        <details className="rounded-xl border border-white/20 p-4"><summary className="cursor-pointer font-semibold">Vista previa de la app</summary><h3 className="mt-3 text-lg">{borrador.nombre || 'App sin nombre'}</h3><p className="text-sm text-white/60">{borrador.descripcion}</p>{borrador.bloques.map(b => <div key={b.id} className="mt-2 rounded-lg border border-white/10 p-3"><strong>{b.titulo || 'Bloque sin título'}</strong><p className="text-sm text-white/60">{b.contenido}</p><small>{b.tipo} · {b.evidencia?.estado ?? 'sin-evaluar'}{b.dependeDe ? ` · después de ${b.dependeDe}` : ''}</small></div>)}</details>
        <div className="flex flex-wrap gap-2"><button disabled={ocupado} type="button" className="rounded-xl bg-violet-600 px-4 py-2" onClick={() => ejecutar(() => elegida ? nuevaVersionApp(elegida, borrador) : crearApp(borrador), elegida ? 'Nueva versión guardada.' : 'App creada como borrador.')}>{elegida ? 'Guardar nueva versión' : 'Crear borrador'}</button>
          {elegida && <button disabled={ocupado} type="button" className="rounded-xl border border-white/20 px-4 py-2" onClick={() => ejecutar(() => publicarApp(elegida, !apps.find(a => a.id === elegida)?.publicada), 'Publicación actualizada.')}>{apps.find(a => a.id === elegida)?.publicada ? 'Retirar del catálogo' : 'Publicar gratis'}</button>}
        </div>
        {error && <p role="alert" className="text-red-300">{error}</p>}{mensaje && <p role="status" className="text-emerald-300">{mensaje}</p>}
      </div>
    </div>
  </section>;
}
