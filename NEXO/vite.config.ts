import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    // Todo pedido que empiece con /api se reenvía a la cocina (servidor/),
    // que corre en el puerto 3000. Así la vidriera y la cocina se ven como
    // si fueran el mismo sitio (sin problemas de CORS).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
