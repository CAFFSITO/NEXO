// La intro de película de la Forja: franjas de cine, salto al hiperespacio y
// las letras de NEXO que se arman en el centro. Se puede saltar (botón, Esc o
// Enter) y no aparece si la persona pidió movimiento reducido.

import { useEffect, useState } from "react";
import CampoEstelar from "./CampoEstelar";

export default function IntroCine({ onTerminar }: { onTerminar: () => void }) {
  const [fase, setFase] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onTerminar();
      return;
    }
    const tiempos = [
      window.setTimeout(() => setFase(1), 450),
      window.setTimeout(() => setFase(2), 2700),
      window.setTimeout(onTerminar, 8200),
    ];
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onTerminar();
    };
    window.addEventListener("keydown", teclado);
    return () => {
      tiempos.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", teclado);
    };
  }, [onTerminar]);

  const velocidad = fase === 0 ? 0.2 : fase === 1 ? 28 : 1.4;

  return (
    <div className="m-intro maestro" role="dialog" aria-label="Intro de la Forja">
      <CampoEstelar velocidad={velocidad} densidad={650} />
      <div className="m-intro-velo" />
      <div className="m-intro-franja arriba" />
      <div className="m-intro-franja abajo" />
      <div className="m-intro-destello" />
      <div className="m-intro-centro">
        <p className="m-intro-presenta">El Maestro presenta</p>
        <div className="m-intro-letras" aria-label="NEXO">
          {"NEXO".split("").map((letra, i) => (
            <span key={letra + i} style={{ animationDelay: `${1.5 + i * 0.16}s` }} aria-hidden="true">{letra}</span>
          ))}
        </div>
        <p className="m-intro-lema">Estás por crear un universo educativo.</p>
        <div className="m-intro-comenzar">
          <button className="m-boton" onClick={onTerminar} autoFocus>
            <span className="material-symbols-outlined" aria-hidden="true">local_fire_department</span>
            Entrar a la Forja
          </button>
        </div>
      </div>
      <button className="m-boton-fantasma m-boton-chico m-intro-saltar" onClick={onTerminar}>
        Saltar intro
        <span className="material-symbols-outlined" aria-hidden="true">skip_next</span>
      </button>
    </div>
  );
}
