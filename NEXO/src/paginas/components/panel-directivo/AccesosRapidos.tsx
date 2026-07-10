// src/paginas/components/panel-directivo/AccesosRapidos.tsx
// Botonera de accesos rápidos. Cada acción dispara un callback identificado para
// que la página decida la navegación / efecto.

export interface AccesoRapido {
  id: string;
  icono: string;
  label: string;
}

interface AccesosRapidosProps {
  accesos: AccesoRapido[];
  onAccion: (id: string) => void;
}

export default function AccesosRapidos({ accesos, onAccion }: AccesosRapidosProps) {
  return (
    <div className="bg-[#2D1B4E] rounded-[20px] p-6 border border-white/5 shadow-lg">
      <h3 className="font-headline font-bold text-xl mb-6">Accesos rápidos</h3>
      <div className="grid grid-cols-1 gap-3">
        {accesos.map((acceso) => (
          <button
            key={acceso.id}
            onClick={() => onAccion(acceso.id)}
            className="w-full flex items-center justify-between border-2 border-fuchsia-500 text-fuchsia-500 font-bold py-3 px-5 rounded-full hover:bg-fuchsia-500 hover:text-white transition-all scale-100 active:scale-95 group"
          >
            <span className="flex items-center">
              <span className="material-symbols-outlined mr-3 text-lg">{acceso.icono}</span>
              {acceso.label}
            </span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
