// PizarraClase.tsx
// La pizarra digital de la clase (Error 2.C.1, sección 14.3 paso 3).
//
// Regla central: SOLO el docente dibuja; todos ven. Esa regla no se sostiene
// escondiendo el mouse en el frontend —el servidor rechaza un trazo que no venga
// del docente (regla de oro 4)—, pero acá igual solo se habilitan los eventos de
// dibujo para el docente, para que la experiencia sea clara.
//
// Cómo viaja un trazo: el docente arrastra → se arma un trazo (lista de puntos en
// coordenadas 0..1, para que se vea igual en cualquier tamaño de pantalla) → se
// guarda en `pizarra_trazos` y se empuja por el mensajero → cada estudiante lo
// recibe y lo reproduce en su lienzo. Quien entra tarde pide todos los trazos y
// los dibuja de una (así ve lo que ya estaba en la pizarra).

import { useCallback, useEffect, useRef, useState } from "react";
import { useTiempoReal, type EventoVivo } from "../../../servicios/tiempoReal";
import {
  enviarTrazo,
  limpiarPizarra,
  trazosDeClase,
  type Trazo,
} from "../../../servicios/aula";

interface Punto {
  x: number; // 0..1
  y: number; // 0..1
}
interface DatosTrazo {
  color: string;
  ancho: number;
  puntos: Punto[];
}

interface PizarraClaseProps {
  claseId: string;
  esDocente: boolean;
}

const COLORES = ["#C548F5", "#ffffff", "#f97316", "#22c55e", "#38bdf8"];

export default function PizarraClase({ claseId, esDocente }: PizarraClaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trazosRef = useRef<DatosTrazo[]>([]);
  const dibujandoRef = useRef<DatosTrazo | null>(null);
  const [color, setColor] = useState(COLORES[0]);

  // ── Dibujar todo el lienzo desde la lista de trazos ────────────────────────
  const redibujar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const pintar = (t: DatosTrazo) => {
      if (t.puntos.length === 0) return;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = t.ancho;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      t.puntos.forEach((p, i) => {
        const x = p.x * width;
        const y = p.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    trazosRef.current.forEach(pintar);
    if (dibujandoRef.current) pintar(dibujandoRef.current);
  }, []);

  // ── Ajustar el tamaño real del lienzo al de su caja ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      const caja = canvas.getBoundingClientRect();
      canvas.width = caja.width;
      canvas.height = caja.height;
      redibujar();
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [redibujar]);

  // ── Cargar los trazos que ya estaban (el que entra tarde ve la pizarra) ────
  useEffect(() => {
    let vigente = true;
    trazosDeClase(claseId)
      .then((trazos) => {
        if (!vigente) return;
        trazosRef.current = trazos.map((t) => t.datos as DatosTrazo);
        redibujar();
      })
      .catch(() => {
        /* Si falla, la pizarra queda vacía; no rompe la clase. */
      });
    return () => {
      vigente = false;
    };
  }, [claseId, redibujar]);

  // ── Escuchar trazos en vivo (los que dibuja el docente) ────────────────────
  const alRecibir = useCallback(
    (evento: EventoVivo) => {
      if (evento.claseId !== claseId) return;
      if (evento.tipo === "aula-trazo" && evento.trazo) {
        const t = (evento.trazo as Trazo).datos as DatosTrazo;
        trazosRef.current = [...trazosRef.current, t];
        redibujar();
      } else if (evento.tipo === "aula-pizarra-limpia") {
        trazosRef.current = [];
        redibujar();
      }
    },
    [claseId, redibujar]
  );
  useTiempoReal(alRecibir);

  // ── Dibujo del docente ─────────────────────────────────────────────────────
  const puntoDe = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
    const caja = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - caja.left) / caja.width,
      y: (e.clientY - caja.top) / caja.height,
    };
  };

  const alBajar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!esDocente) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujandoRef.current = { color, ancho: 3, puntos: [puntoDe(e)] };
  };
  const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!esDocente || !dibujandoRef.current) return;
    dibujandoRef.current.puntos.push(puntoDe(e));
    redibujar();
  };
  const alSoltar = () => {
    if (!esDocente || !dibujandoRef.current) return;
    const trazo = dibujandoRef.current;
    dibujandoRef.current = null;
    if (trazo.puntos.length < 1) return;
    // Se ve al instante en la pizarra del docente y se manda a guardar/repartir.
    trazosRef.current = [...trazosRef.current, trazo];
    redibujar();
    enviarTrazo(claseId, trazo).catch(() => {
      /* El servidor pudo rechazarlo (no docente); el trazo local no molesta. */
    });
  };

  const borrarTodo = () => {
    trazosRef.current = [];
    redibujar();
    limpiarPizarra(claseId).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">draw</span>
          Pizarra
          {!esDocente && <span className="text-slate-500 font-normal">(la maneja el docente)</span>}
        </span>
        {esDocente && (
          <div className="flex items-center gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  color === c ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              onClick={borrarTodo}
              className="ml-1 px-2 py-1 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">ink_eraser</span>
              Limpiar
            </button>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        className={`flex-1 w-full rounded-2xl bg-[#0f0820] border border-white/10 ${
          esDocente ? "cursor-crosshair touch-none" : "cursor-default"
        }`}
      />
    </div>
  );
}
