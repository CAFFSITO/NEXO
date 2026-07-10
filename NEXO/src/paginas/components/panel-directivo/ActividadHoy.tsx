// src/paginas/components/panel-directivo/ActividadHoy.tsx
// Timeline de la actividad reciente de la institución. Data-driven: cada item
// define su color de nodo según el tipo de evento.

export interface ItemActividad {
  id: string;
  titulo: string;
  detalle: string;
  tiempo: string;
  color: string; // clase de fondo Tailwind del nodo, ej: "bg-fuchsia-600"
}

interface ActividadHoyProps {
  items: ItemActividad[];
}

export default function ActividadHoy({ items }: ActividadHoyProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[20px] p-6 border border-white/5 shadow-lg">
      <h3 className="font-headline font-bold text-xl mb-6 flex items-center">
        <span className="material-symbols-outlined mr-3 text-fuchsia-500">history</span>
        Actividad de hoy
      </h3>
      <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-fuchsia-900/30">
        {items.map((item) => (
          <div key={item.id} className="relative pl-8 group">
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-[#2D1B4E] z-10 ${item.color}`} />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-white">{item.titulo}</p>
                <p className="text-xs text-slate-400">{item.detalle}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap ml-3">
                {item.tiempo}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
