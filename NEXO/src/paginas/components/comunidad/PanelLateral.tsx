// La columna de la derecha: buscar, los #temas del momento y las tendencias de
// la escuela. (En NEXO no se sigue a personas: la comunidad es la escuela.)

import { useState } from "react";
import { useHashtags } from "../../../servicios/comunidad";
import SidebarTendencias from "./SidebarTendencias";

interface Props {
  onBuscar: (q: string) => void;
  onTag: (tag: string) => void;
  onPerfil: (id: string) => void;
  onVerTendencias?: () => void;
  onAviso: (texto: string, tipo?: "ok" | "error") => void;
}

export default function PanelLateral({ onBuscar, onTag, onVerTendencias }: Props) {
  const [q, setQ] = useState("");
  const { datos: temas } = useHashtags();

  return (
    <aside className="flex flex-col gap-4" aria-label="Explorar la comunidad">
      <form className="relative" onSubmit={(e) => { e.preventDefault(); onBuscar(q.trim()); }}>
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" aria-hidden="true">search</span>
        <input className="c-input !rounded-full !py-2.5 !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la comunidad" aria-label="Buscar en la comunidad" />
      </form>

      <section className="c-panel overflow-hidden" aria-label="Temas del momento">
        <h3 className="px-4 pt-4 font-headline text-lg font-bold text-white">Qué está pasando</h3>
        {!temas?.hashtags.length ? (
          <p className="px-4 pb-4 pt-2 text-[13px] text-on-surface-variant/60">Usá #temas en tus publicaciones para que aparezcan acá.</p>
        ) : (
          <ul className="py-2">
            {temas.hashtags.map((t, i) => (
              <li key={t.tag}>
                <button type="button" className="w-full px-4 py-2 text-left transition hover:bg-white/[0.04]" onClick={() => onTag(t.tag)}>
                  <span className="block text-[11px] text-on-surface-variant/55">{i + 1} · Tendencia en tu escuela</span>
                  <span className="block font-bold text-white">#{t.tag}</span>
                  <span className="block text-[11.5px] text-on-surface-variant/55">{t.publicaciones} {t.publicaciones === 1 ? "publicación" : "publicaciones"} · {t.personas} {t.personas === 1 ? "persona" : "personas"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {onVerTendencias && <SidebarTendencias onVer={onVerTendencias} />}
    </aside>
  );
}
