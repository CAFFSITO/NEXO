// La cara de quien manda o recibe un aviso: su foto o, si no tiene (o no carga),
// sus iniciales sobre el color de la tarjeta.

import { useState } from "react";
import { iniciales, type PersonaAnuncio } from "../../../servicios/anuncios";

export default function Avatar({ persona, className = "" }: { persona: PersonaAnuncio | null; className?: string }) {
  const [fallo, setFallo] = useState(false);
  if (persona?.avatarUrl && !fallo) {
    return <img className={`av-avatar ${className}`} src={persona.avatarUrl} alt="" onError={() => setFallo(true)} />;
  }
  return <span className={`av-avatar ${className}`} aria-hidden="true">{iniciales(persona?.nombre)}</span>;
}
