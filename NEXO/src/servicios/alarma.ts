// src/servicios/alarma.ts
// La alarma de los avisos obligatorios mientras NEXO está abierto: un timbre que
// se repite hasta que la persona toca la pantalla, y el título de la pestaña
// que parpadea si está mirando otra cosa. Con NEXO cerrado suena el push (ver
// public/sw.js); esto es lo que suena con NEXO abierto.
//
// El timbre se sintetiza acá mismo (Web Audio): no hay archivos de sonido. Los
// navegadores solo dejan sonar después del primer toque de la persona en la
// página; por eso el audio se "despierta" con el primer toque o tecla.

export function crearAlarma() {
  let contexto: AudioContext | null = null;
  let timbre: AudioBuffer | null = null;
  let fuente: AudioBufferSourceNode | null = null;
  let corte: ReturnType<typeof setTimeout> | null = null;

  function crearContexto(): AudioContext | null {
    if (contexto) return contexto;
    const Clase = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Clase) return null;
    try { contexto = new Clase(); } catch { return null; }
    return contexto;
  }

  /** Engancha el desbloqueo del audio al primer toque o tecla. Se llama una vez. */
  function prepararAlarma(): () => void {
    const despertar = () => {
      void crearContexto()?.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", despertar, { capture: true, passive: true });
    window.addEventListener("keydown", despertar, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", despertar, { capture: true });
      window.removeEventListener("keydown", despertar, { capture: true });
    };
  }

  /** "Ding-dong, ding-dong" y un silencio: 2,4 segundos que se repiten. */
  function crearTimbre(c: AudioContext): AudioBuffer {
    const duracion = 2.4;
    const muestras = Math.floor(duracion * c.sampleRate);
    const buffer = c.createBuffer(1, muestras, c.sampleRate);
    const datos = buffer.getChannelData(0);
    const notas: [number, number][] = [[0, 1318.5], [0.2, 1046.5], [0.6, 1318.5], [0.8, 1046.5]];
    for (const [inicio, f] of notas) {
      const desde = Math.floor(inicio * c.sampleRate);
      const largo = Math.floor(1.1 * c.sampleRate);
      for (let i = 0; i < largo && desde + i < muestras; i++) {
        const t = i / c.sampleRate;
        const envolvente = Math.min(1, t / 0.004) * Math.exp(-t / 0.24);
        datos[desde + i] += envolvente * (
          Math.sin(2 * Math.PI * f * t) + 0.32 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t)
        );
      }
    }
    let pico = 0;
    for (const x of datos) pico = Math.max(pico, Math.abs(x));
    if (pico > 0) for (let i = 0; i < datos.length; i++) datos[i] = (datos[i] / pico) * 0.85;
    return buffer;
  }

  /** Hace sonar el timbre en bucle durante `duracionMs` (o hasta `callarAlarma`). */
  function sonarAlarma(duracionMs = 45_000): void {
    const c = crearContexto();
    if (!c) return;
    callarAlarma();
    void c.resume().catch(() => {});
    timbre ??= crearTimbre(c);
    const s = c.createBufferSource();
    s.buffer = timbre;
    s.loop = true;
    const volumen = c.createGain();
    volumen.gain.value = 0.75;
    s.connect(volumen).connect(c.destination);
    s.start();
    fuente = s;
    corte = duracionMs > 0 ? setTimeout(callarAlarma, duracionMs) : null;
    try {
      navigator.vibrate?.([400, 150, 400, 150, 700]);
    } catch {
      // Sin vibración (computadora, o el navegador no la deja todavía).
    }
  }

  function callarAlarma(): void {
    if (corte) clearTimeout(corte);
    corte = null;
    try {
      fuente?.stop();
    } catch {
      // Ya estaba parada.
    }
    fuente = null;
  }

  function liberarAlarma() {
    callarAlarma();
    if (contexto) void contexto.close().catch(() => {});
    contexto = null;
    timbre = null;
  }
  return { prepararAlarma, sonarAlarma, callarAlarma, liberarAlarma };
}

export const { prepararAlarma, sonarAlarma, callarAlarma } = crearAlarma();

/**
 * Mientras la pestaña esté oculta, el título alterna con `texto` cada segundo
 * para que se vea desde la barra de pestañas. Devuelve la función que lo apaga.
 */
export function parpadearTitulo(texto: string): () => void {
  const original = document.title;
  let reloj: ReturnType<typeof setInterval> | null = null;
  const apagar = () => {
    if (reloj) clearInterval(reloj);
    reloj = null;
    document.title = original;
  };
  const revisar = () => {
    if (!document.hidden) return apagar();
    if (reloj) return;
    let alterna = false;
    reloj = setInterval(() => {
      alterna = !alterna;
      document.title = alterna ? texto : original;
    }, 1000);
  };
  revisar();
  document.addEventListener("visibilitychange", revisar);
  return () => {
    document.removeEventListener("visibilitychange", revisar);
    apagar();
  };
}
