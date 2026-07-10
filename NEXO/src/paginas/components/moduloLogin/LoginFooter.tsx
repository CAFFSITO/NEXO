// src/components/login/LoginFooter.tsx
// Footer fijo con links legales y copyright

const footerLinks = [
  { label: "Política de Privacidad", href: "#" },
  { label: "Términos de Servicio", href: "#" },
  { label: "Soporte", href: "#" },
];

export default function LoginFooter() {
  return (
    <footer className="fixed bottom-0 w-full pb-8 flex flex-col items-center gap-2 text-center px-4">
      <div className="flex gap-4 mb-1">
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-xs font-body text-on-background/50 hover:text-primary underline transition-colors duration-300"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="font-body text-xs text-on-background/50">
        © 2025 NEXO — Plataforma Educativa. Acceso Institucional.
      </p>
    </footer>
  );
}
