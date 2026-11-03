import { useState } from "react";
import { normalizar } from "../../../servicios/biblioteca";
import { resumenDeCursos, rolEnAvisos, type PersonaAnuncio } from "../../../servicios/anuncios";
import Avatar from "./Avatar";
import InfoPersona from "./InfoPersona";

export default function SelectorDestinatarios({ personas, seleccionadas, multiple, maximo, disabled, onCambiar }: {
  personas: PersonaAnuncio[];
  seleccionadas: string[];
  multiple: boolean;
  maximo: number;
  disabled: boolean;
  onCambiar: (ids: string[]) => void;
}) {
  const [buscar, setBuscar] = useState("");
  const consulta = normalizar(buscar.trim());
  const visibles = personas.filter((p) => normalizar(`${p.nombre} ${rolEnAvisos(p.rol)} ${resumenDeCursos(p)}`).includes(consulta));
  const elegidas = personas.filter((p) => seleccionadas.includes(p.id));
  const limiteAlcanzado = multiple && elegidas.length >= maximo;

  const alternar = (id: string) => {
    if (disabled) return;
    if (seleccionadas.includes(id)) onCambiar(seleccionadas.filter((actual) => actual !== id));
    else if (!multiple) onCambiar([id]);
    else if (!limiteAlcanzado) onCambiar([...seleccionadas, id]);
  };

  return (
    <div className="av-selector-destinatarios">
      <div className="av-seleccion-cabecera">
        <div>
          <h4>{multiple ? "Armá tu lista de destinatarios" : "Elegí a quién escribirle"}</h4>
          <p>{multiple ? "Marcá las personas que quieras. El aviso le llega solo a quienes elijas, sin crear un grupo." : "Buscá y seleccioná una persona de tu escuela."}</p>
        </div>
        <span className="av-seleccion-contador" role="status">
          {multiple ? `${elegidas.length} / ${maximo}` : `${elegidas.length} / 1`}
          <span className="sr-only"> personas seleccionadas</span>
        </span>
      </div>

      {elegidas.length > 0 && (
        <div className="av-seleccion-resumen">
          <div className="av-seleccion-chips" role="group" aria-label="Destinatarios seleccionados">
            {elegidas.map((p) => (
              <button key={p.id} type="button" className="av-seleccion-chip" disabled={disabled} onClick={() => alternar(p.id)} aria-label={`Quitar a ${p.nombre}`}>
                <span>{p.nombre}</span>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            ))}
          </div>
          {multiple && <button type="button" className="av-boton suave chico" disabled={disabled} onClick={() => onCambiar([])}>Limpiar selección</button>}
        </div>
      )}

      <div className="av-buscar-caja">
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input className="av-buscar" type="search" value={buscar} disabled={disabled} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, rol o curso…" aria-label="Buscar personas" />
      </div>
      {limiteAlcanzado && <p className="av-seleccion-ayuda" role="status">Llegaste al máximo de {maximo} personas. Quitá alguna para elegir otra o usá un grupo para enviar a más.</p>}

      <div className="av-personas av-seleccion-lista" role="group" aria-label={multiple ? "Elegir destinatarios manualmente" : "Elegir una persona"}>
        {visibles.map((p) => (
          <button key={p.id} type="button" className="av-persona" aria-pressed={seleccionadas.includes(p.id)} disabled={disabled || (limiteAlcanzado && !seleccionadas.includes(p.id))} onClick={() => alternar(p.id)}>
            <Avatar persona={p} />
            <InfoPersona persona={p} />
            <span className="av-check" aria-hidden="true"><span className="material-symbols-outlined">check</span></span>
          </button>
        ))}
        {visibles.length === 0 && (
          <div className="av-seleccion-vacia" role="status">
            <span className="material-symbols-outlined" aria-hidden="true">person_search</span>
            <strong>{personas.length ? "No encontramos coincidencias" : "Todavía no hay personas disponibles"}</strong>
            <p>{personas.length ? "Probá con otro nombre, rol o curso. Tu selección se mantiene." : "Las personas a las que puedas escribir aparecerán acá."}</p>
            {buscar && <button type="button" className="av-boton suave chico" disabled={disabled} onClick={() => setBuscar("")}>Limpiar búsqueda</button>}
          </div>
        )}
      </div>
    </div>
  );
}
