// ============================================================================
// NEXO — Trabajador en segundo plano (service worker)
// ----------------------------------------------------------------------------
// Vive en el navegador aunque NEXO esté cerrado. Hace UNA sola cosa: cuando la
// cocina manda un aviso push (servidor/push.js, cifrado para este navegador),
// lo muestra como notificación del sistema que no se va sola, vibra y suena.
// Tocarla abre (o trae al frente) NEXO, donde la tarjeta espera para leerse.
//
// No guarda copias de la aplicación ni intercepta pedidos: NEXO sigue
// funcionando exactamente igual que sin él.
// ============================================================================

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : "" };
  }
  const titulo = datos.titulo || "NEXO · Aviso nuevo";
  evento.waitUntil((async () => {
    // Una entrega tardía no debe reactivar una alarma ya confirmada.
    if (datos.tipo === "mensaje" && datos.notificacionId) {
      try {
        const respuesta = await fetch("/api/notificaciones/mensajes-pendientes");
        if (respuesta.ok) {
          const { pendientes } = await respuesta.json();
          if (!pendientes.some((n) => n.id === datos.notificacionId)) {
            for (const n of await self.registration.getNotifications({ tag: datos.tag })) n.close();
            return;
          }
        }
      } catch { /* Sin red, mostrar el mensaje recibido por push. */ }
    }
    await self.registration.showNotification(titulo, {
      body: datos.cuerpo || "Tenés avisos sin leer.",
      // Misma etiqueta = reemplaza a la anterior en vez de apilar diez, pero
      // `renotify` hace que vuelva a sonar y vibrar cada vez.
      tag: datos.tag || "nexo-anuncios",
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: datos.prioridad === "estandar" ? [300, 150, 300] : [500, 180, 500, 180, 900],
      icon: "/icono-192.png",
      badge: "/insignia-96.png",
      timestamp: Date.now(),
      data: { url: datos.url || "/anuncios" },
    });
  })());
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/", self.location.origin);
  const destino = url.origin === self.location.origin ? url.href : self.location.origin;
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Si NEXO ya está abierto, se trae al frente: la tarjeta ya está encima de todo.
    const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
    if (abierta) {
      await abierta.navigate(destino);
      return abierta.focus();
    }
    return self.clients.openWindow(destino);
  })());
});
