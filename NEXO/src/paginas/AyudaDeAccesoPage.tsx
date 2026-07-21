// src/paginas/AyudaDeAccesoPage.tsx
// Página de ayuda de acceso (Error 12.5). "¿Problemas para ingresar?" era un
// enlace vacío (href="#") que no llevaba a ningún lado; esto es a donde lleva.
//
// Nota sobre el contenido: acá NO hay ningún teléfono, correo de soporte ni
// horario de atención, y no es un olvido. Ese dato no existe en ninguna parte
// del sistema, así que ponerlo sería inventarlo, y un contacto inventado es
// peor que ningún contacto: manda a la persona a escribirle a nadie. Lo que se
// explica es lo que sí es verdad y sale de cómo funciona NEXO: las cuentas las
// crea la institución, y por eso el reclamo va a la institución.

import { useNavigate } from "react-router-dom";
import BackgroundGlow from "./components/shared/BackgroundGlow";
import NexoLogo from "./components/shared/NexoLogo";
import LoginFooter from "./components/moduloLogin/LoginFooter";

interface Ayuda {
  icono: string;
  titulo: string;
  texto: string;
}

const AYUDAS: Ayuda[] = [
  {
    icono: "mail",
    titulo: "No sé cuál es mi correo o mi contraseña",
    texto:
      "Las cuentas de NEXO las crea la administración de tu institución, y es ella quien te entrega tus credenciales. Si nunca las recibiste, o no sabés con qué correo te dieron de alta, tenés que pedírselas a la administración de tu escuela: desde acá no hay forma de averiguarlo.",
  },
  {
    icono: "lock_reset",
    titulo: "Me acuerdo mi correo pero no mi contraseña",
    texto:
      "Usá “Recuperar mi contraseña”. Vas a recibir un código de un solo uso que vence en 30 minutos y sirve para definir una contraseña nueva.",
  },
  {
    icono: "error",
    titulo: "Dice “Correo o contraseña incorrectos”",
    texto:
      "Ese mensaje aparece siempre igual, sea cual sea el motivo, y es a propósito: si dijera cuál de los dos está mal, cualquiera podría usar la pantalla de ingreso para averiguar qué correos tienen cuenta en NEXO. Revisá que el correo esté completo y sin espacios de más. Si estás seguro de los dos datos, puede que tu cuenta esté dada de baja: eso lo resuelve la administración de tu institución.",
  },
  {
    icono: "cloud_off",
    titulo: "Dice “No se pudo contactar al servidor de NEXO”",
    texto:
      "No es tu contraseña: la aplicación no está pudiendo hablar con el servidor. Si estás probando NEXO en tu computadora, casi siempre significa que el servidor no está encendido.",
  },
];

export default function AyudaDeAccesoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <BackgroundGlow />

      <main className="w-full max-w-[560px] relative z-10">
        <div className="bg-surface-container p-8 md:p-10 rounded-[20px] border border-primary/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          <div className="mb-10">
            <NexoLogo size="md" showSlogan />
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Ayuda para ingresar
          </h2>
          <p className="text-sm text-on-surface-variant/70 mb-8">
            Qué hacer según lo que te esté pasando.
          </p>

          <div className="space-y-6">
            {AYUDAS.map((ayuda) => (
              <div key={ayuda.titulo} className="flex gap-4">
                <span className="material-symbols-outlined text-primary/70 shrink-0 mt-0.5">
                  {ayuda.icono}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">{ayuda.titulo}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant/70">
                    {ayuda.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-outline-variant/10 flex flex-col gap-3">
            <button
              onClick={() => navigate("/recuperar-contrasena")}
              className="w-full bg-primary hover:bg-primary-container text-surface-container-lowest font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200"
            >
              Recuperar mi contraseña
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full text-sm font-medium text-on-surface-variant/70 hover:text-primary transition-colors py-2"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}
