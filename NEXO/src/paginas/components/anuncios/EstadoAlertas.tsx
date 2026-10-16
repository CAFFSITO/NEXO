// ¿Le suenan los avisos a este dispositivo con NEXO cerrado? Muestra el estado
// de las alertas push de este navegador, permite activarlas y mandarse una
// prueba, o explica por qué no se puede (permiso bloqueado, o NEXO sin https).

import { useEffect, useState } from "react";
import { activarPush, ayudaDesbloqueo, estadoPush, probarPush, type EstadoPush } from "../../../servicios/push";

const TEXTOS: Record<EstadoPush, { icono: string; titulo: string; detalle: string }> = {
  activo: {
    icono: "notifications_active",
    titulo: "Alertas activadas en este dispositivo",
    detalle: "Los avisos te suenan aunque NEXO esté cerrado, y se repiten cada 10 minutos hasta que los leas.",
  },
  inactivo: {
    icono: "notifications_off",
    titulo: "Las alertas no están activadas en este dispositivo",
    detalle: "Activalas para que los avisos te suenen aunque NEXO esté cerrado.",
  },
  bloqueado: {
    icono: "block",
    titulo: "Las alertas están bloqueadas en este navegador",
    detalle: "",
  },
  "no-soportado": {
    icono: "notifications_paused",
    titulo: "Este navegador no puede recibir alertas con NEXO cerrado",
    detalle: "Hace falta abrir NEXO con https (o desde Chrome, Edge o Firefox actualizados). Mientras tanto, los avisos igual aparecen encima de todo y suenan con NEXO abierto.",
  },
};

export default function EstadoAlertas() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let vigente = true;
    void estadoPush().then((e) => { if (vigente) setEstado(e); });
    return () => { vigente = false; };
  }, []);

  if (!estado) return null;
  const texto = TEXTOS[estado];

  const activar = async () => {
    setOcupado(true);
    setMensaje("");
    try {
      setEstado(await activarPush());
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudieron activar las alertas.");
    } finally {
      setOcupado(false);
    }
  };

  const probar = async () => {
    setOcupado(true);
    setMensaje("");
    try {
      const n = await probarPush();
      setMensaje(n ? "Listo: en unos segundos te llega una notificación de prueba." : "No hay dispositivos suscriptos. Volvé a activar las alertas.");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo mandar la prueba.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className={`av-alertas ${estado}`} aria-live="polite">
      <span className="material-symbols-outlined" aria-hidden="true">{texto.icono}</span>
      <div className="min-w-0 flex-1">
        <strong>{texto.titulo}</strong>
        <p>{estado === "bloqueado" ? ayudaDesbloqueo() : texto.detalle}</p>
        {mensaje && <p className="mt-1 font-semibold text-white">{mensaje}</p>}
      </div>
      {estado === "inactivo" && (
        <button type="button" className="av-boton chico" onClick={activar} disabled={ocupado}>
          <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          Activar alertas
        </button>
      )}
      {estado === "activo" && (
        <button type="button" className="av-boton suave chico" onClick={probar} disabled={ocupado}>
          <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
          Probar alerta
        </button>
      )}
    </section>
  );
}
