// SalaJitsi.tsx
// El video y el audio de la clase en vivo (Errores 3.B.2, 3.B.7).
//
// NEXO no reinventa la videollamada: incrusta Jitsi Meet, un motor gratuito y de
// código abierto (sección 14.3, "Recomendación práctica"). Todo lo PROPIO de
// NEXO —planificación, pizarra, pulso, trayectoria, chat— se construye alrededor,
// en los otros componentes. Acá solo vive la ventana de video.
//
// La sala (`roomName`) la decide el servidor y es la misma para todos los de la
// clase (`nexo-inst<institucion>-clase<id>`), así que docente y estudiantes caen
// en la misma reunión sin coordinar nada a mano.

import { JitsiMeeting } from "@jitsi/react-sdk";

interface SalaJitsiProps {
  sala: string;
  nombre: string;
  /** El docente entra como moderador (puede silenciar, etc.). */
  esDocente: boolean;
}

export default function SalaJitsi({ sala, nombre, esDocente }: SalaJitsiProps) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-white/10">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={sala}
        userInfo={{ displayName: nombre, email: "" }}
        configOverwrite={{
          startWithAudioMuted: !esDocente,
          startWithVideoMuted: !esDocente,
          prejoinPageEnabled: false,
          disableModeratorIndicator: false,
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          MOBILE_APP_PROMO: false,
        }}
        getIFrameRef={(nodo) => {
          // El iframe ocupa todo el panel; la videollamada NO se traga la
          // pantalla ni tapa el menú lateral (Error 3.B.3): vive dentro de su caja.
          nodo.style.height = "100%";
          nodo.style.width = "100%";
        }}
      />
    </div>
  );
}
