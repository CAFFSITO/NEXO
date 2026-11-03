// El cupo de los cursos en el panel de la dirección: cuáles están excedidos,
// cuáles tienen menos estudiantes que el mínimo y cuántos están dentro del
// estándar. Sale del mínimo y máximo que la dirección fija en cada curso.
import { useCursos } from "../../../servicios/perfiles";
import { estadoCupo, ESTADOS_CUPO, textoCupo } from "../../../servicios/gestionAcademica";

export default function CupoCursos({ onIr }: { onIr: (ruta: string) => void }) {
  const { datos } = useCursos();
  if (!datos) return null;
  const cursos = datos.cursos;
  const excedidos = cursos.filter((c) => estadoCupo(c) === "excedido");
  const faltan = cursos.filter((c) => estadoCupo(c) === "faltan");
  const dentro = cursos.filter((c) => estadoCupo(c) === "ok").length;
  const sinCupo = cursos.filter((c) => estadoCupo(c) === "libre").length;
  const fuera = [...excedidos, ...faltan];
  return (
    <section className="nx-tarjeta p-5" aria-labelledby="cupo-cursos-titulo">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id="cupo-cursos-titulo" className="flex items-center gap-2 whitespace-nowrap text-base font-semibold text-on-surface">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">groups</span>Cupo de los cursos
        </h3>
        <button type="button" onClick={() => onIr("/admin/cursos")} className="whitespace-nowrap text-sm font-medium text-primary hover:underline">Ver cursos</button>
      </div>
      <ul className="mb-4 flex flex-col gap-1.5">
        {([["Excedidos", excedidos.length, "bg-rose-500", "text-rose-300"], ["Debajo del mínimo", faltan.length, "bg-amber-500", "text-amber-300"], ["Dentro del cupo", dentro, "bg-emerald-500", "text-emerald-300"]] as const).map(([etiqueta, n, punto, tono]) => (
          <li key={etiqueta} className="flex items-center gap-2.5 rounded-lg bg-surface-container px-3 py-2 text-sm">
            <span className={`h-2 w-2 shrink-0 rounded-full ${punto}`} aria-hidden="true" />
            <span className="flex-1 text-on-surface">{etiqueta}</span>
            <span className={`text-base font-semibold tabular-nums ${n ? tono : "text-on-surface-variant"}`}>{n}</span>
          </li>
        ))}
      </ul>
      {fuera.length > 0 ? (
        <ul className="flex flex-col divide-y divide-white/5">
          {fuera.slice(0, 6).map((c) => {
            const e = ESTADOS_CUPO[estadoCupo(c)];
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-on-surface">{c.anio}° {c.division}</span>
                <span className="flex items-center gap-2"><span className="tabular-nums text-on-surface-variant">{textoCupo(c)}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>{e.etiqueta}</span></span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">{sinCupo === cursos.length ? "Todavía ningún curso tiene cupo definido. Fijalo en Cursos para ver acá cuáles están excedidos o les faltan estudiantes." : "Todos los cursos con cupo definido están dentro del estándar."}</p>
      )}
      {sinCupo > 0 && sinCupo < cursos.length && <p className="mt-3 text-xs text-on-surface-variant">{sinCupo} {sinCupo === 1 ? "curso no tiene" : "cursos no tienen"} cupo definido.</p>}
    </section>
  );
}
