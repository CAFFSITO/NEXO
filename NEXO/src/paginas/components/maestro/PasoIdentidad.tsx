// Paso «Identidad»: cómo se llama la instancia, su lema, su ícono y su dominio.
// Al crear, además: el ciclo lectivo, la cuenta de la dirección (la única que
// siempre se crea), una plantilla de materias opcional y las cuentas semilla
// (una por perfil, para entrar y probar cada diseño).

import type { Genoma } from "../../../servicios/maestro";
import type { PlantillaPlataforma } from "../../../servicios/plataforma";
import SelectorIcono from "./SelectorIcono";
import Selector from "../shared/Selector";

export interface DatosCreacion {
  ciclo: number;
  direccionNombre: string;
  direccionEmail: string;
  cuentasSemilla: boolean;
  plantillaId: string;
}

interface Props {
  genoma: Genoma;
  onCambiar: (genoma: Genoma) => void;
  creacion: DatosCreacion | null;
  onCambiarCreacion: (datos: DatosCreacion) => void;
  plantillas: PlantillaPlataforma[];
}

export default function PasoIdentidad({ genoma, onCambiar, creacion, onCambiarCreacion, plantillas }: Props) {
  const id = genoma.identidad;
  const cambiar = (cambio: Partial<Genoma["identidad"]>) => onCambiar({ ...genoma, identidad: { ...id, ...cambio } });
  const dominioSugerido = (nombre: string) =>
    nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/\b(colegio|escuela|instituto|tecnica|técnica|nacional|n°|nro)\b/g, "")
      .replace(/[^a-z0-9]+/g, "").slice(0, 24);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <section className="flex flex-col gap-8 m-escalonado">
        <div>
          <p className="m-eyebrow">Identidad</p>
          <h2 className="m-titulo text-3xl mt-3">Ponele nombre a este universo</h2>
        </div>
        <label className="m-campo">
          <span>Nombre de la instancia</span>
          <input
            className="m-input m-input-gigante"
            value={id.nombre}
            maxLength={80}
            placeholder="Escuela Técnica Andrómeda"
            onChange={(e) => {
              const nombre = e.target.value;
              const anterior = dominioSugerido(id.nombre);
              const sigueSugerido = !id.dominio || id.dominio === `${anterior}.nexo.edu`;
              cambiar({ nombre, ...(sigueSugerido && dominioSugerido(nombre) ? { dominio: `${dominioSugerido(nombre)}.nexo.edu` } : {}) });
            }}
            autoFocus
          />
        </label>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="m-campo">
            <span>Lema</span>
            <input className="m-input" value={id.lema} maxLength={140} placeholder="Ciencia, comunidad y futuro" onChange={(e) => cambiar({ lema: e.target.value })} />
          </label>
          <div className="m-campo">
            <span>Ícono</span>
            <SelectorIcono valor={id.icono === "hub" ? "" : id.icono} porDefecto="hub" onCambiar={(icono) => cambiar({ icono: icono || "hub" })} etiqueta="Ícono de la instancia" />
          </div>
        </div>
        <label className="m-campo">
          <span>Dominio de las cuentas</span>
          <input className="m-input" value={id.dominio} maxLength={80} placeholder="andromeda.nexo.edu" onChange={(e) => cambiar({ dominio: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "") })} />
        </label>

        {creacion && (
          <>
            <div className="h-px bg-white/10" />
            <div className="grid gap-5 md:grid-cols-3">
              <label className="m-campo">
                <span>Ciclo lectivo</span>
                <input type="number" className="m-input" value={creacion.ciclo} min={2000} max={2100} onChange={(e) => onCambiarCreacion({ ...creacion, ciclo: Number(e.target.value) })} />
              </label>
              <label className="m-campo md:col-span-2">
                <span>Plantilla de materias (opcional)</span>
                <Selector className="m-input" value={creacion.plantillaId} onChange={(e) => onCambiarCreacion({ ...creacion, plantillaId: e.target.value })}>
                  <option value="">Sin plantilla: la dirección carga sus materias</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} · {p.materias.length} materias, {p.competencias.length} competencias</option>
                  ))}
                </Selector>
              </label>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--m-tenue)] mb-3">Quien dirige la escuela</p>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="m-campo">
                  <span>Nombre y apellido</span>
                  <input className="m-input" value={creacion.direccionNombre} maxLength={80} placeholder="Dra. Vera Rubin" onChange={(e) => onCambiarCreacion({ ...creacion, direccionNombre: e.target.value })} />
                </label>
                <label className="m-campo">
                  <span>Correo de acceso</span>
                  <input type="email" className="m-input" value={creacion.direccionEmail} placeholder={id.dominio ? `direccion@${id.dominio}` : "direccion@escuela.edu"} onChange={(e) => onCambiarCreacion({ ...creacion, direccionEmail: e.target.value.trim().toLowerCase() })} />
                </label>
              </div>
            </div>
            <button
              type="button"
              className="flex items-start gap-4 text-left m-cristal p-5 hover:bg-white/[0.06] transition"
              role="switch"
              aria-checked={creacion.cuentasSemilla}
              onClick={() => onCambiarCreacion({ ...creacion, cuentasSemilla: !creacion.cuentasSemilla })}
            >
              <span className="m-interruptor mt-1" aria-checked={creacion.cuentasSemilla} />
              <span>
                <strong className="block">Crear una cuenta semilla por perfil</strong>
                <span className="block text-xs text-[color:var(--m-suave)] mt-1 leading-relaxed">
                  Una cuenta para cada perfil ({id.dominio ? `estudiante@${id.dominio}, profesor@${id.dominio}…` : "requiere dominio"}), así podés entrar y ver cada diseño desde adentro.
                  Las contraseñas se muestran una sola vez al forjar.
                </span>
              </span>
            </button>
          </>
        )}
      </section>

      <aside className="m-cristal p-8 relative overflow-hidden h-fit m-aparecer" style={{ boxShadow: `0 40px 120px -40px ${genoma.tema.acento}` }}>
        <span aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full hidden opacity-40" style={{ background: genoma.tema.acento }} />
        <span aria-hidden="true" className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full hidden opacity-25" style={{ background: genoma.tema.secundario }} />
        <div className="relative text-center">
          <span className="material-symbols-outlined text-7xl" style={{ color: genoma.tema.acento }} aria-hidden="true">{id.icono || "hub"}</span>
          <p className="m-titulo text-3xl mt-4 break-words">{id.nombre || "Tu instancia"}</p>
          <p className="text-sm text-[color:var(--m-suave)] mt-2 italic">{id.lema || "Un lema que la defina"}</p>
          {id.dominio && <p className="m-chip mt-5 mx-auto w-fit"><span className="material-symbols-outlined" aria-hidden="true">alternate_email</span>{id.dominio}</p>}
        </div>
      </aside>
    </div>
  );
}
