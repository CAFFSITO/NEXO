// Campo de estrellas en un <canvas>: el fondo vivo del estudio del Maestro.
// `velocidad` va de un paseo (0.3) a salto al hiperespacio (25+), y se puede
// cambiar sin reiniciar la animación. `convergencia` (0–1) tira las estrellas
// hacia el centro: es el "big bang" al revés de la Ignición. Con movimiento
// reducido se dibuja una sola vez, quieto.

import { useEffect, useRef } from "react";

interface Props {
  velocidad?: number;
  densidad?: number;
  colores?: string[];
  convergencia?: number;
  className?: string;
}

interface Estrella { x: number; y: number; z: number; c: string }

export default function CampoEstelar({ velocidad = 0.6, densidad = 420, colores, convergencia = 0, className }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const config = useRef({ velocidad, colores, convergencia });

  useEffect(() => {
    config.current = { velocidad, colores, convergencia };
  }, [velocidad, colores, convergencia]);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let ancho = 0;
    let alto = 0;
    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ancho = canvas.clientWidth;
      alto = canvas.clientHeight;
      canvas.width = Math.max(1, ancho * dpr);
      canvas.height = Math.max(1, alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(canvas);

    const paleta = () => config.current.colores?.length ? config.current.colores : ["#ffffff", "#c4b5fd", "#67e8f9", "#f0abfc"];
    const nueva = (z = Math.random()): Estrella => ({
      x: (Math.random() * 2 - 1) * 1.2,
      y: (Math.random() * 2 - 1) * 1.2,
      z: Math.max(0.03, z),
      c: paleta()[Math.floor(Math.random() * paleta().length)],
    });
    const estrellas = Array.from({ length: densidad }, () => nueva());
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ultimo = performance.now();
    let cuadro = 0;
    const dibujar = (ahora: number) => {
      const dt = Math.min(48, ahora - ultimo) / 16.67;
      ultimo = ahora;
      const { velocidad: v, convergencia: k } = config.current;
      const cx = ancho / 2;
      const cy = alto / 2;
      ctx.fillStyle = `rgba(4, 2, 10, ${v > 6 ? 0.28 : 0.85})`;
      ctx.fillRect(0, 0, ancho, alto);
      for (const s of estrellas) {
        const zPrevia = s.z;
        if (!reducido) s.z -= 0.0022 * v * dt;
        if (s.z <= 0.03) {
          Object.assign(s, nueva(1));
          continue;
        }
        const escala = Math.max(ancho, alto) * 0.5;
        let sx = cx + (s.x / s.z) * escala;
        let sy = cy + (s.y / s.z) * escala;
        let px = cx + (s.x / zPrevia) * escala;
        let py = cy + (s.y / zPrevia) * escala;
        if (k > 0) {
          sx += (cx - sx) * k; sy += (cy - sy) * k;
          px += (cx - px) * k; py += (cy - py) * k;
        }
        if (sx < -50 || sx > ancho + 50 || sy < -50 || sy > alto + 50) {
          Object.assign(s, nueva(1));
          continue;
        }
        const brillo = Math.min(1, (1 - s.z) * 1.4);
        ctx.strokeStyle = s.c;
        ctx.globalAlpha = brillo;
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.4);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx + 0.1, sy + 0.1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!reducido) cuadro = requestAnimationFrame(dibujar);
    };
    cuadro = requestAnimationFrame(dibujar);
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
    };
  }, [densidad]);

  return <canvas ref={lienzo} className={className} aria-hidden="true" />;
}
