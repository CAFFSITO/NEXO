// El año entero: doce meses chicos con un punto de color por cada tipo de
// evento del día. Tocar un día lo abre.

import type { EventoServidor, Feriado } from "../../../servicios/calendario";
import { construirGrillaMes } from "../calendario/fechas";
import { NOMBRES_MES, porDia, SEMANA } from "./agendaUtil";

interface Props {
  anio: number;
  eventos: EventoServidor[];
  feriados: Feriado[];
  hoy: string;
  onVerDia: (fecha: string) => void;
}

export default function VistaAnio({ anio, eventos, feriados, hoy, onVerDia }: Props) {
  const dias = porDia(eventos);
  const feriadosSet = new Set(feriados.map((f) => f.fecha));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {NOMBRES_MES.map((nombre, mes) => {
        const prefijo = `${anio}-${String(mes + 1).padStart(2, "0")}`;
        const delMes = eventos.filter((e) => e.fecha.startsWith(prefijo)).length;
        return (
          <section key={nombre} className="a-anio-mes a-aparecer" style={{ animationDelay: `${mes * 25}ms` }} aria-label={`${nombre} ${anio}`}>
            <header className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="font-headline text-base font-bold capitalize text-white">{nombre}</h3>
              <span className="text-[10.5px] text-on-surface-variant/50">{delMes ? `${delMes} ${delMes === 1 ? "evento" : "eventos"}` : ""}</span>
            </header>
            <div className="grid grid-cols-7 gap-0.5">
              {SEMANA.map((d) => <span key={d.dia} className="text-center text-[9px] font-bold text-on-surface-variant/35">{d.corto}</span>)}
              {construirGrillaMes(anio, mes).map((c) => {
                if (!c.esDelMes) return <span key={c.fechaISO} aria-hidden="true" />;
                const lista = dias.get(c.fechaISO) ?? [];
                const colores = [...new Set(lista.map((e) => e.color))].slice(0, 3);
                return (
                  <button
                    key={c.fechaISO}
                    type="button"
                    className={`a-anio-dia ${c.fechaISO === hoy ? "is-hoy" : ""} ${feriadosSet.has(c.fechaISO) ? "is-feriado" : ""}`}
                    onClick={() => onVerDia(c.fechaISO)}
                    aria-label={`${c.dia} de ${nombre}${lista.length ? `, ${lista.length} eventos` : ""}`}
                    style={lista.length ? { background: `color-mix(in srgb, ${colores[0]} ${Math.min(10 + lista.length * 8, 34)}%, transparent)` } : undefined}
                  >
                    {c.dia}
                    {colores.length > 0 && (
                      <span className="a-anio-puntos" aria-hidden="true">{colores.map((col) => <span key={col} style={{ background: col }} />)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
