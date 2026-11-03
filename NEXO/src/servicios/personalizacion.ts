import { enviar, pedir } from "./api";

export interface Preferencias {
  densidad?: "comoda" | "compacta";
  movimiento?: "sistema" | "reducido" | "completo";
  tamanoTexto?: number;
}
export type TipoExtension = "algoritmo" | "metodo" | "app" | "capacidad";
export type ValorJSON = null | boolean | number | string | ValorJSON[] | { [clave: string]: ValorJSON };
export interface FichaEvidencia {
  version: 1; tipo: TipoExtension; id: string;
  estado: "sin-evaluar" | "favorable" | "mixta" | "insuficiente" | "desfavorable";
  resumen: string; limites: string; fuentes: { titulo: string; url: string }[]; revisadoEn: string | null;
}
export interface Retencion { modo: "conservar" | "eliminar"; dias: number | null }
export interface Personalizacion {
  version: 1;
  institucion: Preferencias;
  perfiles: Record<string, Preferencias>;
  academico: { anioMin: number; anioMax: number };
  retencion: { historialIa: Retencion; notificacionesLeidas: Retencion };
  evidencias: Record<string, FichaEvidencia>;
  extensiones: Record<string, { version: number; tipo: TipoExtension; config: Record<string, ValorJSON> }>;
}
export function personalizacionPorDefecto(): Personalizacion {
  return { version: 1, institucion: {}, perfiles: {}, academico: { anioMin: 1, anioMax: 7 }, retencion: { historialIa: { modo: "conservar", dias: null }, notificacionesLeidas: { modo: "conservar", dias: null } }, evidencias: {}, extensiones: {} };
}
/** Completa secciones ausentes sin descartar extensiones de versiones anteriores. */
export function completarPersonalizacion(p?: Personalizacion): Personalizacion {
  const base = personalizacionPorDefecto();
  return { ...base, ...p, academico: { ...base.academico, ...p?.academico }, retencion: { ...base.retencion, ...p?.retencion } };
}
export interface PreferenciasCuenta { preferencias: Preferencias; efectivas: Preferencias; version: number }
export const leerPreferencias = () => pedir<PreferenciasCuenta>("/api/cuenta/preferencias");
export const guardarPreferencias = (preferencias: Preferencias, version: number) => enviar<PreferenciasCuenta>("/api/cuenta/preferencias", "PUT", { preferencias, version });
