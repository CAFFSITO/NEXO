// Nombre, rol y —si es preceptor— su turno, especialidad y cursos, para elegir
// a quién mandar un aviso o a quién sumar a un grupo sabiendo de qué turno es.

import { resumenDeCursos, rolEnAvisos, type PersonaAnuncio } from "../../../servicios/anuncios";

export default function InfoPersona({ persona }: { persona: PersonaAnuncio }) {
  const cursos = resumenDeCursos(persona);
  return (
    <span className="min-w-0">
      <b className="block truncate">{persona.nombre}</b>
      <small className="block truncate">{rolEnAvisos(persona.rol)}</small>
      {cursos && <small className="av-persona-cursos block truncate" title={cursos}>{cursos}</small>}
    </span>
  );
}
