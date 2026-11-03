// "Pantalla completa" en el celular: con una conversación abierta (Mensajes,
// Anuncios) se esconden la barra de arriba y la de abajo, como en WhatsApp.
// En la computadora no cambia nada (lo decide index.css).
import { useEffect } from "react";

let pedidos = 0;

export function useInmersivo(activo: boolean): void {
  useEffect(() => {
    if (!activo) return;
    pedidos += 1;
    document.documentElement.dataset.inmersivo = "";
    return () => {
      pedidos -= 1;
      if (pedidos <= 0) { pedidos = 0; delete document.documentElement.dataset.inmersivo; }
    };
  }, [activo]);
}
