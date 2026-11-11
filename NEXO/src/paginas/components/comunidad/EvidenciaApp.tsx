import type { BloqueApp } from '../../../servicios/appsPublicas';

export default function EvidenciaApp({bloque}:{bloque:BloqueApp}){
  const ficha=bloque.evidencia;
  const estado=ficha?.estado??'sin-evaluar';
  const fuentes=ficha?.fuentes?.length?ficha.fuentes:ficha?.fuente?[{titulo:'Fuente declarada',url:ficha.fuente}]:[];
  return <div className="mt-2 space-y-1 text-xs text-amber-200">
    <p>{estado==='sin-evaluar'?'Sin evaluación científica registrada':`El creador declara evidencia ${estado}; NEXO no verificó esta valoración`}</p>
    {ficha?.resumen&&<p>Contexto y resultado: {ficha.resumen}</p>}
    {ficha?.limites&&<p>Límites: {ficha.limites}</p>}
    {ficha?.revisadoEn&&<p>Fecha de revisión: {ficha.revisadoEn}</p>}
    {fuentes.map(f=><a key={f.url} className="block underline" href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>)}
  </div>;
}
