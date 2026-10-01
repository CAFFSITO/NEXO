import { Link } from "react-router-dom";

export default function LoginFooter() {
  return <footer className="text-center text-xs text-on-surface-variant/50 px-4 py-4">
    <Link to="/ayuda-de-acceso" className="hover:text-primary transition-colors">Ayuda de acceso</Link>
    <span className="mx-3" aria-hidden="true">·</span>
    <span>© {new Date().getFullYear()} NEXO</span>
  </footer>;
}
