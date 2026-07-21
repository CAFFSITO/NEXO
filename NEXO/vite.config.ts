import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    // Permitir que el túnel de ngrok (u otros dominios externos) puedan
    // entrar. Sin esto, Vite bloquea cualquier host que no sea localhost.
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
    // Todo pedido que empiece con /api se reenvía a la cocina (servidor/),
    // que corre en el puerto 3000. Así la vidriera y la cocina se ven como
    // si fueran el mismo sitio (sin problemas de CORS).
    proxy: {
      '/api': 'http://localhost:3000',
      // El tubo en vivo del chat y las notificaciones (Etapa 6). `ws: true` le
      // dice al proxy que /ws no es un pedido común sino una conexión WebSocket
      // permanente, y la reenvía a la misma cocina del puerto 3000.
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
