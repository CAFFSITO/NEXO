import { useDatos } from '../../../servicios/api';
import { useInstancia } from '../../../servicios/instancia';

/** El servidor exige tanto acceso al origen como al proyecto antes de mostrarlo. */
export default function ProyectosVinculados({tipo,id}:{tipo:'biblioteca'|'leccion'|'tarea';id:string}){
  const {instancia}=useInstancia();
  const visible=instancia?.modulos.some(m=>m.paginas.includes('proyectos'));
  const {datos}=useDatos<{proyectos:{id:string;titulo:string}[]}>(visible?`/api/proyectos/vinculos/${tipo}/${id}`:null);
  if(!datos?.proyectos.length)return null;
  return <section className="my-3 rounded-xl border border-teal-400/25 bg-teal-400/5 p-3 text-sm"><h3 className="font-semibold">Proyectos relacionados</h3><div className="mt-2 flex flex-wrap gap-2">{datos.proyectos.map(p=><a key={p.id} className="text-primary underline" href={`/proyectos?proyecto=${p.id}`}>{p.titulo}</a>)}</div></section>;
}
