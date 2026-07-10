// src/paginas/components/perfiles/BadgePerfilRol.tsx
// Pill de rol institucional. Color automático según el rol (META_ROL).

import { META_ROL, type RolPerfil } from "./tipos";

interface BadgePerfilRolProps {
  rol: RolPerfil;
}

export default function BadgePerfilRol({ rol }: BadgePerfilRolProps) {
  const meta = META_ROL[rol];
  return (
    <span
      className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}
