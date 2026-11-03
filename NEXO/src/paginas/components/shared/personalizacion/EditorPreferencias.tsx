import Selector from "../Selector";
import type { Preferencias } from "../../../../servicios/personalizacion";

export const campo = "w-full rounded-lg border border-white/20 bg-[#211633] p-2 text-white";
export default function EditorPreferencias({ valor, onCambiar }: { valor: Preferencias; onCambiar: (p: Preferencias) => void }) {
  const cambiar = (clave: keyof Preferencias, dato: string) => {
    const siguiente = { ...valor };
    delete siguiente[clave];
    if (dato !== "") Object.assign(siguiente, { [clave]: clave === "tamanoTexto" ? Number(dato) : dato });
    onCambiar(siguiente);
  };
  return <div className="grid gap-4 sm:grid-cols-3">
    <label className="text-sm">Densidad<Selector className={campo} value={valor.densidad ?? ""} onChange={e => cambiar("densidad", e.target.value)}><option value="">Heredar</option><option value="comoda">Cómoda</option><option value="compacta">Compacta</option></Selector></label>
    <label className="text-sm">Movimiento<Selector className={campo} value={valor.movimiento ?? ""} onChange={e => cambiar("movimiento", e.target.value)}><option value="">Heredar</option><option value="sistema">Preferencia del dispositivo</option><option value="reducido">Reducido</option><option value="completo">Completo</option></Selector></label>
    <label className="text-sm">Tamaño de texto (%)<input className={campo} type="number" min={100} max={150} step={1} placeholder="Heredar" value={valor.tamanoTexto ?? ""} onChange={e => cambiar("tamanoTexto", e.target.value)} /></label>
  </div>;
}
