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
    <div className="bg-lienzo rounded-xl p-6 border border-white/5 shadow-lg">
      <h3 className="font-headline font-bold text-xl mb-6">Accesos rápidos</h3>
      <div className="grid grid-cols-1 gap-3">
        {accesos.map((acceso) => (
          <button
            key={acceso.id}
            onClick={() => onAccion(acceso.id)}
            className="w-full flex items-center justify-between border border-outline-variant bg-surface-container-low text-on-surface font-semibold py-2.5 px-4 rounded-lg hover:bg-surface-container-high transition-colors group"
          >
            <span className="flex items-center">
              <span className="material-symbols-outlined mr-3 text-lg text-primary">{acceso.icono}</span>
              {acceso.label}
            </span>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
