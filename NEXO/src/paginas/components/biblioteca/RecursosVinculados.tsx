import { useDatos } from "../../../servicios/api";

type Tipo = "tarea" | "materia" | "publicacion";

/** Consulta ambos permisos en el servidor antes de mostrar una referencia. */
export default function RecursosVinculados({tipo,id}:{tipo:Tipo;id:string}){
  const {datos}=useDatos<{recursos:{id:string;titulo:string;nacional:boolean}[]}>(id?`/api/biblioteca/vinculos/${tipo}/${id}/recursos`:null);
  if(!datos?.recursos.length)return null;
  return <section className="my-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><h3 className="font-semibold">Recursos de biblioteca</h3><div className="mt-2 flex flex-wrap gap-2">{datos.recursos.map(r=><a key={r.id} className="rounded border border-white/15 px-2 py-1 text-primary underline" href={`/biblioteca/${r.nacional?'nacional':'institucional'}?recurso=${r.id}`}>{r.titulo}</a>)}</div></section>;
}
