import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// El enrutador envuelve a toda la aplicación: de acá para adentro, la dirección
// del navegador ES el estado de la navegación. Ya no hay una variable aparte
// que diga "en qué pantalla estoy": lo dice la URL. Por eso recargar, compartir
// un enlace y el botón "Atrás" funcionan (Errores 12.2 y 12.3).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
