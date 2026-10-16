// La repetición: las de un toque (todos los días, días de clase, cada semana,
// cada mes, cada año) o una personalizada: cada N días/semanas/meses/años,
// qué días, el "2° martes" o "el último viernes", hasta cuándo o cuántas veces,
// y si salta feriados o fines de semana.

import type { Frecuencia, Recurrencia } from "../../../servicios/calendario";
import { describirRecurrencia, NOMBRES_DIA, presetsRepeticion, SEMANA, diaSemana } from "./agendaUtil";
import Selector from "../shared/Selector";

interface Props {
  fecha: string;
  valor: Recurrencia | null;
  onCambiar: (r: Recurrencia | null) => void;
}

const canonica = (r: Recurrencia | null) =>
  r ? JSON.stringify(Object.entries(r).filter(([, v]) => v !== undefined && v !== false).sort(([a], [b]) => a.localeCompare(b))) : "null";
const igual = (a: Recurrencia | null, b: Recurrencia | null) => canonica(a) === canonica(b);
const UNIDAD: Record<Frecuencia, [string, string]> = { diaria: ["día", "días"], semanal: ["semana", "semanas"], mensual: ["mes", "meses"], anual: ["año", "años"] };

/** Lo que define el patrón (sin "hasta" ni "veces", que se eligen aparte). */
const patron = (r: Recurrencia | null) => {
  if (!r) return null;
  const copia: Recurrencia = { ...r };
  delete copia.hasta;
  delete copia.veces;
  return copia;
};

export default function EditorRepeticion({ fecha, valor, onCambiar }: Props) {
  const presets = presetsRepeticion(fecha);
  const elegido = presets.find((p) => igual(patron(p.regla), patron(valor)))?.id ?? "personalizada";
  const fin = valor?.hasta ? "hasta" : valor?.veces ? "veces" : "nunca";
  const cambiar = (cambio: Partial<Recurrencia>) => valor && onCambiar({ ...valor, ...cambio });
  const ordinal = ["primer", "segundo", "tercer", "cuarto", "quinto"][Math.ceil(Number(fecha.slice(8)) / 7) - 1];

  return (
    <div className="flex flex-col gap-3">
      <Selector
        className="a-input"
        value={elegido}
        aria-label="Repetición"
        onChange={(e) => {
          const id = e.target.value;
          if (id === "personalizada") onCambiar({ frecuencia: "semanal", intervalo: 1, dias: [diaSemana(fecha)], hasta: valor?.hasta, veces: valor?.veces });
          else {
            const p = presets.find((x) => x.id === id)!;
            onCambiar(p.regla ? { ...p.regla, ...(valor?.hasta ? { hasta: valor.hasta } : {}), ...(valor?.veces ? { veces: valor.veces } : {}) } : null);
          }
        }}
      >
        {presets.map((p) => <option key={p.id} value={p.id}>{p.etiqueta}</option>)}
        <option value="personalizada">Personalizada…</option>
      </Selector>

      {valor && elegido === "personalizada" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 a-aparecer">
          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            Cada
            <input type="number" min={1} max={99} className="a-input !w-20" value={valor.intervalo} aria-label="Cada cuántos" onChange={(e) => cambiar({ intervalo: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
            <Selector className="a-input !w-auto" value={valor.frecuencia} aria-label="Unidad" onChange={(e) => {
              const f = e.target.value as Frecuencia;
              onCambiar({ frecuencia: f, intervalo: valor.intervalo, ...(f === "semanal" ? { dias: [diaSemana(fecha)] } : {}), ...(f === "mensual" ? { modoMensual: "dia" as const } : {}), hasta: valor.hasta, veces: valor.veces, saltarFeriados: valor.saltarFeriados });
            }}>
              {(Object.keys(UNIDAD) as Frecuencia[]).map((f) => <option key={f} value={f}>{UNIDAD[f][valor.intervalo === 1 ? 0 : 1]}</option>)}
            </Selector>
          </div>

          {valor.frecuencia === "semanal" && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días">
              {SEMANA.map((d) => {
                const dias = valor.dias ?? [diaSemana(fecha)];
                const activo = dias.includes(d.dia);
                return (
                  <button key={d.dia} type="button" aria-pressed={activo} aria-label={NOMBRES_DIA[d.dia]}
                    className={`grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold transition ${activo ? "bg-primary text-on-primary" : "bg-white/5 text-on-surface-variant hover:bg-white/10"}`}
                    onClick={() => {
                      const nuevos = activo ? dias.filter((x) => x !== d.dia) : [...dias, d.dia];
                      if (nuevos.length) cambiar({ dias: nuevos });
                    }}>
                    {d.corto}
                  </button>
                );
              })}
            </div>
          )}

          {valor.frecuencia === "mensual" && (
            <Selector className="a-input" value={valor.modoMensual ?? "dia"} aria-label="Qué día del mes" onChange={(e) => cambiar({ modoMensual: e.target.value as Recurrencia["modoMensual"] })}>
              <option value="dia">El día {Number(fecha.slice(8))}</option>
              <option value="posicion">El {ordinal} {NOMBRES_DIA[diaSemana(fecha)]}</option>
              <option value="ultimo">El último {NOMBRES_DIA[diaSemana(fecha)]}</option>
            </Selector>
          )}

          {valor.frecuencia === "diaria" && (
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" checked={Boolean(valor.soloHabiles)} onChange={(e) => cambiar({ soloHabiles: e.target.checked || undefined })} />
              Solo días hábiles (sin sábados ni domingos)
            </label>
          )}
        </div>
      )}

      {valor && (
        <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Termina">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/55">Termina</span>
            {(["nunca", "hasta", "veces"] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={fin === f} className="a-segmento !py-1" onClick={() => {
                if (f === "nunca") onCambiar({ ...valor, hasta: undefined, veces: undefined });
                if (f === "hasta") onCambiar({ ...valor, veces: undefined, hasta: valor.hasta ?? `${Number(fecha.slice(0, 4))}-12-15` });
                if (f === "veces") onCambiar({ ...valor, hasta: undefined, veces: valor.veces ?? 10 });
              }}>
                {f === "nunca" ? "Nunca" : f === "hasta" ? "Una fecha" : "Después de"}
              </button>
            ))}
            {fin === "hasta" && <input type="date" className="a-input !w-auto" value={valor.hasta ?? ""} min={fecha} aria-label="Hasta" onChange={(e) => cambiar({ hasta: e.target.value || undefined })} />}
            {fin === "veces" && (
              <span className="flex items-center gap-2"><input type="number" min={1} max={500} className="a-input !w-20" value={valor.veces ?? 10} aria-label="Cantidad de veces" onChange={(e) => cambiar({ veces: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} />veces</span>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(valor.saltarFeriados)} onChange={(e) => cambiar({ saltarFeriados: e.target.checked || undefined })} />
            Saltar los feriados
          </label>
          <p className="flex items-center gap-1.5 text-[12px] text-primary">
            <span className="material-symbols-outlined text-base" aria-hidden="true">repeat</span>{describirRecurrencia(valor, fecha)}
          </p>
        </div>
      )}
    </div>
  );
}
